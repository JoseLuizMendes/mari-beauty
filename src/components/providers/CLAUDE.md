# CLAUDE.md — `src/components/providers/`

> Providers globais montados em `src/app/layout.tsx`. Client Components que
> envolvem toda a árvore.

---

## 1. Providers atuais

- `lenis-provider.tsx` — inicializa **Lenis** (smooth scroll) uma única
  vez na raiz.

## 2. Regras

1. **Providers são Client Components.** Marque `"use client"` no topo.
2. **Não fazer fetch** nem chamar Prisma daqui — provider é só wiring.
3. **Montar uma vez** — providers vivem em `src/app/layout.tsx`, nunca em
   `page.tsx`.
4. **Cleanup obrigatório** em `useEffect`: Lenis precisa de `destroy()`,
   listeners precisam ser removidos. Vazamento aqui afeta toda a app.
5. **SSR safety**: usar guards `typeof window !== 'undefined'` se
   acessar browser API; ou condicionar em `useEffect` (que já roda só no
   client).

## 3. Ordem de aninhamento no `layout.tsx`

A ordem importa para que contextos internos vejam externos:

```
<LenisProvider>           ← scroll engine (mais externo)
  <CartProvider>          ← estado de carrinho
    <ThemeProvider?>      ← (futuro, se entrar next-themes)
      {children}
    </ThemeProvider>
  </CartProvider>
</LenisProvider>
```

## 4. Adicionando um provider novo

1. Criar `src/components/providers/<nome>-provider.tsx` com
   `"use client"`.
2. Exportar componente `PascalCase` aceitando `{ children: ReactNode }`.
3. Importar em `src/app/layout.tsx` e posicionar conforme dependências.
4. Atualizar a tabela acima neste arquivo.

## 5. Não faça

- Não envolver children em wrapper inútil — cada provider adiciona
  re-renders e bundle.
- Não criar provider para algo que cabe em um hook + Zustand store.
- Não usar React Context para estado mutável de alta frequência —
  Zustand já é o padrão do projeto.
