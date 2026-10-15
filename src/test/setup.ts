import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// jsdom não implementa window.matchMedia. Componentes que verificam
// prefers-reduced-motion (Newsletter, etc.) precisam dele.
// IMPORTANTE: não usar vi.fn() aqui — clearAllMocks() em outros testes
// limparia a implementação. Função pura sobrevive.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom não implementa IntersectionObserver. Componentes que observam
// viewport (BrandGallery, Hero, animações com once:true) precisam dele.
if (typeof globalThis.IntersectionObserver === "undefined") {
  // @ts-expect-error — tipo simplificado, suficiente para testes
  globalThis.IntersectionObserver = class {
    constructor(_cb: unknown) {
      void _cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// jsdom não implementa ResizeObserver. Componentes responsivos
// (Embla, Radix Tabs, etc.) podem precisar.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    constructor(_cb: unknown) {
      void _cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom não implementa scrollIntoView no Element.prototype.
if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// jsdom não implementa Pointer Capture API (hasPointerCapture, setPointerCapture,
// releasePointerCapture). Radix UI Select (shadcn) usa essas APIs internamente —
// sem polyfill, testes que abrem o dropdown quebram com
// "TypeError: target.hasPointerCapture is not a function".
if (typeof window !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// Mock global do Prisma — testes individuais sobrescrevem com mockResolvedValueOnce.
// Centralizado aqui para evitar repetir em cada arquivo de teste.
// Cobertura: models usados em src/lib/* e src/app/api/*.
// Path canon após Rodada 4.1: src/lib/shared/infrastructure/prisma-client.ts
vi.mock("@/lib/shared/infrastructure/prisma-client", () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    contactMessage: {
      create: vi.fn(),
    },
    newsletterSubscriber: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // Adicionados após Rodada 4: bounded contexts auth + cart + wishlist
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    cartItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    wishlistItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      // Suporta tanto array de promises quanto callback(tx)
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === "function")
        return (arg as (tx: unknown) => unknown)({});
      return arg;
    }),
  },
}));

// Mock GSAP para não quebrar testes unitários (GSAP requer browser).
// `to/from/fromTo/set` retornam um "tween" com kill/play/pause — alguns
// hooks (useCountUp) chamam esses métodos na cleanup.
const makeTween = () => ({
  kill: vi.fn(),
  play: vi.fn().mockReturnThis(),
  pause: vi.fn().mockReturnThis(),
  resume: vi.fn().mockReturnThis(),
  restart: vi.fn().mockReturnThis(),
  progress: vi.fn().mockReturnThis(),
});

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    from: vi.fn(() => makeTween()),
    to: vi.fn(() => makeTween()),
    fromTo: vi.fn(() => makeTween()),
    set: vi.fn(() => makeTween()),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    ticker: {
      add: vi.fn(),
      remove: vi.fn(),
      lagSmoothing: vi.fn(),
    },
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
    update: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@gsap/react", () => ({
  useGSAP: vi.fn((fn: () => void) => fn()),
}));

// Mock do next-auth/react — por padrão o usuário está autenticado, para que
// ações com auth-gate (curtir, carrinho) rodem direto nos testes de
// comportamento. Testes que precisam do estado deslogado podem sobrescrever.
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { id: "test-user", name: "Test", email: "test@belessence.dev" },
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children?: unknown }) => children,
}));

// Mock das Server Actions de carrinho/wishlist — as stores as importam, mas
// nos testes unitários queremos isolar do servidor (auth + Prisma). Por padrão
// retornam sucesso, então o update otimista das stores se mantém.
vi.mock("@/lib/cart/presentation/cart-actions", () => ({
  getCartAction: vi.fn(async () => []),
  addToCartAction: vi.fn(async () => ({ ok: true })),
  setCartQuantityAction: vi.fn(async () => ({ ok: true })),
  removeFromCartAction: vi.fn(async () => ({ ok: true })),
  clearCartAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/wishlist/presentation/wishlist-actions", () => ({
  getWishlistAction: vi.fn(async () => []),
  toggleWishlistAction: vi.fn(async () => ({ ok: true, favorited: true })),
  removeWishlistAction: vi.fn(async () => ({ ok: true })),
  clearWishlistAction: vi.fn(async () => ({ ok: true })),
}));

// `server-only` é um módulo Next.js virtual que só existe em build. Em Vitest
// (jsdom) precisamos mocká-lo pra evitar erro de resolução em arquivos
// `import "server-only"` (ex.: wishlist-repository.ts, cart-repository.ts).
vi.mock("server-only", () => ({}));

vi.mock("lenis", () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    raf: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// O rate limit das rotas públicas guarda contagem num store em memória no
// escopo do módulo. Sem zerar entre casos, um arquivo de teste que chama o
// mesmo handler mais vezes que o limite faz os últimos casos receberem 429 —
// e o teste quebra por ordem de execução, não por comportamento.
// Ver src/lib/shared/infrastructure/rate-limit.ts
beforeEach(async () => {
  const { resetDefaultStore } =
    await import("@/lib/shared/infrastructure/rate-limit");
  resetDefaultStore();
});
