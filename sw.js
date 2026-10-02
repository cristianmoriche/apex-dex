// Service worker de Apex Dex: guarda una copia de la app en el móvil para que abra al momento
// y funcione sin conexión. APIs del navegador: Service Worker y Cache Storage.
//
// Cuando subas cambios de código, cambia VERSION (por ejemplo, de "2.0.0" a "2.0.1").
// Cuando regeneres los datos, herramientas/generar-datos.mjs cambia DATOS él solo.
// Así el móvil detecta que hay una versión nueva y la app ofrece actualizarse.
const VERSION = "2.0.0";
const DATOS = "2026-09·2026-10-02";

const CACHE_APP = `apex-dex-app-${VERSION}-${DATOS}`;
const CACHE_POKEAPI = "apex-dex-pokeapi";
const CACHE_IMAGENES = "apex-dex-imagenes";
const CACHE_FUENTES = "apex-dex-fuentes";
const MAXIMO_DE_ENTRADAS = { [CACHE_POKEAPI]: 300, [CACHE_IMAGENES]: 800, [CACHE_FUENTES]: 30 };

const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilos.css",
  "js/app.js",
  "js/estado.js",
  "js/meta.js",
  "js/pokeapi.js",
  "js/showdown.js",
  "js/tipos.js",
  "js/ui.js",
  "js/vistas/inicio.js",
  "js/vistas/dex.js",
  "js/vistas/tierlist.js",
  "js/vistas/equipos.js",
  "js/vistas/matches.js",
  "js/vistas/perfil.js",
  "datos/meta.json",
  "datos/diccionario.json",
  "img/icono-192.png",
  "img/icono-512.png",
  "img/apple-touch-icon.png",
];
// API web: Google Fonts (la misma dirección que en index.html)
const FUENTES = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap";

// Instalación: se descarga la app entera, más los datos de cada formato que aparece en meta.json
self.addEventListener("install", (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    // cache: "reload" evita copiar ficheros viejos que el navegador tuviera guardados
    await cache.addAll(ARCHIVOS.map((ruta) => new Request(ruta, { cache: "reload" })));
    const meta = await (await cache.match("datos/meta.json")).json();
    await cache.addAll(meta.formatos.map((f) => new Request(`datos/formatos/${f.id}.json`, { cache: "reload" })));
    await guardarFuentes().catch(() => {}); // sin tipografías la app funciona igual, con las del sistema
  })());
});

// Guarda la hoja de estilos de Google Fonts y los ficheros de letra que enlaza, para tenerlas sin conexión
async function guardarFuentes() {
  const cache = await caches.open(CACHE_FUENTES);
  const respuesta = await fetch(FUENTES, { mode: "cors" });
  if (!respuesta.ok) return;
  await cache.put(FUENTES, respuesta.clone());
  const css = await respuesta.text();
  const ficheros = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
  await Promise.all(ficheros.map(async (url) => {
    const letra = await fetch(url, { mode: "cors" });
    if (letra.ok) await cache.put(url, letra);
  }));
}

// Activación: se borran las copias de versiones anteriores
self.addEventListener("activate", (evento) => {
  evento.waitUntil((async () => {
    const actuales = [CACHE_APP, CACHE_POKEAPI, CACHE_IMAGENES, CACHE_FUENTES];
    for (const nombre of await caches.keys()) {
      if (nombre.startsWith("apex-dex-") && !actuales.includes(nombre)) await caches.delete(nombre);
    }
    await self.clients.claim();
  })());
});

// La app avisa de que hay versión nueva y, si se pulsa «Actualizar», manda este mensaje
self.addEventListener("message", (evento) => {
  if (evento.data === "actualizar") self.skipWaiting();
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);

  if (url.origin === self.location.origin) {
    evento.respondWith(desdeLaApp(peticion));
  } else if (url.hostname === "pokeapi.co") {
    evento.respondWith(primeroGuardado(peticion, CACHE_POKEAPI));
  } else if (url.hostname === "raw.githubusercontent.com") {
    evento.respondWith(primeroGuardado(peticion, CACHE_IMAGENES));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    evento.respondWith(primeroGuardado(peticion, CACHE_FUENTES));
  }
  // Lo demás (Pokémon Showdown) va siempre a Internet: son datos en directo
});

// Ficheros de la app: la copia guardada; las páginas, siempre index.html (la app decide la pantalla)
async function desdeLaApp(peticion) {
  const cache = await caches.open(CACHE_APP);
  if (peticion.mode === "navigate") {
    return (await cache.match("index.html")) ?? fetch(peticion);
  }
  return (await cache.match(peticion)) ?? fetch(peticion);
}

// PokeAPI, imágenes y fuentes no cambian: si ya están guardadas no hace falta pedirlas otra vez
async function primeroGuardado(peticion, nombreCache) {
  const cache = await caches.open(nombreCache);
  // ignoreVary: estas respuestas no cambian según las cabeceras de la petición
  const guardada = await cache.match(peticion, { ignoreVary: true });
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok) {
    await cache.put(peticion, respuesta.clone());
    recortar(cache, MAXIMO_DE_ENTRADAS[nombreCache]);
  }
  return respuesta;
}

// Para no llenar el móvil: si hay demasiadas entradas, se borran las más antiguas
async function recortar(cache, maximo) {
  const claves = await cache.keys();
  for (const clave of claves.slice(0, Math.max(0, claves.length - maximo))) {
    await cache.delete(clave);
  }
}
