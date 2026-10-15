/**
 * Testes — ContactForm
 * Foco: validação Zod no submit, chamada de fetch, toast success/error.
 * Interações via userEvent (padrão do projeto).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

import { ContactForm } from "@/components/contact-form";

type User = ReturnType<typeof userEvent.setup>;

async function fillField(user: User, label: RegExp, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

async function fillValid(user: User) {
  await fillField(user, /^nome$/i, "Ana Silva");
  await fillField(user, /^email$/i, "ana@example.com");
  await fillField(user, /^assunto$/i, "Dúvida");
  await fillField(
    user,
    /^mensagem$/i,
    "Gostaria de saber mais sobre o produto X.",
  );
}

function submit(user: User) {
  return user.click(screen.getByRole("button", { name: /enviar mensagem/i }));
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza todos os campos com labels acessíveis", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^assunto$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mensagem$/i)).toBeInTheDocument();
  });

  it("mostra erros de validação Zod quando submetido vazio", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await submit(user);

    await waitFor(() => {
      expect(screen.getByText(/informe seu nome/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/informe um assunto/i)).toBeInTheDocument();
    expect(screen.getByText(/mensagem muito curta/i)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejeita email malformado no client", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillField(user, /^nome$/i, "Ana");
    await fillField(user, /^email$/i, "naoeumemail");
    await fillField(user, /^assunto$/i, "Olá");
    await fillField(
      user,
      /^mensagem$/i,
      "Mensagem com pelo menos 10 caracteres",
    );
    await submit(user);

    await waitFor(() => {
      expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument();
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("envia POST /api/contact e mostra toast de sucesso", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 201 }),
    );

    render(<ContactForm />);
    await fillValid(user);
    await submit(user);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toEqual({
      name: "Ana Silva",
      email: "ana@example.com",
      subject: "Dúvida",
      message: "Gostaria de saber mais sobre o produto X.",
      // Honeypot vai junto, vazio: é assim que o servidor distingue humano
      // de bot. Se este campo sumir do corpo, a armadilha deixa de existir
      // sem nada quebrar — por isso a asserção é exata, não parcial.
      website: "",
    });
  });

  it("renderiza o honeypot escondido e fora da ordem de tabulação", () => {
    render(<ContactForm />);

    const honeypot = document.querySelector<HTMLInputElement>("#hp-website");
    expect(honeypot).not.toBeNull();
    expect(honeypot!.tabIndex).toBe(-1);
    expect(honeypot!.getAttribute("autocomplete")).toBe("off");
    // Precisa estar escondido por posicionamento, não por display:none —
    // bot que presta atenção pula display:none e type=hidden.
    expect(honeypot!.closest("[aria-hidden='true']")).not.toBeNull();
    expect(honeypot!.type).toBe("text");
  });

  it("mostra toast de erro quando API retorna !ok", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
      }),
    );

    render(<ContactForm />);
    await fillValid(user);
    await submit(user);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Dados inválidos");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("mostra toast de erro genérico quando fetch lança", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("Network"));

    render(<ContactForm />);
    await fillValid(user);
    await submit(user);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Network");
  });
});
