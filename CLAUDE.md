# CLAUDE.md

> Configuration and rules for Claude Code working on this project.
> Read this file at the start of every session.

---

## Project identity

**Name:** Jotaeme — Inmobiliaria (personal real-estate agency website).

**One-liner:** Mi sitio de inmobiliaria personal. Catálogo curado de
**mis** propiedades, cargadas a mano. El scraping del upstream se
preserva para **inteligencia de mercado privada** (dashboard interno),
nunca para alimentar el catálogo público.

**Único usuario operativo:** vos (el martillero/corredor admin). No hay
registro público de usuarios — el sitio sirve dos audiencias:

- **Visitantes anónimos:** ven solo tus propiedades publicadas en el
  catálogo público.
- **Admin (vos):** entrás a `/admin`, cargás propiedades, mirás stats de
  mercado de las scrapeadas, gestionás el ciclo borrador → publicada →
  vendida.

**Modelo de negocio (nuevo):** no es B2C de compradores; es la web
operativa de **tu** inmobiliaria. Captás interesados sobre tu propio
inventario. Las scrapeadas viven en la base solo para que vos analices
el mercado.

---

## Origen del proyecto y pivote

Este repo (`Tomito-co54/JMInmobiliaria`) es un fork de
`Tomito-co54/Jotaeme`, un portal agregador buyer-facing que llegó a MVP
feature-complete (blocks 1–7) en la upstream. La sincronización inicial
trajo HEAD `e64b474` del upstream.

**Cambio conceptual al hacer el fork:**

- El catálogo público dejó de mostrar inventario agregado (zonaprop +
  trezza) y ahora **filtra** por `source IN ('owner_direct','agency')`
  AND `listing_status = 'publicada'`.
- El registro público fue eliminado (no `/register`, no Google OAuth, no
  CTAs "Crear cuenta" / "Empezar gratis"). Email + password por
  `/login` para que entres vos solamente.
- El scraping **NO se desactivó**. Los scrapers, ARBA WFS, geocoding,
  dedup, quality score — todo sigue funcionando. La data scrapeada queda
  en la misma tabla `properties` pero con `source != owner_direct/agency`
  y `listing_status = NULL`, lo que la excluye del catálogo público.
- Las propiedades propias se cargan desde `/admin/properties` mediante
  un cargador dedicado (cabeceada de partido + partida, ARBA WFS busca
  por `pda='...'` sin geocoding, fotos en bucket propio Supabase Storage).

---

## Current progress

**Status (1-sep-2026):** Deployado y funcionando en producción, con
auto-deploy desde `main`. **375 tests passing** (+7 skipped a propósito),
`npm run build` verde, 41 rutas.

La cara pública se reordenó entera. El catálogo dejó de ser la última sección
de la landing y pasó a `/propiedades`; apareció `/edificios`, que muestra las
unidades agrupadas por parcela; y en la ficha el **Quality Score le dejó el
lugar al match**, que hasta ahora era invisible para todo el mundo porque
exigía una cuenta que nadie puede crear. El 1-sep **ARBA salió del eje del
discurso**, el match **se abre desde la barra de pestañas** y el sitio recibió
una **pasada de movimiento** — entre páginas, en el cambio de tema y en el
panel. El 1-sep también se auditó la performance y **se resolvió la lentitud** que
Tomy venía notando: no era código, era geografía.

Verificar los números de este documento contra la base destapó además una
segunda desactivación masiva (429 → 45 activas), que quedó **diagnosticada,
arreglada y reparada** el mismo día — ver *Volvió a pasar el 1-sep* más abajo.

Lo que queda es de contenido:


1. **El catálogo tiene 4 propiedades publicadas** — las cuatro unidades de
   2 ambientes de Belgrano 1287. Faltan el loft dúplex y el 3 ambientes del
   mismo edificio, bloqueados solo por fotos.
2. **La protagonista de la portada es Belgrano 1287 2°A** (marcada el 1-sep a
   pedido de Tomy). `getFeaturedProperty` rota entre las marcadas, así que con
   una sola marcada la portada muestra siempre esa. Antes no había ninguna y
   la landing quedaba sin una sola propiedad a la vista.
3. **El scraping corre a mano** — pero ojo, ver abajo: **GitHub Actions
   también corre solo desde el 27-ago** y escribe en la misma base.

### Mobile aguanta, y ahora está medido

Tomy lo probó en el teléfono el 1-sep-2026 y **funciona bien**. Queda dicho
el alcance de esa prueba, que es parte del dato: cinco minutos, a simple
vista, sin recorrer todos los flujos.

Sobre esa impresión hay una barrida medida a 375×667 en las cuatro surfaces
públicas (landing, `/propiedades`, `/edificios`, `/p/[id]`), y confirma lo
más importante:

- **Cero overflow horizontal en las cuatro.** Es la falla mobile más común y
  la más fea —la página que se corre de costado— y no aparece en ninguna. El
  mobile-first del principio 1 no es una aspiración del documento: se sostiene
  en la medición.
- **Los controles que importan rozan o superan los 44px** — 43 a 56 medidos:
  los chips del match y el CTA de WhatsApp dan 43, el disparador del match en
  el header 44, la portada del edificio 56.
- **El peso está muy por debajo del techo.** Las páginas de listado cargan
  262 kB de First Load JS contra un presupuesto de 500 kB.
- **Las animaciones no cuestan scroll**: `transform`/`opacity` e
  IntersectionObserver, **sin librería de animación** — `package.json` no
  tiene framer-motion ni equivalente, todo sale de `hooks/use-in-view.ts` y
  de CSS. Y `prefers-reduced-motion` se respeta de verdad: el hook lo
  consulta y los `motion-safe:` están puestos, así que un teléfono con
  "reducir movimiento" prendido recibe la página quieta.

**Lo que la barrida sí encontró, y conviene no perder de vista:** la regla de
44px se cumple en los controles protagonistas y **no** en los secundarios.
Medido:

| Elemento | Alto | Dónde |
|---|---|---|
| Links del nav (`Propiedades`, `Edificios`) | **28px** | `PublicHeader` |
| CTA `Ver propiedades` del hero | **35px** | `HomeHero` |
| Link del logo | **24px** | `PublicHeader` |
| Términos del glosario (`Parcela identificada`…) | **19px** | `/p/[id]` |
| `Ver más`, `Volver`, `Ajustar` | 27-28px | `/p/[id]` |

Ninguno rompe nada y por eso la prueba a mano no los delata — se tocan igual,
solo que con menos margen de error del que el propio documento se exige.
Subirlos es una decisión visual (el header se pondría más alto justo después
de una pelea por su ancho), así que está en el Build map y no se tocó de
prendido. Los de 19px son texto inline con tooltip, no botones, y valen menos
que los otros.

### La lentitud era geografía (auditoría del 1-sep)

Tomy reportaba que cambiar de pestaña y abrir una propiedad tardaban. **No era
código, era distancia**, y la auditoría lo dejó medido.

**La base está en `sa-east-1` (San Pablo)** — lo dice el host del pooler,
`aws-1-sa-east-1.pooler.supabase.com`. **La función corría en `iad1`
(Washington)**, que es el default de Vercel y nadie eligió: el `X-Vercel-Id`
decía `gru1::iad1`, o sea el pedido entraba por San Pablo y se ejecutaba en
Washington. Cada consulta cruzaba el continente.

La medición que lo aisló usa una ruta dinámica sin consultas como testigo:

| Ruta | Qué hace | TTFB antes |
|---|---|---|
| `/guia-de-compra` | estática, desde CDN | 0,35s |
| `/pago/exito` | **dinámica, cero consultas** | 0,39s |
| `/propiedades` | dinámica, 2 consultas | 1,13s |

La ubicación de la función no costaba casi nada; **cada consulta costaba
~375ms**. Y no eran bytes: el payload de una navegación es de 5 a 8 kB.

**Lo que se hizo, en dos commits separados para poder atribuir cada mejora:**

1. `b98a5f3` — código: el catálogo del header se cachea entre requests
   (`unstable_cache` + tag), el header deja de esperar en fila (`Promise.all`),
   y los íconos de Leaflet dejan de venir de `unpkg`.
2. `c0b9d1f` — `vercel.json` con `"regions": ["gru1"]`. San Pablo, la misma
   ciudad que la base. Una línea, y se revierte borrando el archivo.

**Resultado, medido en producción:**

| Qué | Antes | Después |
|---|---|---|
| TTFB `/propiedades` | mediana 1,19s | **mediana 0,52s** |
| TTFB `/edificios` | 1,23–2,54s | **mediana 0,34s** |
| Navegación pestaña ↔ pestaña (RSC) | 543–1093ms | **164–282ms** |
| Abrir una propiedad (RSC) | 990–1283ms | **247–508ms** |

`/edificios` quedó en 0,34s contra una línea base estática de 0,35s: las
consultas dejaron de costar.

**Recursos: sanos, no hay nada que arreglar.** Heap 10–13 MB contra un límite
de 4.096; 428 nodos DOM que vuelven **exactamente** a 428 tras seis
navegaciones (no hay fugas); 787 kB transferidos en una sesión entera.

**Lo que queda sin hacer y por qué:** `getUser()` se llama dos veces por
request (el middleware y después `PublicHeader`). Se puede pasar el resultado
del middleware por un header interno, pero eso abre una superficie de spoofing
que hay que cerrar a mano, y con la región arreglada el viaje ya es barato.
Anotado, no hecho. Igual `getPropertiesByProximity` sigue con `select("*")` y
trayendo todas las filas para ordenarlas en JS: con cuatro propiedades no es
un problema y el módulo ya documenta que pasa a RPC cuando crezca.

**Trampa de medición, la misma de siempre:** en una pestaña oculta `setTimeout`
se estrangula a ~1s, así que cualquier cronómetro propio devuelve ~1000ms para
todo. Las mediciones que valen son las del **navegador** (`PerformanceResourceTiming`)
y las de **curl**. Ver también la nota al pie de *Cómo se mueve el sitio*.

### Cómo se mueve el sitio

Todo el movimiento es CSS sobre `transform`/`opacity` más IntersectionObserver.
**No hay librería de animación** y no hace falta agregar una. El vocabulario es
corto y conviene reusarlo antes de inventar:

| Pieza | Qué hace | Dónde |
|---|---|---|
| `Reveal` | Entra al entrar en viewport. 850ms, con dirección | `components/shared/Reveal.tsx` |
| `.page-enter` | Entrada de página, 380ms con pico y asentamiento | `globals.css` + los dos `template.tsx` |
| `NavPending` | Barra dorada bajo el link tocado mientras se busca la página | `components/shared/NavPending.tsx` |
| `body[data-navigating]` | La página que se va se recuesta | `globals.css`, lo prenden los NavPending |
| `theme-sweep` | El tema nuevo entra como círculo desde el botón | `globals.css` + `theme-toggle.tsx` |
| `.home-rise` / `-hero` | Cascada de entrada del hero | `globals.css` |

Tres reglas que ya costaron algo:

- **`Reveal` usa `threshold: 0`, y no se toca.** El umbral por fracción del
  propio elemento es **imposible de satisfacer** para algo más alto que ~3
  viewports: el ratio es área visible sobre área total, así que el techo es
  `viewport / alto`. La etapa 4 de la guía mide 2463px contra 667 de un
  teléfono — techo 0,247 contra un umbral de 0,3 — y se habría quedado en
  `opacity: 0` **para siempre**. Nada explota; una sección entera desaparece.
- **El estado escondido va detrás de `motion-safe:`, no solo la transición.**
  Si el `opacity-0` inicial no está gateado, quien pidió menos movimiento no
  ve la página: queda invisible en vez de simplemente no animada.
- **Un keyframe que escribe `transform` pisa el `skew`/`rotate` de las
  clases.** `transform` es una sola propiedad: si la animación dice
  `translateX(...)`, la inclinación puesta con `-skew-x-*` deja de existir
  mientras la animación corre — o sea justo cuando se ve. Va adentro del
  keyframe: `translateX(...) skewX(...)`.
- **El JSX que cruza de un Server Component a uno de cliente como prop
  necesita `key`.** Se serializa y React lo reconcilia en posición de lista,
  así que avisa por consola aunque no haya ningún `.map()` a la vista. El
  mensaje engaña: nombra al componente que lo **creó**, no al que lo
  renderiza.
- **Las promesas de View Transitions rechazan al abortar**, y abortar es
  ordinario (la pestaña se va al fondo, el update pasa el plazo, empieza otra
  transición). `.finally()` re-lanza; hay que manejarlas con
  `then(done, done)` o queda un chorro de rechazos sin manejar en Sentry por
  algo que ni siquiera es una falla.

Y una nota de método que se repitió toda la sesión, en tres formas: **el panel
del navegador, cuando está oculto, no corre `requestAnimationFrame`, no avanza
transiciones CSS y no entrega `IntersectionObserver`.** Todo se ve congelado o
roto por igual. Medir movimiento ahí adentro no prueba nada — hay que confirmar
`document.visibilityState` antes de creerle a una medición de animación.

**Y los screenshots mienten por lo mismo, que es peor**, porque parecen
evidencia. Con el observer parado, todo lo que entra por `Reveal` o por un
`inView` queda en `opacity: 0`: la captura muestra la página sin su contenido.
El 1-sep eso hizo que dos reportes visuales de Tomy se contestaran con
mediciones en vez de con lo que se ve, y que un bug de superficie a la vista
(239 m² en un departamento de 80) tardara dos rondas en aparecer.

El truco para verlo de verdad, cuando haga falta: forzar el estado final a
mano antes de la captura.

```js
el.style.cssText = "opacity:1;transform:none;transition:none";
```

Si algo es visual y no se puede forzar, **la verificación es que lo mire
Tomy** — decirlo, y no pasar una medición numérica por una confirmación
visual.


**Recordarle correr el pipeline** cada vez que retome trabajo.

### Hitos (este fork)

| Fase | Qué entregó | Commit |
|---|---|---|
| Fork inicial | `e64b474` (sync con upstream Jotaeme) | `e64b474` |
| Fase 0 — Separación + Limpieza | Filtros públicos `source` + `listing_status`; baja del registro público; fix flujo reset password vía /auth/callback; SMTP de Supabase via Resend | `ab10631` `c8d6fe1` `361f471` `d189251` |
| Fase 1 — Cargador de propiedades | Migraciones 00011 (listing_status + tpa + CHECK constraint) + 00012 (bucket property-photos); ARBA por partida (getParcelByPartida + bridge); UI single-screen editor con fotos drag&drop; 28 tests nuevos | `434f015` `b2c20b0` `f68c6a1` `e86f735` |
| Fase 1.B — Polish del cargador | Filtros estado split (Gestión + Mercado + Origen); autosave silencioso por sección; inline validation de partida; "Re-consultar ARBA"; preview admin de borradores con banner | `927f50e` |
| Fase 2 — Rediseño de la home pública | Migración 00013 (`is_featured` + toggle ★ en admin, CHECK owner-only); `HomeHero` (cascade stagger 120ms, eyebrow dorado, Fraunces italic); `HomeProtagonist` (§2.6: rota 1/día entre `is_featured=true` publicadas, foto que sobresale del cuadrante, medallón de Quality Score); `HomeGuarantees` + `HomeGuaranteesClient` (Tono 1 ARBA sobrio con polígono que se dibuja; Tono 2 anillo Score + Match reactivo + secuencia de 3 pasos, hook propio `use-in-view.ts` sin librería); `HomeCatalog` + `PropertyPremiumCard` (cards editoriales grandes, foto flip izq/der, la destacada se excluye del catálogo). Rama `rediseno-home` mergeada a `main`. | `29609ad` `b93ab09` `ae16d81` `a61ab95` `56f6586` `36c39a3` (merge) |
| Fase 3 — Dashboard de mercado v1 | `/admin/mercado`: 5 módulos server-side (KPIs de inventario scrapeado, USD/m² por tipo con media/mediana/desvío, feed de cambios recientes desde `property_history`, distribución de Quality Score, tabla-explorador filtrable). Sin dependencias nuevas. | `781ae8f` `c025b72` (merge) |
| Fase 4 — Rediseño de `/p/[id]` | Layout editorial 2-col (panel de datos sticky scrolleable + foto full-bleed), fix `USD/m²` que usaba `surface_arba` en vez de la declarada. | `27ca7a3` `56569dc` `6877ab3` (merge) |
| Fase 5 — Dark mode + polish | Dark mode slate frío (no navy de marca — evita chillones); tintes claros arreglados en sheet de score y toast de favorito guardado; headline real "en construcción" reemplazado; polish general. | `54f9a27` `a52364f` `f601342` |
| Fase 6 — Animaciones scroll-triggered | Pasada de movimiento en la home (Reveal + cascades) — la home "se siente viva" sin librería de animación. | `79bbc31` `a300adf` (merge) |
| Fase 7 — Contacto / leads (canal principal) | `lib/brand/contact.ts` (`WHATSAPP_NUMBER`, `whatsappLink`, `propertyLeadMessage`); `WhatsAppButton` como CTA primario en `/p/[id]` panel desktop + barra sticky mobile con mensaje que nombra la dirección; `WhatsAppFloat` en toda la home con mensaje genérico. | `25cd9f2` `2088d0b` `2eb6629` `2cf1e41` (merges) |
| Fase 8 — Limpieza legacy en cara pública | "Esconder no borrar": se quitó CTA "Ver todas" (iba a `/buscar` viejo); se quitó "Guardar (próximamente)" del top bar de `/p/[id]`; `ShareButton` funcional (Web Share API + fallback a copiar link). Rutas legacy (`/buscar`, `/favoritos`, `/onboarding`, `/mis-servicios`, `/busquedas`) siguen vivas — Tomy puede usarlas como herramienta personal, no las ve el visitante anónimo. | `bfb53be` `873b744` (merge) |
| Fase 9 — Auth legible en producción | Diagnóstico del supuesto "SMTP roto" (ver más abajo — no lo estaba). `lib/auth/callback-errors.ts` + `/auth/callback` que propaga el `error_code` de Supabase en vez de aplanar todo a un redirect mudo; `AuthCallbackNotice` que lee el fragmento `#error=...` desde el cliente (el servidor no puede verlo). `lib/auth/password-reset-errors.ts`: el form de recuperación deja de anunciar "Email enviado" cuando Supabase devolvió 429. Rate limit de auth subido de 2 a 30 mails/hora vía Management API. 10 tests nuevos. | `8d1710a` `3c2a143` `e22fe6e` (merges) |
| Fase 10 — Pipeline revivido | Diagnóstico de 90 corridas fallidas (los forks no heredan secrets de Actions). Cargados los dos secrets, el pipeline pasó la barrera pero seguía trayendo cero: Zonaprop sirve la **primera** navegación de una sesión de navegador y rechaza la segunda, sea cual sea la URL. Una sesión nueva por página → de 25 a **251 avisos por corrida**, sin proxy ni costo. `npm run pipeline` encadena los seis pasos. | `f957013` `caf8703` |
| Fase 11 — Integridad de la data de mercado | `crawl-completeness.ts`: la desactivación exige crawl exhaustivo — el tope de 50 "(testing)" daba por muertos a los que nunca miró, y había cientos de bajas inventadas. Limpieza de 317 bajas demostrablemente falsas (backup previo). Las reactivaciones se registran: el historial tenía 477 bajas y **cero** altas, así que `classifyChange` tenía una rama `relisted` que nunca podía dispararse. Migración 00014: precio al momento del cambio. | `8b0dd2e` `77d641f` `0c9fb47` |
| Fase 12 — El USD/m² dice la verdad | `effectiveSurface` prefería `surface_arba`, que es la superficie del **terreno**: para un departamento, el lote del edificio entero. Mediana de departamentos: 487 con parcela, **2.024** con superficie declarada. Y peor que el nivel era la mezcla — filas con dato catastral valuadas por m² de terreno y el resto por m² de propiedad, promediadas juntas. Filtro de plausibilidad 10–100.000 m². Mismo arreglo que `/p/[id]` recibió en junio (`56569dc`); este módulo era anterior. | `983badd` |
| Fase 13 — El centro de datos crece | `/admin/mercado/cambios`: los 231 eventos con filtros y orden por mayor baja, más media y mediana del movimiento porcentual recalculadas sobre lo visible. `/admin/mercado/mapa`: los 324 avisos geolocalizados, coloreados contra la mediana de su tipo, con selección de área por arrastre. Columnas USD/m² y antigüedad con escala de color en `/admin/properties`. | `67ac417` `6f58fb4` `d81046f` `3746c32` |
| Fase 14 — El mapa muestra la parcela | El polígono de ARBA no se dibujó **nunca**, por tres fallas encadenadas: `arba_lookups` es admin-read y la página pública lee con clave anónima; la vía por partida traía la geometría y la descartaba; y la página buscaba el lookup solo por lat/lng, clave que las propiedades propias nunca tienen. Migración 00015 + `arba/geometry.ts` (centro de parcela, que además da coordenadas más precisas que geocodificar). | `af8bb69` |
| Fase 15 — Navegación y tema | Toggle claro/oscuro en las seis cabeceras. No había forma de llegar a `/admin` clickeando: el CTA de la home iba a `/dashboard` y el menú listaba rutas legacy del portal de compradores. Dos logos que no volvían a la landing. | `0ef4681` `fe2ac1c` |
| Fase 16 — Mapas de verdad | El bloque de verificación de la home dibujaba un hexágono **inventado** (`"a believable parcel"`) al lado de un texto que promete "el polígono exacto de la parcela". Se reemplazó por la **zona de cobertura** sobre tiles reales de OSM: Lanús · Banfield · Lomas · Temperley, con los nombres de las localidades haciendo de etiqueta. `lib/map/tiles.ts` hace la aritmética de tiles sin Leaflet (~45 kB que no se pagan en la landing) y `projectToView` garantiza que polígono y mapa compartan proyección — en una versión intermedia no la compartían y la parcela aparecía cruzando una avenida. `lib/zona-sur/coverage.ts` + tests que verifican que el hexágono realmente contenga las localidades que nombra. | `086a284` `c651888` `8488028` `d92c899` |
| Fase 17 — El mapa tiene proveedor | Dos basemaps elegidos y descartados en un día, los dos por el mismo motivo: **devuelven HTTP 200 con la imagen de rechazo adentro**. CARTO estampa "API KEY REQUIRED" en diagonal; OSM, "Access blocked". Ninguna falla — las dos entregan un PNG del tamaño esperado, y solo se ven mirando los píxeles. Lo de OSM además era inevitable: sus servidores son de voluntarios y su política prohíbe exactamente esto, y no era solo la home (`/p/[id]` y `/admin/mercado/mapa` le pegaban directo). Ahora el basemap sale de `NEXT_PUBLIC_BASEMAP_URL` — MapTiler, estilo `landscape`, key con origins cerrados — y la atribución se deduce de la URL, que es un término de licencia y no un pie de foto. Aparecieron además dos bugs que los efectos visuales tapaban: **el mapa pintaba encima del polígono** (`absolute` sobre estático gana sin importar el DOM — todas las rondas anteriores de "el basemap le gana al hexágono" peleaban contra esto), y el marco cubría también el caption. Heptágono de 7 vértices, bordes nítidos con esquinas apenas redondeadas, match al 100 en azul de marca. | `45f9deb` `989be65` `ea712d5` (merge) |
| Fase 18 — Cargar sin navegador | `scripts/create-property.ts` + `lib/admin/property-import.ts`: una propiedad propia se carga desde un JSON, para que Claude la arme a partir de una descripción y una carpeta de fotos. Reutiliza las piezas del cargador web (schemas de Zod, ARBA por partida, Storage, scorer) — las Server Actions detrás de las que viven solo agregan el chequeo de sesión. Siempre entra como `borrador`; publicar es opt-in y pasa igual por `canPublishProperty`. Dos guardas contra la falla silenciosa, que es el riesgo propio de cargar desde archivo: **campo desconocido es error** (un `precio` en vez de `price_amount` dejaría la ficha sin precio y la corrida diría que salió bien) y **valor impuntable es error** (el schema de borrador nulifica lo que no entiende a propósito, porque el form guarda fichas a medias todo el tiempo — pero un archivo que *dice* "ochenta mil" está afirmando algo). | `e1b0ddd` `349e907` |
| Fase 19 — La primera carga real, y lo que destapó | Se cargaron las 4 unidades de 2 ambientes de Belgrano 1287 con el CLI. Cargar de verdad rompió cuatro cosas que con una sola propiedad no se veían: el cargador scoreaba sin `warmUp()` del cache de comparables (fallaba el sub-score de precio); la card del catálogo mostraba `surface_arba ?? surface_total`, o sea los 239 m² de la parcela sobre una unidad de 40; y **la coherencia ARBA marcaba en rojo al 79% de los departamentos por ser departamentos** — ver la sección propia más abajo. Se reescribió además la guía de compra: `ProcessStep` pasó de un `actions` único a `weHandle` + `youDo`, porque el contenido venía del portal de compradores del upstream y le decía al lector que fuera a sacar sus propios informes. | `e1b0ddd` `989be65` `ad5a878` |
| Fase 20 — Edificios, galería y ficha PDF | **Edificios por parcela** (`lib/buildings`): dos unidades con la misma `nomenclatura_catastral` están en el mismo edificio — es una definición, no una heurística. Sección "Otras unidades en este edificio" en `/p/[id]` y línea "4 unidades · desde USD 80.000" en la card. Todo derivado, sin tabla. **Galería**: el hero pintaba `photos[0]` y un "1/N" fijo, honesto cuando el scraper traía una foto y mentiroso con 18; swipe por `scroll-snap` de CSS. **Ficha PDF** en `/p/[id]/ficha.pdf`, reusando el renderer del Block 7. **Servicios pagos escondidos** detrás de `PAID_SERVICES_PUBLIC`. | `989be65` `ad5a878` |
| Fase 21 — El match funciona sin cuenta | El `MatchScoreCard` estaba en el panel de `/p/[id]` desde siempre, detrás de una condición que **ningún visitante podía cumplir**: `computeMatchScore` exige un `search_profile`, o sea usuario logueado con onboarding, y este sitio no tiene registro público. Ahora las preguntas se responden en la página y la cuenta se hace en el navegador (`lib/matching/preferences.ts` + `hooks/use-match-preferences.ts`, `sessionStorage`). El algoritmo no se tocó: era una función pura, solo faltaba de dónde sacar el perfil. El Quality Score salió del panel. En la home, el medidor del match dejó de ser inventado —tres toggles con pesos elegidos a mano— y pasa a correr el matcher real sobre el catálogo real. | `cc99fc7` |
| Fase 22 — Superficie y antigüedad | Migración 00016: `year_built`. No había de dónde sacar la antigüedad —las únicas fechas eran de publicación— y se guarda el **año**, no los años, porque una antigüedad se vuelve falsa sola cada enero. Pesos rebalanceados para hacerle lugar: `operation` 10 → 4 (el catálogo es solo venta, ese sub-score solo puede coincidir) y `type` 15 → 13. El Quality Score salió también de las cards. | `a262601` |
| Fase 23 — La cara pública se parte en tres | `/propiedades` (el catálogo, todo lo publicado) y `/edificios` (agrupado por parcela, con `buildingLabel`). La landing se queda con hero + protagonista + garantías. `PublicHeader` extraído en vez de escribir una séptima cabecera a mano. | `3078e66` `50a9bdd` `818ad4c` |
| Fase 24 — Acomodar la home | El bloque de Quality Score salió de la home (explicaba un número que el visitante ya no ve en ningún lado donde pueda actuar sobre él) y el copy del match bajó abajo del medidor. Presupuesto desde 5.000. RUMAH: enero 2026. `lib/buildings/photos.ts` para la foto del edificio. | `c6b490d` |
| Fase 25 — ARBA sale del eje | La cara pública lideraba con el nombre de una agencia de recaudación: el bloque de la home se titulaba "Verificación catastral" y explicaba qué es ARBA antes de decir para qué sirve; los chips decían "Verificada con ARBA". **Cambió cómo se cuenta, no qué se chequea** — la consulta a la parcela sigue corriendo y sigue habilitando el chip y el porcentaje. "Match ARBA exacto" pasó a "Ubicación confirmada en la parcela": nombraba la estrategia interna del lookup (`intersects`/`dwithin`), no lo que el dato significa. **ARBA queda solo en el catálogo de documentos de la guía**, donde "quién lo emite" es la pregunta que esa sección existe para contestar. Además la portada de cada edificio se abre en grande, reusando el visor de `/p/[id]`. | `3e822ef` |
| Fase 26 — El match en la barra | Los criterios vivían al pie de la landing y en ningún otro lado, así que quien entraba por `/propiedades` —la página que muestra las propiedades— no tenía forma de llegar a ellos. `MatchQuickFilter`: desplegable en el header con medidor, link al mejor match y las seis preguntas. No es segunda fuente de verdad — mismo `sessionStorage`, así que tocar un criterio arriba mueve el medidor de la home en el mismo frame. `bestMatch` salió a `lib/matching` (la cuenta vivía dentro del componente de la home) y la query del catálogo a `lib/db/properties` con `cache`. El header a 375px se resolvió **midiendo**: el isotipo es apaisado y a dos tercios de alto devuelve 17px, Panel queda como ícono debajo de `sm`. Salió el último resto público del Quality Score, en la guía. | `a4e9f2c` |
| Fase 27 — Transiciones y vida | Pasada de movimiento con la regla rectora de §2 como filtro. **Entre páginas ya no se corta en seco**: `(public)/template.tsx` — template y no layout, porque un layout persiste y un template se vuelve a montar, que es lo que le da entrada a la página nueva. **El click contesta**: `NavPending` (`useLinkStatus`) llena una barra bajo el link tocado, y la página que se va se recuesta (`body[data-navigating]`). No es un skeleton a propósito — Next mantiene la página actual hasta que la siguiente está lista, y para 300ms eso es mejor que vaciar. **El tema se barre desde el botón** (View Transitions API + `clip-path`, un solo paso compuesto; `disableTransitionOnChange` se queda). Movimiento nuevo en `/edificios` y en la guía, que es el proceso numerado de §2.3. El panel tiene su propio template, más quieto: 200ms, sin escala, sin reveals. | `52df257` `626c2da` |
| Fase 28 — Auditoría de performance | La lentitud al cambiar de pestaña resultó ser **geografía**: base en San Pablo, función en Washington, ~375ms por consulta cruzando el continente. Aislado con una ruta dinámica sin consultas como testigo. Dos commits: código (catálogo del header cacheado entre requests con tag, header en `Promise.all`, íconos de Leaflet traídos a `/public`) y región (`vercel.json` → `gru1`). TTFB de `/edificios` 1,23–2,54s → **0,34s**, contra una base estática de 0,35s. Abrir una propiedad 990–1283ms → **247–508ms**. De paso apareció un bug latente: publicar revalidaba solo `/`, de cuando la landing era el catálogo. Recursos: sin fugas, 428 nodos que vuelven a 428, heap de 11 MB. | `b98a5f3` `c0b9d1f` |
| Fase 29 — Se va lo que era del portal viejo | El Quality Score sale de los tres lugares que quedaban (medallón del hero de `/p/[id]`, ficha PDF, medallón de la protagonista) — sigue ordenando el catálogo y mandando en `/admin`. Y el **"Historial"** sale de la ficha: decía "Lo seguimos hace 3 días", que es lenguaje del portal agregador, donde seguir el aviso de **otro** en el tiempo era el producto. Acá la publicación es nuestra y contarle al comprador hace cuántos días la miramos no dice nada de la propiedad — con una ficha de tres días dice algo peor. `property_history` sigue alimentando `/admin/mercado`. De paso saca una consulta de hasta 50 filas de la página que más tarda en abrir. | `16ba93a` |
| Fase 30 — El sitio deja de hablar como auditor | Mismo problema que el historial, en otros dos bloques: **"el aviso"**, **"m² declarados"**, **"lo que pudimos verificar"**, **"superficie no verificable"**. Todo eso describe a alguien revisando la ficha de un tercero — que era el producto del upstream. Acá la publicación es nuestra: la partida la escribimos nosotros y lo que falta falta porque no lo cargamos. La home pasó a **"Publicamos los papeles, no solo las fotos"** y se cayó el **100%**, que en 100 repetía el título y por debajo lo contradecía (y se llevó dos consultas de conteo por carga). Barrido del resto: descripción vacía y tres definiciones del glosario. La guía **no** se toca: ahí "el aviso" son los del mercado. | `7438d6c` |
| Fase 31 — El lugar de la matrícula | Construido y **apagado**: `MARTILLERO.matricula` en `lib/brand/contact.ts` está en `""` y todo lo que la muestra pasa por `hasMatricula()`, así que hoy la home cierra en el párrafo sin ningún hueco. Se enciende escribiendo el número. Vacío y no un placeholder porque una matrícula impresa en una página pública es una afirmación sobre la situación de una persona ante un cuerpo profesional: inventada es peor que ausente, y un rótulo sin número anuncia que el sitio está sin terminar justo en el párrafo que pide que le crean. De paso quedaron con tests `whatsappLink` y `propertyLeadMessage`, que son el canal principal de contacto y no tenían ninguno. | `1f3f9b6` |
| Fase 32 — La guarda fallaba abierta | Segunda desactivación masiva, el 1-sep: 375 bajas con 11% de cobertura. La condición que existe para eso no frenó nada porque `activeCount === 0` **saltea el test entero**, y el baseline se leía con un `try/catch` que dejaba 0 al fallar — la lectura más frágil de la corrida era la que apagaba la guarda. Ahora "no sé" es `null` y rechaza; 0 sigue habilitando porque un baseline vacío de verdad no arriesga nada. Reparado con backup y en transacción: 357 revividas, 393 filas de historial inventado borradas, y los números volvieron exactos a los del 31-ago. | `fbcd559` |
| Fase 33 — Los botones y el brillo | Los 44px de §1 que faltaban: nav 28 → 44, CTA del hero 35 → 46, CTA de la protagonista 35 → 46 (este apareció midiendo, no estaba pedido). El header sube de 56 a 69px de alto — sube el alto, no el ancho, así que los 375px siguen sin overflow. El CTA de la portada lleva un brillo diagonal cada 7s, la única animación puramente atractiva del sitio, y entra por "guiar la mirada": desde que la portada se redujo, ese botón es la única salida al catálogo above the fold. El logo acusa el toque. | `83821bb` `fc85abf` `f47d80a` |
| Fase 34 — La protagonista deja de parecer rota | El bloque detrás de la foto era gris con cuadrícula, o sea el dibujo universal de un placeholder; Tomy lo reportó dos veces como "la imagen que no se ve". Achicarlo no alcanzó (40% → 19% de área y lo seguía leyendo igual): el problema era qué parecía, no cuánto se veía. Ahora es un plano liso en azul de marca. Y al forzar el estado revelado para poder verlo apareció algo peor: la propiedad más visible del sitio mostraba **239,23 m²** para un 2 ambientes de 80 — `surface_arba ?? surface_total`, el bug de la Fase 12 sobreviviendo donde nadie miraba porque hasta ese día no había destacada. | `0543925` |
| Fase 38 — La guarda fallaba abierta otra vez, una capa más abajo | **Tercera** desactivación masiva, el 2-sep: una corrida que vio ~25 avisos dio de baja 380 (434 activas → 54). El cron estaba apagado y la guarda de la Fase 32 estaba en el código. `countActiveListings` terminaba en `count ?? 0`: un conteo nulo sin error —PostgREST puede contestar 200 sin header de conteo— se volvía 0, y **0 desarma la prueba de cobertura** porque un baseline genuinamente vacío no tiene nada que perder. O sea que el arreglo del 1-sep hizo que los scrapers arrancaran en `null`, pero esta función nunca les entregaba un `null` para conservar, y tampoco lanza, así que el `catch` tampoco se disparaba. Reparado con backup y en transacción: 380 revividas, 380 filas de historial inventado borradas, y las activas volvieron **exactas** a 434. | `8470b66` |
| Fase 37 — La operación va en la etiqueta | Donde decía "Casa" ahora dice **"Casa en alquiler"**, y el precio pierde el "/mes". El razonamiento es de Tomy y es mejor: la etiqueta lo dice **antes** de que el lector decida qué significa el número, así que "por mes" pegado al precio es el mismo dato dos veces y hace que el precio se lea como una unidad de medida. El período pasó a ser opt-in y queda sólo donde no hay etiqueta al lado: el "desde" de un edificio. De paso, **"Otras unidades en este edificio"** ganó la etiqueta que no tenía — mostraba precios sin tipo, y una unidad hermana puede ser de otra operación que la que estás leyendo. | `32a179c` |
| Fase 36 — Los alquileres existen y se diferencian | El enum, el validador y el cargador **siempre** aceptaron `alquiler`. Lo que no existía era la **diferencia**: aguas abajo un alquiler se mostraba, se puntuaba y se matcheaba como una venta, y las cuatro fallas devuelven un número creíble. (1) **El precio dice de qué precio habla** — `lib/property/price.ts` es el único lugar que convierte un precio en texto; seis superficies lo imprimían inline. (2) **El Quality Score deja de comparar un alquiler contra ventas**, y la causa raíz no era la query: `PropertyForScoring` **no tenía `operation_type`**, así que el scorer no podía ver la diferencia porque la diferencia no estaba modelada. (3) **El match pregunta la operación, y una operación distinta es un portón, no un criterio** — un promedio ponderado no puede expresar "descalificante": aun con el peso más alto de la tabla, a quien busca alquilar una venta le daría 75%. (4) **La moneda es consecuencia, no preferencia**. (5) **El copy sale del catálogo** en vez de estar escrito a mano. | `47fa961` |
| Fase 35 — La segunda foto, y dos trampas de CSS | El recuadro detrás de la foto destacada **nunca fue un adorno: era el hueco de una segunda foto**. Se leía como una imagen que no cargó porque lo era. Ahora `photos[1]` va ahí, en el lugar exacto del recuadro, con la principal encima. Y dos trampas que costaron una ronda cada una: **un keyframe que escribe `transform` pisa las clases `skew`/`rotate` del elemento** (el brillo del CTA se veía horizontal aunque la clase dijera 28°, porque la inclinación desaparecía justo durante la animación); y **el JSX que se pasa como prop de un Server Component a uno de cliente necesita `key` explícita**, porque cruza serializado y React lo reconcilia en posición de lista — ese era el warning de consola que arrastraba desde antes. | `c6b02a4` `69ce764` `00a7f83` |

**Tests:** 420 passing + 7 skipped (176 al cierre de Fase 1.B → 216 tras la
fase 9 → 275 tras las fases 10-15 → 300 tras la 16 → 316 tras la 18 → 319
tras la 20 → 360 tras las fases 21-24 → 367 tras la 26, que sumó los de
`bestMatch`, → 372 tras la 31, que cubrió el contacto, → 375 tras la 32,
→ **420** tras las fases 36-37: el formateo de precios, la cohorte de
comparables por operación, el portón del match y la carga de un alquiler por
CLI). Los 7 saltados son las bandas de
coherencia ARBA: quedan como spec de vuelta, ver **El dato de ARBA es de la
parcela** más abajo.

**Build:** `npm run build` verde. **41 rutas**, First Load JS shared 184 kB.
3 warnings menores de `@typescript-eslint/no-unused-vars` que no bloquean.

*(El documento venía diciendo 42 desde el 31-ago y son 41. Se contaron una por
una contra el build: no falta ninguna — están las 41, con `/icon.svg` y
`/apple-icon.png` incluidas. Era un error de conteo, no una ruta perdida.)*

**Live URLs:**
- Producción: **https://jm-inmobiliaria-d3pa.vercel.app** — deployada 12-ago-2026. Login de admin **verificado** el 24-ago. Auto-deploy desde `main`: un push llega a producción en ~60s.
- GitHub repo: https://github.com/Tomito-co54/JMInmobiliaria
- Supabase project: `https://cjnaxxidigdylnwlpyab.supabase.co` (**compartido con el proyecto original `jotaeme`** — decisión tomada: una única DB, el scraper alimenta la misma tabla).
- Sentry project: `jotaeme-web` (heredado del upstream).

**Project location:** `C:\dev\jotaeme-inmobiliaria` (hermano de `C:\dev\jotaeme` que es el original — este fork no toca al original).

**Contenido real (reverificado contra la base al cierre del 2-sep-2026):**

| Qué | Cuánto |
|---|---|
| Propiedades propias publicadas | **5** — Belgrano 1287 (1°A, 1°B, 2°A, 2°B) + **Talcahuano 258, el primer alquiler** |
| Scrapeadas | **567** · 439 activas · 392 geolocalizadas |
| `property_history` | 291 eventos |
| Total en la tabla | **575** (5 publicadas + 3 borradores + 567 scrapeadas) |

Números de después de la corrida manual del 2-sep a la tarde, que es la
primera con la guarda reparada. Vio **250 avisos** (61% de cobertura, holgado
sobre el umbral del 50%), insertó **5 nuevos**, registró un cambio de precio
—Sáenz al 200, 115.000 → 118.000— y **no dio de baja nada**, que es lo
correcto: Zonaprop corta en la página 10, el crawl queda marcado como truncado
y la desactivación se saltea. Los **borradores son 3**, no 1: este documento
decía 1 desde el 31-ago.

**Trezza sigue devolviendo cero** — 27 filas, sin moverse.

**La corrida del 1-sep a la noche, la primera con el cron ya apagado**, vio
229 avisos (contra 45 de la automática de la mañana), insertó 4 nuevos y
registró 9 cambios — entre ellos dos bajas de precio reales (Alvear al 1600,
419.000 → 390.000; Oslo al 800, 149.900 → 145.000) y **una republicación**
(Capello 200, que estaba dada de baja y volvió). Esa última es el dato que la
detección de republicaciones venía esperando desde que se construyó.

No dio de baja nada, y es correcto: Zonaprop cortó en la página 10 con un 403,
la corrida quedó marcada como truncada y la guarda salteó la desactivación.

**Trezza sigue devolviendo cero** — no rompe nada porque la guarda lo ataja,
pero o el parser se desactualizó o hay bloqueo; vale mirarlo.

Las 429 activas incluyen las 154 que se revivieron el 31-ago. El 1-sep
cayeron a 45 por una segunda desactivación masiva, **ya diagnosticada,
arreglada y reparada** — ver la sección de abajo.

**El edificio RUMAH (Belgrano 1287, Banfield)** tiene 7 unidades en 4
tipologías. Están cargadas las cuatro de 2 ambientes: 1°A y 1°B a USD
80.000 (40 m²), 2°A y 2°B a USD 96.000 (40 m² + 40 de terraza). Faltan el
**loft dúplex** (54 m² + 30 de terraza, USD 126.000) y el **3 ambientes de
planta baja** (55 m² + patio de 22, USD 150.000, unidad única), los dos
esperando fotos. Los precios de ficha son **contado sin cochera**; la tabla
completa —financiado, con cochera— está en el folleto y todavía no tiene
lugar en el sitio (ver punto 7 del Build map).

El catálogo público muestra dos fichas. Cargar más es lo único que separa
al sitio de estar listo.

### Estado de email / auth (resuelto en Fase 9)

El `CLAUDE.md` v2.1 registraba "SMTP roto — no llegan emails de recovery".
**Era falso, y la causa real vale la pena documentarla porque el síntoma
engaña.**

- El SMTP custom está bien: `smtp.resend.com:465`, usuario `resend`.
  Los mails llegan al inbox, sin pasar por spam.
- El proyecto tenía `rate_limit_email_sent = 2/hora`. Probar el flujo de
  recuperación tres veces seguidas agotaba la cuota, y a partir de ahí
  Supabase devolvía 429 sin mandar nada.
- `requestPasswordReset()` devolvía `ok: true` **pase lo que pase** para
  evitar enumeración de emails, así que la pantalla seguía diciendo
  "Email enviado" mientras no salía nada. Ese silencio es lo que se
  interpretó como SMTP roto.
- Arreglado: el rate limit está en 30/hora (el default de Supabase cuando
  hay SMTP propio), y el 429 ahora se muestra. El resto de los errores
  sigue callado a propósito — el rate limit no revela si la cuenta
  existe, los demás sí.

**Pendiente relacionado, no urgente:** `smtp_admin_email` es
`onboarding@resend.dev`, el dominio sandbox de Resend, que solo entrega
al dueño de la cuenta. Hoy no bloquea nada porque el sitio no le manda
mails a terceros (no hay registro público, MercadoPago está apagado, y
los leads van por WhatsApp). Se vuelve bloqueante el día que se encienda
el informe ARBA pago; ahí hace falta dominio propio verificado en Resend.

### Estado del pipeline de scraping

```bash
npm run pipeline    # los seis pasos encadenados, 2-8 minutos
```

**Corregido el 31-ago: GitHub Actions NO está muerto.** El `CLAUDE.md` decía
que falla desde el día uno del fork y eso quedó viejo el 27-ago, cuando se
cargaron los secrets. De 99 corridas históricas, **92 fallaron y las últimas 6
dieron success**: entre el 27-ago y el 1-sep el pipeline **corrió solo todos
los días y escribió en la base de producción**, sin que nadie mirara el
resultado. El 1-sep se apagó el cron (ver abajo). Zonaprop
le sirve poco desde IPs de datacenter, así que trae pocos avisos, pero escribe.

La corrida a mano desde la PC de Tomy sigue siendo la que trae volumen (~250
avisos), por el mismo motivo de siempre: Zonaprop bloquea a los runners, y
rechaza el segundo pedido de cada sesión de navegador, lo que se resuelve
abriendo un navegador nuevo por página.

**El cron se apagó el 1-sep, a pedido de Tomy.** El pipeline ya no corre
solo: `.github/workflows/pipeline.yml` conserva `workflow_dispatch` y perdió
el `schedule`.

El motivo no es que trajera poco, sino **el sesgo que ese poco dejaba**.
Zonaprop bloquea por IP y las de los runners de GitHub son de datacenter: una
corrida desde Actions traía ~45 avisos de ~430, y siempre los mismos, porque
lo que sirve es la primera página. Resultado: esos ~45 se refrescaban el
`last_seen_at` todos los días mientras los otros ~385 envejecían solos.
Ninguna fila era falsa; el conjunto sí quedaba deformado, y justo en las dos
métricas que dependen de esa columna — antigüedad y días en mercado.

**Ningún cambio de código lo arreglaba**: al scraper le cierran la puerta
antes de entrar. Las dos salidas reales eran pagar un proxy residencial o que
la PC de Tomy lo corriera sola, y mientras ninguna esté, correrlo a mano una
vez por día es estrictamente mejor que correrlo mal todos los días.

*(Antes hacía algo peor: esas mismas corridas flacas daban de baja el catálogo
entero. Eso se arregló aparte y sigue arreglado corra quien corra el pipeline
— ver la sección de la guarda más abajo.)*

**De paso, un dato medido que conviene no perder:** el cron pedía las 06:00
UTC y GitHub lo arrancaba entre 4 y 12 horas tarde (01-sep 10:51 · 31-ago
12:16 · 30-ago 10:57 · 29-ago 12:01 · 28-ago 17:56 · 27-ago 17:09 · 26-ago
06:33). Es comportamiento documentado de GitHub con runners gratuitos. Si
algún día se reactiva, no buscar la corrida a la hora que el cron declara.

Techo conocido: la página 10 devuelve 403. El crawl queda marcado como
truncado y la desactivación se saltea, que es lo correcto.

**Consecuencia que conviene tener presente:** por ese techo, un crawl de
Zonaprop **casi nunca puede llegar legítimamente a `exhausted`**, así que en
la práctica las bajas de Zonaprop están apagadas y el número de "activas" va
a ir subiendo de más con el tiempo.

**Si el pipeline muere en la primera línea con `browserType.launch:
Executable doesn't exist`**, no es el scraper: Playwright se instala como
paquete de npm pero los navegadores se bajan aparte, y cuando la versión
sube (la 1.60 pide el build `1223`) hay que volver a bajarlos.

```bash
npx playwright install
```

### Integridad de la data de mercado

Tres cosas que parecían features y eran bugs. Anotadas porque el síntoma
en los tres casos era un número creíble, no un error:

- **La desactivación inventaba bajas.** `deactivateStale()` marca como
  inactivo todo lo que el crawl no vio, pero el crawl tenía un tope de 50
  documentado como *"(testing)"* que nunca se sacó. Cada corrida daba por
  muertos a los 250 restantes. Se limpiaron 317 bajas demostrablemente
  falsas; quedan 160 que no se pueden desmentir. Hoy la desactivación
  exige crawl exhaustivo (`lib/services/scrapers/crawl-completeness.ts`).
- **El historial era asimétrico.** 477 bajas, cero altas — no porque
  ningún aviso volviera, sino porque `is_active` no está en
  `TRACKED_FIELDS` y la reactivación pasaba en silencio. `classifyChange`
  tenía una rama `relisted` imposible de disparar.
- **El USD/m² dividía por el terreno.** `effectiveSurface` prefería
  `surface_arba`, la superficie de la parcela catastral, que para un
  departamento es el lote del edificio entero. Mediana de departamentos:
  487 así, **2.024** con la superficie declarada.

### Y volvió a pasar el 2-sep, una capa más abajo

Tercera vez, y otra vez se descubrió **verificando este documento**: al chequear
la tabla de contenido contra la base aparecieron 54 scrapeadas activas donde
decía 434.

**Lo que pasó.** Una corrida vio ~25 avisos y dio de baja **380**. Es el mismo
incidente que el 1-sep pero con la guarda de la Fase 32 puesta y el cron
apagado, o sea con las dos explicaciones anteriores descartadas de entrada.

**La causa.** `countActiveListings` terminaba así:

    return count ?? 0;

PostgREST puede contestar 200 **sin header de conteo**, y en ese caso `count`
llega `null` sin que haya `error`. Eso se volvía **0**, y 0 es justo el valor
que **desarma** la prueba de cobertura, porque la condición está escrita
`activeCount > 0 && ...` — un baseline genuinamente vacío no tiene nada que
perder.

Lo que hace a esto la tercera repetición y no una falla nueva: **el arreglo del
1-sep hizo que los scrapers arrancaran en `null` y sólo lo pisaran si la
lectura salía bien**, pero esta función nunca les entregaba un `null` para
conservar —les entregaba 0— y tampoco lanza en ese caso, así que el `catch`
de los scrapers tampoco se disparaba. La protección quedó desconectada por
debajo de donde se la había reparado.

**El arreglo** (`8470b66`): `Promise<number | null>`, y sólo un número real
cuenta como baseline. El tipo de retorno obliga a cada llamador a contestar qué
hace con "no sé"; los dos scrapers ya lo guardaban en `number | null`, así que
el compilador cierra el circuito.

**La reparación.** Backup primero, después en una transacción todo-o-nada: 380
revividas, 380 filas de historial inventado borradas. **No hubo reactivaciones
que desenredar** —a diferencia del 1-sep, el lote era limpio: 380 filas con el
mismo timestamp, todas `true → false`— y **no se registró la reparación como
reactivación**, por la misma razón de siempre. Las activas volvieron **exactas**
a 434.

**Lo mismo que no se recupera:** `deactivateStale` pisa `last_seen_at` con la
fecha de la baja. Esas 380 filas figuran vistas el 2-sep sin haberlo sido, y no
hay de dónde sacar el valor real.

**La lección, a esta altura difícil de ignorar:** las tres veces fue el mismo
error con distinto disfraz — **un valor que significa "no pude leerlo" tratado
como un dato válido que resulta ser justo el que apaga la guarda**. Vale
revisar el resto del código con esa lente: `?? 0`, `?? []`, `catch {}` que
deja un default, cualquier lugar donde la ausencia de dato se vuelva
silenciosamente el caso permisivo.

### Volvió a pasar el 1-sep, y la guarda tenía la puerta abierta

Cuarta vez que un número creíble resulta ser un bug, y la primera que se
descubre **verificando el propio `CLAUDE.md`**: al chequear la tabla de
contenido contra la base aparecieron 45 activas donde el documento decía 429.

**Lo que pasó.** Una corrida vio 45 avisos contra 399 activos —11% de
cobertura— y dio de baja 375. La condición 3 de la guarda existe exactamente
para eso. No la frenó, y el motivo es un **fail-open**:

    if (activeCount > 0 && scrapedCount < activeCount * MIN_COVERAGE_RATIO)

Con `activeCount === 0` el test se saltea entero. Y del otro lado, en los dos
scrapers, el baseline se leía así:

    let activeBefore = 0;
    try { activeBefore = await countActiveListings(...) } catch { /* warn */ }

O sea que **la lectura del baseline fallando dejaba 0, y 0 desarmaba la
guarda**: lo más probable que salga mal en una corrida inestable era también
lo que apagaba la protección contra esa inestabilidad. Estaba escrito como si
fuera una decisión —el comentario decía "0 simply waives the coverage test"—
y había un test que lo fijaba. Estaba revisado, y estaba mal.

**El arreglo** (`fbcd559`): "no sé" pasa a ser un estado distinto de "cero".
`activeCount: number | null`; 0 sigue habilitando porque un baseline vacío de
verdad no tiene nada que perder, y `null` rechaza antes de cualquier
aritmética. Los scrapers arrancan en `null` y sólo lo pisan si la lectura sale
bien. Fallar sigue sin frenar el scrape: frena la desactivación, que es la
única parte que no se deshace.

**Una vía que se descartó, para no volver a investigarla:** la primera
sospecha fue que `decideDeactivation` decide con `allScraped.length` mientras
`deactivateStale` protege `seenExternalIds`. No pueden divergir — se llenan en
el mismo loop, línea a línea.

**La reparación.** Backup primero, después en una transacción: revividas las
357 que seguían caídas, borradas las 375 bajas inventadas y las 18 altas que
sólo las corregían (las 18 eran artefactos; revivals genuinos en la ventana,
cero). Los números volvieron **exactos** a los del 31-ago —429 activas, 279
eventos— que es la mejor evidencia de que el recorte estuvo bien acotado.

Y como el 31-ago: **la reparación no se registró como reactivación**, porque
eso metería republicaciones que nunca pasaron en la única feature que espera
ese dato.

**Lo que no se pudo recuperar:** `deactivateStale` pisa `last_seen_at` con la
fecha de la baja, así que esas 375 filas perdieron su último visto real. No es
un bug — `daysOnMarket` usa esa columna como fecha de fin para las inactivas,
y depende de eso — pero significa que el daño de una baja falsa no es del todo
reversible. Un motivo más para que la guarda falle cerrada.

### La corrida bloqueada que mató el catálogo (31-ago)

Tercera vez que un número creíble resulta ser un bug, y la más cara. El
`CLAUDE.md` cerraba el 28-ago con 412 activas y había 275, con la corrida de
esa noche desactivando cero.

- **359 bajas a las 12:13 UTC, todas con el mismo timestamp** — una escritura
  en bloque de `deactivateStale`, de una corrida local. La corrida de la noche
  **reactivó 208 de esas mismas**: un aviso dado por muerto a la mañana y
  visto vivo a la noche no estaba muerto.
- **La causa:** `parseListPage` devuelve `[]` tanto cuando no hay más
  resultados como cuando el selector de cards nunca aparece, y una página
  bloqueada está igual de vacía que la siguiente al último resultado. Eso se
  leía como `exhausted`, que autoriza la desactivación. La guarda de la Fase 11
  solo atajaba el 403 explícito (`page_error`); **un bloqueo blando no lo es**.
  Mismo patrón que los basemaps: el rechazo llega vestido de éxito.
- **El arreglo NO lee mejor la página.** La marca de "sin resultados" no se
  pudo verificar (Zonaprop 403ea después de ~9 pedidos por IP) y una guarda
  parada sobre un selector sin verificar es la misma apuesta que acaba de
  perder. Es aritmética: `countActiveListings()` lee cuántos había activos
  **antes** de tocar nada, y una corrida que vio menos de `MIN_COVERAGE_RATIO`
  (la mitad) no se gana una extinción masiva. La mala vio 10%; la sana de la
  misma noche, 88%. El tercer parámetro de `decideDeactivation` es
  **obligatorio** para que el compilador obligue a cada scraper a contestar.
- **Reparación:** revividas las 154 que seguían de baja, borradas las 359 filas
  de baja y las 205 reactivaciones que solo las corregían. **No** se registró
  la reparación como reactivación: habría metido 205 "republicaciones" que
  nunca pasaron en la feature que justamente espera datos. Backup en el
  scratchpad de la sesión.
- **Se salvaron 3 republicaciones reales** — dadas de baja en junio, vueltas
  el 31-ago con precio. Son las primeras de verdad, y el `price_at_change` de
  la migración 00014 funcionando con datos reales por primera vez.

### El match ahora es de los visitantes

Hasta el 31-ago el match estaba en el panel de `/p/[id]` **detrás de una
condición que ningún visitante podía cumplir**: `computeMatchScore` necesita
un `search_profile`, o sea usuario logueado con onboarding hecho, y acá no hay
registro público. Esa fila solo puede existir para Tomy.

- Las preferencias se responden en la página y viven en **`sessionStorage`**
  (`hooks/use-match-preferences.ts`): duran la visita, acompañan de la home a
  la ficha, se van al cerrar el navegador. Sin cuenta, sin servidor, sin
  identificador que sobreviva a la visita.
- `lib/matching/preferences.ts` es la versión anónima del perfil (seis
  campos) y `toSearchProfile()` la ensancha a lo que el matcher ya consumía.
  **El algoritmo no se tocó** — era puro, solo faltaba de dónde sacar el
  perfil. Lo que no se responde queda en null, o sea `confidence: 0`, y el
  match renormaliza sobre lo que sí se expresó.
- **El Quality Score ya no lo ve ningún visitante** (cerrado el 1-sep). Salió
  por partes: del panel de la ficha y de las cards (Fase 21), de la home
  (Fase 24), y finalmente de los tres lugares que quedaban — el **medallón del
  hero de `/p/[id]`**, la **ficha PDF** y el **medallón de la protagonista**.
  Los dos primeros eran los peores: sobre la foto al lado del precio se lee
  como una nota que la propiedad se sacó, y el PDF además se descarga y se
  reenvía, así que el número salía del sitio y seguía viaje sin nada que lo
  explicara. El de la protagonista se había defendido como gesto de diseño
  (§2.1) — pero el gesto es la foto rompiendo el cuadrante; el medallón era
  solo lo que colgaba de él.
  **Sigue ordenando el catálogo y sigue mandando en `/admin`**, y sigue
  visible en `/buscar` y `/favoritos`, que están detrás de login y son
  herramientas de Tomy, mismo estatus que el panel.
- **Antigüedad** (`year_built`, migración 00016): no había de dónde sacarla —
  las únicas fechas eran de publicación. Se guarda el **año**, no los años.
  Queda nula en casi todas las scrapeadas y el sub-score lo lee como "no se
  sabe" y se sale de la cuenta: puntuar un desconocido como "probablemente
  vieja" sería inventar el número que el comprador está preguntando. Se gradúa
  en años absolutos y se pregunta con chips porque "a estrenar" es máximo 0 y
  una proporción se rompe justo ahí.

### El dato de ARBA es de la parcela, no de la unidad

`surface_arba` es la superficie de la **parcela catastral**. La declarada es
lo construido, o la unidad si es un departamento. Son cosas distintas casi
siempre, y compararlas no mide coherencia: mide si la propiedad es un lote.

    departamento   95 de 120 con ambas superficies "fallaban"  (79%)
    ph             20 de  40                                   (50%)
    casa           59 de 128                                   (46%)

Belgrano 1287 lo puso a la vista: 40 m² declarados contra una parcela de
239 puntuaban 20/100 y le costaban ~10 puntos de score a cada unidad, y en
la ficha pública salía como *"Discrepancia importante en superficie"*, en
rojo, en el sitio cuya promesa es la verificación catastral.

Es la misma clase de error que la Fase 12 —donde el USD/m² dividía por el
terreno— en los lugares que nadie revisó después. **Si aparece un número
raro de superficie, sospechar de esto primero.**

Estado actual:

- **El sub-score está parkeado** en `confidence: 0` (`ARBA_COHERENCE_PARKED`
  en `lib/scoring/subscores.ts`). No borrado: el score renormaliza solo, la
  lógica de bandas sigue entera y el motivo aparece en el breakdown. Los 7
  tests de bandas quedan en `describe.skip` como spec de vuelta.
- **La ficha reporta los dos números sin compararlos** — "239 m² de parcela ·
  40 m² declarados en la propiedad. En departamentos y PH la parcela es la
  del edificio entero."
- **Efecto del rescoreo de las 380:** verdes 79 → 106, rojos 61 → 64.
- **El que faltaba ya está arreglado.** Este documento decía que
  `lib/matching/match.ts` seguía usando `surface_arba ?? surface_total` para
  cruzar contra lo que busca un comprador, y que no urgía por ser del match
  legacy. Las dos mitades quedaron viejas el 31-ago: el orden se invirtió
  cuando el match pasó a ser lo que ve todo visitante, y el comentario de
  `surfaceSubScore` explica por qué —decirle a alguien que pide 40 m² que una
  unidad de 40 sobre una parcela de 239 "cumple" con 239 es absurdo impreso
  en el breakdown.

Reconstruirlo bien depende de separar cubierto de descubierto — punto 8 del
Build map.

### Los alquileres, y por qué "ya se podía" era falso

Preguntado por Tomy el 2-sep: *¿por ahora solo se pueden subir publicaciones de
venta?* La respuesta corta era que no —el enum `operation_type` tiene las dos
desde la migración 00001, el desplegable del editor las ofrece, el validador las
acepta y `canPublishProperty` sólo exige que **haya** operación—. La respuesta
larga es que **cargarlo no era el problema**: aguas abajo, un alquiler se
mostraba, se puntuaba y se matcheaba como si fuera una venta.

Las cuatro fallas son de la familia de siempre: **ninguna rompe nada, las cuatro
devuelven un número creíble.**

- **El precio se imprimía plano**, en seis superficies que hacían
  `{moneda} {monto}` inline. Ahora hay un solo lugar que convierte un precio
  en texto (`lib/property/price.ts`). ARS se escribe con el signo local; USD
  queda explícito, porque un signo pelado sobre un precio en dólares es la
  ambigüedad más cara que esa función puede producir.

- **El Quality Score comparaba un alquiler contra ventas, y la causa raíz no
  era la query.** `PropertyForScoring` **no tenía `operation_type`**: el
  scorer no podía ver la diferencia porque la diferencia no estaba modelada.
  Ahora el dato entra al modelo y la cohorte de comparables se acota por
  operación; una operación desconocida devuelve **cohorte vacía**, no la unión
  de las dos. El corpus scrapeado es 100% venta —el crawler pide
  `inmuebles-venta-` y nada más— así que hoy **todo alquiler cae en
  abstención**, que es la respuesta correcta y se corrige sola el día que se
  crawleen alquileres. Detalle que ya estaba bien: el sub-score de precio se
  abstenía si la moneda no era USD, así que un alquiler **en pesos** nunca
  inventó un número. El agujero era el alquiler en dólares.

- **El match no preguntaba la operación, a propósito** — el comentario decía
  que el catálogo es sólo de venta, así que la pregunta tendría una sola
  respuesta. Con alquileres esa premisa se cae. Y la operación **no entró como
  un criterio más**: un promedio ponderado no puede expresar "descalificante",
  porque aun con el peso más alto de la tabla, a alguien que busca alquilar una
  venta le daría 75%, que es una recomendación. Así que es un **portón** en
  `computeMatchScore` —cero, no null: null es "no sé", esto es un no con
  certeza— y el sub-score sólo carga la frase que lo explica en el desglose.

- **La moneda estaba fija en USD.** Ahora la escala del presupuesto se deriva
  de la operación: dólares de contado o pesos por mes. Un techo guardado bajo
  una operación se **descarta** bajo la otra, no se recorta — 600.000 no es un
  número más chico, es otra cantidad.

**Dónde se dice la operación (Fase 37).** No en el precio: en la etiqueta que
nombra la propiedad. "Casa en alquiler" lo dice **antes** de que el lector
decida qué significa el número, y "por mes" pegado al precio, con la etiqueta
ya puesta, es el mismo dato dos veces y hace que el precio se lea como una
unidad de medida. Así que el período es **opt-in**, y la regla no es "nunca
mostrarlo" sino **nunca mostrar un alquiler que nada marque como alquiler**.
Queda encendido en un solo lugar: el "desde" de un edificio, que resume una
cohorte y no nombra ningún tipo. Y **"Otras unidades en este edificio"** ganó
la etiqueta que nunca tuvo — mostraba precios sin tipo al lado, y una unidad
hermana puede ser de otra operación que la que se está leyendo.

**La pregunta se muestra sola.** El formulario de criterios recibe qué
operaciones tiene el catálogo y sólo dibuja "Comprar / Alquilar" cuando hay más
de una, porque un control con una sola posición real no es una pregunta. Se
encendió solo el 2-sep, al publicarse el primer alquiler. La excepción es quien
ya eligió: su elección queda visible y borrable siempre, para que nadie quede
filtrado en una operación sin control para deshacerlo.

**El primer alquiler es Talcahuano 258, Banfield** (casa, $ 1.900.000 por mes),
y sirvió de verificación end-to-end: card con la etiqueta y el precio limpio,
ficha, PDF, encabezado del catálogo que soltó el "en venta" solo, la pregunta
del match encendiéndose, y el portón dando **match 100 al alquiler** para un
perfil que busca alquilar mientras las cuatro ventas quedan en cero.

`docs/ejemplo-alquiler.json` es la plantilla: cambian `operation_type` y
`price_currency`, y **el precio se escribe mensual y pelado**.

### Los servicios pagos están escondidos

`PAID_SERVICES_PUBLIC` en `lib/services/offering.ts` está en `false`. El
checkout de MercadoPago y el informe ARBA en PDF **funcionan** desde el
Block 7 del upstream; lo que se apagó son las **cuatro** entradas públicas: el
botón del panel, el CTA del advisor, que el advisor proponga comprar un
informe, y —agregada el 31-ago— la sección "Del dato al informe, en tres
pasos" de la home, que era la más ruidosa de las cuatro y se había pasado por
alto: una sección entera ofreciendo algo que no se puede comprar. La ruta `/p/[id]/servicios` sigue resolviendo y el webhook sigue
cumpliendo órdenes. Misma decisión que la Fase 8: esconder, no borrar.

### El basemap tiene dueño (y contesta 200 cuando dice que no)

Los tres mapas del sitio —bloque de cobertura de la home, `/p/[id]`,
`/admin/mercado/mapa`— toman sus tiles de **una sola** variable:
`NEXT_PUBLIC_BASEMAP_URL`. Hoy apunta a **MapTiler**, estilo `landscape`,
con la key restringida por origin a `localhost` y al dominio de producción.

Lo que hay que saber antes de tocarlo:

- **Un proveedor que te rechaza igual te devuelve 200.** CARTO estampa
  "API KEY REQUIRED" en diagonal sobre la tile; OSM devuelve una que dice
  "Access blocked". Las dos son PNG del tamaño esperado. **Verificar un
  cambio de basemap mirando el status o el peso no sirve: hay que mirar
  los píxeles.**
- **Los servidores de OSM no son una opción para este sitio.** Son de
  voluntarios y su política de uso prohíbe exactamente esto — repartirle
  sus tiles a los visitantes. Siguen como fallback si la variable no está
  seteada, para que los mapas dibujen algo en dev, no como plan.
- **La key es pública a propósito.** Viaja en la URL de cada tile, en el
  navegador de cada visitante. No se puede ocultar; lo único que protege
  la cuota es la lista de origins en el panel de MapTiler. Los deploys de
  **preview** de Vercel usan subdominios distintos y por eso salen sin
  mapas — es esperable, no un bug.
- **La atribución se deduce de la URL** (`attributionFor`), así que cambiar
  de proveedor no puede dejar el crédito equivocado abajo del mapa. Es un
  término de licencia, no un pie de foto.
- **Si se cambia de proveedor**, agregar su hostname a
  `images.remotePatterns` en `next.config.ts`, y revisar
  `nativeTilePixelsFor()`: MapTiler sirve tiles de 512px por el mismo
  terreno que los 256 de todos los demás, y de eso depende si hace falta
  el supersample (ver `BASEMAP_SUPERSAMPLE`).

---

## Tech Stack — Fixed Decisions

Same as upstream — no se cambia stack sin confirmación explícita.

### Core
- **Frontend:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix-based) — 13 componentes instalados
- **Backend / DB:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel (deployado, auto-deploy desde `main`)
- **Forms:** React Hook Form + Zod validation
- **Tipografía:** Inter (body) + Fraunces (headings vía `font-heading`)

### Services
- **Payments:** Mercado Pago (legacy del upstream — servicios pagos)
- **Email:** Resend (SMTP de Supabase Auth + emails transaccionales)
- **Maps:** Leaflet (`/p/[id]`, mapa de mercado) + aritmética de tiles propia
  (`lib/map/tiles.ts`, bloque de la home). Las tiles las sirve **MapTiler**
  vía `NEXT_PUBLIC_BASEMAP_URL` — ver **El basemap tiene dueño** en Current
  progress
- **Scraping:** Playwright (Zonaprop + Trezza, vivo, alimenta inteligencia de mercado)
- **Cadastral data:** ARBA WFS GeoServer (público sin auth)
- **Geocoding:** Nominatim / OSM (1 req/s, cacheado 90d)
- **Error tracking:** Sentry
- **Analytics:** Vercel Analytics

### Background Jobs
- **GitHub Actions** (`.github/workflows/pipeline.yml`): scrape diario
  de Zonaprop + Trezza → dedup → geocode → ARBA → quality score →
  alertas. Heredado del upstream. **Ya NO corre solo** — el cron se apagó el
  1-sep (ver abajo). Queda como disparo manual desde Actions; la corrida que
  vale es `npm run pipeline` desde la PC de Tomy.

---

## Architectural Principles

### 1. Mobile-first, radically
- Cada componente diseñado primero para viewport 375px (iPhone standard).
- Probar mobile **antes** de adaptar a desktop.
- Touch targets mínimo 44px.
- No hover-only para acciones críticas.

### 2. Server-first
- Default Server Components.
- `"use client"` solo cuando hace falta (state, effects, browser APIs).
- Data fetching server-side salvo interactividad real-time.

### 3. Type safety end-to-end
- TypeScript strict mode no-negociable.
- Zod schemas para todo input externo (forms, API, scraping outputs).
- Nunca `any`. Usar `unknown` y narrow, o definir tipos propios.

### 4. Separation of concerns
- `/app` → routing y páginas only
- `/components` → UI reutilizable
- `/lib` → business logic
- `/lib/db` → queries tipadas
- `/lib/services` → integraciones externas (ARBA, scrapers, MP, email, storage)
- `/lib/scoring` → quality score (puro, testeable)
- `/lib/matching` → match score (puro, testeable)
- `/lib/validators` → Zod schemas
- `/types` → tipos compartidos
- `/hooks` → hooks de cliente (ej. `useAutoSave`)

### 5. Security by default
- Row Level Security (RLS) habilitado en cada tabla Supabase.
- Service role keys nunca se exponen client-side.
- Validar inputs server-side aunque ya esté validado client-side.
- HTTPS only (Vercel se encarga).
- Nunca loguear passwords, tokens, datos de pago, ni DNI.
- Cumplir Ley 25.326 (Datos Personales Argentina).

### 5.1 Handling `SUPABASE_MANAGEMENT_TOKEN`

Vive en `.env.local` como `SUPABASE_MANAGEMENT_TOKEN`. Sirve para
Management API (config de auth, settings de proyecto). Reglas:

- **NUNCA** `cat .env.local`, `grep` el token, ni `echo $SUPABASE_MANAGEMENT_TOKEN`.
- **Solo vía sustitución de shell**: `curl -H "Authorization: Bearer
  $SUPABASE_MANAGEMENT_TOKEN" ...`. El comando contiene `$VAR` como
  literal; el shell sustituye al ejecutar y el valor va directo a curl.
- Para verificar que existe sin filtrarlo: `[ -n "$SUPABASE_MANAGEMENT_TOKEN" ] && echo OK`.
- Si el usuario lo pega en chat por accidente, tratarlo como
  comprometido: pedir revocación, generar uno nuevo, ponerlo en `.env.local`.

### 6. Performance budget
- Mobile First Contentful Paint < 1.5s en 4G.
- Largest Contentful Paint < 2.5s.
- Peso total < 500KB para páginas de listado.
- `next/image` para TODAS las imágenes (incluyendo fotos del bucket
  `property-photos` — `next.config.ts` whitelist incluye el hostname).
- Lazy-load below the fold.

---

## Project Structure

```
/
├── app/
│   ├── (auth)/                   # login, forgot-password, reset-password, verify-email
│   ├── (public)/                 # /p/[id], /p/[id]/servicios, /guia-de-compra
│   │   ├── template.tsx          # ← entrada de página. Template y NO layout: un
│   │   │                         #   layout persiste entre navegaciones, un template
│   │   │                         #   se vuelve a montar, que es lo que da la entrada
│   │   ├── propiedades/          # ← el catálogo (salió de la landing)
│   │   └── edificios/            # ← agrupado por parcela catastral
│   ├── (app)/                    # legacy del upstream — buscar, busquedas, favoritos, dashboard, perfil, alertas, mis-servicios
│   ├── admin/                    # ← panel principal de operación
│   │   ├── template.tsx          # ← misma idea, más quieta: 200ms, sin escala y sin
│   │   │                         #   reveals. Es una herramienta, no una vidriera
│   │   ├── page.tsx              # dashboard de métricas
│   │   ├── properties/           # ← CARGADOR (nueva, listado, [id]/editar)
│   │   ├── mercado/              # ← Centro de datos (3 pantallas)
│   │   │   ├── page.tsx          #     dashboard: 5 módulos agregados
│   │   │   ├── cambios/          #     registro completo, filtros + media %
│   │   │   └── mapa/             #     mapa con selección por área
│   │   ├── groups/               # dedup viewer (admin tool)
│   │   └── users/                # legacy
│   ├── api/                      # webhooks (MercadoPago, Sentry), admin fulfillment
│   ├── auth/callback/            # OAuth + email confirmation handler
│   ├── onboarding/               # legacy del upstream (search profiles)
│   ├── pago/                     # /exito, /pendiente, /error (MP returns)
│   ├── icon.svg                  # ← favicon (Next lo cablea solo). Isotipo
│   │                             #   completo, SIN fondo, al 96% del ancho.
│   │                             #   SVG y no PNG para poder llevar adentro un
│   │                             #   @media prefers-color-scheme: navy sobre
│   │                             #   pestaña clara, blanco sobre oscura — sin eso
│   │                             #   el navy desaparece contra la barra oscura.
│   │                             #   Se evaluó recortar a la casa del centro (a
│   │                             #   16px la marca entera mide 14x6) y Tomy lo
│   │                             #   descartó: va la marca, no un recorte.
│   ├── apple-icon.png            # ← 180px CON fondo navy: iOS no soporta
│   │                             #   transparencia y la compone sobre negro
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui base
│   ├── property/                 # PropertyHero, PropertyGallery, PropertyDataPanel,
│   │                             #   PropertyMobileBar, WhatsAppButton, ShareButton,
│   │                             #   PropertyMapSection, BuildingUnits, etc.
│   ├── scoring/                  # QualityScoreRing + Card + Sheet
│   ├── matching/                 # ← MatchPreferencesForm (las 6 preguntas, compartidas
│   │                             #   por home, header y ficha), MatchMeter (medidor:
│   │                             #   barra, NO anillo — el anillo es del Quality Score
│   │                             #   y son cosas distintas), MatchBreakdownSheet,
│   │                             #   MatchQuickFilter (el desplegable del header)
│   ├── home/                     # HomeHero, HomeProtagonist, HomeGuarantees(+Client),
│   │                             #   HomeMatchBuilder, WhatsAppFloat
│   ├── catalog/                  # ← PropertyCatalog + PropertyPremiumCard + BuildingGroup
│   │                             #   + BuildingCover (la portada del edificio, que abre
│   │                             #   el visor de /p/[id] con una sola foto).
│   │                             #   Salieron de home/ cuando el catálogo dejó de vivir
│   │                             #   en la landing: un componente "Home*" renderizando
│   │                             #   /propiedades sería un nombre que miente
│   ├── map/                      # ← AreaMap (+.inner) — mapa multi-propiedad
│   │                             #   con selección por arrastre. Agnóstico:
│   │                             #   recibe puntos ya coloreados. Lo comparten
│   │                             #   el mapa de mercado y (a futuro) el público
│   ├── shared/                   # BrandLogo, PublicHeader (el nav público, en UN lugar:
│   │                             #   había seis cabeceras a mano y por eso el dark mode
│   │                             #   costó seis ediciones), AdminSidebar, UserMenu,
│   │                             #   Reveal (entrada por scroll — vivía en el archivo
│   │                             #   de la home y lo importaban tres surfaces),
│   │                             #   NavPending (acuse del click), theme-toggle
│   │                             #   (el barrido circular del tema), etc.
│   ├── education/                # BuyingProcessAdvisor (legacy)
│   ├── payment/                  # PaymentReturnLayout — el marco compartido por las
│   │                             #   tres vueltas de MercadoPago (/pago/exito,
│   │                             #   /pendiente, /error)
│   ├── services/                 # ServiceCard — servicios pagos. Sin entrada pública
│   │                             #   hoy: PAID_SERVICES_PUBLIC está en false
│   └── search-profile/           # SearchProfileForm (legacy). El nombre importa: este
│                                 #   documento decía `components/search/` hasta la
│                                 #   v2.18, y esa carpeta estaba vacía
│
├── lib/
│   ├── db/                       # queries tipadas — properties, admin, favorites, etc.
│   │   └── property-sources.ts   # ← gate público (sources + listing_status)
│   ├── supabase/                 # clients (server, browser, middleware, admin,
│   │                             #   public: anon y SIN cookies, el de menor privilegio.
│   │                             #   Necesario para cachear: unstable_cache no tiene
│   │                             #   request del cual leer cookies)
│   ├── services/
│   │   ├── arba/                 # WFS client + getParcelByPartida + bridge
│   │   │                         #   + geometry.ts (centro de parcela)
│   │   ├── scrapers/             # Zonaprop + Trezza (alimentan inteligencia de mercado)
│   │   ├── geocoding/            # Nominatim wrapper
│   │   ├── dedup/                # cross-source matching
│   │   ├── mercadopago/          # legacy upstream — checkout + webhook
│   │   ├── email/                # Resend wrappers (client · send · templates).
│   │   │                         #   Los mails de recuperación NO salen de acá: esos
│   │   │                         #   los manda Supabase Auth con su propio SMTP
│   │   ├── storage/              # deliverables.ts — bucket de los informes pagos.
│   │   │                         #   Distinto de lib/storage/, que es el de fotos
│   │   ├── pdf/                  # @react-pdf renderer — informe ARBA (pago)
│   │   │                         #   + property-sheet.tsx (ficha publica)
│   │   └── offering.ts           # ← PAID_SERVICES_PUBLIC: apaga las entradas
│   │                             #   publicas a los servicios pagos
│   ├── market/                   # ← lógica del centro de datos (pura, testeable)
│   │                             #   stats.ts · geo.ts (áreas) · listing-bands.ts
│   │                             #   (color) · crawl-completeness.ts
│   ├── scoring/                  # quality.ts + subscores + comparables + bands
│   ├── validators/               # Zod schemas — auth, property, etc.
│   ├── property/                 # ← verified-data.ts: arma la lista "Datos oficiales"
│   │                             #   de la ficha. Pura, con tests. Es donde vive la
│   │                             #   decisión de no nombrar a ARBA y de no hablar
│   │                             #   como auditor del aviso de otro.
│   │                             #   price.ts: el UNICO lugar que convierte un precio
│   │                             #   en texto, y el que arma "Casa en alquiler". El
│   │                             #   período es opt-in: la regla no es "nunca mostrar
│   │                             #   por mes", es NUNCA MOSTRAR UN ALQUILER QUE NADA
│   │                             #   MARQUE COMO ALQUILER
│   ├── matching/                 # match.ts + preferences.ts (perfil anónimo, puro)
│   │                             #   + best-match.ts: el mejor match del catálogo,
│   │                             #   compartido por la home y el header para que los
│   │                             #   dos lugares que dicen "tu match" no discrepen
│   ├── auth/                     # ← copy de errores de auth (puro, testeable)
│   │                             #   callback-errors.ts + password-reset-errors.ts
│   ├── admin/                    # ← property-import.ts: parseo y validacion
│   │                             #   del JSON del cargador CLI (puro, testeable)
│   ├── buildings/                # ← agrupar unidades por parcela catastral.
│   │                             #   buildingLabel() nombra el grupo (nombrar no es
│   │                             #   agrupar: la membresía la decide la parcela).
│   │                             #   photos.ts: la foto del edificio, elegida a mano
│   │                             #   porque nada en los datos distingue un frente de
│   │                             #   un living — la portada de un aviso vende la unidad
│   │                             #   Puro y derivado: buildingKey() es el unico
│   │                             #   lugar que sabe como se identifica un
│   │                             #   edificio, asi que una tabla `buildings`
│   │                             #   entra cambiando solo esa funcion
│   ├── storage/                  # property-photos.ts (upload/delete helpers).
│   │                             #   El de informes pagos es lib/services/storage/
│   ├── zona-sur/                 # partidos + arbaCode mapping
│   ├── education/                # guía de compra contenido (legacy)
│   ├── brand/                    # tokens de marca
│   └── utils.ts
│
├── hooks/
│   ├── use-match-preferences.ts  # ← lo que busca el visitante, en sessionStorage
│   ├── use-autosave.ts           # ← debounced autosave del cargador
│   └── use-in-view.ts            # ← IntersectionObserver + count-up rAF (Fase 2 bloque 4)
│
├── types/                        # tipos compartidos
├── public/brand/                 # logos navy/white, isotipo + full
├── public/leaflet/               # ← los 3 iconos del marcador. Venian de unpkg:
│                                 #   4,5 kB que costaban DNS+TCP+TLS contra un host
│                                 #   ajeno, en la pagina que mas rapido tiene que cargar
├── vercel.json                   # ← regions: [gru1]. San Pablo, la misma ciudad que
│                                 #   la base. Sin esto la funcion corre en Washington
│                                 #   y cada consulta cruza el continente (~375ms)
├── supabase/
│   ├── migrations/               # 00001..00016 + 00015b (00011+ son del fork).
│   │                             #   00015b es compañera de 00015: indexa
│   │                             #   arba_lookups por partida, que es la clave de
│   │                             #   las propias. La tabla solo tenía (lat, lng)
│   ├── seed.sql
│   └── reset.sql
├── scripts/                      # CLIs: scrape, dedup, geocode, ARBA, score, alerts,
│                                 #   db-run, db-query, create-property,
│                                 #   buscar-partida (direccion -> partida, via
│                                 #   geocoding + ARBA por punto: es AYUDA DE BUSQUEDA
│                                 #   y no fuente de verdad, y avisa cuando el match
│                                 #   fue por cercania y no por interseccion)
├── docs/                         # PLAN_MAESTRO, PLAYBOOK_PROMPTS, ARCHITECTURE,
│                                 #   ejemplo-alquiler.json (plantilla de alquiler:
│                                 #   mismo formato, cambian operation_type y moneda,
│                                 #   y el precio se escribe mensual y pelado),
│                                 #   TESTING_BLOCK_7, MIGRATION,
│                                 #   ejemplo-propiedad.json (plantilla del cargador CLI)
└── CLAUDE.md
```

---

## Database Schema — Core Entities

### `properties` (la tabla central)

Columnas clave:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `external_id` | text | ID en la fuente (zonaprop, trezza) — null para mías |
| `source` | enum | `owner_direct` / `agency` = MÍAS · `zonaprop` / `trezza` / etc. = scrapeadas |
| `url` | text | Link al listing original (solo scrapeadas) |
| `partido` | text | Nombre del partido (mapeado a `arbaCode` en `lib/zona-sur`) |
| `partida` | text | ARBA tax ID (9 dígitos, primeros 3 = código de partido) |
| `nomenclatura_catastral` | text | Desde ARBA |
| `address` | text | Dirección (obligatoria para publicar) |
| `lat`, `lng` | numeric | Geocoded (solo scrapeadas, mías no geocodean — entran por partida) |
| `property_type` | enum | casa / departamento / ph / lote / local |
| `operation_type` | enum | venta / alquiler |
| `price_amount`, `price_currency` | numeric / enum | |
| `surface_total`, `surface_covered`, `surface_arba` | numeric | Declaradas + ARBA real |
| `tpa` | text | Urbano / Rural (desde ARBA WFS) |
| `year_built` | integer | **NEW** (00016): año de construcción. **No** es la antigüedad del aviso — para eso está `first_seen_at`. Nulo en casi todas las scrapeadas: la fuente lo publica en la ficha individual, fuera del techo de pedidos |
| `rooms`, `bedrooms`, `bathrooms`, `garages` | integer | |
| `description`, `photos` | text / jsonb | `photos` = array de URLs (primera = portada) |
| `first_seen_at`, `last_seen_at`, `is_active` | timestamps / bool | **Estado de mercado** — solo relevante a scrapeadas |
| `listing_status` | text | `borrador` / `publicada` / `vendida` — solo mías (CHECK constraint) |
| `is_featured` | boolean | Broker-curated flag para rotar la protagonista de la home. Solo owner sources (CHECK constraint, migración 00013). |
| `quality_score`, `quality_score_breakdown` | numeric / jsonb | |
| `created_at`, `updated_at` | timestamps | |

### Las **dos columnas de estado** son ortogonales

| Columna | Significado | Quién la setea | Aplica a |
|---|---|---|---|
| `is_active` | ¿El aviso sigue vivo en el portal de origen? | Scraper (auto baja al no verlo en el crawl) | Solo scrapeadas |
| `listing_status` | Workflow editorial del broker | Cargador `/admin` (manualmente) | Solo mías (CHECK constraint enforza) |

El **filtro público** combina ambas con AND:
```
source IN ('owner_direct','agency') AND listing_status = 'publicada'
```
Vive como constantes en `lib/db/property-sources.ts` y se aplica en 6
surfaces: home grid, home stats, `/p/[id]`, `/buscar`, `/favoritos`,
`/p/[id]/servicios` (action de checkout).

### Storage: bucket `property-photos`

- Migración 00012.
- Lectura pública (URLs servidas por Supabase CDN).
- Escritura admin-only (RLS via `public.is_admin()`).
- 10 MB por archivo, JPEG/PNG/WebP.
- Layout: `<propertyId>/<uuid>.<ext>`.
- Server Actions tienen body limit subido a 12 MB en `next.config.ts`.

### Otras tablas (legacy del upstream, siguen funcionando)

- `users` — perfiles de app extendiendo `auth.users`. Solo vos vas a estar acá.
- `search_profiles`, `favorites`, `alerts` — sistema de matching buyer-side del upstream. Sigue activo para que vos puedas usarlo "como comprador" si querés.
- `service_orders` — informes ARBA pagos via MercadoPago (Block 7 del upstream).
- `property_history` — audit log de cambios. Migración 00014 sumó
  `price_at_change` + `price_currency_at_change`: una baja sin el precio al
  que se cayó contesta cuándo, no a cuánto, y el precio de la fila se pisa
  apenas el aviso vuelve — que es el caso interesante.
- `property_groups` — dedup cross-source.
- `geocoding_cache` — Nominatim TTL 90d.
- `arba_lookups` — ARBA WFS TTL 180d (con GeoJSON crudo). **Admin-read
  por RLS**: tiene una fila por cada aviso scrapeado, o sea el rastro del
  crawl. `/p/[id]` la lee con el admin client del lado del servidor,
  acotado a una propiedad que ya pasó el filtro público. Migración 00015
  agregó `by_partida` al enum de estrategias (las propiedades propias se
  cachean bajo el centro de su parcela, no bajo coordenadas geocodificadas).

---

## Build map

### Fases hechas (este fork)

1. **Fase 0 — Separación + Limpieza** ✅
2. **Fase 1 — Cargador de propiedades** ✅ (+ Polish B)
3. **Fase 2 — Rediseño de la home pública** ✅ (5 bloques, mergeado)
4. **Fase 3 — Dashboard de mercado v1** ✅ (`/admin/mercado`)
5. **Fase 4 — Rediseño de `/p/[id]`** ✅ (layout 2-col + fix USD/m²)
6. **Fase 5 — Dark mode slate + polish** ✅
7. **Fase 6 — Animaciones scroll-triggered** ✅
8. **Fase 7 — Contacto/leads (WhatsApp)** ✅ (CTA primario)
9. **Fase 8 — Limpieza legacy en cara pública** ✅ ("esconder no borrar")
10. **Deploy a producción (Vercel)** ✅ 12-ago-2026 — vinculado por la
    integración GitHub, auto-deploy desde `main`
11. **Fase 9 — Auth legible en producción** ✅ 24-ago-2026
12. **Fase 10 — Pipeline revivido** ✅ 27-ago (25 → 251 avisos/corrida)
13. **Fase 11 — Integridad de la data de mercado** ✅ 27-ago
14. **Fase 12 — El USD/m² dice la verdad** ✅ 27-ago
15. **Fase 13 — El centro de datos crece** ✅ 27-ago (cambios + mapa)
16. **Fase 14 — El mapa muestra la parcela** ✅ 27-ago
17. **Fase 15 — Navegación y tema** ✅ 27-ago
18. **Fase 16 — Mapas de verdad** ✅ 27-ago (zona de cobertura sobre tiles)
19. **Fase 17 — El mapa tiene proveedor** ✅ 28-ago (MapTiler + 2 bugs de pintado)
20. **Fase 18 — Cargar sin navegador** ✅ 28-ago (`npm run cargar-propiedad`)
21. **Fase 19 — La primera carga real** ✅ 28-ago (4 unidades + 4 bugs destapados)
22. **Fase 20 — Edificios, galería y ficha PDF** ✅ 28-ago
23. **Fase 21 — El match funciona sin cuenta** ✅ 31-ago
24. **Fase 22 — Superficie y antigüedad en el match** ✅ 31-ago (migración 00016)
25. **Fase 23 — `/propiedades` y `/edificios`** ✅ 31-ago
26. **Fase 24 — Acomodar la home** ✅ 31-ago
27. **Fase 25 — ARBA sale del eje del discurso** ✅ 1-sep (+ portada del edificio ampliable)
28. **Fase 26 — El match en la barra de pestañas** ✅ 1-sep
29. **Fase 27 — Transiciones y vida** ✅ 1-sep (páginas, tema, panel)
30. **Fase 28 — Auditoría de performance** ✅ 1-sep (la lentitud era la región)
31. **Fase 29 — Se va lo que era del portal viejo** ✅ 1-sep (Quality Score + historial)
32. **Fase 30 — El sitio deja de hablar como auditor** ✅ 1-sep
33. **Fase 31 — El lugar de la matrícula, construido y apagado** ✅ 1-sep
34. **Fase 32 — La guarda de desactivación fallaba abierta** ✅ 1-sep
35. **Fase 33 — Los botones llegan a 44px y el CTA se hace ver** ✅ 1-sep
36. **Fase 34 — La protagonista deja de parecer rota** ✅ 1-sep
37. **Fase 35 — La segunda foto de la protagonista** ✅ 1-sep
38. **Fase 36 — Los alquileres existen y se diferencian** ✅ 2-sep
39. **Fase 37 — La operación va en la etiqueta del tipo** ✅ 2-sep
40. **Fase 38 — La guarda fallaba abierta otra vez** ✅ 2-sep

Detalles de cada fase en **Current progress** más arriba.

### Próximo

**1. Cargar propiedades reales** ← lo único que separa al sitio de lanzar

Hay 4 publicadas, las cuatro de 2 ambientes de Belgrano 1287. Lo siguiente
son el **loft dúplex** y el **3 ambientes de planta baja** del mismo
edificio: los datos están en el folleto y **lo único que falta son las fotos**.
Dos caminos:

- **Formulario:** `/admin/properties/nueva`.
- **Desde un JSON:** `npm run cargar-propiedad -- ficha.json [--dry-run]`
  (`docs/ejemplo-propiedad.json` es la plantilla, ya incluye `year_built`).

**2. Correr `npm run pipeline` seguido** ← ahora es la única forma en que corre

Cada corrida acumula historial que no se puede reconstruir después.
Además, dos features del centro de datos están construidas y **esperando
datos** para tener algo que mostrar:

- **Republicaciones** — un aviso que se da de baja y vuelve más barato.
  Los cimientos están (las reactivaciones se registran, con precio), pero
  hasta que no pase una de verdad **con los arreglos puestos**, no hay
  nada que detectar.
- **Series temporales de USD/m²** — necesitan meses.

**3. La matrícula del martillero** ← una línea, esperando el número

**Ya está construido y apagado.** El bloque vive en el lugar que dejó el
"100%" de la home y se dibuja solo cuando hay número: `MARTILLERO.matricula`
en `lib/brand/contact.ts` está en `""`, y todo lo que la muestra pasa antes
por `hasMatricula()`. Hoy la home cierra en el párrafo, sin ningún hueco.

Para encenderlo: escribir el número en esa constante. Nada más. Opcionalmente
`colegio` para que diga de quién es la matrícula.

**Por qué se dejó vacío y no con un placeholder:** un número de matrícula
impreso en una página pública es una afirmación sobre la situación de una
persona ante un cuerpo profesional. No se puede inventar, ni redondear, ni
poner "Matrícula ___" — mal o inventado es peor que ausente, y un rótulo sin
número anuncia que el sitio está sin terminar justo en el párrafo que pide que
le crean.

Falta decidir además si va también en el pie y en la ficha.

**4. El desglose de superficie** ← decidido el 1-sep, es lo próximo

Junta los dos puntos que estaban separados (el USD/m² ponderado y la
superficie cubierta del scraper). Iban separados porque uno dependía del otro;
van juntos porque el segundo es la única forma de hacer el primero.

**El problema.** Hoy el USD/m² divide por una sola superficie. Para una casa
eso mide el lote, no lo construido. Y 40 m² cubiertos más 40 de terraza no
valen lo mismo que 80 cubiertos — está a la vista en el propio catálogo:

| Unidad | Total | Cubierta | USD/m² |
|---|---|---|---|
| 1°A · 1°B | 40 | 40 | **2.000** |
| 2°A · 2°B | 80 | 40 | **1.200** |

Las de arriba son la misma planta con una terraza encima. Cuestan USD 16.000
más y aparecen 40% más baratas por metro.

**Por qué falta el dato.** Zonaprop publica "superficie total" en la página de
resultados y el desglose cubierto/descubierto sólo dentro de cada aviso.
Medido: llega en el **1%** de las 558 filas. La antigüedad falta por lo mismo.

**El enfoque decidido — no traer todo, traer los nuevos.** El techo de
Zonaprop es por corrida y por IP (~9 pedidos), no de por vida. Entrar a los
558 avisos de una es imposible; entrar a **los nuevos de cada día** entra
holgado: son 13 a 30, y ni siquiera todos los días.

  - De acá en adelante, cada aviso nuevo se abre una vez y se le saca el
    desglose. Se paga una sola vez por aviso, para siempre.
  - Los 558 que ya están quedan incompletos, o se completan de a poco con lo
    que sobre del presupuesto de pedidos en cada corrida.

En algunas semanas hay masa suficiente para sacar cuánto vale el m² cubierto y
cuánto el descubierto en la zona, que es lo que el punto necesita. Beneficio
lateral: la ficha individual también trae la antigüedad.

**Ojo con el orden:** esto suma pedidos a una corrida que ya vive contra un
techo. Conviene gastar primero el presupuesto en las páginas de listado (que
es lo que mantiene el catálogo al día) y usar lo que sobre para las fichas.

**5. Los 44px que faltan** ← ya casi cerrado

Nav, CTA del hero y CTA de la protagonista pasaron a 44-46px el 1-sep. Queda
sólo el **logo (24px)**, y para ese Tomy pidió otra cosa: acuse al toque, ya
hecho. Se cierra cuando se decida si el logo también sube.

**6. Mapa de búsqueda público**

`components/map/AreaMap` ya es agnóstico y está probado con 324 puntos.
El público es una capa fina encima: cambian de dónde salen los puntos y
qué hace la selección. Esperando inventario — con 2 fichas no se puede
evaluar si está bien resuelto.

**7. Configurador de precio en la ficha** ← ideas de Tomy, 28-ago

Una unidad no tiene un precio, tiene una tabla. Belgrano 1287 la muestra
cruda: contado o financiado, con cochera o sin. El sitio tiene **un** campo
`price_amount`, y hoy la ficha publica el piso —contado sin cochera— y el
resto queda en la descripción, que es texto muerto.

Dos piezas, la misma función:

- **Botón de cochera** que suma su valor y recalcula el precio en vivo.
- **Recuadro de financiación** con el cálculo hecho: anticipo del 60%,
  saldo hasta en 30 cuotas fijas en dólares, sobre el valor financiado (que
  no es el de contado).

Ojo con una decisión de datos que esto obliga: hoy el precio es un número
en una columna. Un configurador necesita **una estructura** —valor base,
suplemento de cochera, valor financiado— y eso es una tabla nueva o un
jsonb, no un campo más. Vale pensarlo antes de escribirlo, porque el
`price_amount` plano es lo que consumen el Quality Score, los comparables
y el dashboard de mercado: si el precio pasa a ser un objeto, el número
que esos tres leen tiene que seguir siendo el de contado sin extras.

**8. Ponderar cubierto y descubierto en el precio** ← *absorbido por el punto 4*, se deja el detalle

Hoy el USD/m² divide por una sola superficie. Pero 40 m² cubiertos más 40
de terraza no valen lo mismo que 80 cubiertos, y el mercado ya sabe cuánto
menos: está en las 515 scrapeadas. La idea es **sacar de esa data el valor
del m² cubierto y el del descubierto por separado** y ponderar con eso.

Sirve para dos cosas distintas:

- **Tasar** — dar un precio sugerido para una unidad propia a partir de su
  mezcla de superficies, en vez de a ojo.
- **Comparar** — que el Quality Score deje de premiar o castigar mal a una
  propiedad con mucha expansión. Hoy `effectiveSurface` toma una sola
  superficie y los comparables terminan mezclando peras con manzanas.

**Ya tiene un caso concreto en el catálogo propio.** Belgrano 1287, las
cuatro unidades del mismo edificio, cargadas el 28-ago:

| Unidad | Total | Cubierta | USD/m² | Score |
|---|---|---|---|---|
| 1°A · 1°B | 40 | 40 | **2.000** | 69 · 65 |
| 2°A · 2°B | 80 | 40 | **1.200** | **77** |

Las de arriba son la misma planta con una terraza de 40 m² encima. Cuestan
USD 16.000 más y aparecen **40% más baratas por metro**. Y el Quality Score
les da 77 contra 69 y 65, en buena parte porque el sub-score de precio lee
esos USD 1.200/m² como una ganga contra los comparables. La terraza puntúa
dos veces: una como superficie y otra como precio por metro.

El dato de entrada es el problema, y es exactamente el del punto 9:
Zonaprop publica "superficie total" en el listado y el desglose
cubierto/descubierto solo en la ficha individual. Sin ese desglose no hay
de dónde separar los dos m². **Este punto depende del 9.**

**9. Superficie cubierta en el scraper** ← *absorbido por el punto 4*

El USD/m² de casas mide el lote, no lo construido, porque Zonaprop
publica "superficie total". Los avisos **sí** muestran cubiertos y
descubiertos, pero en la **ficha individual**, no en el listado. Sacarlo
son 251 pedidos extra por corrida contra un techo de ~9. Bloqueado por
el mismo límite que el scraping, no por falta de código.

**10. Dominio propio + verificación en Resend**

Necesario recién cuando se encienda el informe ARBA pago. Hoy no bloquea.

**11. Automatizar el pipeline**

Tarea programada de Windows, diferida a propósito. Ojo con la premisa: desde
el 27-ago **GitHub Actions corrió solo todos los días**, hasta que el 1-sep se
apagó el cron justamente porque no puede traer volumen: Zonaprop bloquea sus
IPs. Automatizar significa hoy **automatizarlo en la PC de Tomy**, que es la
que tiene IP de casa.

### Nice-to-haves post-lanzamiento

- Form de contacto por mail vía Resend para quien no usa WhatsApp
  (baja prioridad — el canal principal ya cubre el caso de uso).
- Galería fullscreen con swipe (espera múltiples fotos por propiedad).
- Eliminación total de surfaces legacy buyer-facing (`/buscar`,
  `/favoritos`, `/onboarding`, `/mis-servicios`, `/busquedas`) — hoy
  esconden sus CTAs públicos pero las rutas viven. Borrar solo si Tomy
  confirma que no las quiere como herramienta personal.

---

## Coding Conventions

### Naming
- **Files:** `kebab-case.tsx` para componentes, `camelCase.ts` para utils
- **Components:** `PascalCase`
- **Functions:** `camelCase`, verbos descriptivos (`getPropertyById`, no `property`)
- **Constants:** `SCREAMING_SNAKE_CASE` a nivel módulo
- **Types/Interfaces:** `PascalCase`, sin prefijo `I`
- **Database:** `snake_case` (convención Postgres)

### Component patterns
- Server Components por default. `"use client"` solo si hace falta.
- Co-locar lógica específica del componente.
- Props siempre tipadas con interface (no inline).

### Database access
- Cliente Supabase tipado.
- Todas las queries pasan por `/lib/db/`.
- Nunca SQL crudo en componentes ni API routes.
- Usar transacciones (`rpc`) para operaciones multi-paso.

### Error handling
- Throw typed errors.
- Server actions devuelven `{ ok: true, data } | { ok: false, error }`.
- Loguear errores a Sentry; nunca tragar silenciosamente.
- Mensajes user-friendly en español, no strings crudos de error.

### Testing
- Vitest para lógica pura (scoring, matching, validators, partidos).
- 176 tests passing al cierre de Fase 1.B.
- No buscar 100% cobertura. Cobertura de high-impact.

### Comments
- Código debe ser self-documenting por naming.
- Comentarios explican el **por qué**, no el qué.
- JSDoc en funciones públicas de `/lib`.

---

## Antes de tocar cualquier cosa visual

**Regla dura:** antes de modificar componentes visuales, layout, estilos,
tipografía, colores, spacing, copy de UI, o tomar cualquier decisión de
diseño — **leer `DIRECCION_DE_ARTE.md`** (vive en la raíz del repo).

Aplica a:
- Cambios en `app/page.tsx` (landing), `/p/[id]`, `/guia-de-compra`,
  o cualquier surface pública.
- Componentes de `components/property/`, `components/scoring/`,
  `components/home/`, `components/shared/`.
- Tokens en `lib/brand/`, `globals.css`, Tailwind config.
- Cualquier propuesta de "este botón se ve mejor así" / "movamos esto" /
  "cambiemos la jerarquía".

NO aplica a (lectura de DIRECCION_DE_ARTE no obligatoria):
- Cambios de lógica de negocio, queries, schemas, server actions sin
  impacto visual.
- Fixes de bugs que solo restauran comportamiento previo.
- Refactors internos sin cambio de UI.

Si la decisión que vas a tomar afecta cómo SE VE algo, leer el doc primero
y referenciar la sección relevante en el commit/explicación.

---

## What NOT to do

- ❌ No proponer nuevo stack sin confirmación explícita.
- ❌ No usar `any` en TypeScript.
- ❌ No acceder a la DB directo desde componentes — siempre por `/lib/db`.
- ❌ No guardar secretos en código (usar env vars + Vercel env config).
- ❌ No escribir lógica en API routes — extraer a `/lib` y llamar.
- ❌ No optimizar prematuramente. Hacelo andar, después acelerá.
- ❌ No usar fetching client-side en páginas SEO-críticas (Server Components).
- ❌ No romper el principio mobile-first por conveniencia desktop.
- ❌ **No filtrar `SUPABASE_MANAGEMENT_TOKEN`** — solo shell substitution.
- ❌ **No mostrar propiedades scrapeadas en surfaces públicas**. El filtro
  combinado (source + listing_status) en `lib/db/property-sources.ts` es la
  fuente de verdad. Cualquier query nueva que vaya al público tiene que
  honrarlo.
- ❌ **No escribir `listing_status` para propiedades scrapeadas**. La
  CHECK constraint en DB lo bloquea, pero el código no debería intentarlo
  tampoco.
- ❌ **No reactivar el registro público** — el modelo es admin único.
- ❌ **No nombrar a ARBA en copy que lea un visitante.** Decisión de Tomy
  (1-sep): el discurso público habla de "los registros oficiales" o "el
  catastro", no de la agencia. **La verificación no cambió** — la consulta
  a la parcela sigue corriendo y sigue habilitando el chip "Propiedad
  verificada" y el porcentaje de la home. La única excepción es el
  catálogo de documentos de `/guia-de-compra`, donde "quién lo emite" es
  la pregunta que la sección contesta. Los nombres internos
  (`surface_arba`, `arbaLookup`, `arba_lookups`) se quedan: describen de
  dónde sale el dato, que es exactamente lo que un nombre debe hacer.

---

## Domain Glossary

Términos en español usados en el código y la UI:

| Term | English | Notes |
|---|---|---|
| Partida | Tax ID | ARBA's identifier for a parcel (9 dígitos, primeros 3 = partido) |
| Nomenclatura catastral | Cadastral nomenclature | Format: Partido-Circunscripción-Sección-Manzana-Parcela (43 chars) |
| Partido | District | División administrativa PBA |
| ARBA | Provincial tax agency | Buenos Aires province |
| SIC | Cadastral Info System | ARBA's public/professional system |
| WFS | Web Feature Service | Estándar OGC; geo.arba.gov.ar lo expone público |
| Informe de dominio | Dominion report | Property ownership/encumbrance report |
| Cédula catastral | Cadastral certificate | Official property data document |
| Certificado catastral | Cadastral certificate (escrow-grade) | Required for property transfer |
| Estado parcelario | Parcel status | Survey of parcel (surveyor-issued) |
| Martillero / Corredor | Real estate broker | Licensed professional |
| Escritura | Deed | Legal property transfer document |
| Escribano | Notary | Required for property deeds |
| Boleto de compraventa | Sale agreement | Preliminary purchase contract |
| Inhibición | Personal restriction | Restriction on a person's property rights |
| Embargo | Lien | Legal claim against property |
| Borrador | Draft | `listing_status` inicial — no se publica |
| Publicada | Published | `listing_status` visible al público |
| Vendida | Sold | `listing_status` archivada — no se publica pero no se borra |

---

## Environment Variables

Vars requeridas (en `.env.local` para dev, Vercel env para prod).
`.env.example` etiqueta cada una con dónde tiene que estar seteada
(`[Vercel + local]`, `[Vercel only]`, `[Local only]`, `[Opcional]`) —
esa es la fuente de verdad, no esta lista.

Ojo con un malentendido recurrente: **`RESEND_API_KEY` no tiene nada que
ver con los emails de recuperación de contraseña.** Esos los manda
Supabase Auth con su propia config SMTP, que vive del lado de Supabase y
se toca por Management API o dashboard, no por env vars de la app. La
`RESEND_API_KEY` solo alimenta los emails transaccionales que manda el
código nuestro (`lib/services/email/`).

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                        # transaction pooler — migrations (db-run) y
                                     # consultas (db-query). Supabase muestra esta
                                     # password UNA sola vez; si se pierde, la única
                                     # salida es resetearla en Settings → Database
                                     # (pasó el 28-ago). Que el pooler conteste
                                     # "password authentication failed for user
                                     # postgres" con el usuario postgres.<ref> bien
                                     # escrito significa que encontró el proyecto y
                                     # rechazó la clave: es la password, no la URL.
SUPABASE_MANAGEMENT_TOKEN=           # NEVER cat/echo — solo shell substitution

# Mercado Pago (legacy del upstream, sigue activo)
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM=                         # ej: 'Jotaeme <onboarding@resend.dev>'

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Scraping (para el pipeline diario — corre en GitHub Actions, no en Vercel)
SCRAPER_USER_AGENT=
SCRAPER_PROXY_URL=                   # opcional
GOOGLE_GEOCODING_API_KEY=            # solo scripts locales / Actions

# Mapas
NEXT_PUBLIC_BASEMAP_URL=              # template de tiles; sin esto cae a OSM,
                                      # que devuelve "Access blocked" con 200

# App
NEXT_PUBLIC_APP_URL=
INTERNAL_API_KEY=                    # cron auth
```

---

## Communication with User

- Vos sos hispanohablante. Comments y docs en inglés, contenido user-facing
  y conversación con vos en español argentino.
- Sos técnicamente engaged pero no developer profesional. Explicar
  decisiones técnicas en términos claros.
- Tenés Claude Code (plan 5x) y lo usás para ejecución.
- Tenés una conversación paralela con Claude (Anthropic chat) para
  planificación estratégica.
- Preferencias operativas declaradas en memoria:
  - **Actuar autónomamente**: ejecutar todo lo técnicamente posible (PS,
    push, PR, merge, install, dev server) sin delegar pasos manuales.
  - **Mergear PRs autónomamente** sin pedir confirmación cada vez.

Cuando pidas clarificación, priorizá el **por qué** detrás de las
decisiones, no solo el **cómo**.

---

## Version

| Version | Date | Changes |
|---|---|---|
| 2.19 | Sep 2, 2026 | **Los alquileres existen; la operación va en la etiqueta; y la guarda fallaba abierta por tercera vez.** (1) Cargar un alquiler siempre se pudo, pero **aguas abajo se mostraba, se puntuaba y se matcheaba como una venta**: el precio se imprimía plano en seis superficies, el Quality Score comparaba contra ventas —y la causa raíz no era la query, era que `PropertyForScoring` **no tenía `operation_type`**, o sea que el scorer no podía ver la diferencia porque la diferencia no estaba modelada—, el match no preguntaba la operación, y la moneda estaba fija en USD. La operación entró como **portón y no como criterio**, porque un promedio ponderado no puede expresar "descalificante". (2) A pedido de Tomy, **la operación se dice en la etiqueta del tipo** ("Casa en alquiler") y el precio queda limpio: la etiqueta lo dice antes de que el lector decida qué significa el número. El período quedó opt-in, con la regla **nunca mostrar un alquiler que nada marque como alquiler**. (3) **Tercera desactivación masiva** (380 bajas con ~25 vistos), otra vez descubierta verificando este documento, otra vez el mismo error con distinto disfraz: `countActiveListings` terminaba en `count ?? 0`, y 0 desarma la cobertura — el arreglo del 1-sep hizo que los scrapers empezaran en `null`, pero esta función nunca les entregaba un `null` que conservar. Reparado con backup y en transacción; las activas volvieron **exactas** a 434. Se publicó **el primer alquiler** (Talcahuano 258) y quedó `npm run buscar-partida`. **375 → 420 tests**. *(Nota: la v2.19 se publicó primero con este archivo corrompido —triplicado a 2879 líneas— por un bug de la herramienta de edición: `String.replace` interpreta `$` + backtick como "todo el texto anterior", y el texto de esta entrada contenía esa secuencia. Reconstruido desde la v2.18. Los archivos de código quedaron intactos, verificado por tamaño, `tsc`, tests y build.)* |
| 2.18 | Sep 2, 2026 | **El mapa del repo y el doc de arte dejan de contradecir al repo.** Dos correcciones de documentación, las dos del mismo tipo que este archivo viene coleccionando: afirmaciones plausibles que nadie volvió a chequear. **(1) El Project Structure tenía huecos y un puntero roto.** Decía `components/search/ — SearchProfileForm` y esa carpeta **estaba vacía**: el form vive en `components/search-profile/`. Faltaban además `components/payment/`, `components/services/`, `lib/property/` (el `verified-data.ts` que decide no nombrar a ARBA y no hablar como auditor — o sea el módulo donde viven dos decisiones que el propio doc explica largo) y `lib/services/storage/`, que es el bucket de informes pagos y **no** es `lib/storage/`, el de fotos. `lib/matching/` figuraba **dos veces**, con dos descripciones distintas. Y faltaba la migración **00015b**, que indexa `arba_lookups` por partida: sin ella la lectura de las propiedades propias no tiene índice, así que omitirla del mapa es omitir justo la que sostiene la vía por partida. Se borraron las dos carpetas vacías (`components/search/` y `lib/services/resend/`, las dos con un `.gitkeep` y nada más — los wrappers de Resend están en `lib/services/email/`). **(2) `DIRECCION_DE_ARTE.md` §5 mandaba usar Framer Motion**, listada bajo "Stack disponible (ya en el proyecto)", cuando **no está instalada** y todo el movimiento sale de CSS + `use-in-view.ts` + View Transitions. La contradicción no era teórica: el doc de arte es de lectura obligatoria antes de tocar cualquier cosa visual, así que la regla dura mandaba leer un archivo que pedía sumar una librería contra la que el §3 del mismo archivo decide ("gana mobile") y que costaría el presupuesto de peso que hoy está en 262 kB de 500. Ahora §5 dice que no hay librería, por qué, y remite al vocabulario ya construido en *Cómo se mueve el sitio*. Sin cambios de código: 375 tests, 41 rutas. |
| 2.17 | Sep 1, 2026 | **La segunda foto, y por qué costó tres rondas.** El recuadro detrás de la propiedad destacada nunca fue decorativo: **era el hueco de una segunda foto**, y por eso se leía como una imagen que no cargó — lo era. Tomy lo dijo tres veces y las tres se interpretó como un problema de aspecto (se achicó el recuadro, se le sacó la grilla, se lo eliminó); ninguna era la respuesta. Vale como recordatorio de que **cuando alguien repite el mismo reporte, lo que falla es la interpretación, no la ejecución**. Ahora `photos[1]` ocupa ese lugar con la principal encima, inclinadas en abanico. Dos trampas técnicas de la misma tanda quedan escritas en *Cómo se mueve el sitio*: un keyframe que escribe `transform` **pisa** las clases de `skew`/`rotate`, y el JSX pasado como prop de servidor a cliente **necesita `key`** — este último era el warning de consola que el proyecto arrastraba desde antes de la sesión y que se había dado por preexistente sin diagnosticar. |
| 2.16 | Sep 1, 2026 | **Cierre real del 1-sep.** Los 44px que faltaban ya están (nav 28 → 44, los dos CTA 35 → 46) y el CTA de la portada lleva un brillo diagonal cada 7s. La protagonista es **Belgrano 1287 2°A** — la primera vez que la landing muestra una propiedad. Y ahí aparecieron dos cosas que sólo se ven mirando: el bloque detrás de la foto era gris con cuadrícula, o sea el dibujo universal de un placeholder, y Tomy lo reportó **dos veces** como "la imagen que no se ve" — achicarlo no alcanzó porque el problema era qué parecía, no cuánto se veía; y la propiedad más visible del sitio mostraba **239,23 m² para un 2 ambientes de 80**, que es el bug de la Fase 12 sobreviviendo justo donde nadie miraba porque hasta ese día no había destacada. **El cron del pipeline se apagó** a pedido de Tomy: traía 45 avisos de 430 y siempre los mismos, lo que sesgaba `last_seen_at` y con él antigüedad y días en mercado. La primera corrida manual sin cron vio 229, insertó 4 y capturó dos bajas de precio y **una republicación real**. Y la nota de método de la v2.10 se completa: **los screenshots también mienten con el panel oculto**, porque los reveals no disparan y la captura sale sin contenido — eso hizo que dos reportes visuales se contestaran con números en vez de con lo que se ve. 372 → **375 tests**. |
| 2.15 | Sep 1, 2026 | **La guarda de desactivación fallaba abierta, y se descubrió verificando este documento.** Chequear la tabla de contenido contra la base mostró 45 activas donde el doc decía 429: una segunda desactivación masiva, 375 bajas con **11% de cobertura**, o sea exactamente lo que la condición 3 de la guarda existe para frenar. No lo frenó porque `activeCount === 0` saltea el test entero, y los dos scrapers leían el baseline con un `try/catch` que dejaba 0 al fallar — **la lectura más frágil de la corrida era la que apagaba la guarda contra esa misma fragilidad**, escrito como si fuera una decisión de diseño y con un test que lo fijaba. Arreglado haciendo que "no sé" sea un estado distinto de "cero": `number \| null`, donde `null` rechaza antes de cualquier aritmética y 0 sigue habilitando porque un baseline vacío de verdad no arriesga nada. Reparado con backup y en una transacción — 357 revividas, 393 filas de historial inventado borradas, sin registrar la reparación como reactivación (lección del 31-ago) — y los números volvieron **exactos** a los del 31-ago, 429 activas y 279 eventos, que es la mejor evidencia de que el recorte estuvo bien acotado. Queda dicho lo que no se recupera: `deactivateStale` pisa `last_seen_at`, así que una baja falsa no es del todo reversible. 372 → **375 tests**. |
| 2.14 | Sep 1, 2026 | **Cierre de la sesión del 1-sep — y verificar los números destapó una regresión grave.** Al chequear las cifras de este documento contra la base apareció que **las scrapeadas activas cayeron de 429 a 45**: 375 bajas de zonaprop en un lote, el 1-sep a las 10:00 UTC. Es el incidente del 31-ago repitiéndose **con la guarda puesta y conectada**, y la contradicción a explicar es nítida: para que la guarda autorizara, el crawl tuvo que reportar ~210 vistos, pero si hubiera visto 210 hoy habría 210 activos — hay 45. Sospecha anotada, sin tocar código: `decideDeactivation` decide con `allScraped.length` y `deactivateStale` protege `seenExternalIds`, que son poblaciones distintas. Pasa a ser el punto 1 del Build map. Aparte: Queda construido y **apagado** el lugar de la **matrícula del martillero**, que es el ancla de credibilidad que quedó sola cuando el Quality Score se fue de la cara pública: `MARTILLERO.matricula` está en `""` y todo lo que la muestra pasa por `hasMatricula()`, así que hoy la home cierra en el párrafo sin ningún hueco y se enciende escribiendo el número. Vacío y no un placeholder a propósito — una matrícula impresa en público es una afirmación sobre la situación de una persona ante un cuerpo profesional, y un rótulo sin número anuncia que el sitio está sin terminar justo en el párrafo que pide que le crean. **Y el documento volvió a tener números mal**: decía **42 rutas** y son **41** (contadas una por una contra el build — no falta ninguna, era error de conteo), **279 eventos** de historial cuando hay **672**, **562** filas cuando hay **563**, y apuntaba a `lib/market/crawl-completeness.ts` cuando ese módulo vive en `lib/services/scrapers/`. Se contaron una por una contra el build — no falta ninguna, era un error de conteo. Junto con el `match.ts` de la v2.9, el Quality Score que "había salido entero" y GitHub Actions "muerto" de la v2.8, el patrón ya no admite duda: **este documento se equivoca sobre sí mismo con cifras plausibles, y hay que verificarlas contra el build y la base, no releerlas.** 367 → **372 tests** (los nuevos cubren la matrícula y, de paso, `whatsappLink` y `propertyLeadMessage`, que eran el canal principal de contacto sin un solo test). |
| 2.13 | Sep 1, 2026 | **El sitio deja de hablar como auditor del aviso de otro.** Tomy señaló el bloque de verificación de la home y "Datos oficiales" de la ficha, y los dos tenían el mismo problema que el historial y el Quality Score. Se nota en las palabras: *"no publicamos lo que dice **el aviso**"*, *"m² **declarados** en la propiedad"*, *"lo que **pudimos** verificar"*, *"superficie **no verificable**"*. Todo eso describe a alguien revisando la ficha de un tercero a ver si miente, que era exactamente el producto del portal upstream. Acá la publicación es nuestra: la partida la escribimos nosotros, los metros los cargamos nosotros, y lo que falta falta porque todavía no lo cargamos — que es lo que el texto dice ahora, en vez de insinuar que alguien lo escondió. La home pasó a **"Publicamos los papeles, no solo las fotos"**, que es lo que el sitio realmente hace y lo que lo diferencia. Y **se cayó el "100%"**: esa cifra sólo podía decir una de dos cosas y ninguna valía el espacio — en 100% repite el título (claro que está todo verificado, verificar es lo que hacemos antes de publicar) y por debajo lo contradice; de paso se llevó dos consultas de conteo por carga de la home. El lugar que dejó libre le corresponde a la **matrícula del martillero**, que es lo único ahí que un desconocido no puede afirmar y que no está en el código porque nadie tipeó el número — nuevo punto del Build map. |
| 2.12 | Sep 1, 2026 | **Se va lo último que quedaba del portal agregador.** El Quality Score sale de los tres lugares donde un visitante todavía lo veía: el medallón del hero de `/p/[id]`, la **ficha PDF** —la peor, porque se descarga y se reenvía, así que el número salía del sitio y seguía viaje sin nada que lo explicara— y el medallón de la protagonista, que se había defendido como gesto de diseño cuando el gesto es la foto rompiendo el cuadrante y el medallón era solo lo que colgaba de él. Sigue ordenando el catálogo y mandando en `/admin`. Y sale el **"Historial"** de la ficha, que decía *"Lo seguimos hace 3 días"*: eso es lenguaje de un portal donde seguir el aviso de **otro** a lo largo del tiempo era el producto y el comprador quería saber si el precio se había movido antes de que él llegara. Acá la publicación es nuestra. `property_history` sigue registrando todo y sigue siendo la materia prima de `/admin/mercado`, que es donde ese dato significa algo — y sacarlo de la ficha se lleva de paso una consulta de hasta 50 filas en la página que más tarda en abrir. |
| 2.11 | Sep 1, 2026 | **La lentitud era geografía, y ahora está medida de las dos puntas.** Tomy reportó que cambiar de pestaña y abrir una propiedad tardaban, y que venía de hace rato. No era código: **la base está en San Pablo y la función corría en Washington**, el default de Vercel que nadie eligió, así que cada consulta cruzaba el continente. Aislado con una ruta dinámica sin consultas como testigo — estática 0,35s, dinámica-sin-consultas 0,39s, dinámica-con-dos-consultas 1,13s — o sea **~375ms por consulta**, y nada de eso eran bytes: el payload de una navegación es de 5 a 8 kB. Se arregló en dos commits separados para poder atribuir cada mejora: código (el catálogo del header, que corría en cada página pública sin haber cambiado desde la última publicación, pasa a cachearse entre requests con tag; el header deja de esperar en fila; los íconos de Leaflet dejan de venir de unpkg) y región (`vercel.json` → `gru1`). **`/edificios` pasó de 1,23–2,54s a 0,34s**, contra una línea base estática de 0,35s: las consultas dejaron de costar. Abrir una propiedad, de 990–1283ms a 247–508ms. **Recursos: sanos** — heap de 11 MB contra un límite de 4.096, 428 nodos DOM que vuelven exactamente a 428 tras seis navegaciones, sin fugas. De paso apareció un bug latente: publicar una propiedad revalidaba solo `/`, de cuando la landing era el catálogo, así que `/propiedades` y `/edificios` seguían sirviendo el set anterior. Y otra vez la trampa del panel oculto: ahí `setTimeout` se estrangula a ~1s y cualquier cronómetro propio devuelve 1000ms para todo — las mediciones que valen son las del navegador y las de curl. |
| 2.10 | Sep 1, 2026 | **Pasada de movimiento: el sitio deja de cortar en seco.** Entre páginas no había transición y desde que la Fase 23 partió la cara pública en tres, moverse entre páginas es lo principal que hace un visitante — cada click cambiaba la pantalla entera en un frame. Ahora hay entrada de página, la página que se va se recuesta, y el click se acusa con una barra bajo el link (`useLinkStatus`). **No hay skeletons a propósito**: Next mantiene la página actual hasta que la siguiente está lista, y para una espera de 300ms eso es mejor que vaciar a un esqueleto — lo que faltaba nunca fue el destino, era la respuesta al toque. El **cambio de tema** pasó de un frame duro a un círculo que crece desde el botón (View Transitions, un solo paso compuesto; `disableTransitionOnChange` se queda porque transicionar cada color por separado es justo lo que arrastra en un teléfono). Movimiento nuevo en `/edificios` y en la guía. El panel tiene el suyo, más quieto. **Dos bugs propios, cazados antes de subir:** `Reveal` pedía `threshold: 0.3`, que es **aritméticamente imposible** para algo más alto que ~3 viewports — la etapa 4 de la guía habría quedado invisible para siempre; y `transition.finished` rechaza al abortar, así que `.finally()` dejaba rechazos sin manejar en cada abort. Y una nota de método: **el panel del navegador oculto no corre rAF, ni transiciones, ni IntersectionObserver**, así que varias mediciones de animación de esta sesión no probaban nada hasta confirmar `visibilityState`. Nuevo en el Build map: **el cambio de pestaña se siente lento** (reportado por Tomy, sin diagnosticar). 367 tests, peso sin cambios. |
| 2.9 | Sep 1, 2026 | **ARBA sale del eje del discurso, el match sube a la barra, y mobile deja de ser una aspiración para ser una medición.** La cara pública lideraba con el nombre de una agencia de recaudación provincial: el bloque de la home se titulaba "Verificación catastral" y explicaba qué es ARBA *antes* de decir para qué sirve. Cambió **cómo se cuenta, no qué se chequea** — la consulta a la parcela sigue corriendo y sigue habilitando el chip y el porcentaje. ARBA queda nombrada en un solo lugar y a propósito: el catálogo de documentos de la guía, donde "quién lo emite" es la pregunta que esa sección existe para contestar. El match, que vivía al pie de la landing y en ningún otro lado —o sea inalcanzable para quien entra por `/propiedades`, que es la página que muestra las propiedades— ahora se abre desde el header. **Mobile:** Tomy lo probó cinco minutos en el teléfono y anda bien; sobre esa impresión hay ahora una barrida medida a 375px que confirma lo importante (cero overflow horizontal en las cuatro surfaces públicas, 262 kB contra un techo de 500) y encuentra lo que la prueba a mano no delata: la regla de 44px se cumple en los controles protagonistas y no en los secundarios —nav de 28px, CTA del hero de 35px—. Y el documento volvió a mentir en dos cosas que él mismo afirmaba: `match.ts` **ya** no usa `surface_arba` para cruzar contra un comprador (se arregló el 31-ago), y el Quality Score **no** salió entero de la cara pública — sigue en el medallón del hero de `/p/[id]` y en la ficha PDF. **360 → 367 tests**. |
| 2.8 | Aug 31, 2026 | **La cara pública se reordenó, y el match dejó de ser invisible.** El `MatchScoreCard` estaba en la ficha desde siempre detrás de una condición que **ningún visitante podía cumplir**: el match exigía un `search_profile`, o sea cuenta con onboarding, en un sitio sin registro público. Ahora las preguntas se responden en la página y la cuenta se hace en el navegador — el algoritmo no se tocó, era puro, solo faltaba de dónde sacar el perfil. El Quality Score le dejó el lugar en la ficha, y salió también de las cards y de la home: seguía explicándose en la landing un número que el visitante ya no veía en ningún lado donde pudiera actuar sobre él. El catálogo salió de la landing a **`/propiedades`** y apareció **`/edificios`**. Se sumaron superficie y antigüedad al match (migración 00016 `year_built`, que no existía: las únicas fechas de la tabla eran de publicación). Y otra vez un número creíble era un bug, el más caro hasta ahora: **una corrida bloqueada de Zonaprop se declaró completa y dio de baja 359 avisos**, de los cuales 208 se probaron vivos esa misma noche — una página bloqueada está igual de vacía que la siguiente al último resultado, y solo se atajaba el 403 explícito. La guarda nueva es aritmética y no lee la página, porque la marca de "sin resultados" no se pudo verificar. Se repararon los datos (154 revividas, 564 filas de historial inventado borradas) preservando **3 republicaciones reales**, las primeras. De paso se corrigió el propio `CLAUDE.md`: **GitHub Actions no está muerto** — corre solo y escribe en producción desde el 27-ago. **319 → 360 tests**, 38 → 42 rutas. |
| 2.7 | Aug 28, 2026 | **El catálogo dejó de ser una vitrina de una sola ficha, y cargar de verdad rompió cuatro cosas.** Entraron las cuatro unidades de 2 ambientes de Belgrano 1287 con el cargador CLI. Con una propiedad ninguna de estas se veía: el cargador scoreaba sin `warmUp()` del cache de comparables; la card mostraba los 239 m² de la parcela sobre una unidad de 40; y sobre todo **la coherencia ARBA marcaba en rojo al 79% de los departamentos por ser departamentos** —40 m² declarados contra una parcela de 239 puntuaban 20/100— justo en la página cuya promesa es la verificación catastral. Es la Fase 12 otra vez, en los dos lugares que no se revisaron. Parkeado, con las bandas guardadas como spec de vuelta; el rescoreo de las 380 movió los verdes de 79 a 106. Después, tres piezas nuevas: **edificios por parcela** (dos unidades con la misma nomenclatura están en el mismo edificio: es una definición, y ya agrupa 17 parcelas de la data scrapeada, una con diez unidades), **galería de fotos** (el hero mostraba 1 de 18) y **ficha PDF** descargable. Los servicios pagos quedaron escondidos detrás de un flag. Y la guía de compra pasó de decirle al lector que fuera a sacar sus propios informes a decir de qué se encarga JM, cambiando el modelo de datos y no solo el copy. **316 → 319 tests** (+7 skipped a propósito). |
| 2.6 | Aug 28, 2026 | **Cargar propiedades sin abrir el navegador.** `npm run cargar-propiedad -- ficha.json` hace lo mismo que `/admin/properties/nueva` desde un JSON, reutilizando las piezas del cargador web en vez de reimplementarlas. La idea es que Claude arme la ficha a partir de una descripción y una carpeta de fotos. Entra siempre como borrador y publicar sigue pasando por `canPublishProperty`. Las dos guardas que tiene salieron de pensar cuál es el riesgo propio de cargar desde archivo y no desde un form: la falla no es que explote, es que **salga bien y quede mal** — un `precio` en vez de `price_amount`, o un `"ochenta mil"` que el schema de borrador nulifica en silencio. Las dos ahora son error. Aparte, se documentan dos cosas que costaron esta sesión: el pipeline muere con `Executable doesn't exist` cuando sube la versión de Playwright y hay que correr `npx playwright install`, y la password de `DATABASE_URL` se resetea porque Supabase no la vuelve a mostrar nunca. **304 → 316 tests.** |
| 2.5 | Aug 28, 2026 | **El mapa ya no es prestado, y tres bugs salieron de atrás de los efectos.** El bloque de cobertura cambió de basemap dos veces en un día y las dos fueron descartadas por el mismo motivo, que vale documentar: **CARTO y OSM devuelven HTTP 200 con la imagen de rechazo adentro** —"API KEY REQUIRED" estampada en diagonal, "Access blocked"— así que verificar por status o por peso no alcanza; hay que mirar los píxeles. Lo de OSM era además inevitable: son servidores de voluntarios cuya política prohíbe justamente esto, y no era solo la home, `/p/[id]` y el mapa de mercado le pegaban directo. Ahora hay proveedor propio (MapTiler, `landscape`, origins cerrados) detrás de `NEXT_PUBLIC_BASEMAP_URL`, una variable para los tres mapas, con la atribución deducida de la URL. Y apareció lo que probablemente explicaba **todas** las rondas anteriores de "el basemap le gana al hexágono": **el mapa pintaba encima del polígono** —`absolute` sobre estático gana sin importar el orden del DOM— y el marco cubría también el caption. El difuminado de bordes, que era otra curita del mismo problema, se reemplazó por esquinas apenas redondeadas. Heptágono de 7 vértices y match al 100 en azul de marca, vía un token propio y **sin** tocar el dorado del Quality Score, que comparten diez surfaces. **300 → 304 tests.** |
| 2.4 | Aug 27, 2026 | **Mapas.** El bloque de verificación de la home dibujaba un hexágono inventado —el código lo llamaba `"a believable parcel"`— junto a un párrafo que promete el polígono exacto. Ahora muestra la zona de cobertura sobre tiles reales, con Lanús, Banfield y Temperley legibles debajo. Se escribió la aritmética de tiles a mano para no cargar Leaflet en la landing (~45 kB por un recuadro estático), y `projectToView` para que polígono y mapa compartan proyección: en una versión intermedia no la compartían y la parcela se dibujaba cruzando la Avenida Hipólito Yrigoyen. **275 → 300 tests.** Queda sin resolver el equilibrio visual entre el mapa y el hexágono — ver punto 3 del Build map. |
| 2.3 | Aug 27, 2026 | **Seis fases en un día, y todas empezaron como un bug que parecía un dato.** El pipeline llevaba 90 corridas muertas (los forks no heredan secrets) y, una vez arreglado eso, seguía trayendo cero: Zonaprop rechaza el segundo pedido de cada sesión de navegador. Una sesión por página lo llevó de 25 a **251 avisos por corrida**. Después salieron a la luz tres números que mentían con cara de precisos: la desactivación inventaba bajas por un tope "(testing)" de 50 que nunca se sacó (317 falsas, limpiadas); el historial registraba bajas y no altas, dejando la detección de republicaciones ciega desde la base; y el USD/m² dividía por la superficie del **terreno** — 487 contra 2.024 en departamentos. El centro de datos pasó de un dashboard a tres pantallas (dashboard, cambios, mapa con selección por área). Y el polígono de ARBA, que es la evidencia visual de todo el pitch del sitio, **no se había dibujado nunca**: tres fallas encadenadas, la raíz una política de RLS. **216 → 275 tests**, 34 → 37 rutas, migraciones 00014 y 00015. |
| 2.2 | Aug 24, 2026 | **Sync con el estado real, tras reconstruir el entorno en una PC nueva.** Se corrigieron seis afirmaciones falsas de la v2.1: (1) el deploy a Vercel no estaba pendiente — está hecho desde el 12-ago y con integración GitHub, la nota "nunca vinculado, no hay `vercel.json` ni `.vercel`" apuntaba a la evidencia equivocada porque la integración Git no deja rastro en el repo; (2) el SMTP nunca estuvo roto — la causa era `rate_limit_email_sent = 2/hora` amplificado por un form que ocultaba el 429; (3) el pipeline no "sigue corriendo" — dispara pero falla desde el run #1 por secrets faltantes en el fork; (4) 206 tests → **216**; (5) 25 rutas → 34; (6) faltaba la Fase 9 entera. Build map reordenado por leverage: el pipeline va primero porque el historial de mercado no se puede reconstruir hacia atrás. Se agregó `lib/auth/` al Project Structure y dos secciones nuevas de estado (email/auth y pipeline). |
| 2.1 | Aug 12, 2026 | **Actualización pre-deploy.** El rediseño de home + `/p/[id]` + dashboard de mercado + WhatsApp + limpieza legacy están todos mergeados a `main` (HEAD `873b744`). Current progress reescrito como tabla de 8 fases (2-8 son nuevas). Build map colapsado: solo queda **Deploy a Vercel** como bloqueante. **206 tests passing** (+30 desde 2.0), `npm run build` verde (25 rutas). Se agregó `is_featured` al schema; `use-in-view.ts` a hooks; `mercado/` a admin; `WhatsAppButton` + `WhatsAppFloat` + `HomeHero/Protagonist/Guarantees/Catalog` + `PropertyPremiumCard` al Project Structure. |
| 2.0 | May 27, 2026 | **Fork inicializado.** Rewrite completo del CLAUDE.md para reflejar la identidad del proyecto (inmobiliaria personal, no portal buyer-facing). Conserva historia upstream como referencia. Listado de hitos del fork: separación + cargador + polish B. **176 tests passing** sobre la base de 146 del upstream. |
| 1.x | upstream | Las entradas anteriores (1.0 a 1.19) describen la construcción del portal buyer-facing original (`Tomito-co54/Jotaeme`). Preservadas como historia para entender por qué existen ciertas piezas (matching score, search profiles, /buscar, /favoritos, BuyingProcessAdvisor, MercadoPago + informe ARBA, etc.). |

### Upstream history (preservada como referencia)

| Version | Date | Changes |
|---|---|---|
| 1.19 | May 19, 2026 | Día de pulido + features post-MVP. MP real-fix end-to-end. Landing rica (catálogo + features + stats live). `/guia-de-compra`. Dark mode theme tokens. Buying-process advisor (migración 00010). PRs #6-#17 mergeados. |
| 1.18 | May 18, 2026 | **Block 7 cerrado (upstream MVP feature-complete).** Servicios automatizados pagos end-to-end (MercadoPago + informe ARBA en PDF). Migraciones 00008+00009. 146 tests. |
| 1.17 | May 18, 2026 | Tipografía: Geist → Inter + Fraunces. Bugfix `--font-sans: var(--font-sans)` auto-referenciado. |
| 1.16 | May 18, 2026 | **Block 6 cerrado.** Discovery + retención: `/buscar`, `/favoritos`, `<PropertyCard>` reusable, `<NotificationBell>`, `detect-alerts.ts` + Resend templates. 117 tests. |
| 1.15 | May 17, 2026 | **Block 5 cerrado.** Match score subjetivo. `lib/matching/` 7 sub-scores. Migración 00007. Onboarding + /busquedas CRUD. 104 tests. |
| 1.14 | May 17, 2026 | **Block 4 cerrado.** Vista pública `/p/[id]` mobile-first. Marca lockeada (navy + dorado). Mapa Leaflet + polígono ARBA. Tooltips educativos. Score visualization compartido entre admin y público. 66 tests. |
| 1.13 | May 17, 2026 | **Block 3 cerrado.** Quality Score: 5 sub-scores + renormalización por confianza + algoritmo `v1`. 34 tests. |
| 1.12 | May 17, 2026 | **Block 2 cerrado.** Property history helpers + admin UI enriquecida con días-en-mercado, diff de precio, clasificación de eventos. |
| 1.11 | May 17, 2026 | B2.5: GitHub Actions pipeline (pivot desde Vercel Cron por límite de 10s). |
| 1.10 | May 17, 2026 | B2.3: ARBA SIC via WFS GeoServer. `arba_lookups` cache 180d. INTERSECTS-then-DWITHIN(30m). |
| 1.9 | May 17, 2026 | B2.4: Nominatim geocoding + 90d cache + `ensurePropertyCoordinates`. |
| 1.8 | May 17, 2026 | B2.2: `property_groups` + fuzzy address matcher + `/admin/groups`. |
| 1.7 | May 17, 2026 | B2.1b: Trezza scraper (infinite scroll, JSON-LD prices). |
| 1.6 | May 16, 2026 | B2.1: Zonaprop scraper end-to-end (25 propiedades Lomas). |
| 1.5 | May 16, 2026 | **Block 1 cerrado.** Vercel + Sentry + Analytics. |
| 1.4 | May 16, 2026 | B1.5: Admin panel (dashboard + properties list+detail + users list). |
| 1.3 | May 16, 2026 | B1.4: Auth (email/password, OAuth pending). |
| 1.2 | May 16, 2026 | B1.3: Supabase schema + RLS + seed. |
| 1.1 | May 16, 2026 | B1.1 + B1.2. Proyecto: Jotaeme. |
| 1.0 | May 2026 | MVP scope locked, stack confirmado, build order set. |
