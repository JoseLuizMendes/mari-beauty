/**
 * Campo honeypot — armadilha anti-bot para formulários públicos.
 * ─────────────────────────────────────────────────────────────────────
 * Canon do vault (`Preferencias Dev` §Segurança): "Formulários públicos
 * (contato, newsletter, orçamento): validação server-side sempre + rate
 * limiting + honeypot e/ou Cloudflare Turnstile".
 *
 * Como funciona: um input que humano nenhum vê nem tabula, mas que bot de
 * preenchimento automático completa por reconhecer o `name`. Veio preenchido
 * → é bot, e o servidor descarta.
 *
 * Decisões que fazem o honeypot funcionar (e que são fáceis de errar):
 *
 *  - `name="website"` — nome plausível o bastante para o bot querer
 *    preencher. `name="honeypot"` seria ignorado pelos bons.
 *  - **Não** usar `type="hidden"`: bot que presta atenção pula hidden.
 *    Escondemos via CSS.
 *  - **Não** usar `display:none` isolado: alguns bots também pulam isso.
 *    Usamos posicionamento fora da tela.
 *  - `aria-hidden` + `tabIndex={-1}` — leitor de tela ignora e o Tab pula,
 *    então não atrapalha quem navega por teclado.
 *  - `autoComplete="off"` — impede o navegador de preencher sozinho e
 *    reprovar um humano de verdade.
 *
 * ── Por que `register` e não `ref` ────────────────────────────────────
 *
 * Os dois formulários públicos já usam react-hook-form, então registrar o
 * campo deixa o valor fluir no `data` do submit como qualquer outro.
 *
 * A primeira tentativa usou `useRef`, e o lint do React Compiler
 * (`react-hooks/refs`) reprovou: o handler que lê o ref é passado a
 * `handleSubmit(...)` durante o render, e a regra não consegue provar que a
 * leitura só acontece no evento. Com `register` não há ref nenhum.
 *
 * Uso:
 *
 *   const schema = z.object({ ..., [HONEYPOT_FIELD_NAME]: z.string().optional() });
 *   const { register } = useForm<Input>({ ... });
 *   <HoneypotField register={register(HONEYPOT_FIELD_NAME)} />
 */

import type { UseFormRegisterReturn } from "react-hook-form";

export const HONEYPOT_FIELD_NAME = "website";

interface HoneypotFieldProps {
  /** Retorno de `register(HONEYPOT_FIELD_NAME)` do react-hook-form. */
  register: UseFormRegisterReturn;
}

export function HoneypotField({ register }: HoneypotFieldProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: 1,
        height: 1,
        overflow: "hidden",
      }}
    >
      <label htmlFor={`hp-${HONEYPOT_FIELD_NAME}`}>
        Não preencha este campo
      </label>
      <input
        id={`hp-${HONEYPOT_FIELD_NAME}`}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register}
      />
    </div>
  );
}
