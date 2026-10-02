# Apex Dex

Versión 2 de la Pokémon App de la Clase 1 de Entornos de Desarrollo (1.º DAM): una **Pokédex competitiva para el móvil**, con el diseño oscuro y neón de mis bocetos.

Es una **app web instalable (PWA)**:
- se abre en el navegador;
- se puede añadir a la pantalla de inicio del iPhone y funciona como una app, también sin conexión.

La versión 1, el programa de consola en Java, es la práctica de clase y está en `pokemon-app/`.

**Pruébala:** https://TU-USUARIO.github.io/apex-dex/ (cambia la dirección por la tuya cuando la publiques: [DESPLIEGUE.md](DESPLIEGUE.md))

## Pantallas

- **Home**
  - La repetición destacada de Pokémon Showdown.
  - El selector de formato: VGC 2026 Reg M-C, Gen 9 OU o BSS Reg M-C.
  - La tier list destacada: los 4 Pokémon más usados, con sus estadísticas y sus roles.
  - Los núcleos de equipo: los tríos que más se repiten.
- **Tier list**: todos los Pokémon del formato, en los grupos S, A, B, C y D según su puesto de uso.
- **Stats & Dex**, la ficha de un Pokémon con los datos de la PokeAPI y su análisis competitivo con los de Smogon:
  - tier, puesto en el formato y roles;
  - habilidad y teratipo (u objeto) más usados;
  - estadísticas base, y las reales con el spread más usado;
  - eficacia de tipos (x4, x2, x½, x¼ y x0);
  - compañeros, con la explicación de por qué se cubren;
  - movimientos meta, objetos, habilidades, teratipos y *checks & counters*;
  - botón de favorito, botón **+ Equipo** y grito del Pokémon.
- **Equipos**
  - Equipos de hasta 6 Pokémon, que se añaden con su set más usado.
  - Editor de sets.
  - Análisis del equipo: debilidades, cobertura ofensiva y orden de velocidad.
  - Importar y exportar en el formato de Showdown.
- **Matches**
  - Historial de combates: importados de repeticiones de Showdown (pegando el enlace o desde la lista de tus partidas) o apuntados a mano.
  - Victorias, derrotas, porcentaje y racha.
  - Los rivales que más te encuentras.
- **Perfil**
  - Nombre, avatar y formato favorito.
  - Tu usuario de Showdown y tu Elo.
  - Favoritos.
  - Cómo instalarla en el iPhone.
  - Copia de seguridad y créditos.

## APIs utilizadas

| API o fuente | Tipo | Cuándo se usa | Para qué |
|---|---|---|---|
| PokeAPI (https://pokeapi.co/docs/v2) | API web (REST, JSON) | En directo, desde el móvil | Datos, descripción e ilustración de cada Pokémon |
| Imágenes de la PokeAPI (https://github.com/PokeAPI/sprites) | Ficheros en GitHub | En directo | Miniaturas e ilustraciones oficiales |
| Pokémon Showdown: repeticiones (https://replay.pokemonshowdown.com) | API web (JSON) | En directo | Repetición destacada, tus repeticiones e importar combates |
| Pokémon Showdown: jugadores (https://pokemonshowdown.com/users/) | API web (JSON) | En directo | Tu Elo y tu GXE |
| Smogon: estadísticas de uso (https://www.smogon.com/stats/) | Ficheros JSON mensuales | Con el generador, una vez al mes | Uso, sets, compañeros y counters de cada formato |
| Pokémon Showdown: datos del simulador (https://play.pokemonshowdown.com/data/) | Ficheros JSON y JS | Con el generador | Tipos, estadísticas, tiers, movimientos, objetos y habilidades |
| PokeAPI: CSV de su base de datos (https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) | Ficheros CSV | Con el generador | Nombres en español y tabla de tipos |
| Google Fonts (https://fonts.google.com) | API web | Al abrir la app (y se guarda) | Tipografías Space Grotesk y JetBrains Mono |
| APIs del navegador | Fetch, Web Storage (`localStorage`), Service Worker y Cache Storage, Web App Manifest, History, Clipboard e `Intl` | Siempre | Hacer peticiones, guardar tus datos en el móvil, funcionar sin conexión, instalarse, la flecha de volver, copiar el equipo y escribir números y fechas en español |

Peticiones que hace la app en directo:

- `GET https://pokeapi.co/api/v2/pokemon/{nombre o número}`: datos básicos, estadísticas, tipos, habilidades, imagen y grito.
- `GET https://pokeapi.co/api/v2/pokemon-species/{número}`: nombre, categoría y descripción en español.
- `GET https://replay.pokemonshowdown.com/search.json?format={formato}` (o `?user={usuario}`): las 51 repeticiones más recientes.
- `GET https://replay.pokemonshowdown.com/{id}.json`: una repetición, con los equipos y el ganador.
- `GET https://pokemonshowdown.com/users/{usuario}.json`: el Elo de un jugador en cada formato.

Cada ficha nueva son 2 peticiones a la PokeAPI. La versión 1 hacía 3 o 4, pero aquí la tabla de tipos y los nombres de las habilidades vienen en el diccionario. Las respuestas se guardan en el móvil y no se vuelven a pedir.

Las estadísticas de Smogon no se pueden pedir desde el navegador, porque Smogon no admite CORS. Por eso las descarga una vez al mes el programa `herramientas/generar-datos.mjs` y las guarda, ya preparadas, en `datos/`.

## Cómo abrirla en el ordenador

Los módulos de JavaScript y el service worker necesitan un servidor web, así que **no funciona con doble clic** en `index.html`. Hay dos formas de abrirla:

- **Con Python**, dentro de la carpeta `apex-dex`:

  ```text
  python -m http.server 8080 --bind 127.0.0.1
  ```

  Después abre http://localhost:8080 en el navegador. Para ir directo a un Pokémon: http://localhost:8080/#/dex/dragapult

- **Desde IntelliJ IDEA:** clic derecho en `index.html` → *Open In* → *Browser*.

## Publicarla e instalarla en el iPhone

Los pasos están en [DESPLIEGUE.md](DESPLIEGUE.md):
- publicarla gratis con GitHub Pages;
- añadirla a la pantalla de inicio desde Safari;
- actualizarla;
- lo que haría falta para la App Store.

## Actualizar los datos cada mes

Con Node.js 18 o posterior, dentro de la carpeta `apex-dex`:

```text
node herramientas/generar-datos.mjs           (último mes publicado)
node herramientas/generar-datos.mjs 2026-09   (un mes concreto)
```

El programa:
1. busca el último mes publicado en Smogon;
2. elige la regulación más reciente de VGC y de BSS;
3. descarga las estadísticas y los datos de Showdown y de la PokeAPI;
4. escribe `datos/`;
5. cambia la versión de los datos en `sw.js`, para que los móviles se actualicen.

## Estructura

| Fichero o carpeta | Qué contiene |
|---|---|
| `index.html` | La página: pantalla de carga, barra inferior, aviso de versión nueva y metadatos para instalarla |
| `manifest.webmanifest` | El manifiesto de la app instalable: nombre, iconos, colores y pantalla completa |
| `sw.js` | El service worker: guarda la app en el móvil para que abra al momento y funcione sin conexión |
| `css/estilos.css` | El diseño oscuro y neón de toda la app |
| `js/app.js` | Arranca la app y decide qué pantalla se ve según la dirección (`#/dex/dragapult`…) |
| `js/vistas/` | Una pantalla por fichero: `inicio`, `tierlist`, `dex`, `equipos`, `matches` y `perfil` |
| `js/pokeapi.js` | Las peticiones a la PokeAPI |
| `js/showdown.js` | Las peticiones a Showdown y el formato de equipos de Showdown (importar y exportar) |
| `js/meta.js` | Los datos competitivos: formatos, especies, traducciones y cálculo de estadísticas reales |
| `js/tipos.js` | Los 18 tipos, la tabla de tipos y el análisis de equipos |
| `js/estado.js` | Lo que se guarda en el móvil: perfil, equipos, combates, favoritos y búsquedas recientes |
| `js/ui.js` | Piezas comunes: iconos, insignias de tipo, miniaturas y avisos |
| `datos/` | Datos generados: `meta.json`, `diccionario.json` y un fichero por formato en `formatos/` |
| `img/` | Iconos de la app (180, 192 y 512 px) |
| `herramientas/generar-datos.mjs` | El generador de datos mensual |

## Decisiones técnicas

- **Sin frameworks:** HTML, CSS y JavaScript con módulos (`import` y `export`). Así cada línea es mía y la puedo explicar. No hace falta instalar nada para usar la app.
- **Rutas con `#`** (`#/dex/dragapult`): GitHub Pages solo sirve ficheros, y así cada pantalla tiene su propia dirección sin necesitar un servidor propio.
- **Tier list propia por puesto de uso:** S son los 6 más usados, A del 7.º al 15.º, B del 16.º al 30.º, C del 31.º al 50.º y D el resto. No es la tier list oficial de Smogon, y así lo pone la app.
- **Estadísticas reales:** con las fórmulas de los juegos, 31 IVs y el nivel del formato (100 en OU y 50 en VGC y BSS). En Pokémon Champions no hay EVs, sino puntos de estadística (como mucho 32 por estadística y 66 en total). La fórmula es la del simulador de Showdown (`data/mods/champions/scripts.ts`): PS = base + puntos + 75; el resto = (base + puntos + 20) × naturaleza.
- **Núcleos:** Smogon solo dice qué porcentaje de los equipos de A lleva a B. La fuerza de una pareja es la media de los dos sentidos (media geométrica), y la de un trío, la de su pareja más débil. Para que haya variedad, nadie sale en más de dos núcleos.
- **Sinergias explicadas con la tabla de tipos:** un compañero «aguanta» las debilidades del Pokémon que él resiste, y al revés.
- **Roles** (Rápido, Pivote, Trampas, Espacio Raro…): se deducen de las habilidades, los objetos y los movimientos que más usa cada Pokémon.
- **La tabla de tipos, con la misma lógica que la versión 1:** se empieza en x1 y se multiplica por el factor de cada tipo.
- **Tus datos se quedan en tu móvil**, en `localStorage`. La copia de seguridad es un fichero JSON.

## Pruebas

Hechas con un iPhone simulado de 390 px (Microsoft Edge controlado con el protocolo de DevTools). Pasaron las 56 comprobaciones automáticas, más las pruebas sin conexión, de actualización y dentro de una subcarpeta (como en GitHub Pages). Entre ellas:

| Prueba | Resultado |
|---|---|
| Las 5 pantallas y la tier list, sin desbordar a lo ancho | ✅ |
| Dragapult en OU (Miedosa, 252 AtEsp y 252 Vel, nivel 100) | ✅ 317/248/186/299/187/421 |
| Rillaboom en Champions (Firme, 32/32/0/0/2/0) | ✅ 207/194/110/72/92/105 |
| Buscar `716` → Xerneas; `mr mime` → Mr. Mime; `xerneass` → aviso | ✅ |
| Salamence en VGC muestra los datos de Salamence-Mega | ✅ |
| Importar un equipo de Showdown y volver a exportarlo igual | ✅ |
| Las megas se exportan con su especie base («Salamence @ Salamencite») | ✅ |
| Importar una repetición real de Showdown y guardarla como victoria | ✅ |
| Elo de un jugador real de Showdown | ✅ |
| Sin servidor: la app abre entera desde la copia del service worker | ✅ |
| Aviso de versión nueva y actualización con un toque | ✅ |
| Enlaces antiguos de la v1 (`?p=887`) | ✅ abren la ficha de Dragapult |

## Limitaciones

- Los datos de uso son mensuales, y solo incluyen los Pokémon con al menos un 0,5 % de uso en cada formato.
- Showdown solo da las repeticiones que se han subido como públicas.
- La app no calcula el daño de los ataques.
- Algunas formas muy nuevas aún no están en la PokeAPI. En ese caso, la ficha usa la imagen de la forma base, y los tipos y las estadísticas de Showdown (la app lo avisa).
- La App Store no es viable para este proyecto (marcas de Pokémon y requisitos de Apple): se explica en [DESPLIEGUE.md](DESPLIEGUE.md#4-y-por-la-app-store).

## Créditos y aviso legal

Apex Dex es un proyecto educativo de 1.º de DAM, sin ánimo de lucro y no oficial. No está afiliado a Nintendo, Creatures, GAME FREAK, The Pokémon Company, Smogon ni Pokémon Showdown. Pokémon y los nombres de los Pokémon son marcas de sus respectivos propietarios.

Datos de la [PokeAPI](https://pokeapi.co), de las [estadísticas de uso de Smogon](https://www.smogon.com/stats/) y de [Pokémon Showdown](https://pokemonshowdown.com).
