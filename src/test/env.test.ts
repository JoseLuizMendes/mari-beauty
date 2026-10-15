/**
 * Testes da validação de ambiente.
 *
 * Estratégia: cada teste monta um `process.env` próprio e reseta o cache do
 * módulo. O parse é memoizado em produção (roda uma vez no boot), então sem
 * o reset os testes contaminariam uns aos outros.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getServerEnv,
  resetServerEnvCache,
  isFeatureReady,
  missingForFeature,
  featureReadiness,
  validateEnvAtBoot,
} from "@/lib/shared/infrastructure/env";

const VALID_CORE = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  ADMIN_SECRET: "um-segredo-com-mais-de-16-chars",
  AUTH_SECRET: "outro-segredo-com-mais-de-16-chars",
  NODE_ENV: "test",
};

const ORIGINAL = process.env;

function setEnv(vars: Record<string, string | undefined>) {
  process.env = { ...vars } as NodeJS.ProcessEnv;
  resetServerEnvCache();
}

beforeEach(() => resetServerEnvCache());
afterEach(() => {
  process.env = ORIGINAL;
  resetServerEnvCache();
});

describe("núcleo obrigatório", () => {
  it("aceita um ambiente válido", () => {
    setEnv(VALID_CORE);
    const env = getServerEnv();
    expect(env.DATABASE_URL).toBe(VALID_CORE.DATABASE_URL);
    expect(env.NODE_ENV).toBe("test");
  });

  it.each(["DATABASE_URL", "ADMIN_SECRET", "AUTH_SECRET"])(
    "falha quando %s está ausente",
    (missing) => {
      setEnv({ ...VALID_CORE, [missing]: undefined });
      expect(() => getServerEnv()).toThrow(/Ambiente inválido/);
      expect(() => getServerEnv()).toThrow(new RegExp(missing));
    },
  );

  it("rejeita DATABASE_URL que não é Postgres", () => {
    setEnv({ ...VALID_CORE, DATABASE_URL: "mysql://user@localhost/db" });
    expect(() => getServerEnv()).toThrow(/connection string Postgres/);
  });

  it("rejeita segredo curto demais para assinar JWT", () => {
    setEnv({ ...VALID_CORE, ADMIN_SECRET: "curto" });
    expect(() => getServerEnv()).toThrow(/pelo menos 16 caracteres/);
  });

  it("lista TODAS as variáveis faltando, não só a primeira", () => {
    setEnv({ NODE_ENV: "test" });
    try {
      getServerEnv();
      expect.unreachable("deveria ter lançado");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("DATABASE_URL");
      expect(msg).toContain("ADMIN_SECRET");
      expect(msg).toContain("AUTH_SECRET");
    }
  });

  it("memoiza o parse entre chamadas", () => {
    setEnv(VALID_CORE);
    expect(getServerEnv()).toBe(getServerEnv());
  });
});

describe("grupos de feature", () => {
  it("considera cloudinary desligado sem as chaves", () => {
    setEnv(VALID_CORE);
    expect(isFeatureReady("cloudinary")).toBe(false);
    expect(missingForFeature("cloudinary")).toEqual([
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]);
  });

  it("considera cloudinary pronto com as duas chaves", () => {
    setEnv({
      ...VALID_CORE,
      CLOUDINARY_API_KEY: "k",
      CLOUDINARY_API_SECRET: "s",
    });
    expect(isFeatureReady("cloudinary")).toBe(true);
    expect(missingForFeature("cloudinary")).toEqual([]);
  });

  it("trata string vazia como ausente", () => {
    setEnv({ ...VALID_CORE, MP_ACCESS_TOKEN: "" });
    expect(isFeatureReady("mercadoPago")).toBe(false);
  });

  it("exige o grupo completo — chave parcial não liga a feature", () => {
    setEnv({ ...VALID_CORE, AUTH_GOOGLE_ID: "id" });
    expect(isFeatureReady("adminGoogleOAuth")).toBe(false);
    expect(missingForFeature("adminGoogleOAuth")).toEqual([
      "AUTH_GOOGLE_SECRET",
      "ADMIN_ALLOWLIST_EMAILS",
    ]);
  });

  it("featureReadiness cobre todos os grupos", () => {
    setEnv(VALID_CORE);
    expect(featureReadiness()).toEqual({
      adminLogin: false,
      adminGoogleOAuth: false,
      cloudinary: false,
      mercadoPago: false,
    });
  });
});

describe("validateEnvAtBoot", () => {
  it("relata cada feature desligada", () => {
    setEnv(VALID_CORE);
    const lines = validateEnvAtBoot();
    expect(lines).toHaveLength(4);
    expect(lines.join("\n")).toContain("mercadoPago: DESLIGADA");
  });

  it("não relata nada quando tudo está configurado", () => {
    setEnv({
      ...VALID_CORE,
      ADMIN_PASSWORD_HASH: "$2a$10$abc",
      ADMIN_TOTP_SECRET: "BASE32SECRET",
      ADMIN_ALLOWLIST_EMAILS: "dev@exemplo.com",
      AUTH_GOOGLE_ID: "id",
      AUTH_GOOGLE_SECRET: "secret",
      CLOUDINARY_API_KEY: "k",
      CLOUDINARY_API_SECRET: "s",
      MP_ACCESS_TOKEN: "token",
    });
    expect(validateEnvAtBoot()).toEqual([]);
  });

  it("propaga a falha do núcleo", () => {
    setEnv({ NODE_ENV: "test" });
    expect(() => validateEnvAtBoot()).toThrow(/Ambiente inválido/);
  });
});
