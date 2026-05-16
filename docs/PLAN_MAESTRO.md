# 📘 Plan Maestro del Proyecto

> **Plataforma Inmobiliaria — Argentina (zona sur GBA)**
>
> Documento de referencia estratégico-conceptual del proyecto.
> Versión 1.0 — Documento vivo, se actualiza con el avance.

---

## 📑 Índice

1. [Identidad del Proyecto](#1-identidad-del-proyecto)
2. [Propuesta de Valor](#2-propuesta-de-valor)
3. [Análisis del Mercado](#3-análisis-del-mercado)
4. [Segmentación y Posicionamiento](#4-segmentación-y-posicionamiento)
5. [Arquitectura Conceptual del Producto](#5-arquitectura-conceptual-del-producto)
6. [Diseño de Producto](#6-diseño-de-producto)
7. [Modelo de Monetización](#7-modelo-de-monetización)
8. [MVP — Producto Mínimo Viable](#8-mvp--producto-mínimo-viable)
9. [Roadmap por Fases](#9-roadmap-por-fases)
10. [Métricas Clave](#10-métricas-clave)
11. [Aspectos Legales y Regulatorios](#11-aspectos-legales-y-regulatorios)
12. [Trampas a Evitar](#12-trampas-a-evitar)
13. [Principios Rectores](#13-principios-rectores)

---

## 1. Identidad del Proyecto

### Visión

> **"La primera plataforma inmobiliaria de Argentina que trabaja para el comprador, no para el que publica."**

### Misión

Volcar la asimetría de información del mercado inmobiliario argentino a favor del comprador, traduciendo la complejidad burocrática y registral en una experiencia digital intuitiva, transparente y accesible.

### Visión de largo plazo

Convertirse en la infraestructura tecnológica y de servicios sobre la que se montan las operaciones inmobiliarias en Argentina, expandiéndose progresivamente desde verificación e información hacia servicios financieros (originación de hipotecas, financiación propia con análisis actuarial).

---

## 2. Propuesta de Valor

### Frase central

**"Información verificada, scoring transparente y servicios automatizados que vuelcan el equilibrio de información a favor de quien decide la compra más importante de su vida."**

### Los dos pilares

#### Pilar 1 — Información volcada al comprador

El mercado inmobiliario argentino opera con asimetría brutal contra el comprador:

- El vendedor sabe el precio real, los problemas dominiales, hace cuánto la propiedad no se vende.
- El comprador llega ciego y los portales actuales perpetúan esa ceguera porque su cliente que paga es quien publica.

Nuestra plataforma invierte ese equilibrio:

- Scoring objetivo de cada propiedad basado en variables verificables.
- Datos cruzados con fuentes oficiales (ARBA, registro, catastro).
- Histórico real (tiempo en venta, bajas de precio, comparables de la zona).
- Documentación verificada o señalada como faltante.

#### Pilar 2 — Traducción de la complejidad en experiencia intuitiva

Los datos existen — el problema es que están en jerga catastral, registral y notarial que el comprador promedio no entiende.

Nuestra plataforma actúa como un **traductor visual**:

- Información cruda → dashboard tipo videojuego (scores, barras, semáforos).
- Términos técnicos → tooltips en lenguaje común.
- Documentos oficiales → íconos de verificación (✅ ⚠️ 🚨).
- Procesos burocráticos → checklist guiado paso a paso.

El comprador siente **control e información**, no abrumamiento.

### Diferenciación vs el status quo

| Dimensión | Portales actuales | Nuestra plataforma |
|---|---|---|
| Cliente que paga | Quien publica | Servicios + suscripciones + publicidad |
| Datos mostrados | Lo que dice el publicante | Lo que dicen las fuentes oficiales |
| Tiempo en venta | Oculto | Visible y verificable |
| Vendedor | Foto + teléfono | Score basado en operaciones |
| Documentación | "Consultar" | Estado verificado |
| UX | Listings genéricos | Dashboard intuitivo mobile-first |
| Trámites | Por tu cuenta | Automatizados desde plataforma |
| Costos totales | Sorpresa al final | Calculadora desde el inicio |

---

## 3. Análisis del Mercado

### Contexto macro (2025-2026)

Vivimos un momento estructuralmente favorable:

- **Vuelta del crédito hipotecario** después de una década: en 2025 más del 15% de escrituras fueron con hipoteca, el nivel más alto desde 2018.
- **Cambio estructural, no coyuntural**: una generación entera quedó sin acceso a vivienda. El regreso del crédito genera demanda real.
- **Eliminación del impuesto cedular** sobre venta de inmuebles → menos fricción para vendedores.
- **Conflicto ARBA** (mayo 2026) paraliza escrituras en PBA → muestra la fragilidad burocrática que nuestra plataforma podría aliviar.

### El cementerio de quienes intentaron antes

**Mudafy** es el caso más relevante:

- Proptech argentina fundada en 2019, levantó USD 10M de Founders Fund.
- Intentó ser broker tecnológico completo.
- Despidió al 70% del personal en enero 2023.

**Por qué fracasó (y qué aprendemos):**

1. Modelo intensivo en capital, dependiente de rondas VC que se cortaron.
2. No tenía negocio ancla que generara caja propia.
3. Operaba en un mercado argentino sin crédito hipotecario.

**Nuestra estrategia evita las tres trampas:**

- Bootstrap inicial sin presión de VC.
- Servicios automatizados como motor de ingresos desde el día 1.
- Mercado ya activado por el regreso del crédito.

### Ecosistema actual

- **127 startups proptech activas** en Argentina (datos noviembre 2025).
- **USD 284M invertidos** en el sector en los últimos 18 meses.
- **Ninguna** ocupa específicamente el espacio "comprador-céntrico" con servicios automatizados.

### Dolores del mercado por segmento

#### Comprador
- Burocracia salvaje y opaca (60+ días paralizadas las escrituras en PBA).
- Incertidumbre temporal (entre 10 y 45 días para una escritura, en el mejor caso).
- Operaciones encadenadas son una pesadilla.
- Falta de claridad sobre costos totales (5-8% de sorpresas al final).

#### Vendedor / Dueño Directo
- Desconfianza generalizada — estigma fuerte contra el "dueño directo".
- Falta de acceso a verificaciones que dan seguridad.
- Alto riesgo de fraude.
- Difusión limitada vs inmobiliarias.

#### Inmobiliaria pequeña/mediana
- Tarifas de Zonaprop/Argenprop cada vez más caras sin proporcional aumento de leads útiles.
- Falta de herramientas tecnológicas (operan con Excel + WhatsApp).
- Cumplimiento regulatorio creciente (UIF, antilavado).

#### Inversor
- No hay información comparable real (precios de cierre, rentabilidad por zona, tasa de vacancia).
- Falta de transparencia estructural.

---

## 4. Segmentación y Posicionamiento

### Segmento focal Año 1

**Comprador final (B2C)** en **zona sur del GBA**: Lomas de Zamora, Banfield, Lanús, Avellaneda, Quilmes y alrededores.

### Por qué este segmento

- Es el segmento estructuralmente desatendido (los portales sirven al que publica).
- Tu ubicación geográfica permite alianzas locales y conocimiento del territorio.
- Volumen suficiente de operaciones para validar el modelo (sin necesidad de cubrir todo PBA).
- Matrícula única en Lomas habilita toda PBA para expansión futura.

### Expansión natural

```
Zona Sur GBA (Año 1)
   ↓
Resto de PBA (Año 1-2) — misma matrícula
   ↓
CABA (Año 2) — requiere matrícula CUCICBA
   ↓
Otras provincias (Año 2-3) — alianzas locales
```

---

## 5. Arquitectura Conceptual del Producto

### Principios transversales

1. **Mobile-first radical** — todo se diseña primero para celular, después se adapta a desktop.
2. **Datos verificados sobre lo declarado** — siempre que haya fuente oficial, se cruza.
3. **Traducción visual** — la complejidad se vuelve dashboard intuitivo.
4. **El comprador es el centro** — cada decisión se evalúa contra "¿esto le sirve a quien busca?".

### Las piezas estructurales

```
INFRAESTRUCTURA COMPARTIDA
┌─────────────────────────────────────────┐
│ 1. DATOS VERIFICADOS                     │
│    ARBA, scraping, registro, geo         │
│                                          │
│ 2. SCORE DE CALIDAD                      │
│    Objetivo, sobre la propiedad          │
│                                          │
│ 3. TRADUCCIÓN VISUAL                     │
│    Dashboard mobile-first                │
└─────────────────────────────────────────┘

MODO COMPRADOR
┌─────────────────────────────────────────┐
│ 4. PERFIL + SCORE DE MATCH               │
│    Subjetivo, relación usuario-propiedad │
│                                          │
│ 5. SERVICIOS AUTOMATIZADOS               │
│    Monetización + alimentación de datos  │
│                                          │
│ + Capa de acompañamiento (ciclo finito)  │
│ + Capa de referidos post-cierre          │
└─────────────────────────────────────────┘

MODO EXPLORADOR (Fase 2)
┌─────────────────────────────────────────┐
│ 6. CONTENIDO EDITORIAL / CURADURÍA       │
│ 7. VISUALIZACIONES DE MERCADO            │
│                                          │
│ + Monetización vía publicidad            │
└─────────────────────────────────────────┘
```

### Los dos modos de consumo

| Modo Comprador | Modo Explorador |
|---|---|
| Crea perfil | No crea perfil (o lo crea light) |
| Recibe matches | Consume contenido y galerías |
| Contrata servicios | Genera tráfico y datos |
| Convierte → operación | Eventualmente puede activarse como comprador |
| Ciclo finito (3-6 meses activo) | Uso recreativo, sin objetivo claro |
| Monetización directa por servicios | Monetización indirecta por publicidad |

Ambos modos comparten infraestructura pero operan con interfaces diferenciadas.

### Sobre la "retención"

Importante: nuestro producto tiene **usuarios con ciclo de vida finito** (el comprador entra al mercado, compra, y se va por años). La retención NO es vitalicia, es **intra-ciclo**.

Esto cambia las métricas:
- No medimos DAU/MAU eternos.
- Medimos permanencia durante el ciclo activo + tasa de conversión + referidos post-cierre.

El motor de crecimiento principal no es retención, es **referidos**: cada usuario que cierra contento se vuelve evangelista para amigos/familia.

---

## 6. Diseño de Producto

### El "wow moment" (lo que impacta la primera vez)

El usuario entra a ver una propiedad y, además de fotos y precio, ve un dashboard con:

- Score grande con color tipo semáforo.
- Tiempo real en venta.
- Comparación con la zona.
- Datos catastrales verificados (ARBA).
- Plano catastral oficial integrado.
- Iconografía de verificación junto a cada dato declarado.

En 5 segundos, el usuario entiende: **¿esta propiedad es lo que dice ser, o no?**

### La "contención" (lo que hace volver durante el ciclo activo)

1. **Alertas de nuevas propiedades que matchean su perfil** (la más importante — proactiva).
2. **Cambios en score de match** cuando ajusta perfil o aparecen propiedades nuevas.
3. **Bajas de precio** en propiedades guardadas.
4. **Checklist personal** del proceso de compra.

Todo gira alrededor del **perfil de búsqueda** como elemento central de retención.

### El perfil de búsqueda

Nivel: **básicos + objetivos personales** (la decisión que tomamos).

**Bloque básico de propiedad:**
- Zonas con prioridad (preferido / aceptable / descarte).
- Rango de precio.
- Ambientes mínimos y deseados.
- Metros mínimos.
- Tipo (casa, depto, PH, lote).
- Características no negociables (cochera, patio, etc.).

**Bloque de vida personal (el diferencial):**
- Composición familiar (parejas, hijos, edades).
- Lugar de trabajo (para tiempo de traslado real).
- Escuela/jardín de hijos.
- Hobbies que requieren espacio.
- Forma de vida (auto sí/no).
- Plan a futuro (expansión familiar, etc.).

### Los dos scores

| Score de Calidad | Score de Match |
|---|---|
| Qué tan buena es la propiedad en términos absolutos | Qué tan bien le calza al usuario específicamente |
| Objetivo (igual para todos) | Subjetivo (único por usuario) |
| Mide la propiedad | Mide la relación propiedad-usuario |
| Ejemplo: "85/100 — propiedad sólida" | Ejemplo: "95/100 para vos" |

La misma propiedad puede tener score de calidad 60 (no es la mejor del mercado) y score de match 92 para Tomy (cumple todo su criterio). Eso al usuario le importa más.

### Las 5 pantallas críticas del MVP

1. **Home** — primera impresión, sin barrera de registro.
2. **Vista de propiedad** — el wow moment, la pantalla más importante.
3. **Onboarding del perfil** — punto de conversión emocional.
4. **Feed personalizado** — donde sucede la retención.
5. **Flujo de pago** — donde sucede la monetización.

Si estas 5 están excelentes, el producto funciona.

---

## 7. Modelo de Monetización

### Principio rector

**El comprador nunca paga por "usar" la plataforma.** Paga por servicios que contrata voluntariamente cuando avanza en su decisión de compra.

### Fuentes de ingreso priorizadas

| # | Fuente | Quién paga | Tipo | Prioridad |
|---|---|---|---|---|
| 1 | **Servicios automatizados** | Comprador | Transaccional | 🟢 Motor año 1 |
| 2 | **Suscripción inmobiliarias** | Inmobiliaria | Recurrente | 🟡 Motor secundario |
| 3 | **Publicidad servicios complementarios** | Anunciantes B2B | Recurrente | 🔵 Fase 2-3 |
| 4 | **Lead qualification** | Inmobiliaria | Transaccional | 🔵 Fase 2-3 |
| 5 | **Honorarios opcionales** | Usuario que pide intermediación | Transaccional | 🔵 Ingreso ocasional |
| 6 | **Originación hipotecaria** | Bancos | Transaccional | 🔮 Fase 3-4 |
| 7 | **Financiación propia** | Compradores | Recurrente | 🔮 Visión LP |

### Descartado explícitamente

❌ Comisión obligatoria sobre operaciones (regresiva, no capturable técnicamente).
❌ Cobro al comprador por usar la plataforma (rompe principio rector).
❌ Suscripción premium para comprador año 1 (ciclo finito, mejor monetizar vía servicios).

### Lógica de pricing — masividad sobre margen

Decisión estratégica: márgenes ajustados a la baja para favorecer adopción y volumen.

#### Catálogo de servicios con precios

| Servicio | Costo oficial | Precio plataforma | Margen |
|---|---|---|---|
| Informe de dominio (simple) | $22.300 | $29.900 | $7.600 (34%) |
| Informe de dominio (urgente) | $62.800 | $74.900 | $12.100 (19%) |
| Certificado de dominio | $27.800 | $36.900 | $9.100 (33%) |
| Informe de inhibiciones | $22.300 | $29.900 | $7.600 (34%) |
| Informe catastral ARBA | $3.542 | $7.900 | $4.358 (123%) |
| Cédula catastral / CEP | $5.314 | $11.900 | $6.586 (124%) |
| Certificado catastral | $4.428 | $9.900 | $5.472 (124%) |
| Tasación de mercado (algoritmo) | ~$2.000 | $14.900 | $12.900 |
| Tasación formal (con tasador) | $40-60k | $89.900 | ~$35.000 (38%) |
| Estado parcelario completo | $80-150k | $169.900 | ~$45.000 (27%) |
| **Paquete "Compra Segura"** | Suma | **$149.900** | ~$45.000 |

*Datos basados en aranceles oficiales 2026 del Registro de la Propiedad PBA y ARBA.*

#### Tiers para inmobiliarias

| Tier | Precio/mes | Propiedades | Features |
|---|---|---|---|
| **Free** | $0 | Hasta 2 | Listings básicos |
| **Pro** | $35.000 | Hasta 20 | Score destacado + leads + analytics |
| **Premium** | $85.000 | Ilimitadas | Pro + CRM + alertas + soporte prioritario |
| **Enterprise** | A medida | Ilimitadas | Premium + API + multi-usuario + branding |

#### Para dueños directos

- Gratis hasta 2 propiedades (alineado con principio rector).
- $9.900/mes por propiedad adicional.
- Acceso a servicios automatizados como cualquier usuario.

### Proyecciones (orientativas)

| Mes | Visitantes únicos | Compradores activos | Servicios/mes | Ingreso mensual estimado |
|---|---|---|---|---|
| Mes 6 | 100 | 20 | 5 | $200.000 (~USD 145) |
| Mes 12 | 800 | 150 | 60 + 4 paquetes | $2.2M (~USD 1.575) |
| Mes 24 | 5.000 | 800 | 300 + 25 paquetes | $14.4M (~USD 10.300) |

### Punto de equilibrio operativo

- Costos fijos mensuales año 1: ~$300.000.
- **12 servicios/mes a $25.000 de margen promedio = break-even**.
- 40 servicios/mes = vivir tranquilo.
- 100 servicios/mes = vivir bien + reinvertir.
- 200 servicios/mes = contratar primer empleado.
- 500+ servicios/mes = modelo defendible.

---

## 8. MVP — Producto Mínimo Viable

### Definición en una frase

> **"Una plataforma mobile-first donde un comprador de zona sur GBA puede explorar propiedades reales del mercado con datos verificados, recibir un score de calidad y un score personalizado de match, guardar favoritas, recibir alertas, y contratar 2-3 servicios automatizados clave para avanzar con seguridad en su decisión de compra."**

### Los 7 bloques de construcción

#### 🧱 Bloque 1 — Fundación técnica

- Setup del proyecto (repositorio, deploys, entornos)
- Base de datos PostgreSQL en Supabase configurada
- Sistema de autenticación (email + contraseña + Google)
- Roles básicos (usuario, admin)
- Panel de administración interno
- Tracking de analytics básico

**Tiempo estimado:** 1-2 semanas.

#### 🧱 Bloque 2 — Ingesta de datos

- Scraper de Zonaprop para zona sur GBA (Lomas, Banfield, Lanús, Avellaneda, Quilmes)
- Detección de duplicados básica
- Integración con ARBA SIC (datos catastrales por dirección o partida)
- Geolocalización con OpenStreetMap
- Base de datos de propiedades estructurada
- Sistema de actualización periódica (diaria u horaria)
- Histórico de cambios por propiedad

**Tiempo estimado:** 2-4 semanas.

#### 🧱 Bloque 3 — Score de calidad

- Algoritmo de score con 4-5 variables iniciales:
  - Precio vs comparables de la zona
  - Tiempo en venta acumulado
  - Documentación detectable
  - Coherencia entre datos declarados y ARBA
  - Calidad de fotos/descripción
- Sub-scores que componen el total
- Recálculo automático cuando cambian datos

**Tiempo estimado:** 1-2 semanas.

#### 🧱 Bloque 4 — Vista de propiedad mobile-first

- Pantalla de propiedad con carga progresiva por capas
- Galería fullscreen con swipe
- Score visible y desglosable
- Datos verificados con íconos ✅⚠️🚨
- Plano catastral integrado
- Mapa con ubicación exacta
- Tooltips educativos
- CTAs para guardar, contactar, pedir servicios

**Tiempo estimado:** 2-3 semanas.

#### 🧱 Bloque 5 — Perfil de búsqueda + Match score

- Onboarding para crear perfil
- Perfil básico: zonas, precio, ambientes, m², tipo, no-negociables
- Algoritmo de match score
- Visualización del match en cada propiedad
- Explicación de qué cumple y qué no

**Tiempo estimado:** 1-2 semanas.

#### 🧱 Bloque 6 — Listas y alertas

- Buscador con filtros funcionales
- Listado mobile-first de resultados
- Guardar propiedades favoritas
- Alertas por email de nuevas matches
- Alertas de bajas de precio
- Centro de notificaciones in-app

**Tiempo estimado:** 2-3 semanas.

#### 🧱 Bloque 7 — Servicios automatizados

- Catálogo de servicios visible desde cada propiedad
- Integración con MercadoPago
- Sistema de pedidos
- Flujo de informe catastral ARBA
- Flujo de informe de dominio (post-matriculación)
- Tracking del estado del pedido
- Entrega automatizada de PDF
- Sistema de facturación básico

**Tiempo estimado:** 2-3 semanas.

### Orden de construcción

```
[1] Fundación → [2] Ingesta → [3] Score → [4] Vista propiedad
                                              ↓
            [5] Perfil + Match → [6] Alertas → [7] Servicios
```

### Hitos del MVP

| Hito | Semanas | Qué tenés |
|---|---|---|
| **Hito 1** | 6-8 | Producto demostrable (propiedades con datos verificados y score) |
| **Hito 2** | 10-12 | MVP utilizable (usuarios beta pueden buscar) |
| **Hito 3** | 14-18 | MVP completo (monetización activa, alertas funcionando) |

**Total estimado: 4 meses.**

### Lo que NO entra en el MVP

❌ Modo Explorador / Feed Instagram → Fase 2
❌ Publicación de propiedades por inmobiliarias → Fase 2
❌ Publicación por dueños directos → Fase 2
❌ Tier Pro/Premium para inmobiliarias → Fase 2-3
❌ Heatmaps y visualizaciones de mercado → Fase 2
❌ Comparador de propiedades → Fase 2
❌ Tasaciones algorítmicas → Fase 2
❌ Alertas por WhatsApp → Fase 2
❌ App nativa iOS/Android → Fase 3 (PWA por ahora)
❌ Publicidad → Fase 3
❌ Sistema de referidos → Fase 3
❌ Contenido editorial → Fase 3

---

## 9. Roadmap por Fases

### 📌 MVP — Meses 1-4

**Objetivo:** que un comprador real de zona sur pueda usar la plataforma para buscar y contratar al menos un servicio.

**Cierre con:** 20-50 usuarios activos reales, al menos 5 servicios contratados.

### 🚀 Fase 2 — Meses 5-9

**Objetivo:** convertir el MVP en producto robusto y abrir nuevas líneas.

**Features que entran:**
- Onboarding de inmobiliarias y dueños directos
- Tier Pro/Premium para inmobiliarias
- Catálogo ampliado de servicios
- Paquete "Compra Segura"
- Alertas por WhatsApp
- Comparador de propiedades
- Modo Explorador (feed tipo Instagram)
- Curaduría editorial básica
- Heatmap de precios por barrio
- Onboarding del perfil con objetivos personales

**Cierre con:** 200-500 usuarios activos, 10+ inmobiliarias, ingresos sustentables.

### 🎯 Fase 3 — Meses 10-18

**Objetivo:** escalar geográficamente y profundizar diferenciación.

**Features que entran:**
- Expansión a otras zonas de PBA
- Tasación formal con tasadores aliados
- Estado parcelario con agrimensores
- Alianzas con escribanías
- App nativa iOS/Android
- Sistema de referidos
- Contenido educativo
- Publicidad contextual activada
- Dashboard avanzado inmobiliarias
- Lead qualification
- Score predictivo con ML

**Cierre con:** presencia en 2-3 regiones, modelo defendible.

### 🏦 Fase 4 — Año 2+

**Objetivo:** convertirse en infraestructura financiera del mercado inmobiliario.

- Originación de hipotecas (alianzas bancarias)
- Financiación propia con análisis actuarial
- Expansión a CABA (matrícula CUCICBA)
- Expansión a otras provincias
- Posible Serie A con tracción demostrada

### Principio del roadmap

**Cada fase debe estar autosuficiente económicamente antes de pasar a la siguiente.** No se inicia Fase 3 sin que Fase 2 esté generando ingresos predecibles.

---

## 10. Métricas Clave

### Métrica Norte Verdadero

> **NPS / Recomendación activa: ¿le recomendarías esta plataforma a un amigo que está comprando una propiedad?**

Si la gente recomienda activamente, todo lo demás se cae solo. Si no, no importa cuántas features tengas.

### Bloque 1 — ¿La gente entra y vuelve?

| Métrica | Objetivo año 1 |
|---|---|
| Visitantes únicos mensuales | 50 (mes 1) → 800 (mes 12) |
| Tasa de retorno semanal | >25% |
| Tiempo promedio en sitio | >3 minutos |

### Bloque 2 — ¿Pasan de mirar a hacer?

| Métrica | Objetivo año 1 |
|---|---|
| Tasa de registro | >5% de visitantes |
| Propiedades guardadas promedio | >3 por usuario |

### Bloque 3 — ¿Pagan?

| Métrica | Objetivo año 1 |
|---|---|
| Tasa de conversión a servicio pago | >2% de usuarios activos |
| Ticket promedio | $25.000-$40.000 |

### Métricas operativas internas

| Métrica | Objetivo |
|---|---|
| Propiedades activas en base | 3.000-5.000 (zona sur) |
| Datos cruzados con ARBA | >70% de propiedades con datos catastrales |
| Tiempo de actualización de scraping | Diario |
| Uptime de la plataforma | >99% |

---

## 11. Aspectos Legales y Regulatorios

### Matrícula de Martillero

**Estado actual de Tomy:** título obtenido, falta solo trámite de matriculación.

**Rol de la matrícula:** llave técnica, NO modelo de negocio.

**Lo que habilita:**
- ✅ Informes oficiales (dominio, catastral certificado)
- ✅ Cédulas y certificados catastrales
- ✅ Tasaciones formales
- ✅ Cobro de honorarios cuando un usuario solicita intermediación voluntaria

**Lo que NO es:**
- ❌ La identidad de la empresa
- ❌ La fuente principal de ingresos
- ❌ Competencia con inmobiliarias

**Plan:** matricularse en el Colegio Departamental de Lomas de Zamora **cuando estemos cerca de lanzar servicios que la requieran** (no antes, para no pagar cuotas anuales innecesarias).

**Cobertura:** una sola matrícula habilita toda PBA.

### Marco legal aplicable

- **Ley 20.266** (Régimen Legal de Martilleros y Corredores)
- **Ley 10.973** (PBA — Ejercicio profesional)
- **Ley 14.085** (modificatoria — habilita toda PBA con una matrícula)
- **Ley 25.326** (Protección de Datos Personales — relevante para el manejo de información de usuarios)

### Honorarios (cuando aplique)

Regulados: **piso 1,5%, techo 3% por parte** (GBA). 

**No es comisión, son honorarios** — distinción legal importante.

### Trampa del modelo Re/Max — a evitar

El artículo 19 inciso C de Ley 10.973 prohíbe **"cesión de bandera"** (que una empresa preste su matrícula a no matriculados). El conflicto Re/Max vs Colegios de Martilleros existe por esto.

**Nosotros evitamos esto** porque Tomy es martillero matriculado Y la marca al mismo tiempo. No hay cesión.

### Posible cambio regulatorio

**Proyecto de Ley Bongiovanni** propone eliminar matrícula obligatoria, jurisdicciones, y aranceles mínimos. Si se aprueba, nos beneficia.

Nuestra estrategia es **robusta ante los tres escenarios** (status quo, desregulación parcial, desregulación total).

### Privacidad y datos

- Encriptación de datos sensibles
- Cumplimiento Ley 25.326
- Política de privacidad explícita
- Consentimiento informado de usuarios
- Derecho al olvido implementado

---

## 12. Trampas a Evitar

### ❌ Modelo Mudafy

- VC-heavy desde el día 1
- Intentar ser broker tecnológico completo sin negocio ancla
- Crecer en personal antes de validar

**Nuestra antítesis:** bootstrap inicial, servicios automatizados como motor desde el día 1, contratar después de validar.

### ❌ Modelo Re/Max

- Franquicia con cesión de matrícula
- Conflicto permanente con colegios profesionales

**Nuestra antítesis:** martillero matriculado es Tomy mismo, sin franquicia.

### ❌ Comisión obligatoria sobre operaciones

- Regresiva para la adopción
- No capturable técnicamente
- Anti-pattern de marketplaces inmobiliarios

**Nuestra antítesis:** monetización vía servicios opt-in.

### ❌ Competir frontalmente con inmobiliarias

- Pierdes un canal de usuarios
- Pierdes una fuente potencial de datos
- Generas hostilidad innecesaria

**Nuestra antítesis:** ser infraestructura para ellas, no competidor.

### ❌ Lanzar antes de tiempo

- Si los primeros usuarios prueban algo mediocre, no vuelven ni recomiendan
- Mata más proyectos que cualquier problema técnico

**Nuestra antítesis:** 4 meses para MVP completo, no apurar la calidad.

### ❌ Cobrar al comprador por usar la plataforma

- Rompe el principio rector
- Aumenta fricción de adopción

**Nuestra antítesis:** comprador siempre ve valor gratis, paga solo por servicios.

### ❌ Apresurarse vs ir rápido

- Apresurarse: construir todo a medias
- Ir rápido: construir solo lo esencial con calidad alta

**Nuestra antítesis:** disciplina de scope, calidad alta en lo que entra.

---

## 13. Principios Rectores

Cada decisión futura se evalúa contra estos principios. Si una decisión los rompe, no entra.

### Principio 1 — El comprador es el centro

**"¿Esto ayuda al comprador a decidir mejor?"**

Si la respuesta es no, no entra. Cada feature, cada decisión técnica, cada modelo de monetización, cada alianza se evalúa contra esto.

### Principio 2 — Infraestructura, no operador

**"¿Esto nos convierte en operador de la operación inmobiliaria?"**

Si la respuesta es sí, lo pensamos dos veces. Nuestro valor es ser la capa de información y servicios, no la inmobiliaria que cierra.

### Principio 3 — Mobile-first radical

**"¿Esto funciona bien en celular?"**

Toda decisión de diseño se prueba primero en pantalla 375px. Después se adapta a desktop.

### Principio 4 — Datos verificados sobre lo declarado

**"¿Esto se basa en lo que dijo alguien o en lo que dice una fuente oficial?"**

Cuando hay conflicto, mostramos ambos y señalamos la discrepancia. No ocultamos.

### Principio 5 — Traducción visual

**"¿Un usuario sin formación entiende esto?"**

Si requiere conocimiento técnico para entenderse, lo traducimos. Tooltips, íconos, lenguaje común.

### Principio 6 — Cada fase autosuficiente

**"¿Esta fase está generando ingresos predecibles?"**

No se inicia la siguiente sin que la actual esté en pie por sí sola.

### Principio 7 — Calidad sobre velocidad

**"¿Estamos sacando algo bueno o algo apurado?"**

Mejor 1 mes más tarde y bien hecho, que 1 mes antes y mediocre.

---

## 📌 Documento Vivo

Este documento se actualiza con cada decisión importante del proyecto. Versionado:

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Mayo 2026 | Documento inicial — cierre de Etapa 1, 2 y 3 con Claude |

---

*Plan Maestro — Plataforma Inmobiliaria Zona Sur GBA*
*Tomy — 2026*
