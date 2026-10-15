/**
 * Admin Layout — sidebar (desktop) + topbar com drawer (mobile)
 * ─────────────────────────────────────────────────────────────────────
 * Desktop: sidebar fixa à esquerda (md:w-64).
 * Mobile:  topbar com hamburger que abre <Sheet> com o mesmo conteúdo.
 *
 * Logo agora usa <MariLogo> (mesma marca do hero, em vez do "M" italic).
 */

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Mail,
  Tag,
  LogOut,
  Home,
} from "lucide-react";
import { MariLogo } from "@/components/mari-logo";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { Button } from "@/components/ui/button";
import { ADMIN_COOKIE } from "@/lib/auth/presentation/admin-auth";

/**
 * Todo o admin é dinâmico, e o build não depende do banco.
 * ─────────────────────────────────────────────────────────────────────
 * Motivo (auditoria 2026-10, §8.6): sem isto o Next prerenderiza as
 * páginas do admin, que consultam o Prisma. `pnpm build` passava a exigir
 * Postgres de pé e falhava com ECONNREFUSED offline. Na Vercel funcionava
 * por acidente — o Neon está acessível no build —, então o acoplamento
 * não aparecia onde dói.
 *
 * Prerenderizar aqui nunca fez sentido: cada página destas é **privada,
 * autenticada e sempre fresca**. Pedido, estoque e mensagem prerenderizados
 * seriam dados velhos servidos a quem precisa dos de agora.
 *
 * Declarado no layout do grupo, não página a página: vale para as sete
 * rotas filhas, e rota nova entra já dinâmica em vez de depender de
 * alguém lembrar da linha.
 */
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, exact: false },
  { href: "/admin/cupons", label: "Cupons", icon: Tag, exact: false },
  { href: "/admin/mensagens", label: "Mensagens", icon: Mail, exact: false },
];

async function logout() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/**
 * Conteúdo compartilhado da sidebar — usado no aside desktop E dentro do
 * SheetContent mobile. Renderizado pelo servidor (mantém server actions).
 */
function SidebarContent() {
  return (
    <div className="flex flex-col gap-8 p-7 md:p-8 h-full">
      {/* Logo + label */}
      <div className="shrink-0">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 mb-1 whitespace-nowrap focus-ring rounded-sm"
        >
          <MariLogo className="h-7 w-[2.6rem] text-brand-pink" />
          <span className="text-[11px] tracking-[0.36em] uppercase font-medium text-brand-pink">
            Admin
          </span>
        </Link>
        <p className="text-[10px] tracking-[0.18em] text-brand-pink/55 mt-1">
          Painel Mari Beauty
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 px-3.5 py-2.5 rounded-token-sm text-[11px] tracking-[0.22em] uppercase text-brand-pink/65 hover:text-brand-pink hover:bg-brand-pink/8 transition-colors duration-200 whitespace-nowrap focus-ring"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-brand-pink/45 group-hover:text-brand-pink transition-colors"
              strokeWidth={1.6}
            />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="mt-auto pt-5 border-t border-brand-pink/12 flex flex-col gap-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-token-sm text-[10px] tracking-[0.22em] uppercase text-brand-pink/55 hover:text-brand-pink hover:bg-brand-pink/8 transition-colors duration-200 whitespace-nowrap"
        >
          <Home className="h-3.5 w-3.5" strokeWidth={1.6} />
          Ver loja
        </Link>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2.5 h-auto px-3.5 py-2.5 rounded-token-sm text-[10px] tracking-[0.22em] uppercase text-brand-pink/55 hover:bg-brand-pink/8 hover:text-brand-pink transition-colors duration-200 whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-admin-canvas flex flex-col md:flex-row">
      {/* ── Sidebar desktop (md+) ──────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-brand-wine text-brand-pink sticky top-0 self-start">
        <SidebarContent />
      </aside>

      {/* ── Topbar mobile (< md) ───────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-brand-wine text-brand-pink shadow-[0_8px_24px_-12px_rgba(46,11,18,0.4)]">
        <AdminMobileNav>
          <SidebarContent />
        </AdminMobileNav>

        <Link
          href="/admin"
          className="flex items-center gap-2 focus-ring rounded-sm"
        >
          <MariLogo className="h-6 w-9 text-brand-pink" />
          <span className="text-[11px] tracking-[0.32em] uppercase font-medium">
            Admin
          </span>
        </Link>

        {/* Spacer pra balancear visualmente o título central */}
        <div className="w-9" aria-hidden="true" />
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 animate-admin-rise">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
