/**
 * `<JsonLd>` — o componente que injeta o dado estruturado no HTML.
 *
 * O teste que importa aqui é o do escape: o conteúdo vai para o DOM via
 * `dangerouslySetInnerHTML`, e um `</script>` dentro de um nome de produto
 * fecharia a tag mais cedo e injetaria markup. Nome de produto vem do
 * admin, não do visitante — mas confiar nisso é exatamente o tipo de
 * premissa que envelhece mal.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "@/components/seo/json-ld";

function scriptsFrom(container: HTMLElement): HTMLScriptElement[] {
  return Array.from(
    container.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    ),
  );
}

describe("<JsonLd>", () => {
  it("renderiza um script com o JSON serializado", () => {
    const { container } = render(
      <JsonLd data={{ "@type": "Product", name: "Essência Noturna" }} />,
    );

    const scripts = scriptsFrom(container);
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].innerHTML)).toEqual({
      "@type": "Product",
      name: "Essência Noturna",
    });
  });

  it("renderiza um script por item quando recebe lista", () => {
    const { container } = render(
      <JsonLd data={[{ "@type": "Organization" }, { "@type": "WebSite" }]} />,
    );

    expect(scriptsFrom(container)).toHaveLength(2);
  });

  it("escapa `<` para que um valor não feche o script", () => {
    const { container } = render(
      <JsonLd data={{ name: "</script><img onerror=alert(1)>" }} />,
    );

    const html = scriptsFrom(container)[0].innerHTML;

    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");
    // E segue sendo JSON válido com o valor original preservado.
    expect(JSON.parse(html).name).toBe("</script><img onerror=alert(1)>");
  });

  it("não injeta elemento nenhum além dos scripts", () => {
    const { container } = render(<JsonLd data={{ "@type": "WebSite" }} />);
    expect(container.querySelectorAll("*")).toHaveLength(1);
  });
});
