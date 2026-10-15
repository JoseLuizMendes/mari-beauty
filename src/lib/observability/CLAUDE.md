# `src/lib/observability/` — Bounded Context Observabilidade

> Captura de erro em produção. Nasceu da auditoria 2026-10 (**P1.5**): o
> Belessence é o projeto com mais superfície do workspace — checkout,
> pagamento, admin — e era o único sem nenhuma captura de erro. Voava cego.

---

## 1. Escopo

Uma coisa só: **o que não pode sair junto com o erro.**

O SDK do Sentry é configurado fora daqui — `instrumentation.ts` (servidor
e edge) e `instrumentation-client.ts` (navegador), que é onde o Next
espera encontrá-los. Esta pasta guarda a regra que os dois compartilham.

---

## 2. Estrutura

```
src/lib/observability/
└── domain/
    └── sentry-scrub.ts   # filtro de dado sensível — função pura
```

Sem `infrastructure/`: não há adapter nosso. Quem fala com o Sentry é o
SDK, nos dois arquivos de instrumentação.

---

## 3. Diretrizes

- **O scrub não importa o Sentry.** É função pura sobre um objeto com a
  forma do evento (`ScrubbableEvent`). É o que permite testá-lo sem subir
  SDK, e o que impede o SDK de vazar para o bundle do cliente por um
  import de tipo.
- **Campo novo que carrega dado de cliente entra em `SENSITIVE_BODY_KEYS`
  no mesmo PR que o cria.** A comparação é por substring normalizada, então
  `cpf`, `CPF` e `cpf_cliente` caem na mesma regra — mas `documento` não.
- **Profundidade é limitada de propósito** (6 níveis). O `beforeSend` roda
  no caminho de envio do erro: recursão sem teto num objeto com ciclo
  pendura o processo exatamente quando algo já deu errado.
- **Gate por DSN, sempre.** Sem `NEXT_PUBLIC_SENTRY_DSN` nada inicializa.
  É o mesmo desenho dos grupos de feature de `env.ts`: a ausência desliga
  a feature e anuncia no boot, não derruba a app.
- **`sendDefaultPii` fica `false`.** O scrub é a segunda linha, não a
  primeira.

---

## 4. Stack Local

`@sentry/nextjs`. O `domain/` não depende de nada.

---

## 5. Testes

`src/test/sentry-scrub.test.ts` — cabeçalhos, cookies, query string, corpo
do checkout, dado aninhado, array preservado, referência circular e
idempotência. Os casos afirmam que o dado **não aparece no evento
serializado**, não que a chave mudou: a diferença importa quando o dado
está aninhado.

---

## 6. Referências

- `docs/AUDITORIA-2026-10.md` §P1.5 — por que este contexto existe
- `instrumentation.ts` e `instrumentation-client.ts` — onde o SDK sobe
- `CLAUDE.md` de `src/lib/`
