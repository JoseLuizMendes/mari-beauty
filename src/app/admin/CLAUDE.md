# CLAUDE.md — `src/app/admin/`

> Painel administrativo do Belessence (single-tenant). Protegido por um cookie
> `admin_session` que contém um **JWT assinado** (não o segredo em texto puro),
> validado por `verifyAdminSession` em [`src/middleware.ts`](../../middleware.ts).

---

## 1. Estrutura

```
admin/
├── login/                    # Página pública (única exceção do middleware)
├── (authenticated)/          # Route group — apenas organização
│   ├── cupons/
│   ├── mensagens/
│   ├── pedidos/
│   └── produtos/
├── pedidos/[id]/             # Detalhes de pedido
└── produtos/[id]/, /novo/    # CRUD de produto
```

O `(authenticated)` **não** garante autenticação por si só — o middleware
sim. O grupo só evita o nome aparecer na URL.

## 2. Regras de auth (blindado, single-tenant)

**Cookie = JWT assinado.** O `admin_session` guarda um token assinado (jose
HS256, chave = `ADMIN_SECRET`) com `exp` curto (~12h) e `TOKEN_VERSION`. O
cookie **não é mais** o `ADMIN_SECRET`. Verificação única e compartilhada:
[`src/lib/auth/presentation/admin-auth.ts`](../../lib/auth/presentation/admin-auth.ts) → `verifyAdminSession` (usada
pelo middleware **e** por `/api/admin/cloudinary/sign`).

**Dois caminhos de login** (ambos setam o mesmo cookie assinado):

- **A — senha + TOTP:** server action em [`login/page.tsx`](login/page.tsx).
  Senha via hash bcrypt (`ADMIN_PASSWORD_HASH`) + código TOTP
  (`ADMIN_TOTP_SECRET`). Lógica em [`src/lib/auth/infrastructure/persistence/admin-login.ts`](../../lib/auth/infrastructure/persistence/admin-login.ts).
  **Lockout por IP** (model `AdminLoginAttempt`) após 5 falhas → 15 min.
- **B — Login com Google:** OAuth (arctic) com **allowlist de email**
  (`ADMIN_ALLOWLIST_EMAILS`). Rotas **públicas** `/api/admin/oauth/google` e
  `.../callback` (exceções explícitas no middleware). Lógica em
  [`src/lib/auth/infrastructure/external/admin-google.ts`](../../lib/auth/infrastructure/external/admin-google.ts).

**Rotas públicas** (pré-login, liberadas no middleware): `/admin/login`,
`/api/admin/oauth/google`, `/api/admin/oauth/google/callback`. Não adicionar
outras sem revisão.

**Recuperação pelo TI:** dois caminhos (um cobre o outro); lockout auto-expira
e `scripts/admin-unlock.mjs` zera na hora; `scripts/admin-setup.mjs` re-gera
hash da senha + segredo TOTP (QR). `TOKEN_VERSION` (em `admin-auth.ts`) revoga
todas as sessões.

**Segredos** (`ADMIN_SECRET`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOTP_SECRET`,
`AUTH_GOOGLE_*`): server-only, nunca `NEXT_PUBLIC_*`. UI admin **nunca** confia
em `localStorage`/`sessionStorage` — apenas o cookie validado no servidor.

## 3. UX do admin

- Páginas admin **podem** ser mais densas que o público — o usuário é
  operador, não cliente. Mas mantenha tokens de design do projeto (não
  inventar paleta).
- Mobile-friendly mas não otimizado para conversão — focar em formulários
  claros e tabelas legíveis.
- Confirmação obrigatória antes de ações destrutivas (deletar produto,
  cancelar pedido) — usar `AlertDialog` shadcn.

## 4. Mutações

- Toda mutação admin chama `/api/admin/*` ou Server Action marcada com
  `"use server"`.
- Após mutação que afeta vitrine pública: `revalidatePath('/')`,
  `revalidatePath('/allProducts')`, `revalidatePath('/product/[slug]')`
  conforme apropriado.
- Estoque, preço e status de pedido **nunca** são alteráveis pelo client
  sem passagem pelo handler.

## 5. Componentes de apoio

- Forms admin: ver [`../../components/admin/`](../../components/admin/).
- Upload de imagem: `cloudinary-upload.tsx` consome
  `/api/admin/cloudinary` para gerar signature; **nunca colocar API key
  Cloudinary no client**.

## 6. Não faça

- Não exibir mensagens do tipo "Você não está autenticado" no client antes
  do middleware redirecionar — confiar no fluxo do servidor.
- Não criar rotas admin fora de `/admin/*` (o matcher do middleware
  depende desse prefixo).
- Não loggar payloads admin no client (`console.log` em produção vaza
  dados sensíveis).
