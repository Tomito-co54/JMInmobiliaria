import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  garagesOf,
  listingIdsFromPage,
  mapPlace,
  mapType,
  normalizeListing,
  parseListingPage,
  parsePrice,
  scrubContact,
  sentenceCase,
  yearBuiltOf,
} from "./buscadorprop";

// The shape of a BuscadorProp property page, trimmed to what the reader uses.
const PAGE = `
<h1>DEPARTAMENTO DE 3 AMBIENTES C&Eacute;NTRICO</h1>
<p class="direccion"> <img alt="direccion"> Jorge San Pellerano 700, Adrogu&eacute; </p>
<div class="precio-header"> <h2>Venta</h2> <div class="rebajado-tag"><p>Precio rebajado</p></div> </div>
<div class="precio__container"> <p class="actual">USD 252.500</p> </div>
<img src="https://staticbp.com/img/prop_new_b/710/00710404-02.jpg?t=1">
<img src="https://staticbp.com/img/prop_new_b/710/00710404-01.jpg?t=1">
<img src="https://staticbp.com/img/prop_new_b/710/00710404-01.jpg?t=1">
<img src="https://staticbp.com/img/prop_new_b/999/00999999-01.jpg">
<section id="caracteristicas" class="m-ficha"><ul>
  <li> Departamentos </li><li> 3 Ambientes </li><li> 2 baños </li><li> 2 Dormitorios </li>
  <li><span>Sup. cubierta 94m<sup>2</sup></span></li><li><span>Sup. total 108m<sup>2</sup></span></li>
  <li> Antigüedad 15 años </li>
</ul></section>
<section id="acercade" class="m-ficha"><h2>Acerca de la propiedad</h2>
  EN PLENO CENTRO DE ADROGU&Eacute;.<br />\r\n<br />\r\n<br />AMPLIO BALC&Oacute;N. CONSULTE AL 11 4140-2704.
</section>
<section id="comodidades" class="m-ficha"><h2>Comodidades</h2><ul><li> Con balcon </li><li> 2 cocheras </li></ul></section>
<script type="application/ld+json">{ "geo": { "latitude": "-34.7996", "longitude": "-58.3907" } }</script>
`;

describe("listingIdsFromPage", () => {
  it("reads ids from the infinite-scroll JSON and from plain HTML, once each, in order", () => {
    const json = JSON.stringify([
      '<a href="/propiedad/569643" class="prop-card">',
      '<a href="/propiedad/569643">again</a><a href="/propiedad/710404">',
    ]);
    expect(listingIdsFromPage(json)).toEqual(["569643", "710404"]);
    expect(listingIdsFromPage('<a href="https://x.com.ar/propiedad/577373">')).toEqual(["577373"]);
  });

  it("reads the empty page past the end as no ids", () => {
    expect(listingIdsFromPage("[]")).toEqual([]);
  });
});

describe("parseListingPage", () => {
  const raw = parseListingPage(PAGE, "710404");

  it("splits the address into street and localidad", () => {
    expect(raw.street).toBe("Jorge San Pellerano 700");
    expect(raw.localidadRaw).toBe("Adrogué");
  });

  it("keeps the gallery in its numbered order, once per photo, and only this property's", () => {
    expect(raw.photos).toEqual([
      "https://staticbp.com/img/prop_new_b/710/00710404-01.jpg?t=1",
      "https://staticbp.com/img/prop_new_b/710/00710404-02.jpg?t=1",
    ]);
  });

  it("reads the type, the characteristics, the coordinates and the price cut", () => {
    expect(raw.typeRaw).toBe("Departamentos");
    expect(raw.characteristics).toContain("3 Ambientes");
    expect(raw.lat).toBeCloseTo(-34.7996);
    expect(raw.reduced).toBe(true);
    expect(raw.descriptionHtml).not.toContain("Acerca de");
  });
});

describe("normalizeListing", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const { row, errors } = normalizeListing(parseListingPage(PAGE, "710404"), ["Adrogué"], now);

  it("maps it onto the site's vocabulary", () => {
    expect(errors).toEqual([]);
    expect(row).toMatchObject({
      address: "Jorge San Pellerano 700",
      localidad: "Adrogué",
      partido: "Almirante Brown",
      property_type: "departamento",
      operation_type: "venta",
      price_amount: 252500,
      price_currency: "USD",
      rooms: 3,
      bedrooms: 2,
      bathrooms: 2,
      garages: 2,
      surface_covered: 94,
      surface_total: 108,
      year_built: 2011,
      // The fixture is marked "Precio rebajado".
      tags: ["oferta"],
    });
  });

  it("writes the description in sentences, without the partner's phone", () => {
    expect(row?.description).toContain("En pleno centro de Adrogué.");
    expect(row?.description).toContain("Amplio balcón.");
    expect(row?.description).not.toMatch(/4140/);
    expect(row?.description).not.toMatch(/\n{3,}/);
  });

  it("leaves out a listing it cannot place, rather than publishing it wrong", () => {
    const odd = parseListingPage(PAGE.replace("Adrogu&eacute;", "Mar del Plata"), "710404");
    const n = normalizeListing(odd, [], now);
    expect(n.row).toBeNull();
    expect(n.errors[0]).toMatch(/localidad desconocida/);
  });
});

describe("the small readers", () => {
  it("maps BuscadorProp's types, and nothing it does not know", () => {
    expect(mapType("Lotes / Terrenos")).toBe("lote");
    expect(mapType("Dúplex/Tríplex")).toBe("departamento");
    expect(mapType("Depósitos / Galpones")).toBe("deposito");
    expect(mapType("Galpones Industriales")).toBe("galpon");
    expect(mapType("Castillos")).toBeNull();
  });

  it("resolves the places the source spells its own way", () => {
    expect(mapPlace("Barrio San José")).toEqual({ localidad: "San José", partido: "Almirante Brown" });
    expect(mapPlace("Lomas De Zamora")).toEqual({ localidad: "Lomas de Zamora", partido: "Lomas de Zamora" });
    expect(mapPlace("Guernica")).toEqual({ localidad: "Guernica", partido: "Presidente Perón" });
  });

  it("reads dollars and pesos", () => {
    expect(parsePrice("USD 390.000")).toEqual({ amount: 390000, currency: "USD" });
    expect(parsePrice("$ 450.000")).toEqual({ amount: 450000, currency: "ARS" });
    expect(parsePrice("Consultar")).toBeNull();
  });

  it("reads the age, and a building under construction as new with no year", () => {
    const now = new Date("2026-09-23");
    expect(yearBuiltOf(["Antigüedad A estrenar"], now)).toEqual({ year: 2026, brandNew: true });
    expect(yearBuiltOf(["Antigüedad En construcción"], now)).toEqual({ year: null, brandNew: true });
    expect(yearBuiltOf(["Antigüedad 1 año"], now)).toEqual({ year: 2025, brandNew: false });
  });

  it("reads garages from the amenities", () => {
    expect(garagesOf(["Con patio", "cochera"])).toBe(1);
    expect(garagesOf(["10 cocheras"])).toBe(10);
    expect(garagesOf(["Sin cochera"])).toBe(0);
    expect(garagesOf(["Con patio"])).toBeNull();
  });

  it("drops the sentence that carries a contact, not just the number", () => {
    expect(scrubContact("Lote en esquina. Llamar al 11 4140-2704. Escritura al día.")).toBe(
      "Lote en esquina. Escritura al día.",
    );
    expect(scrubContact("Ver www.laudaniycia.com.ar")).toBe("");
  });

  it("turns shouting into sentences and leaves normal text alone", () => {
    expect(sentenceCase("CASA EN ADROGUÉ. MUY LUMINOSA", ["Adrogué"])).toBe("Casa en Adrogué. Muy luminosa");
    expect(sentenceCase("Casa en Adrogué, muy luminosa")).toBe("Casa en Adrogué, muy luminosa");
  });

  it("decodes the double-encoded entities of the JSON-LD", () => {
    expect(decodeEntities("inversi&amp;oacute;n")).toBe("inversión");
  });
});

describe("an address that names its own localidad", () => {
  it("trusts the localidad written in the address over the listing's filing, and says so", () => {
    const page = PAGE.replace(
      "Jorge San Pellerano 700, Adrogu&eacute;",
      "San Rafael 731, Turdera, Lomas De Zamora, Adrogu&eacute;",
    );
    const n = normalizeListing(parseListingPage(page, "710404"), [], new Date("2026-09-23"));
    expect(n.row).toMatchObject({ address: "San Rafael 731", localidad: "Turdera", partido: "Lomas de Zamora" });
    expect(n.warnings.join(" ")).toMatch(/Turdera.*Adrogué/);
  });
});
