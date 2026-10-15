/**
 * Store de rate limit no Postgres — o contador que todas as instâncias veem.
 * ─────────────────────────────────────────────────────────────────────
 * Por que existe: `InMemoryRateLimitStore` guarda a janela num `Map` do
 * processo. Em serverless cada instância tem o seu, então basta atacar com
 * concorrência para cair em instâncias diferentes e passar por baixo do
 * limite. O Postgres é a memória compartilhada — mesma escolha que
 * `admin-login.ts` já fazia para o login admin.
 *
 * ── Por que SQL cru aqui ──────────────────────────────────────────────
 *
 * O `CLAUDE.md` de `src/lib` pede para não usar `$queryRaw` sem motivo
 * claro. O motivo aqui é o ponto inteiro da mudança: **atomicidade**.
 *
 * Ler a linha, decidir em TypeScript e gravar de volta reintroduz
 * exatamente a corrida que viemos eliminar — duas instâncias leem `count
 * = 9`, as duas gravam `10`, e passaram 11. O `INSERT ... ON CONFLICT DO
 * UPDATE` abaixo resolve leitura, decisão e escrita num único statement:
 * o Postgres trava a linha no conflito e serializa os concorrentes.
 * Não existe forma de expressar isso pela API do Prisma Client.
 *
 * Todos os valores vão como parâmetro (`Prisma.sql`), nunca interpolados.
 *
 * ── Comportamento quando o banco falha ────────────────────────────────
 *
 * Cai para o store em memória, **não** libera a requisição. Três opções
 * existiam e esta é a menos ruim:
 *
 *   - falhar aberto: uma instabilidade de banco abre `/api/coupon/validate`
 *     para enumeração — o buraco que esta mudança veio fechar;
 *   - falhar fechado: um blip de banco derruba contato, newsletter e CEP
 *     para clientes legítimos, e rate limit não vale um incidente;
 *   - degradar: volta ao comportamento que o projeto tinha até aqui, que
 *     segura flood acidental e script ingênuo.
 *
 * A degradação é registrada no console uma vez por janela de erro, para
 * não virar flood de log em cima de um banco já em dificuldade.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";
import { InMemoryRateLimitStore, type RateLimitStore } from "./rate-limit";

/** Linha devolvida pelo upsert. `count` vem como BigInt em alguns drivers. */
interface HitRow {
  count: number | bigint;
  windowStart: Date;
}

/**
 * Chance de uma chamada aproveitar para limpar janelas vencidas.
 * ─────────────────────────────────────────────────────────────────────
 * Sem limpeza a tabela cresce uma linha por IP por regra, para sempre.
 * Um cron seria mais previsível, mas exige infraestrutura que o projeto
 * não tem; 1% das chamadas mantém a tabela pequena sem custar latência
 * perceptível e sem depender de nada externo. A limpeza é disparada sem
 * `await`: se falhar, não afeta a requisição em curso.
 */
const CHANCE_DE_LIMPEZA = 0.01;

/** Janelas mais velhas que isto não interessam a nenhuma regra. */
const RETENCAO_MS = 24 * 60 * 60 * 1000;

export class PostgresRateLimitStore implements RateLimitStore {
  /** Usado quando o banco não responde — ver o cabeçalho. */
  private readonly fallback = new InMemoryRateLimitStore();
  private ultimoAvisoDeFalha = 0;

  async hit(key: string, windowMs: number, now: number) {
    const agora = new Date(now);
    const expiraAntesDe = new Date(now - windowMs);

    try {
      const rows = await prisma.$queryRaw<HitRow[]>(Prisma.sql`
        INSERT INTO rate_limit_windows ("key", "count", "windowStart")
        VALUES (${key}, 1, ${agora})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN rate_limit_windows."windowStart" <= ${expiraAntesDe}
              THEN 1
            ELSE rate_limit_windows."count" + 1
          END,
          "windowStart" = CASE
            WHEN rate_limit_windows."windowStart" <= ${expiraAntesDe}
              THEN ${agora}
            ELSE rate_limit_windows."windowStart"
          END
        RETURNING "count", "windowStart"
      `);

      const row = rows[0];
      if (!row) throw new Error("upsert de rate limit não devolveu linha");

      if (Math.random() < CHANCE_DE_LIMPEZA) void this.limparVencidas(now);

      return {
        count: Number(row.count),
        windowStart: row.windowStart.getTime(),
      };
    } catch (erro) {
      this.avisarDegradacao(erro, now);
      return this.fallback.hit(key, windowMs, now);
    }
  }

  /**
   * Zera o contador de degradação. Só para testes: o Prisma é mockado lá,
   * o upsert falha, e sem isto o contador em memória atravessa casos — um
   * arquivo que chama o mesmo handler mais vezes que o limite faz os
   * últimos casos receberem 429 por ordem de execução, não por
   * comportamento. Ver o hook em `src/test/setup.ts`.
   */
  clear(): void {
    this.fallback.clear();
    this.ultimoAvisoDeFalha = 0;
  }

  private async limparVencidas(now: number): Promise<void> {
    try {
      await prisma.rateLimitWindow.deleteMany({
        where: { windowStart: { lt: new Date(now - RETENCAO_MS) } },
      });
    } catch {
      // Limpeza é oportunista: falhar aqui não pode afetar a requisição.
    }
  }

  private avisarDegradacao(erro: unknown, now: number): void {
    if (now - this.ultimoAvisoDeFalha < 60_000) return;
    this.ultimoAvisoDeFalha = now;
    console.error(
      "[rate-limit] Postgres indisponível; degradando para contador em " +
        "memória (por instância). Causa:",
      erro,
    );
  }
}
