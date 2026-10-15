/**
 * Remove dado sensível antes do evento sair para o Sentry.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.5): o Belessence é o projeto com mais
 * superfície do workspace — checkout, pagamento, admin — e era o único
 * voando cego, sem captura de erro em produção.
 *
 * Telemetria resolve isso e cria um problema novo: o relatório de erro
 * leva junto o que havia na requisição. Numa loja, isso é CPF, endereço,
 * telefone e cookie de sessão. Mandar erro para fora **não pode** virar
 * vazamento de dado de cliente.
 *
 * Portado do `src/lib/sentry-scrub.ts` do `dr-gabriel-cavalcante-web`,
 * com a lista de campos ampliada para o que um e-commerce brasileiro
 * coleta: aquele projeto filtra senha e token; aqui o checkout recebe CPF,
 * CEP e endereço, e o `confirm-payment` recebe identificador de pagamento.
 *
 * Camada `domain/`: função pura e idempotente, sem Sentry importado. É o
 * que a torna testável sem subir SDK nenhum.
 */

export interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: Record<string, unknown>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  [key: string]: unknown;
}

const FILTERED = "[Filtered]";

/** Cabeçalhos que carregam credencial. */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-signature", // webhook do gateway — é a prova de autenticidade
]);

/**
 * Campos de corpo que não podem sair da casa.
 *
 * Comparação em minúsculas e **sem** pontuação, para que `cpf`, `CPF` e
 * `cpf_cliente` caiam na mesma regra. Ver `normalizeKey`.
 */
const SENSITIVE_BODY_KEYS = [
  "password",
  "newpassword",
  "currentpassword",
  "token",
  "secret",
  "authorization",
  // Dado pessoal de cliente — LGPD
  "cpf",
  "cnpj",
  "email",
  "telefone",
  "phone",
  "cep",
  "endereco",
  "address",
  "complemento",
  "numero",
  // Pagamento
  "cardnumber",
  "cvv",
  "paymentid",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, "");
}

/** `true` quando o nome do campo contém qualquer termo sensível. */
export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SENSITIVE_BODY_KEYS.some((term) => normalized.includes(term));
}

/**
 * Filtra recursivamente. Profundidade limitada porque evento de erro
 * carrega estrutura aninhada (um pedido com itens e endereço) e porque
 * recursão sem teto num objeto com ciclo trava o `beforeSend` — que roda
 * no caminho de envio do erro, o pior lugar para travar.
 */
function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, inner] of Object.entries(source)) {
    result[key] = isSensitiveKey(key) ? FILTERED : scrubValue(inner, depth + 1);
  }

  return result;
}

/**
 * Aplica o filtro no evento. **Muta e devolve o mesmo objeto**, que é o
 * contrato do `beforeSend` do Sentry.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const req = event.request;
  if (!req) return event;

  if (req.headers && typeof req.headers === "object") {
    for (const key of Object.keys(req.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) req.headers[key] = FILTERED;
    }
  }

  // Cookie inteiro sai: não há cookie nosso que valha o risco de vazar o
  // `admin_session` ou o JWT do cliente num relatório de erro.
  if (req.cookies !== undefined) req.cookies = FILTERED;

  // Query string pode trazer e-mail em link de recuperação.
  if (req.query_string !== undefined) req.query_string = FILTERED;

  if (req.data !== undefined) req.data = scrubValue(req.data, 0);

  return event;
}
