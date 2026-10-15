/**
 * /lab/bottle — spike do frasco 3D procedural (fatia 1 do spec 001).
 *
 * **Rota só de desenvolvimento.** Em produção devolve 404: é ferramenta de
 * calibração, não página da loja. Sem isso, `three` e `drei` acabariam
 * roteáveis em produção e indexáveis pelo Google.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottleLabClient } from "./bottle-lab-client";

export const metadata: Metadata = {
  title: "Laboratório do frasco 3D",
  robots: { index: false, follow: false },
};

export default function BottleLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <BottleLabClient />;
}
