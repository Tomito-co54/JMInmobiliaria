---
name: arranque
description: Arranque de sesión de JM Inmobiliaria. Tomy lo escribe (/arranque, opcionalmente con el tema del día) al abrir una sesión nueva, para que Claude se ponga en contexto solo y le devuelva un parte corto del estado real antes de trabajar.
disable-model-invocation: true
---

# Arranque de sesión

Tomy abrió una sesión nueva y quiere empezar a trabajar ya. Tu trabajo es
ponerte en contexto **sin que él tenga que explicarte nada** y devolverle un
parte corto con el estado real. Todo lo de este arranque es de **sólo
lectura**: no escribas en la base, no commitees, no toques archivos.

Tema del día, si lo dio: **$ARGUMENTS**

## 1. Lo que ya tenés y lo que tenés que leer

`CLAUDE.md` y la memoria ya están cargados: no los releas enteros. Leé sólo lo
que cambia entre sesiones, en paralelo:

- `git status -sb` y `git log --oneline -12` en el repo.
- En `C:\Users\tomit\OneDrive\Escritorio\Inmobiliaria\CONTEXTO.md`: el bloque
  «Estado al …» y la «Sesión del <fecha>» más reciente. Sólo esos dos.
- `PUBLICACION.md` de esa carpeta **sólo si** su fecha de modificación es
  posterior al último commit del repo (cambió el contrato).

## 2. Los chequeos del estado real

Corré estos cinco, en paralelo cuando se pueda. Son lecturas; si alguno
falla, decilo en el parte y seguí con el resto.

1. **¿La maestra tiene algo que el sitio no?** `npm run sincronizar-cartera`
   (en seco). Contá cuántas unidades dicen «sin diferencias» y listá las que
   no, con qué cambia (alta, precio, galería).
2. **¿Cuándo corrió el pipeline de mercado por última vez?**
   `node scripts/db-query.mjs "select source, count(*) filter (where is_active) as activas, max(last_seen_at)::date as ultimo_visto from properties where source in ('zonaprop','trezza') group by 1"`
3. **¿Los colegas se están sincronizando?**
   `node scripts/db-query.mjs "select partner, listing_status, count(*), max(last_seen_at)::date as ultimo_visto from properties where source = 'colega' group by 1, 2 order by 1, 2"`
   La sincronización corre sola cada mañana; un `ultimo_visto` de hace más de
   dos días quiere decir que no está corriendo.
4. **¿Cuánto hay publicado?**
   `node scripts/db-query.mjs "select coalesce(partner, 'propias') as de_quien, count(*) from properties where source in ('owner_direct','agency','colega') and listing_status = 'publicada' group by 1 order by 1"`

5. **¿Cómo salió la tarea diaria de Windows?** Leé `.logs/ultima-corrida.txt`
   del repo (lo escribe `scripts/tarea-diaria.ps1`: Villa del Dique y el
   pipeline de mercado, que corren desde esta PC). Si dice «con errores», o
   si su fecha tiene más de dos días, va en el parte; el detalle está en el
   log que nombra. Si el archivo no existe en esta PC, la tarea vive en otra:
   guiate por las fechas de los chequeos 2 y 3.

No corras `sincronizar-colegas` ni el pipeline acá: tardan minutos y no son
parte del arranque.

## 3. El parte

Devolvele a Tomy esto y nada más, en castellano rioplatense, seco y sin
preámbulo (así lo pide `TOMY.md`). Diez líneas como mucho:

- **Dónde quedó**: versión de `CLAUDE.md` y lo último que se hizo, en una línea.
- **Sitio**: cuántas publicadas (propias · Laudani · Villa del Dique).
- **Cartera**: «sin diferencias», o qué tiene la maestra que el sitio no. Si
  hay diferencias, cerrá esa línea con: *decí «actualizá el sitio»*.
- **Mercado**: hace cuántos días corrió el pipeline. Corre solo en la tarea
  diaria de Windows; si son más de dos días, decile que la tarea no está
  corriendo y que a mano es `npm run pipeline`.
- **Colegas**: al día, o desde cuándo no se sincronizan.
- **Pendiente de decisión suya**: lo que `CLAUDE.md` y la última sesión de
  `CONTEXTO.md` dejan esperando una respuesta de él. Sólo lo que le toca a él.
- **Algo raro**: cualquier número que no cierre contra lo que dice
  `CLAUDE.md` (publicadas, activas del mercado). En este proyecto un número
  creíble y equivocado es el bug más común: si no cierra, decilo.

## 4. Después del parte

- **Si dio un tema** (arriba, en «Tema del día»): después del parte, leé lo
  que haga falta para ese tema —las secciones de `CLAUDE.md` que lo tocan, el
  código, y `DIRECCION_DE_ARTE.md` si es algo visual— y proponé en tres o
  cuatro líneas por dónde empezar. No empieces a cambiar nada hasta que él
  diga.
- **Si no dio tema**: cerrá el parte y esperá. Sin preguntas de cortesía.
