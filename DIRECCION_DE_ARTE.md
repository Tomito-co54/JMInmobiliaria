# Dirección de arte — Jotaeme

> Documento de contexto para diseño. No es un brief de cliente: es la base conceptual
> que define cómo se ve, se mueve y se siente esta página. Leer **completo** antes de
> escribir cualquier componente visual, animación o estilo. Ante una duda de diseño no
> resuelta acá, la regla de oro manda (ver al final).

---

## 0. Qué es esto y para quién

Jotaeme es el sitio de una inmobiliaria personal en el sur del Gran Buenos Aires
(Argentina). No es un portal agregador ni una agencia tradicional: es una plataforma
**que trabaja para el comprador**. Invierte la asimetría de información del mercado
inmobiliario con datos verificados, un score de calidad por propiedad, y la firma de un
martillero matriculado que responde por lo que publica.

El usuario es un comprador B2C, muchas veces primerizo, navegando casi siempre **desde
el celular**. Llega desconfiado —el rubro le enseñó a desconfiar— y la página tiene que
ganarse esa confianza.

**Tensión central del diseño, y la idea más importante de todo este documento:**
la seriedad NO la aporta un diseño tímido. La aportan los datos verificados, el score y
el martillero matriculado. Eso es el ancla de credibilidad. Y *justamente porque el
fondo es serio*, la forma queda libre para ser audaz, original y memorable sin parecer
poco confiable. Un diseño aburrido sería desperdiciar esa libertad. El traje puede ser
llamativo porque quien lo usa ya demostró que es serio.

---

## 1. ADN visual: "Tech con alma"

Preciso como un producto de software bien hecho (referencia: Linear, Vaulk), pero
**cálido**, no frío ni corporativo. Ni el lujo distante de una galería de arte (le diría
al comprador de zona sur "esto no es para vos"), ni el parque de diversiones que tapa el
mensaje. El punto medio exacto: una herramienta seria que se siente humana.

Atributos, en orden de prioridad:
1. **Confiable** — todo comunica que acá no hay letra chica.
2. **Original** — no parece una plantilla. Tiene identidad propia.
3. **Cálido** — humano, no robótico. Cercano sin ser informal.
4. **Preciso** — cada detalle está cuidado. La prolijidad ES el lujo.

---

## 2. Los seis principios de movimiento

Estos seis principios salieron de un análisis de páginas premiadas (Awwwards/CSS Design
Awards). Son las reglas de oro del comportamiento visual. Cada uno trae su corrección:
qué tomar y qué NO hacer.

### Principio rector que gobierna a los otros seis
**Movimiento con intención, nunca de adorno.** Toda animación tiene que *hacer* algo:
revelar información, explicar un proceso, guiar la mirada o premiar una acción. Si un
movimiento no cumple ninguna de esas cuatro funciones, se elimina. La elegancia está en
la restricción, no en la cantidad de efectos.

### 2.1 Profundidad en eje Z, con intención
Los elementos pueden vivir en planos distintos y acercarse/alejarse (escala + opacidad +
blur sutil) para dar sensación de profundidad sin 3D real.
- **HACER:** usar la profundidad para *revelar* o *jerarquizar* — una propiedad que se
  acerca cuando entra en foco, un dato que viene hacia el lector.
- **NO HACER:** usar el acercamiento/alejamiento solo como transición de salida
  decorativa (una tarjeta que se "va hacia el fondo" solo para hacerle lugar a la
  siguiente). Eso se ve premium pero es vacío, y se siente genérico.

### 2.2 Hover/tap que revela al instante
Al interactuar con un elemento, se revela información relacionada de inmediato (una foto,
un dato del score, una vista de la propiedad).
- **HACER:** premiar la curiosidad con respuesta inmediata y fluida.
- **CRÍTICO — MOBILE:** en celular NO hay hover. El dedo toca y listo. Todo efecto de
  hover debe tener un equivalente táctil claro (tap que expande, primer tap revela /
  segundo confirma, o el dato ya visible sin requerir hover). Nunca esconder info
  esencial detrás de un hover que en mobile no existe.

### 2.3 Procesos como secuencia animada paso a paso
Cuando haya un proceso (sobre todo el flujo **verificación → documentación →
escrituración**), contarlo como una secuencia numerada que se anima a medida que el
usuario avanza. El movimiento explica, no decora.
- **HACER:** que el recorrido del comprador se entienda visualmente, paso a paso.
- Esta es la oportunidad más fuerte de la página para convertir el movimiento en
  pedagogía y confianza a la vez.

### 2.4 Transiciones que nunca cortan en seco
Ningún cambio de estado o de vista es un corte abrupto. Todo encadena con suavidad.
- **HACER:** continuidad entre secciones y estados; el ojo nunca pega un salto brusco.
- **NO HACER:** cortes secos, "pops", apariciones de golpe sin transición.

### 2.5 Mundo cohesivo, nada de "sabor a librería"
Componentes que se sienten diseñados para *esta* página, no piezas reconocibles de un
framework genérico. Sin estética "AI slop": sin las fuentes de siempre, sin el degradé
violeta sobre blanco, sin layouts predecibles.
- **HACER:** sistema visual propio y coherente de punta a punta.
- **NO HACER:** dejar componentes con el look default de la librería de turno.

### 2.6 El recorte que sobresale del cuadrante (gesto de marca)
La firma visual de Jotaeme. Imágenes de propiedades **recortadas a contorno** (PNG con
fondo removido) que sobresalen de su contenedor, invaden la sección de al lado, pisan el
texto. Es el "3D" de Jotaeme: NO es Three.js ni objetos que rotan; es composición
editorial con capas CSS, liviana y mobile-friendly.
- **HACER:** usarlo como gesto puntual y protagonista (la propiedad destacada que rompe
  el margen), sostenido por un grid invisible rígido por detrás que ordena el caos
  aparente.
- **NO HACER:** abusar — si todo rompe el cuadrante, nada lo rompe. Es un golpe de
  efecto, no un patrón repetido en cada bloque.

---

## 3. El espectro y nuestro lugar en él

Para calibrar la ambición, cinco referencias de menor a mayor complejidad:

- **Lagom** (profundidad Z usada como transición) — *demasiado normal.* Es el piso.
- **Loud** (hover que revela + interacción deliberada) — interacción con personalidad.
- **Vaulk** (proceso animado + fluidez total) — **objetivo de ejecución.** Audaz pero
  liviano y prolijo. Producto serísimo (bunkers) con forma elegante: la prueba de que
  fondo serio + forma audaz conviven.
- **Hubtown** (mundo propio autoconstruido, zoom continuo) — **objetivo de creatividad,**
  pero su techo de peso es justo lo que NO queremos.

**El lugar de Jotaeme: entre Vaulk y Hubtown.** La creatividad y la identidad propia de
Hubtown, ejecutadas con la liviandad y prolijidad de Vaulk. Creativo y memorable, pero
que vuele en un celular de gama media en zona sur. Si hay que elegir entre un efecto
espectacular y que la página cargue rápido en mobile, **gana mobile.**

---

## 4. Restricciones técnicas (no negociables)

- **Mobile-first de verdad.** No "responsive como para que entre". Diseñar primero para
  el pulgar y la pantalla chica, y que escale hacia arriba.
- **Performance es parte del diseño.** Parallax, animaciones y efectos hover se usan con
  moderación y medidos. Una animación que traba el scroll en mobile es un bug, no un
  detalle. Preferir animaciones CSS y transform/opacity (que corren en GPU) por sobre
  todo lo que fuerce reflow.
- **El recorte que sobresale se hace con PNG recortados + capas CSS,** no con 3D real.
- **Nada de motores pesados (WebGL/canvas continuo estilo Hubtown)** salvo decisión
  explícita y acotada a un solo momento protagonista.
- **Las animaciones nunca esconden los CTA** ni la información esencial.
- **Accesibilidad:** respetar `prefers-reduced-motion` (si el usuario pidió menos
  movimiento, se lo damos). Contraste suficiente. Foco visible.

---

## 5. Stack disponible (ya en el proyecto)

- **Next.js 15 (App Router) + React 19 + TypeScript.**
- **Tailwind 4 + shadcn/ui + base-ui** para estilos y componentes base.
- **Fuentes ya instaladas: Inter (cuerpo) y Fraunces (display serif).** Fraunces tiene
  mucho carácter y da el toque "alma/editorial"; Inter es seguro pero genérico. Explorar
  apoyarse fuerte en Fraunces para los momentos de personalidad y, si se justifica,
  evaluar una alternativa de cuerpo más distintiva que Inter sin romper legibilidad ni
  performance.
- **Framer Motion / Motion** es la librería indicada para las animaciones en React
  (entradas escalonadas, scroll-triggered, transiciones de estado).
- **Leaflet** ya está para mapas.

No cambiar de tecnología. Todo lo de este documento se construye sobre este stack.

---

## 6. Qué evitar (lista negra de "AI slop")

- Fuentes genéricas como protagonista (Arial, Roboto, system; Inter solo como cuerpo
  discreto, nunca como la personalidad de la marca).
- Degradé violeta/púrpura sobre fondo blanco (el cliché AI por excelencia).
- Grid de fichas todas iguales como única forma de mostrar propiedades.
- Scroll vertical por bloques numerados sin ninguna otra idea (el piso "Lagom").
- Movimiento de adorno sin función.
- Cortes secos entre estados.
- Componentes con el look default de la librería.

---

## 7. La regla de oro (resuelve cualquier duda no contemplada)

Ante cualquier decisión de diseño que este documento no cubra, preguntarse, en este
orden:

1. **¿Refuerza la confianza** (o al menos no la traiciona)? El fondo serio es sagrado.
2. **¿Tiene intención** el movimiento, o es adorno?
3. **¿Vuela en un celular de gama media?** Si no, se simplifica.
4. **¿Se siente propio,** o sabe a plantilla?

Si las cuatro dan que sí, es Jotaeme. Si alguna da que no, se corrige hasta que dé que sí.

> **Norte en una frase:** identidad propia y movimiento con intención, ejecutados con la
> liviandad de Vaulk y la creatividad de Hubtown, donde el fondo serio (datos, score,
> martillero) le da permiso a la forma para ser audaz.
