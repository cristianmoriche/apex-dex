// API web: Pokémon Showdown. Repeticiones, ladder y perfiles de jugador.
// Son públicas, no necesitan clave y admiten CORS, así que la app las pide directamente.
//   - Buscar repeticiones: https://replay.pokemonshowdown.com/search.json?user=…&format=…
//   - Una repetición:      https://replay.pokemonshowdown.com/{id}.json
//   - Perfil de jugador:   https://pokemonshowdown.com/users/{usuario}.json
//   - Ladder de un formato: https://pokemonshowdown.com/ladder/{formato}.json
import { aId } from "./meta.js";

const URL_REPETICIONES = "https://replay.pokemonshowdown.com/";
const URL_WEB = "https://pokemonshowdown.com/";
const ESPERA_MAXIMA_MS = 10_000;
const ESTADISTICAS_EN = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

export class SinDatos extends Error {}

async function pedir(url) {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });
  if (respuesta.status === 404) throw new SinDatos(url);
  if (!respuesta.ok) throw new Error(`Showdown ha respondido con el código ${respuesta.status}`);
  return respuesta.json();
}

export function urlRepeticion(id) {
  return `${URL_REPETICIONES}${id}`;
}

export function urlPerfil(usuario) {
  return `${URL_WEB}users/${aId(usuario)}`;
}

/** Las 51 repeticiones más recientes de un jugador o de un formato. */
export async function buscarRepeticiones({ usuario, formato } = {}) {
  const parametros = new URLSearchParams();
  if (usuario) parametros.set("user", aId(usuario));
  if (formato) parametros.set("format", formato);
  const lista = await pedir(`${URL_REPETICIONES}search.json?${parametros}`);
  return Array.isArray(lista) ? lista : [];
}

/** Saca el identificador de un enlace («https://replay.pokemonshowdown.com/gen9ou-123» → «gen9ou-123»). */
export function idDeRepeticion(texto) {
  const encontrado = String(texto).trim().toLowerCase().match(/([a-z0-9]+-\d+(?:-[a-z0-9]+pw)?)(?:\.json|\.log)?\/?(?:[?#].*)?$/);
  return encontrado?.[1] ?? null;
}

export async function leerRepeticion(enlaceOId) {
  const id = idDeRepeticion(enlaceOId);
  if (!id) throw new SinDatos(enlaceOId);
  return analizarRepeticion(await pedir(`${URL_REPETICIONES}${id}.json`));
}

/**
 * El registro (log) de una partida es texto con una acción por línea, separada por barras:
 *   |player|p1|Nombre|…    |poke|p1|Dragapult, L50, M|    |win|Nombre
 */
export function analizarRepeticion(repeticion) {
  const jugadores = { p1: repeticion.players?.[0] ?? "", p2: repeticion.players?.[1] ?? "" };
  const equipos = { p1: [], p2: [] };
  const salieron = { p1: [], p2: [] };
  let ganador = null;
  for (const linea of repeticion.log.split("\n")) {
    const partes = linea.split("|");
    const accion = partes[1];
    if (accion === "player" && partes[3]) {
      jugadores[partes[2]] = partes[3];
    } else if (accion === "poke" && equipos[partes[2]]) {
      equipos[partes[2]].push(limpiarEspecie(partes[3]));
    } else if ((accion === "switch" || accion === "drag") && partes[2]) {
      const lado = partes[2].slice(0, 2);
      const nombre = limpiarEspecie(partes[3]);
      if (salieron[lado] && !salieron[lado].includes(nombre)) salieron[lado].push(nombre);
    } else if (accion === "win") {
      ganador = partes[2];
    } else if (accion === "tie") {
      ganador = "";
    }
  }
  // Sin vista previa de equipos (algunos formatos), se usan los Pokémon que salieron al campo
  for (const lado of ["p1", "p2"]) {
    if (equipos[lado].length === 0) equipos[lado] = salieron[lado];
    // En la vista previa algunas formas salen sin concretar («Urshifu-*»): se cambia por la que salió
    equipos[lado] = equipos[lado].map((nombre) => salieron[lado].find((s) => s.split("-")[0] === nombre) ?? nombre);
  }
  return {
    id: repeticion.id,
    formato: repeticion.format,
    formatoId: repeticion.formatid,
    fecha: repeticion.uploadtime * 1000,
    rating: repeticion.rating || null,
    jugadores: [jugadores.p1, jugadores.p2],
    equipos: [equipos.p1, equipos.p2],
    ganador,
  };
}

function limpiarEspecie(texto = "") {
  return texto.split(",")[0].replace(/-\*$/, "").trim();
}

/** Perfil público de un jugador: su Elo y su GXE en cada formato en el que ha jugado. */
export async function perfilDeJugador(usuario) {
  const perfil = await pedir(`${URL_WEB}users/${aId(usuario)}.json`);
  const valoraciones = Object.entries(perfil.ratings ?? {})
    .map(([formato, r]) => ({ formato, elo: Math.round(r.elo), gxe: r.gxe, victorias: r.w, derrotas: r.l }))
    .sort((a, b) => b.elo - a.elo);
  return { nombre: perfil.username, registro: perfil.registertime * 1000, valoraciones };
}

/** Los mejores jugadores de un formato. */
export async function ladder(formato) {
  const datos = await pedir(`${URL_WEB}ladder/${formato}.json`);
  return (datos.toplist ?? []).map((j) => ({ nombre: j.username, elo: Math.round(j.elo), gxe: j.gxe, victorias: j.w, derrotas: j.l }));
}

// ---------------------------------------------------------------------------
// Formato de equipos de Showdown (botones Import / Export del Teambuilder):
//
//   Dragapult @ Choice Specs
//   Ability: Infiltrator
//   Tera Type: Ghost
//   EVs: 252 SpA / 4 SpD / 252 Spe
//   Timid Nature
//   - Draco Meteor

export function importarEquipo(texto) {
  const bloques = texto.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return bloques.map(leerBloque).filter((set) => set.especie).slice(0, 6);
}

function leerBloque(bloque) {
  const [primera, ...resto] = bloque.split("\n").map((linea) => linea.trim());
  const [nombres, objeto] = primera.split(" @ ");
  const sinGenero = nombres.replace(/\s\((M|F)\)\s*$/, "").trim();
  const conApodo = sinGenero.match(/^.*\(([^()]+)\)$/); // «Apodo (Especie)»
  const set = {
    especie: (conApodo ? conApodo[1] : sinGenero).trim(),
    objeto: objeto ? aId(objeto) : null,
    habilidad: null,
    tera: null,
    naturaleza: null,
    valores: [0, 0, 0, 0, 0, 0],
    movimientos: [],
  };
  for (const linea of resto) {
    if (linea.startsWith("Ability:")) {
      set.habilidad = aId(linea.slice(8));
    } else if (linea.startsWith("Tera Type:")) {
      set.tera = linea.slice(10).trim().toLowerCase();
    } else if (linea.startsWith("EVs:")) {
      for (const parte of linea.slice(4).split("/")) {
        const [cantidad, estadistica] = parte.trim().split(/\s+/);
        const indice = ESTADISTICAS_EN.indexOf(estadistica);
        if (indice >= 0) set.valores[indice] = Number(cantidad) || 0;
      }
    } else if (/ Nature$/.test(linea)) {
      set.naturaleza = linea.replace(/ Nature$/, "").trim();
    } else if (linea.startsWith("-") && set.movimientos.length < 4) {
      set.movimientos.push(aId(linea.slice(1).replace(/\[.*\]/, "")));
    }
  }
  return set;
}

/** Equipo de la app → texto para pegar en Showdown. Necesita el diccionario para los nombres en inglés. */
export function exportarEquipo(miembros, diccionario) {
  return miembros.map((m) => {
    // Las megas y las formas primigenias se apuntan con su especie base: evolucionan en combate con su objeto
    const especie = /-(Mega(-[XY])?|Primal)$/.test(m.especie) ? (diccionario.especies[m.especie]?.especie ?? m.especie) : m.especie;
    const lineas = [m.objeto ? `${especie} @ ${diccionario.objetos[m.objeto]?.en ?? m.objeto}` : especie];
    if (m.habilidad) lineas.push(`Ability: ${diccionario.habilidades[m.habilidad]?.en ?? m.habilidad}`);
    if (m.tera) lineas.push(`Tera Type: ${m.tera.charAt(0).toUpperCase()}${m.tera.slice(1)}`);
    const valores = m.valores.map((v, i) => (v ? `${v} ${ESTADISTICAS_EN[i]}` : null)).filter(Boolean);
    if (valores.length) lineas.push(`EVs: ${valores.join(" / ")}`);
    if (m.naturaleza) lineas.push(`${m.naturaleza} Nature`);
    for (const movimiento of m.movimientos) lineas.push(`- ${diccionario.movimientos[movimiento]?.en ?? movimiento}`);
    return lineas.join("\n");
  }).join("\n\n");
}
