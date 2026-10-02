// API web: PokeAPI (documentación: https://pokeapi.co/docs/v2). Es gratuita, no necesita clave
// y permite que una página web le pida datos (CORS abierto).
const URL_API = "https://pokeapi.co/api/v2/";
const ESPERA_MAXIMA_MS = 10_000; // como en el RNF-03 de la versión 1: como mucho 10 segundos

// Respuestas ya recibidas mientras la app está abierta, para no repetir peticiones a un servicio gratuito.
// Además, el service worker (sw.js) las guarda en el móvil para la próxima vez.
const memoria = new Map();

export class NoEncontrado extends Error {}

async function consultar(url) {
  if (memoria.has(url)) {
    return memoria.get(url);
  }
  // API del navegador: Fetch API
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });
  if (respuesta.status === 404) {
    throw new NoEncontrado(url);
  }
  if (!respuesta.ok) {
    throw new Error(`La API ha respondido con el código ${respuesta.status}`);
  }
  const datos = await respuesta.json();
  memoria.set(url, datos);
  return datos;
}

/** Busca un Pokémon por nombre o número. Son 2 peticiones: la del Pokémon y la de su especie. */
export async function buscarPokemon(busqueda) {
  // API web: PokeAPI, petición /pokemon/{nombre o número}
  const pokemon = await consultar(`${URL_API}pokemon/${encodeURIComponent(busqueda)}`);
  // API web: PokeAPI, petición /pokemon-species/{número}: nombre, categoría y descripción en español
  const especie = await consultar(pokemon.species.url);

  return {
    clave: pokemon.name,
    id: pokemon.id,               // las formas (megas, regionales…) tienen números a partir de 10001
    numero: especie.id,           // número de la Pokédex nacional
    nombre: enEspanol(especie.names) ?? pokemon.name,
    esFormaBase: pokemon.is_default,
    categoria: enEspanol(especie.genera, "genus") ?? "",
    tipos: pokemon.types.map((t) => t.type.name),
    altura: pokemon.height / 10,  // la API da la altura en decímetros
    peso: pokemon.weight / 10,    // y el peso en hectogramos
    imagen: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default,
    habilidades: pokemon.abilities.map((h) => ({ id: h.ability.name.replaceAll("-", ""), clave: h.ability.name, oculta: h.is_hidden })),
    estadisticas: pokemon.stats.map((s) => ({ clave: s.stat.name, valor: s.base_stat })),
    descripcion: ultimaEnEspanol(especie.flavor_text_entries),
    grito: pokemon.cries?.latest ?? null,
  };
}

function enEspanol(lista, campo = "name") {
  return lista.find((entrada) => entrada.language.name === "es")?.[campo];
}

/** La descripción más reciente en español, sin los saltos de línea que trae la API. */
function ultimaEnEspanol(textos) {
  const enEspanolTodas = textos.filter((t) => t.language.name === "es");
  return enEspanolTodas.at(-1)?.flavor_text.replace(/\s+/g, " ").trim() ?? null;
}
