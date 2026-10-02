// Apex Dex · generador de datos competitivos
//
// Prepara los datos que la app no puede pedir directamente desde el navegador.
// Se ejecuta en el ordenador, con Node.js 18 o superior, una vez al mes
// (Smogon publica las estadísticas de cada mes en los primeros días del siguiente):
//
//   node herramientas/generar-datos.mjs           → último mes publicado
//   node herramientas/generar-datos.mjs 2026-09   → un mes concreto
//
// Escribe:
//   datos/meta.json                → mes y formatos disponibles
//   datos/diccionario.json         → especies, movimientos, objetos, habilidades, naturalezas y tabla de tipos
//   datos/formatos/<formato>.json  → uso, sets, compañeros, counters y núcleos de cada formato
// y cambia la versión de los datos en sw.js para que los móviles descarguen los nuevos.
//
// APIs y fuentes de datos (públicas y gratuitas):
//   - Smogon, estadísticas de uso: https://www.smogon.com/stats/
//     No admite CORS (un navegador no puede pedírselas a otra web), por eso se descargan aquí.
//   - Pokémon Showdown, datos del simulador: https://play.pokemonshowdown.com/data/
//   - PokeAPI, CSV de su base de datos en GitHub: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv
//     Se usan los CSV en lugar de la API para no lanzar cientos de peticiones a un servicio gratuito.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_SMOGON = "https://www.smogon.com/stats/";
const URL_SHOWDOWN = "https://play.pokemonshowdown.com/data/";
const URL_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";

// Carpeta opcional para guardar las descargas y no repetirlas mientras se hacen pruebas:
//   APEX_CACHE=carpeta node herramientas/generar-datos.mjs
const CACHE = process.env.APEX_CACHE;

// Formatos de la app. Cada «patron» elige la regulación más reciente que haya publicado Smogon,
// así el programa sigue funcionando cuando cambie la regulación de VGC.
// «corte» es el rating mínimo de las partidas que se cuentan (los mismos que usa Smogon).
const FORMATOS = [
  { patron: /^gen9championsvgc\d{4}reg[a-z]+$/, corte: 1630, modo: "Dobles", juego: "Pokémon Champions" },
  { patron: /^gen9ou$/, corte: 1695, modo: "Individual", juego: "Smogon" },
  { patron: /^gen9championsbssreg[a-z]+$/, corte: 1630, modo: "Individual", juego: "Pokémon Champions" },
];
const USO_MINIMO = 0.5;      // en %: los Pokémon que se usan menos no se incluyen
const POKEMON_MAXIMOS = 200;
const ESPANOL = "7";         // identificadores de idioma en languages.csv de PokeAPI
const INGLES = "9";
const ESTADISTICAS = ["hp", "atk", "def", "spa", "spd", "spe"];

// Nombres de Showdown que no se pueden emparejar solos con los de PokeAPI
const EXCEPCIONES = {
  "necrozma-dusk-mane": "necrozma-dusk",
  "necrozma-dawn-wings": "necrozma-dawn",
  "greninja-bond": "greninja-battle-bond",
  "minior-meteor": "minior-red-meteor",
  "maushold-four": "maushold-family-of-four",
};
// Objetos con otro identificador en PokeAPI (el puerro se llamaba «stick» en inglés)
const OBJETOS_RENOMBRADOS = { stick: "leek" };

// Roles que se deducen de las habilidades, los objetos y los movimientos más usados
const ROLES = [
  { nombre: "Lluvia", habilidades: ["drizzle"] },
  { nombre: "Sol", habilidades: ["drought", "orichalcumpulse"] },
  { nombre: "Arena", habilidades: ["sandstream"] },
  { nombre: "Nieve", habilidades: ["snowwarning"] },
  { nombre: "Campo Psíquico", habilidades: ["psychicsurge"] },
  { nombre: "Campo de Hierba", habilidades: ["grassysurge"] },
  { nombre: "Campo Eléctrico", habilidades: ["electricsurge", "hadronengine"] },
  { nombre: "Campo de Niebla", habilidades: ["mistysurge"] },
  { nombre: "Espacio Raro", movimientos: ["trickroom"] },
  { nombre: "Viento Afín", movimientos: ["tailwind"] },
  { nombre: "Rápido", velocidad: 110 },
  { nombre: "Choice", objetos: ["choicescarf", "choicespecs", "choiceband"] },
  { nombre: "Setup", movimientos: ["swordsdance", "dragondance", "nastyplot", "calmmind", "quiverdance", "bulkup", "shellsmash", "bellydrum", "victorydance", "shiftgear", "coil", "tailglow", "geomancy", "filletaway", "clangoroussoul", "noretreat", "curse", "agility", "tidyup"] },
  { nombre: "Pivote", movimientos: ["uturn", "voltswitch", "flipturn", "partingshot", "teleport", "chillyreception", "shedtail"] },
  { nombre: "Fake Out", movimientos: ["fakeout"] },
  { nombre: "Redirección", movimientos: ["followme", "ragepowder"] },
  { nombre: "Trampas", movimientos: ["stealthrock", "spikes", "toxicspikes", "stickyweb", "ceaselessedge", "stoneaxe"] },
  { nombre: "Limpia trampas", movimientos: ["defog", "rapidspin", "mortalspin", "courtchange"] },
  { nombre: "Prioridad", movimientos: ["extremespeed", "suckerpunch", "aquajet", "iceshard", "machpunch", "bulletpunch", "shadowsneak", "firstimpression", "jetpunch", "grassyglide", "vacuumwave", "accelerock", "thunderclap", "upperhand"] },
  { nombre: "Recuperación", movimientos: ["recover", "roost", "slackoff", "softboiled", "moonlight", "morningsun", "synthesis", "shoreup", "strengthsap", "wish", "milkdrink", "junglehealing", "lifedew", "rest", "lunarblessing", "healorder"] },
  { nombre: "Estados", movimientos: ["willowisp", "toxic", "thunderwave", "spore", "sleeppowder", "glare", "nuzzle", "yawn", "hypnosis", "stunspore"] },
];
const ROLES_DE_EQUIPO = ["Lluvia", "Sol", "Arena", "Nieve", "Campo Psíquico", "Campo de Hierba", "Campo Eléctrico", "Campo de Niebla", "Espacio Raro", "Viento Afín"];

async function principal() {
  const mes = process.argv[2] ?? (await ultimoMes());
  console.log(`Estadísticas de Smogon de ${mes}`);

  const formatos = await elegirFormatos(mes);
  const fuentes = await descargarFuentes();
  const diccionario = crearDiccionario(fuentes);
  const meta = { mes, generado: new Date().toISOString().slice(0, 10), formatos: [] };

  await mkdir(join(RAIZ, "datos", "formatos"), { recursive: true });
  for (const formato of formatos) {
    // API de Smogon: estadísticas «chaos» (las más completas) de un formato y un corte
    const chaos = JSON.parse(await descargar(`${URL_SMOGON}${mes}/chaos/${formato.id}-${formato.corte}.json`));
    const datos = procesarFormato(formato, chaos, diccionario, mes);
    await escribir(`datos/formatos/${formato.id}.json`, datos);
    const { pokemon, nucleos, ...resumen } = datos;
    meta.formatos.push(resumen);
    console.log(`  ${datos.nombre}: ${pokemon.length} Pokémon, ${datos.partidas.toLocaleString("es-ES")} partidas · ` +
      pokemon.slice(0, 5).map((p) => `${p.nombre} ${p.uso} %`).join(", "));
  }

  await escribir("datos/diccionario.json", diccionario);
  await escribir("datos/meta.json", meta);
  await actualizarServiceWorker(mes);
  console.log(`Listo: ${Object.keys(diccionario.especies).length} especies, ${Object.keys(diccionario.movimientos).length} movimientos, ` +
    `${Object.keys(diccionario.objetos).length} objetos y ${Object.keys(diccionario.habilidades).length} habilidades.`);
}

// ---------------------------------------------------------------------------
// Descargas

async function descargar(url) {
  const archivoCache = CACHE && join(CACHE, url.replace(/^https?:\/\//, "").replace(/[^\w.-]+/g, "_"));
  if (archivoCache && existsSync(archivoCache)) return readFile(archivoCache, "utf8");
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!respuesta.ok) throw new Error(`código ${respuesta.status}`);
      const texto = await respuesta.text();
      if (archivoCache) {
        await mkdir(CACHE, { recursive: true });
        await writeFile(archivoCache, texto);
      }
      return texto;
    } catch (error) {
      if (intento === 3) throw new Error(`No se ha podido descargar ${url} (${error.message})`);
      await new Promise((resolver) => setTimeout(resolver, 2000 * intento));
    }
  }
}

// El índice de Smogon es una página con una carpeta por mes: 2026-08/, 2026-09/…
async function ultimoMes() {
  const indice = await descargar(URL_SMOGON);
  const meses = [...indice.matchAll(/href="(\d{4}-\d{2})\/"/g)].map((m) => m[1]).sort();
  return meses.at(-1);
}

async function elegirFormatos(mes) {
  const indice = await descargar(`${URL_SMOGON}${mes}/chaos/`);
  const ficheros = [...indice.matchAll(/href="([a-z0-9]+)-(\d+)\.json"/g)].map((m) => ({ id: m[1], corte: Number(m[2]) }));
  const elegidos = [];
  for (const formato of FORMATOS) {
    const candidatos = ficheros.filter((f) => formato.patron.test(f.id) && f.corte === formato.corte).map((f) => f.id).sort();
    if (candidatos.length === 0) {
      console.warn(`  Aviso: no hay datos de ${formato.patron} con corte ${formato.corte} en ${mes}`);
      continue;
    }
    elegidos.push({ ...formato, id: candidatos.at(-1) });
  }
  return elegidos;
}

async function descargarFuentes() {
  const csv = async (nombre) => leerCsv(await descargar(`${URL_CSV}${nombre}.csv`));
  // API de Pokémon Showdown: datos del simulador (Pokédex, movimientos, objetos, habilidades y tiers)
  const showdown = async (nombre) => {
    const texto = await descargar(`${URL_SHOWDOWN}${nombre}`);
    return nombre.endsWith(".json") ? JSON.parse(texto) : leerObjetoJs(texto);
  };
  const [pokedex, movimientos, objetos, habilidades, tiers] = await Promise.all(
    ["pokedex.json", "moves.json", "items.js", "abilities.js", "formats-data.js"].map(showdown));
  const nombres = ["pokemon", "moves", "move_names", "items", "item_names", "abilities", "ability_names",
    "natures", "nature_names", "types", "type_efficacy"];
  const tablas = Object.fromEntries(await Promise.all(nombres.map(async (n) => [n, await csv(n)])));
  return { pokedex, movimientos, objetos, habilidades, tiers, ...tablas };
}

// ---------------------------------------------------------------------------
// Lectura de formatos

function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const [cabecera, ...resto] = filas;
  return resto.filter((f) => f.length > 1).map((f) => Object.fromEntries(cabecera.map((c, i) => [c, f[i] ?? ""])));
}

// Los ficheros .js de Showdown son objetos de JavaScript, no JSON. En lugar de ejecutar código
// descargado de Internet, se leen con este pequeño analizador (objetos, listas, textos y números).
function leerObjetoJs(texto) {
  let i = texto.indexOf("{");
  const saltarEspacios = () => { while (i < texto.length && /\s/.test(texto[i])) i++; };
  const leerTexto = () => {
    const comilla = texto[i++];
    let resultado = "";
    while (texto[i] !== comilla) {
      if (texto[i] === "\\") {
        const siguiente = texto[i + 1];
        if (siguiente === "u") { resultado += String.fromCharCode(parseInt(texto.slice(i + 2, i + 6), 16)); i += 6; }
        else { resultado += siguiente === "n" ? "\n" : siguiente; i += 2; }
      } else {
        resultado += texto[i++];
      }
    }
    i++;
    return resultado;
  };
  const leerValor = () => {
    saltarEspacios();
    const c = texto[i];
    if (c === "{" || c === "[") {
      const esObjeto = c === "{";
      const cierre = esObjeto ? "}" : "]";
      const valor = esObjeto ? {} : [];
      i++;
      for (;;) {
        saltarEspacios();
        if (texto[i] === cierre) { i++; return valor; }
        if (esObjeto) {
          let clave;
          if (texto[i] === '"' || texto[i] === "'") {
            clave = leerTexto();
          } else {
            clave = /^[\w$]+/.exec(texto.slice(i, i + 80))[0];
            i += clave.length;
          }
          saltarEspacios();
          i++; // los dos puntos
          valor[clave] = leerValor();
        } else {
          valor.push(leerValor());
        }
        saltarEspacios();
        if (texto[i] === ",") i++;
      }
    }
    if (c === '"' || c === "'") return leerTexto();
    const literal = /^(-?\d+(\.\d+)?(e[+-]?\d+)?|true|false|null|undefined)/i.exec(texto.slice(i, i + 40));
    if (!literal) throw new Error(`Valor inesperado en la posición ${i}: ${texto.slice(i, i + 30)}`);
    i += literal[0].length;
    if (literal[0] === "true") return true;
    if (literal[0] === "false") return false;
    if (literal[0] === "null" || literal[0] === "undefined") return null;
    return Number(literal[0]);
  };
  return leerValor();
}

// ---------------------------------------------------------------------------
// Diccionario: todo lo que la app necesita para traducir y calcular

// Identificador de Showdown: minúsculas, sin espacios ni signos («Choice Specs» → «choicespecs»)
const aId = (texto) => texto.toLowerCase().replace(/[^a-z0-9]+/g, "");

function nombresPorIdioma(filas, campoId) {
  const nombres = new Map();
  for (const fila of filas) {
    const idioma = fila.local_language_id === ESPANOL ? "es" : fila.local_language_id === INGLES ? "en" : null;
    if (!idioma) continue;
    nombres.set(fila[campoId], { ...nombres.get(fila[campoId]), [idioma]: fila.name });
  }
  return nombres;
}

// Español de PokeAPI para cada identificador de Showdown («draco-meteor» → «dracometeor» → «Cometa Draco»)
function traducciones(filas, nombres, campoId, renombrados = {}) {
  const porId = nombresPorIdioma(nombres, campoId);
  return new Map(filas.map((f) => [renombrados[f.identifier] ?? aId(f.identifier), porId.get(f.id)?.es]).filter(([, es]) => es));
}

function crearDiccionario(fuentes) {
  const tipos = new Map(fuentes.types.filter((t) => Number(t.id) <= 18).map((t) => [t.id, t.identifier]));
  const tabla = {};
  for (const fila of fuentes.type_efficacy) {
    const factor = Number(fila.damage_factor) / 100;
    const ataque = tipos.get(fila.damage_type_id);
    const defensa = tipos.get(fila.target_type_id);
    if (ataque && defensa && factor !== 1) (tabla[ataque] ??= {})[defensa] = factor;
  }

  const movimientosEs = traducciones(fuentes.moves, fuentes.move_names, "move_id");
  const movimientos = {};
  for (const [id, m] of Object.entries(fuentes.movimientos)) {
    if (m.num <= 0 || m.isZ || m.isMax || ["CAP", "Custom"].includes(m.isNonstandard)) continue;
    movimientos[id] = {
      en: m.name, es: movimientosEs.get(id) ?? m.name, tipo: m.type.toLowerCase(),
      clase: { Physical: "Físico", Special: "Especial", Status: "Estado" }[m.category],
      potencia: m.basePower || null, precision: m.accuracy === true ? null : m.accuracy,
    };
  }

  const objetosEs = traducciones(fuentes.items, fuentes.item_names, "item_id", OBJETOS_RENOMBRADOS);
  const objetos = {};
  for (const [id, o] of Object.entries(fuentes.objetos)) {
    if (!o.name || o.num <= 0 || ["CAP", "Custom"].includes(o.isNonstandard)) continue;
    objetos[id] = { en: o.name, es: objetosEs.get(id) ?? o.name };
  }

  const habilidadesEs = traducciones(fuentes.abilities, fuentes.ability_names, "ability_id");
  const habilidades = {};
  for (const [id, h] of Object.entries(fuentes.habilidades)) {
    if (!h.name || h.num <= 0 || ["CAP", "Custom"].includes(h.isNonstandard)) continue;
    habilidades[id] = { en: h.name, es: habilidadesEs.get(id) ?? h.name };
  }

  const naturalezasEs = nombresPorIdioma(fuentes.nature_names, "nature_id");
  const naturalezas = {};
  for (const n of fuentes.natures) {
    const nombre = n.identifier[0].toUpperCase() + n.identifier.slice(1);
    const sube = Number(n.increased_stat_id) - 1;
    const baja = Number(n.decreased_stat_id) - 1;
    naturalezas[nombre] = { es: naturalezasEs.get(n.id)?.es ?? nombre, ...(sube !== baja ? { sube, baja } : {}) };
  }

  const idsPokeapi = new Map(fuentes.pokemon.map((p) => [p.identifier, Number(p.id)]));
  const especies = {};
  const sinPareja = [];
  for (const [id, e] of Object.entries(fuentes.pokedex)) {
    const tiers = fuentes.tiers[id] ?? {};
    // Las formas solo estéticas (Gastrodon-East…) no traen datos: son iguales que su especie
    if (!e.types || !(e.num > 0) || ["CAP", "Custom", "LGPE"].includes(tiers.isNonstandard ?? e.isNonstandard)) continue;
    if (/-(Gmax|Totem)$/.test(e.name)) continue;
    const pareja = emparejar(e.name, idsPokeapi);
    if (!pareja) { sinPareja.push(e.name); continue; }
    especies[e.name] = {
      clave: pareja.clave,
      id: idsPokeapi.get(pareja.clave),
      num: e.num,
      tipos: e.types.map((t) => t.toLowerCase()),
      base: ESTADISTICAS.map((s) => e.baseStats[s]),
      habilidades: Object.values(e.abilities).map(aId),
      ...(pareja.exacta ? {} : { aproximada: true }),
      ...(e.baseSpecies && e.baseSpecies !== e.name ? { especie: e.baseSpecies } : {}),
      ...(tiers.tier && tiers.tier !== "Illegal" ? { tier: tiers.tier } : {}),
      ...(tiers.natDexTier && tiers.natDexTier !== "Illegal" ? { tierNatDex: tiers.natDexTier } : {}),
    };
  }
  if (sinPareja.length) console.log(`  Sin pareja en PokeAPI (${sinPareja.length}): ${sinPareja.slice(0, 30).join(", ")}${sinPareja.length > 30 ? "…" : ""}`);
  const aproximadas = Object.entries(especies).filter(([, e]) => e.aproximada).map(([n, e]) => `${n}→${e.clave}`);
  if (aproximadas.length) console.log(`  Con la imagen de su forma base (${aproximadas.length}): ${aproximadas.slice(0, 25).join(", ")}${aproximadas.length > 25 ? "…" : ""}`);

  return { especies, movimientos, objetos, habilidades, naturalezas, tabla };
}

// Nombre de Showdown → nombre de PokeAPI («Landorus-Therian» → «landorus-therian», «Urshifu» → «urshifu-single-strike»)
function emparejar(nombre, idsPokeapi) {
  const base = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’'.:%]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  if (EXCEPCIONES[base] && idsPokeapi.has(EXCEPCIONES[base])) return { clave: EXCEPCIONES[base], exacta: true };
  if (idsPokeapi.has(base)) return { clave: base, exacta: true };
  const conGenero = base.replace(/-f(-|$)/, "-female$1").replace(/-m(-|$)/, "-male$1");
  if (idsPokeapi.has(conGenero)) return { clave: conGenero, exacta: true };
  // Forma por defecto con otro nombre en PokeAPI: se elige la de número más bajo
  const formas = [...idsPokeapi].filter(([clave]) => clave.startsWith(`${base}-`)).sort((a, b) => a[1] - b[1]);
  if (formas.length) return { clave: formas[0][0], exacta: true };
  // Forma que PokeAPI no tiene (megas nuevas, colores de Vivillon…): se usa la especie base
  const partes = base.split("-");
  while (partes.length > 1) {
    partes.pop();
    if (idsPokeapi.has(partes.join("-"))) return { clave: partes.join("-"), exacta: false };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatos

function nombreDeFormato(id) {
  const reg = id.match(/reg([a-z])([a-z]?)$/);
  const regulacion = reg ? ` Reg ${reg[1].toUpperCase()}${reg[2] ? `-${reg[2].toUpperCase()}` : ""}` : "";
  const vgc = id.match(/vgc(\d{4})/);
  if (vgc) return { nombre: `VGC ${vgc[1]}${regulacion}`, corto: `VGC${regulacion.replace(" Reg", "")}` };
  if (id.includes("bss")) return { nombre: `BSS${regulacion}`, corto: `BSS${regulacion.replace(" Reg", "")}` };
  const [, generacion, resto] = id.match(/^gen(\d+)(.*)$/);
  const tier = resto.replace(/^champions/, "").replace(/reg[a-z]+$/, "").toUpperCase();
  return { nombre: `Gen ${generacion} ${tier}${regulacion}`, corto: tier };
}

function procesarFormato(formato, chaos, diccionario, mes) {
  const champions = formato.id.includes("champions");
  // Smogon y Showdown escriben a veces distinto el mismo nombre («Sirfetch'd» y «Sirfetch’d»)
  const porId = new Map(Object.keys(diccionario.especies).map((nombre) => [aId(nombre), nombre]));
  const canonico = (nombre) => porId.get(aId(nombre)) ?? nombre;
  const renombrar = (pesos) => Object.fromEntries(Object.entries(pesos ?? {}).map(([nombre, valor]) => [canonico(nombre), valor]));
  const entradas = Object.entries(chaos.data)
    .map(([nombre, d]) => [canonico(nombre), { ...d, Teammates: renombrar(d.Teammates), "Checks and Counters": renombrar(d["Checks and Counters"]) }])
    .sort((a, b) => b[1].usage - a[1].usage);
  const total = (d) => Object.values(d.Abilities).reduce((suma, peso) => suma + peso, 0);
  const porcentaje = (peso, d) => redondear((peso / total(d)) * 100, 1);
  const mejores = (pesos, d, cuantos) => Object.entries(pesos ?? {})
    .filter(([clave]) => clave && clave !== "nothing")
    .sort((a, b) => b[1] - a[1]).slice(0, cuantos)
    .map(([clave, peso]) => [clave, porcentaje(peso, d)]);
  const conTera = entradas.some(([, d]) => Object.keys(d["Tera Types"] ?? {}).some((t) => t !== "nothing"));

  const pokemon = entradas
    .filter(([, d]) => d.usage * 100 >= USO_MINIMO)
    .slice(0, POKEMON_MAXIMOS)
    .map(([nombre, d], indice) => {
      const habilidades = mejores(d.Abilities, d, 3);
      const objetos = mejores(d.Items, d, 6);
      const movimientos = mejores(d.Moves, d, 10);
      const counters = Object.entries(d["Checks and Counters"] ?? {})
        .filter(([, c]) => c.n >= 20)
        .map(([rival, c]) => [rival, redondear(c.p * 100, 1), redondear((c.p - 4 * c.d) * 100, 1)])
        .sort((a, b) => b[2] - a[2]).slice(0, 6);
      return {
        nombre,
        puesto: indice + 1,
        uso: redondear(d.usage * 100, 2),
        habilidades,
        objetos,
        movimientos,
        ...(conTera ? { tera: mejores(d["Tera Types"], d, 4) } : {}),
        spreads: Object.entries(d.Spreads).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([spread, peso]) => [...spread.split(":"), porcentaje(peso, d)]),
        companeros: mejores(d.Teammates, d, 8),
        counters,
        roles: calcularRoles(diccionario.especies[nombre], habilidades, objetos, movimientos),
      };
    });

  const { nombre, corto } = nombreDeFormato(formato.id);
  return {
    id: formato.id, nombre, corto, juego: formato.juego, modo: formato.modo,
    nivel: champions || formato.modo === "Dobles" || formato.id.includes("bss") ? 50 : 100,
    champions, tera: conTera, mes, corte: formato.corte, partidas: chaos.info["number of battles"],
    pokemon,
    nucleos: calcularNucleos(entradas.slice(0, 30), pokemon, total),
  };
}

function calcularRoles(especie, habilidades, objetos, movimientos) {
  const roles = [];
  for (const rol of ROLES) {
    const cumple =
      (rol.habilidades && habilidades.some(([id, pct]) => rol.habilidades.includes(id) && pct >= 50)) ||
      (rol.objetos && objetos.filter(([id]) => rol.objetos.includes(id)).reduce((s, [, pct]) => s + pct, 0) >= 30) ||
      (rol.movimientos && movimientos.some(([id, pct]) => rol.movimientos.includes(id) && pct >= 30)) ||
      (rol.velocidad && especie && especie.base[5] >= rol.velocidad);
    if (cumple) roles.push(rol.nombre);
  }
  return roles.slice(0, 3);
}

// Núcleos: tríos de Pokémon que aparecen juntos en muchos equipos.
// Smogon solo da parejas (qué % de los equipos de A llevan a B), así que la fuerza de una
// pareja es la media geométrica de los dos sentidos, y la de un trío, su pareja más débil.
function calcularNucleos(entradas, pokemon, total) {
  const pct = new Map();
  for (const [nombre, d] of entradas) {
    for (const [companero, peso] of Object.entries(d.Teammates ?? {})) pct.set(`${nombre}|${companero}`, (peso / total(d)) * 100);
  }
  const pareja = (a, b) => Math.sqrt((pct.get(`${a}|${b}`) ?? 0) * (pct.get(`${b}|${a}`) ?? 0));
  const nombres = entradas.map(([nombre]) => nombre);
  const trios = [];
  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) {
      for (let k = j + 1; k < nombres.length; k++) {
        const [a, b, c] = [nombres[i], nombres[j], nombres[k]];
        trios.push({ miembros: [a, b, c], juntos: Math.min(pareja(a, b), pareja(a, c), pareja(b, c)) });
      }
    }
  }
  trios.sort((x, y) => y.juntos - x.juntos);
  const elegidos = [];
  const apariciones = new Map();
  for (const trio of trios) {
    // Para que haya variedad: no se repite una pareja ya elegida y nadie sale en más de dos núcleos
    if (elegidos.some((e) => e.miembros.filter((m) => trio.miembros.includes(m)).length >= 2)) continue;
    if (trio.miembros.some((m) => (apariciones.get(m) ?? 0) >= 2)) continue;
    const roles = trio.miembros.flatMap((m) => pokemon.find((p) => p.nombre === m)?.roles ?? []);
    const estilo = ROLES_DE_EQUIPO.find((r) => roles.includes(r));
    elegidos.push({ estilo: estilo ?? null, miembros: trio.miembros, juntos: redondear(trio.juntos, 1) });
    for (const m of trio.miembros) apariciones.set(m, (apariciones.get(m) ?? 0) + 1);
    if (elegidos.length === 4) break;
  }
  return elegidos;
}

// ---------------------------------------------------------------------------
// Escritura

function redondear(numero, decimales) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

async function escribir(ruta, datos) {
  await writeFile(join(RAIZ, ruta), JSON.stringify(datos));
}

// El service worker guarda una copia de la app en el móvil. Al cambiar DATOS, el móvil
// detecta que hay versión nueva y descarga los ficheros otra vez.
async function actualizarServiceWorker(mes) {
  const ruta = join(RAIZ, "sw.js");
  if (!existsSync(ruta)) return;
  const codigo = await readFile(ruta, "utf8");
  const nuevo = codigo.replace(/const DATOS = "[^"]*";/, `const DATOS = "${mes}·${new Date().toISOString().slice(0, 10)}";`);
  await writeFile(ruta, nuevo);
}

await principal();
