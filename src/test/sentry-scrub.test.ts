/**
 * Scrub da telemetria.
 *
 * Este é o teste que impede a observabilidade de virar vazamento. Numa
 * loja, o evento de erro do checkout carrega CPF, endereço e o cookie de
 * sessão; se o filtro falhar em silêncio, esses dados saem do país num
 * relatório que ninguém revisa.
 *
 * Por isso os casos aqui são todos "o dado sensível **não** aparece em
 * lugar nenhum do evento serializado" — e não "a chave foi substituída".
 * A diferença importa quando o dado está aninhado.
 */

import { describe, it, expect } from "vitest";
import {
  isSensitiveKey,
  scrubEvent,
  type ScrubbableEvent,
} from "@/lib/observability/domain/sentry-scrub";

const FILTERED = "[Filtered]";

describe("isSensitiveKey", () => {
  it.each([
    "cpf",
    "CPF",
    "cpf_cliente",
    "clienteCPF",
    "password",
    "currentPassword",
    "cardNumber",
    "card-number",
    "cvv",
    "cep",
    "endereco",
    "paymentId",
  ])("reconhece %s", (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each(["quantidade", "slug", "status", "nome", "produto", "id"])(
    "deixa passar %s",
    (key) => {
      expect(isSensitiveKey(key)).toBe(false);
    },
  );
});

describe("scrubEvent", () => {
  it("devolve o evento intacto quando não há request", () => {
    const event: ScrubbableEvent = { message: "erro solto" };
    expect(scrubEvent(event)).toBe(event);
  });

  it("filtra cookie, authorization e a assinatura do webhook", () => {
    const event: ScrubbableEvent = {
      request: {
        headers: {
          Cookie: "admin_session=eyJhbGciOi...",
          Authorization: "Bearer segredo",
          "x-signature": "ts=1,v1=abc",
          "content-type": "application/json",
        },
      },
    };

    const { request } = scrubEvent(event);

    expect(request?.headers?.Cookie).toBe(FILTERED);
    expect(request?.headers?.Authorization).toBe(FILTERED);
    expect(request?.headers?.["x-signature"]).toBe(FILTERED);
    // O que não é segredo continua: sem contexto não se depura nada.
    expect(request?.headers?.["content-type"]).toBe("application/json");
  });

  it("filtra cookies e query string inteiros", () => {
    const event: ScrubbableEvent = {
      request: {
        cookies: { admin_session: "eyJ..." },
        query_string: "email=cliente@exemplo.com&token=abc",
      },
    };

    const { request } = scrubEvent(event);

    expect(request?.cookies).toBe(FILTERED);
    expect(request?.query_string).toBe(FILTERED);
  });

  it("filtra dado pessoal no corpo do checkout", () => {
    const event: ScrubbableEvent = {
      request: {
        data: {
          cpf: "123.456.789-00",
          email: "cliente@exemplo.com",
          cep: "01310-100",
          endereco: "Av. Paulista, 1000",
          quantidade: 2,
        },
      },
    };

    const serialized = JSON.stringify(scrubEvent(event));

    expect(serialized).not.toContain("123.456.789-00");
    expect(serialized).not.toContain("cliente@exemplo.com");
    expect(serialized).not.toContain("01310-100");
    expect(serialized).not.toContain("Av. Paulista");
    // E o que serve para depurar sobrevive.
    expect(serialized).toContain('"quantidade":2');
  });

  it("alcança dado sensível aninhado — é onde um filtro raso falha", () => {
    const event: ScrubbableEvent = {
      request: {
        data: {
          pedido: {
            itens: [{ slug: "elixir-noturno", quantidade: 1 }],
            comprador: { nome: "Fulano", cpf: "123.456.789-00" },
            entrega: { cep: "01310-100", numero: "1000" },
          },
        },
      },
    };

    const serialized = JSON.stringify(scrubEvent(event));

    expect(serialized).not.toContain("123.456.789-00");
    expect(serialized).not.toContain("01310-100");
    expect(serialized).toContain("elixir-noturno");
  });

  it("preserva arrays e não os transforma em objeto", () => {
    const event: ScrubbableEvent = {
      request: { data: { itens: [{ slug: "a" }, { slug: "b" }] } },
    };

    const data = scrubEvent(event).request?.data as {
      itens: { slug: string }[];
    };

    expect(Array.isArray(data.itens)).toBe(true);
    expect(data.itens.map((i) => i.slug)).toEqual(["a", "b"]);
  });

  it("não entra em recursão infinita com referência circular", () => {
    // `beforeSend` roda no caminho de envio do erro: travar aqui é perder
    // o relatório e pendurar o processo junto.
    const circular: Record<string, unknown> = { slug: "x" };
    circular.self = circular;

    const event: ScrubbableEvent = { request: { data: circular } };

    expect(() => scrubEvent(event)).not.toThrow();
  });

  it("é idempotente — filtrar duas vezes dá o mesmo resultado", () => {
    const build = (): ScrubbableEvent => ({
      request: {
        headers: { Cookie: "a=b" },
        data: { cpf: "123.456.789-00", slug: "x" },
      },
    });

    const uma = JSON.stringify(scrubEvent(build()));
    const duas = JSON.stringify(scrubEvent(scrubEvent(build())));

    expect(duas).toBe(uma);
  });
});
