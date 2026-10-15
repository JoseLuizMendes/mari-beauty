/**
 * Hook de boot do Next.js — roda uma vez quando o servidor sobe.
 * ─────────────────────────────────────────────────────────────────────
 * Única responsabilidade: validar o ambiente antes de atender a primeira
 * requisição. Se o núcleo (DATABASE_URL / ADMIN_SECRET / AUTH_SECRET) estiver
 * inválido, derruba o processo aqui — barulhento e cedo — em vez de deixar a
 * app subir e quebrar na primeira requisição que precisar da variável.
 *
 * Ver `src/lib/shared/infrastructure/env.ts`.
 */

export async function register() {
  // O runtime Edge do middleware não precisa (e não deve) rodar isto: a
  // validação lá acontece no primeiro acesso via o proxy `serverEnv`.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnvAtBoot } =
    await import("./src/lib/shared/infrastructure/env");

  const disabled = validateEnvAtBoot(); // lança se o núcleo estiver inválido

  if (disabled.length > 0) {
    console.warn(
      "\n⚠️  Features desligadas por variável de ambiente ausente:\n" +
        disabled.join("\n") +
        "\n",
    );
  }
}
