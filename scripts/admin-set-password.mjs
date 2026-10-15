/**
 * Troca SÓ a senha do admin (mantém o TOTP atual).
 * Gera o hash bcrypt, escapa os `$` (exigência do dotenv-expand do Next) e
 * grava direto no `.env`, substituindo a linha `ADMIN_PASSWORD_HASH`.
 *
 * Uso: node scripts/admin-set-password.mjs "<nova-senha>"
 *
 * Por que escapar `$`: o Next carrega o `.env` com dotenv-expand, que trata
 * `$` como referência de variável. Hashes bcrypt contêm `$` (ex.: `$2b$12$...`)
 * — sem escapar, o valor é corrompido em runtime e a senha nunca valida.
 */

import fs from "fs";
import bcrypt from "bcryptjs";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/admin-set-password.mjs "<nova-senha>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Senha muito curta — use pelo menos 8 caracteres.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const escaped = hash.replace(/\$/g, "\\$");
const line = `ADMIN_PASSWORD_HASH="${escaped}"`;

const cwdEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(__dirname, "..", ".env");
const envPath = fs.existsSync(cwdEnv) ? cwdEnv : rootEnv;

if (!fs.existsSync(envPath)) {
  console.error(
    `Arquivo .env não encontrado em: ${envPath}\nCrie o arquivo .env na raiz do projeto a partir de .env.example.`,
  );
  process.exit(1);
}

let env = fs.readFileSync(envPath, "utf8");
if (/^ADMIN_PASSWORD_HASH=.*$/m.test(env)) {
  env = env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line);
} else {
  env = env.replace(/\s*$/, "") + "\n" + line + "\n";
}
fs.writeFileSync(envPath, env);

// Sanity check: relê e confirma que o hash gravado valida a senha.
const stored = fs
  .readFileSync(envPath, "utf8")
  .match(/^ADMIN_PASSWORD_HASH="?(.+?)"?$/m)[1]
  .replace(/\\\$/g, "$");
const ok = await bcrypt.compare(password, stored);

console.log("\n✔ Senha do admin atualizada no .env.");
console.log("  verificação:", ok ? "OK" : "FALHOU (avise o suporte)");
console.log("\n⚠ Reinicie o servidor (Ctrl+C e `pnpm dev`) para aplicar.\n");
