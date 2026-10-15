/**
 * Rate limit para rotas públicas — Belessence
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, P1.2): rate limit existia só no login admin.
 * As rotas públicas estavam abertas — a pior delas `/api/coupon/validate`,
 * onde sem throttle dá para enumerar cupons por força bruta.
 *
 * Canon do vault (`Backend Onboarding Protocol` §Segurança): "Rate limiting
 * em rotas públicas e de auth".
 *
 * ── Onde o contador mora ──────────────────────────────────────────────
 *
 * Este arquivo tem o **motor e as regras**, e nenhuma dependência de
 * banco — é o que o mantém testável em unit, rápido, sem subir nada.
 *
 * O contador de verdade vive no Postgres
 * (`rate-limit-store-postgres.ts`), porque em serverless cada instância
 * tem seu próprio `Map`: quem ataca com concorrência cai em instâncias
 * diferentes e passa por baixo de um limite em memória. A escolha do
 * store é feita em `with-rate-limit.ts`, que é a raiz de composição.
 *
 * `InMemoryRateLimitStore`, abaixo, continua existindo com dois papéis:
 * é o store dos testes de unidade, e é para onde o store de Postgres
 * degrada se o banco não responder — degradar para o comportamento
 * antigo é melhor que abrir a rota ou derrubá-la.
 */

export interface RateLimitRule {
  /** Quantas requisições são permitidas na janela. */
  limit: number;
  /** Tamanho da janela, em segundos. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Quantas requisições ainda cabem na janela atual. */
  remaining: number;
  /** Quando a janela zera (epoch ms). */
  resetAt: number;
  /** Segundos até poder tentar de novo. Só faz sentido quando bloqueado. */
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  /**
   * Registra um acesso e devolve quantos houve na janela, junto do instante
   * em que a janela começou.
   */
  hit(
    key: string,
    windowMs: number,
    now: number,
  ): Promise<{ count: number; windowStart: number }>;
}

/* ── Store em memória ──────────────────────────────────────────────────── */

interface Window {
  count: number;
  windowStart: number;
}

/**
 * Janela fixa (não deslizante). Escolha deliberada: é O(1) em memória por
 * chave e o erro de borda — até 2x o limite na virada da janela — é
 * irrelevante para o que estamos barrando aqui.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, Window>();

  /** Teto de chaves, para o Map não virar vetor de exaustão de memória. */
  constructor(private readonly maxKeys = 10_000) {}

  async hit(key: string, windowMs: number, now: number) {
    const existing = this.windows.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      if (this.windows.size >= this.maxKeys) this.evictExpired(windowMs, now);
      const fresh = { count: 1, windowStart: now };
      this.windows.set(key, fresh);
      // Cópia, não a linha guardada: devolver a referência interna fazia
      // o resultado de uma chamada mudar sozinho quando a próxima
      // incrementava o mesmo contador. Quem chama hoje consome o valor na
      // hora e não notava, mas é uma armadilha esperando quem guardar o
      // retorno — e a assinatura promete um instantâneo.
      return { ...fresh };
    }

    existing.count += 1;
    return { count: existing.count, windowStart: existing.windowStart };
  }

  private evictExpired(windowMs: number, now: number) {
    for (const [key, w] of this.windows) {
      if (now - w.windowStart >= windowMs) this.windows.delete(key);
    }
    // Se ainda estourou (tudo dentro da janela), descarta o mais antigo.
    if (this.windows.size >= this.maxKeys) {
      const oldest = [...this.windows.entries()].reduce((a, b) =>
        a[1].windowStart <= b[1].windowStart ? a : b,
      );
      this.windows.delete(oldest[0]);
    }
  }

  /** Só para testes. */
  clear() {
    this.windows.clear();
  }
}

/* ── Regras por rota ───────────────────────────────────────────────────── */

/**
 * Limites por rota. Calibrados para uso humano normal com folga — o objetivo
 * é barrar script, não irritar cliente.
 */
export const RATE_LIMITS = {
  /**
   * O mais apertado de todos. Sem throttle dá para enumerar códigos de cupom
   * ("BLACK20", "DESCONTO10"...) por tentativa e erro. Quem compra testa um
   * cupom, talvez dois.
   */
  couponValidate: { limit: 10, windowSeconds: 60 },

  /** Formulário de contato: ninguém manda 5 mensagens em 10 minutos. */
  contact: { limit: 5, windowSeconds: 600 },

  /** Newsletter: idem, e evita enumeração de e-mails. */
  newsletter: { limit: 5, windowSeconds: 600 },

  /** Avaliação de produto: evita flood de review falsa. */
  reviews: { limit: 5, windowSeconds: 600 },

  /** Proxy do ViaCEP: protege custo e reputação de IP junto ao serviço. */
  cep: { limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/* ── Motor ─────────────────────────────────────────────────────────────── */

const defaultStore = new InMemoryRateLimitStore();

export async function checkRateLimit(
  name: RateLimitName,
  clientKey: string,
  store: RateLimitStore = defaultStore,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const windowMs = rule.windowSeconds * 1000;

  const { count, windowStart } = await store.hit(
    `${name}:${clientKey}`,
    windowMs,
    now,
  );

  const resetAt = windowStart + windowMs;
  const allowed = count <= rule.limit;

  return {
    allowed,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

/* ── Identificação do cliente ──────────────────────────────────────────── */

/**
 * Deriva a chave do cliente a partir dos headers.
 *
 * Em produção na Vercel, `x-forwarded-for` é posto pela plataforma e o
 * primeiro IP da lista é o do cliente. Confiar nesse header só é seguro
 * atrás de um proxy que o sobrescreve — que é o caso aqui. Fora de um
 * proxy, ele é forjável.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "desconhecido";
}

/** Headers padrão de rate limit, para o cliente saber onde está. */
export function rateLimitHeaders(
  name: RateLimitName,
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(RATE_LIMITS[name].limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed)
    headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}

/** Só para testes — zera o store padrão entre casos. */
export function resetDefaultStore() {
  defaultStore.clear();
}
