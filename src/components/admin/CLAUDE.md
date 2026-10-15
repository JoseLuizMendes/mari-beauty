# CLAUDE.md — `src/components/admin/`

> Componentes específicos do painel administrativo. **Não devem ser
> importados por rotas/páginas públicas** — vazaria peso de bundle e
> superfície de ataque.

---

## 1. Componentes atuais

| Arquivo                   | Papel                                             |
| ------------------------- | ------------------------------------------------- |
| `admin-mobile-nav.tsx`    | Nav mobile do admin                               |
| `cloudinary-upload.tsx`   | Upload assinado (consome `/api/admin/cloudinary`) |
| `order-status-filter.tsx` | Filtro de status de pedido                        |
| `order-status-form.tsx`   | Form para mudar status de pedido                  |
| `product-form.tsx`        | CRUD form de produto                              |

## 2. Regras

1. **Imports só por rotas em `app/admin/*`.** Se um componente "admin" for
   reusado em rota pública, mova para `src/components/` raiz.
2. **Forms** usam `react-hook-form` + `zodResolver` com schema importado
   de `@/lib/shared/domain/zod-schemas`. Não duplicar regras de validação.
3. **Submissão**: chamar `/api/admin/*` via `fetch` ou Server Action.
   Tratar `response.ok === false`, mostrar `toast.error` do Sonner.
4. **Estados de loading**: usar `formState.isSubmitting` do RHF (ou
   `useTransition`/`useFormStatus` em Server Actions).
5. **Upload de imagens** vai exclusivamente por `cloudinary-upload.tsx`.
   **Nunca colocar API key Cloudinary no client** — usar signature
   server-side.

## 3. UX admin

- **Confirmação destrutiva**: usar `AlertDialog` shadcn antes de deletar.
- **Feedback imediato**: sucesso/erro via Sonner toast. Não usar
  `alert()` ou banner custom.
- **Inputs financeiros** (preço, desconto): aceitar string formatada (R$
  X,YZ), converter para `Decimal` no backend. Nunca confiar no client.

## 4. Segurança

- Nada de logar payload do admin no client (`console.log`/`alert`).
- Renderizar dados que vêm do banco com confiança, mas **sanitizar** se
  for HTML (não temos rich text agora — se vier, usar `dompurify`).

## 5. Não faça

- Não criar tabela de produtos custom — usar `Table` shadcn.
- Não acessar Prisma do client. Tudo via Route Handler admin.
- Não importar `@/components/admin/*` em um Server Component público.
