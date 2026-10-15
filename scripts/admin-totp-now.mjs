/**
 * Mostra o código TOTP que o servidor espera AGORA, a partir do
 * `ADMIN_TOTP_SECRET` do `.env`. Útil para diagnóstico: compare com o número
 * que o app autenticador (Authy) mostra no mesmo instante.
 *
 *  - Iguais   → o segredo está certo (o problema é a senha ou o relógio).
 *  - Diferentes → o Authy está com outro segredo (rode admin-setup.mjs e
 *                 re-escaneie o QR).
 *
 * Uso: node scripts/admin-totp-now.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generate } from "otplib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwdEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(__dirname, "..", ".env");
const envPath = fs.existsSync(cwdEnv) ? cwdEnv : rootEnv;

if (!fs.existsSync(envPath)) {
  console.error(
    `Arquivo .env não encontrado em: ${envPath}\nCrie o arquivo .env na raiz do projeto a partir de .env.example.`,
  );
  process.exit(1);
}

const m = fs
  .readFileSync(envPath, "utf8")
  .match(/^ADMIN_TOTP_SECRET="?([^"\r\n]+)"?/m);
if (!m) {
  console.error("ADMIN_TOTP_SECRET não está no .env — 2FA não configurado.");
  process.exit(1);
}

const code = await generate({ secret: m[1] });
console.log("\nCódigo TOTP esperado agora:", code);
console.log("(muda a cada 30s — compare com o Authy no mesmo instante)\n");
