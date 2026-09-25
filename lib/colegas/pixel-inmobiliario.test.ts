import { describe, expect, it } from "vitest";
import { COLEGAS } from "./index";
import { listingEntriesFromPage, mapPixelType, normalizeAd, parseAdPage, placeOf } from "./pixel-inmobiliario";

const WORDS = COLEGAS.martino_villa_del_dique.scrubWords;

// A Pixel Inmobiliario property page, trimmed to what the reader uses.
const PAGE = `
<meta property="og:image" content="https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/thumbs/R1-1jpg.jpeg">
<div class="sale bg-pixel" style="color:white;">
  <div>En Venta</div>
</div>
<div class="icon_default">
  <h5 class="mt_10 color-secondery">CASA IMPERDIBLE!</h5>
  <h6>C&oacute;digo: 215470</h6>
  <p><i class="fa fa-map-marker" aria-hidden="true"></i> Av. de los Navegantes, Villa del Dique, Córdoba, Argentina, Villa Del Dique, Córdoba, Argentina.
  </p>
</div>
<div class="property-price">
  <h5 class="color-secondery">
    <p class="sale bg-pixel" style="color:white">
      USD55.000
    </p>
  </h5>
  <div class="amount">
    Casa
  </div>
</div>
<div id="gallery-1">
  <img src="https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/R1-1jpg.jpeg" alt="CASA IMPERDIBLE"/>
  <img src="https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/R1-2jpg.jpeg" alt="CASA IMPERDIBLE"/>
  <img src="https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/R1-1jpg.jpeg" alt="again"/>
</div>
<button type="button" class="btn btn-default"><p class="pt-2 mb-0"><i class="fas fa-bed"></i></p>
  Dormitorios
  <span class="number">
    2
  </span>
</button>
<button type="button" class="btn btn-default"><p class="pt-2 mb-0"><i></i></p>
  Ambientes
  <span class="number">3</span>
</button>
<button type="button" class="btn btn-default"><p class="pt-2 mb-0"><i></i></p>
  Baños
  <span class="number">1</span>
</button>
<button type="button" class="btn btn-default"><p class="pt-2 mb-0"><i></i></p>
  M² Totales
  <span class="number">400</span>
</button>
<button type="button" class="btn btn-default"><p class="pt-2 mb-0"><i></i></p>
  M² Cubiertos
  <span class="number">100</span>
</button>
<h4 class="color-secondery mt_30 mb_30">Descripción de la Propiedad</h4>
<p>Disfrutá de un entorno único con vista a las sierras<br />
<br />
Dos dormitorios<br />
Consultanos para más información y coordiná tu visita<br />
<br />
JOSÉ MARTINO INMOBILIARIA<br />
El nombre que marca la diferencia</p>
<ul><li class="color-secondery"><i class="fa fa-check"></i> Parrilla </li></ul>
<ul><li class="color-secondery"><i class="fa fa-check"></i> Cochera </li></ul>
<ul><li class="color-secondery"><i class="fa fa-check"></i> Antigüedad 20 años </li></ul>
<iframe src="https://www.youtube.com/embed/F19_teLqNY4?feature=share"></iframe>
<iframe src="https://www.google.com/maps/embed/v1/place?key=K&q=-32.1717562, -64.4500085"></iframe>
`;

const LISTING = `
<div class="thumbnail_one mb_30 color-secondery">
  <a href="https://www.josemartinoinmobiliaria.com.ar/ad/casa-imperdible">
    <img src="x.jpeg" alt="CASA IMPERDIBLE">
  </a>
  <h5><a href="https://www.josemartinoinmobiliaria.com.ar/ad/casa-imperdible" title="CASA IMPERDIBLE">CASA IMPERDIBLE</a></h5>
  <h7>C&oacute;digo: 215470</h7>
</div>
<div class="thumbnail_one mb_30 color-secondery">
  <a href="https://www.josemartinoinmobiliaria.com.ar/ad/casa-en-villa-rumipal">
    <img src="y.jpeg" alt="CASA EN VILLA RUMIPAL">
    <div class="Featured">Vendido</div>
  </a>
  <h7>C&oacute;digo: 177866</h7>
</div>
`;

describe("listingEntriesFromPage", () => {
  it("reads the code, the url and the sold ribbon of each card, and nothing past the end", () => {
    expect(listingEntriesFromPage(LISTING)).toEqual([
      { code: "215470", url: "https://www.josemartinoinmobiliaria.com.ar/ad/casa-imperdible", sold: false },
      { code: "177866", url: "https://www.josemartinoinmobiliaria.com.ar/ad/casa-en-villa-rumipal", sold: true },
    ]);
    expect(listingEntriesFromPage("<h1>Propiedad no encontrada por sus criterios de búsqueda</h1>")).toEqual([]);
  });
});

describe("parseAdPage", () => {
  const raw = parseAdPage(PAGE, "215470");

  it("reads the state, the title, the price, the type and the counters", () => {
    expect(raw.stateRaw).toBe("En Venta");
    expect(raw.title).toBe("CASA IMPERDIBLE!");
    expect(raw.priceRaw).toBe("USD55.000");
    expect(raw.typeRaw).toBe("Casa");
    expect(raw.counters).toEqual({ Dormitorios: 2, Ambientes: 3, Baños: 1, "M² Totales": 400, "M² Cubiertos": 100 });
  });

  it("keeps the full-size gallery once per photo, in order, and skips the thumbs", () => {
    expect(raw.photos).toEqual([
      "https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/R1-1jpg.jpeg",
      "https://www.josemartinoinmobiliaria.com.ar/uploads/josemartinoinmobiliaria/images/R1-2jpg.jpeg",
    ]);
  });

  it("reads the coordinates from the map embed, the amenities and the video", () => {
    expect(raw.lat).toBeCloseTo(-32.1717562);
    expect(raw.lng).toBeCloseTo(-64.4500085);
    expect(raw.amenities).toEqual(["Parrilla", "Cochera", "Antigüedad 20 años"]);
    expect(raw.videoUrl).toBe("https://www.youtube.com/embed/F19_teLqNY4");
  });
});

describe("placeOf", () => {
  it("finds the town among the repeated province and country, and a street when there is one", () => {
    expect(placeOf(["Villa del Dique", "Córdoba", "Argentina", "Villa Del Dique", "Córdoba", "Argentina"])).toEqual({
      street: null,
      localidad: "Villa del Dique",
    });
    expect(placeOf(["Av. de los Navegantes", "Villa del Dique", "Córdoba", "Argentina"])).toEqual({
      street: "Av. de los Navegantes",
      localidad: "Villa del Dique",
    });
    expect(placeOf(["X5862 Villa del Dique", "Córdoba", "Argentina"])).toEqual({ street: null, localidad: "Villa del Dique" });
    expect(placeOf(["VILLA DEL DIQUE", "Villa Del Dique", "Córdoba", "Argentina"]).street).toBeNull();
    expect(placeOf(["Villa Rumipal", "Córdoba", "Argentina"]).localidad).toBe("Villa Rumipal");
  });
});

describe("mapPixelType", () => {
  it("translates what it knows and refuses what it does not", () => {
    expect(mapPixelType("Terreno")).toBe("lote");
    expect(mapPixelType("Casa con Terreno")).toBe("casa");
    expect(mapPixelType("Complejo")).toBeNull();
    expect(mapPixelType("Inmueble en block")).toBeNull();
  });
});

describe("normalizeAd", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  const { row, errors, sold } = normalizeAd(parseAdPage(PAGE, "215470"), ["Villa del Dique"], now, WORDS);

  it("builds the row: Calamuchita as the partido, the counters as fields, the age as a year", () => {
    expect(errors).toEqual([]);
    expect(sold).toBe(false);
    expect(row).toMatchObject({
      external_id: "215470",
      address: "Av. de los Navegantes",
      localidad: "Villa del Dique",
      partido: "Calamuchita",
      property_type: "casa",
      operation_type: "venta",
      price_amount: 55000,
      price_currency: "USD",
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      garages: 1,
      surface_total: 400,
      surface_covered: 100,
      year_built: 2006,
      tags: [],
    });
  });

  it("drops the agency's sign-off and its call to contact them, and the shouting from the title", () => {
    expect(row!.description).toBe(
      "Casa imperdible\n\nDisfrutá de un entorno único con vista a las sierras\n\nDos dormitorios",
    );
  });

  it("reads a sold listing as sold, and still as a sale", () => {
    const n = normalizeAd(parseAdPage(PAGE.replace("<div>En Venta</div>", "<div>Vendido</div>"), "1"), [], now);
    expect(n.sold).toBe(true);
    expect(n.row?.operation_type).toBe("venta");
  });

  it("publishes a peso price that cannot be a sale price as no price, and says so", () => {
    const n = normalizeAd(parseAdPage(PAGE.replace("USD55.000", "$13.000"), "1"), [], now);
    expect(n.row?.price_amount).toBeNull();
    expect(n.warnings.some((w) => w.includes("inverosímil"))).toBe(true);
  });

  it("leaves out a surface that cannot be one, and says so", () => {
    const n = normalizeAd(parseAdPage(PAGE.replace('<span class="number">400</span>', '<span class="number">3</span>'), "1"), [], now);
    expect(n.row?.surface_total).toBeNull();
    expect(n.row?.surface_covered).toBe(100);
    expect(n.warnings.some((w) => w.includes("superficie total inverosímil"))).toBe(true);
  });

  it("refuses a type it cannot translate and a place it does not know", () => {
    expect(normalizeAd(parseAdPage(PAGE.replace(">\n    Casa\n", ">\n    Complejo\n"), "1"), [], now).errors).toEqual([
      'tipo desconocido: "Complejo"',
    ]);
    const elsewhere = PAGE.replace("Av. de los Navegantes, Villa del Dique, Córdoba, Argentina, Villa Del Dique", "Alta Gracia");
    expect(normalizeAd(parseAdPage(elsewhere, "1"), [], now).errors[0]).toMatch(/localidad desconocida/);
  });
});
