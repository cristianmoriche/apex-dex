// Datos competitivos: las estadísticas de uso de Smogon que prepara herramientas/generar-datos.mjs,
// y el diccionario con especies, movimientos, objetos, habilidades, naturalezas y tabla de tipos.
// Son ficheros de la propia app (datos/), así que funcionan sin conexión cuando ya están guardados.
import { leer } from "./estado.js";

let meta = null;
let diccionario = null;
const formatos = new Map();         // id del formato → promesa con sus datos
const nombrePorClave = new Map();   // clave de PokeAPI («landorus-therian») → nombre de Showdown («Landorus-Therian»)
const clavePorId = new Map();       // «landorustherian» → «landorus-therian», para las búsquedas
const nombrePorId = new Map();      // «landorustherian» → «Landorus-Therian»

export const ABREVIATURAS = ["PS", "Atq", "Def", "AtEsp", "DefEsp", "Vel"];

// Tier list por uso: S son los 6 más usados del formato, A del 7 al 15, etc.
export const TIERS_DE_USO = [
  { tier: "S", hasta: 6 },
  { tier: "A", hasta: 15 },
  { tier: "B", hasta: 30 },
  { tier: "C", hasta: 50 },
  { tier: "D", hasta: Infinity },
];

/** Identificador de Showdown: minúsculas sin espacios ni signos («Mr. Mime» → «mrmime»). */
export function aId(texto) {
  return String(texto).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// API del navegador: Fetch API, para leer los ficheros de datos de la app
async function leerJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se ha podido leer ${ruta} (código ${respuesta.status})`);
  return respuesta.json();
}

export async function cargarMeta() {
  [meta, diccionario] = await Promise.all([leerJson("datos/meta.json"), leerJson("datos/diccionario.json")]);
  for (const [nombre, especie] of Object.entries(diccionario.especies)) {
    if (!especie.aproximada && !nombrePorClave.has(especie.clave)) nombrePorClave.set(especie.clave, nombre);
    if (!clavePorId.has(aId(nombre))) clavePorId.set(aId(nombre), especie.clave);
    if (!nombrePorId.has(aId(nombre))) nombrePorId.set(aId(nombre), nombre);
  }
}

export function infoMeta() {
  return meta;
}

export function dic() {
  return diccionario;
}

export function formatoActual() {
  const elegido = leer().perfil.formato;
  return meta.formatos.some((f) => f.id === elegido) ? elegido : meta.formatos[0].id;
}

export function resumenFormato(id = formatoActual()) {
  return meta.formatos.find((f) => f.id === id);
}

export function cargarFormato(id = formatoActual()) {
  if (!formatos.has(id)) {
    const promesa = leerJson(`datos/formatos/${id}.json`).then((datos) => {
      datos.porNombre = new Map(datos.pokemon.map((p) => [p.nombre, p]));
      return datos;
    });
    promesa.catch(() => formatos.delete(id)); // si falla, se puede volver a intentar
    formatos.set(id, promesa);
  }
  return formatos.get(id);
}

// ---------------------------------------------------------------------------
// Especies

export function especie(nombre) {
  return diccionario.especies[nombre];
}

export function nombresDeEspecies() {
  return Object.keys(diccionario.especies);
}

export function nombreDeClave(clave) {
  return nombrePorClave.get(clave) ?? null;
}

/** Nombre de Showdown a partir de lo que escribe el usuario («great tusk» → «Great Tusk»). */
export function nombreDeEspecie(texto) {
  return nombrePorId.get(aId(texto)) ?? nombreDeClave(claveDeBusqueda(texto));
}

/** Nombre para mostrar de una clave de PokeAPI: el de Showdown o, si no tiene, «iron-valiant» → «Iron-Valiant». */
export function nombreDesdeClave(clave) {
  return nombreDeClave(clave) ?? clave.split("-").map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1)).join("-");
}

/** Lo que escribe el usuario → clave para la PokeAPI («Urshifu» → «urshifu-single-strike», «mr mime» → «mr-mime»). */
export function claveDeBusqueda(texto) {
  const limpio = texto.trim().toLowerCase();
  return clavePorId.get(aId(limpio)) ?? limpio.replace(/\s+/g, "-");
}

/** Enlace a la ficha de una especie de Showdown. Si la PokeAPI no tiene esa forma, la de su especie base. */
export function rutaDex(nombre) {
  const e = especie(nombre);
  if (!e) return `#/dex/${encodeURIComponent(claveDeBusqueda(nombre))}`;
  return e.aproximada ? `#/dex/${e.clave}?forma=${encodeURIComponent(nombre)}` : `#/dex/${e.clave}`;
}

/** Entradas del formato que son de la misma especie (Salamence y Salamence-Mega, las formas de Rotom…). */
export function formasEnFormato(formato, nombre) {
  const base = especie(nombre)?.especie ?? nombre;
  return formato.pokemon.filter((p) => p.nombre === base || especie(p.nombre)?.especie === base);
}

/**
 * Datos de uso que corresponden a la ficha. Si se busca la especie base (Salamence) y en el formato
 * solo se usa otra forma (Salamence-Mega), se muestra esa; si se busca una forma concreta, solo esa.
 */
export function entradaParaDex(formato, nombre) {
  if (!nombre) return { formas: [], elegida: null };
  const formas = formasEnFormato(formato, nombre);
  const esBase = !especie(nombre)?.especie;
  const elegida = formas.find((p) => p.nombre === nombre) ?? (esBase ? formas[0] : null) ?? null;
  return { formas, elegida };
}

export function tierDeUso(puesto) {
  return TIERS_DE_USO.find((t) => puesto <= t.hasta).tier;
}

// ---------------------------------------------------------------------------
// Traducciones (si falta el nombre en español, se usa el de Showdown)

export const nombreMovimiento = (id) => diccionario.movimientos[id]?.es ?? id;
export const nombreObjeto = (id) => diccionario.objetos[id]?.es ?? id;
export const nombreHabilidad = (id) => diccionario.habilidades[id]?.es ?? id;
export const nombreNaturaleza = (naturaleza) => diccionario.naturalezas[naturaleza]?.es ?? naturaleza;

/** Busca un movimiento, objeto o habilidad por su nombre en español o en inglés, o por su id. */
export function buscarId(tabla, texto) {
  const buscado = aId(texto);
  if (!buscado) return null;
  if (diccionario[tabla][buscado]) return buscado;
  const encontrado = Object.entries(diccionario[tabla]).find(([, d]) => aId(d.es) === buscado || aId(d.en) === buscado);
  return encontrado?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Estadísticas reales

export function maximoPorEstadistica(formato) {
  return formato.champions ? 32 : 252;
}

export function maximoTotal(formato) {
  return formato.champions ? 66 : 510;
}

export function valoresDeSpread(texto) {
  return texto.split("/").map(Number);
}

/**
 * Estadísticas reales con una naturaleza y un reparto, con 31 IVs (lo habitual en competitivo).
 * - Juegos principales: las fórmulas de siempre con EVs (de 0 a 252) y el nivel del formato.
 * - Pokémon Champions: nivel 50 y puntos de estadística (de 0 a 32) en lugar de EVs. Fórmula sacada
 *   del simulador de Showdown (data/mods/champions/scripts.ts): PS = base + puntos + 75 y el resto,
 *   (base + puntos + 20) por la naturaleza.
 */
export function estadisticasReales(base, naturaleza, valores, formato) {
  const efecto = diccionario.naturalezas[naturaleza] ?? {};
  return base.map((b, i) => {
    if (i === 0 && b === 1) return 1; // Shedinja siempre tiene 1 PS
    const porNaturaleza = (valor) => {
      if (efecto.sube === i) return Math.floor((valor * 110) / 100);
      if (efecto.baja === i) return Math.floor((valor * 90) / 100);
      return valor;
    };
    if (formato.champions) {
      return i === 0 ? b + valores[i] + 75 : porNaturaleza(b + valores[i] + 20);
    }
    const nivel = formato.nivel;
    const parcial = Math.floor(((2 * b + 31 + Math.floor(valores[i] / 4)) * nivel) / 100);
    return i === 0 ? parcial + nivel + 10 : porNaturaleza(parcial + 5);
  });
}

export function textoSpread(naturaleza, valores) {
  const partes = valores.map((v, i) => (v ? `${v} ${ABREVIATURAS[i]}` : null)).filter(Boolean);
  return `${partes.join(" / ") || "Sin repartir"} (${nombreNaturaleza(naturaleza)})`;
}

/** El set más habitual: el objeto, la habilidad, la tera y el spread más usados y los 4 movimientos más usados. */
export function setMasUsado(entrada, formato) {
  const [naturaleza, valores] = entrada.spreads[0] ?? ["Serious", "0/0/0/0/0/0"];
  return {
    especie: entrada.nombre,
    objeto: entrada.objetos[0]?.[0] ?? null,
    habilidad: entrada.habilidades[0]?.[0] ?? null,
    tera: formato.tera ? (entrada.tera?.[0]?.[0] ?? null) : null,
    naturaleza,
    valores: valoresDeSpread(valores),
    movimientos: entrada.movimientos.slice(0, 4).map(([id]) => id),
  };
}
