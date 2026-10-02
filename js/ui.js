// Piezas de interfaz que comparten todas las pantallas
import { nombreTipo, colorTipo, ETIQUETAS } from "./tipos.js";
import { especie, infoMeta, formatoActual } from "./meta.js";

const URL_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";

export const ICONOS = {
  logo: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/></svg>`,
  atras: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>`,
  buscar: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  estrella: `<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`,
  mas: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  dado: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle class="relleno" cx="9" cy="9" r="1.3"/><circle class="relleno" cx="15" cy="9" r="1.3"/><circle class="relleno" cx="9" cy="15" r="1.3"/><circle class="relleno" cx="15" cy="15" r="1.3"/></svg>`,
  trofeo: `<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/></svg>`,
  alerta: `<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/></svg>`,
  escudo: `<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  rayo: `<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>`,
  papelera: `<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`,
  copiar: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/></svg>`,
  externo: `<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  sonido: `<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>`,
  gota: `<svg viewBox="0 0 24 24"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>`,
  sol: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>`,
  arena: `<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>`,
  nieve: `<svg viewBox="0 0 24 24"><path d="M12 2v20M4 7l16 10M20 7L4 17M9 4l3 3 3-3M9 20l3-3 3 3"/></svg>`,
  hoja: `<svg viewBox="0 0 24 24"><path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15zM5 19l8-8"/></svg>`,
  espiral: `<svg viewBox="0 0 24 24"><path d="M12 12a2 2 0 1 1 2 2 4 4 0 0 1-4-4 6 6 0 0 1 6-6 8 8 0 0 1 0 16 9 9 0 0 1-9-9"/></svg>`,
  viento: `<svg viewBox="0 0 24 24"><path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/></svg>`,
  enlace: `<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>`,
  descargar: `<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>`,
  subir: `<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>`,
  compartir: `<svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v9h14v-9h-1"/></svg>`,
};

// Icono de cada estilo de núcleo (clima, campos y control de velocidad)
export const ICONO_ESTILO = {
  "Lluvia": "gota", "Sol": "sol", "Arena": "arena", "Nieve": "nieve",
  "Campo Psíquico": "espiral", "Campo de Hierba": "hoja", "Campo Eléctrico": "rayo", "Campo de Niebla": "espiral",
  "Espacio Raro": "espiral", "Viento Afín": "viento",
};

/** Evita que un texto que llega de fuera se interprete como HTML. */
export function escapar(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function decimal(numero, decimales = 1) {
  return numero.toLocaleString("es-ES", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function porcentaje(numero) {
  return `${numero.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
}

export function numeroPokedex(numero) {
  return `#${String(numero).padStart(3, "0")}`;
}

export function insigniaTipo(tipo, multiplicador) {
  const etiqueta = multiplicador === undefined ? "" : ` <small>${ETIQUETAS[multiplicador]}</small>`;
  const clase = multiplicador === 4 ? " x4" : multiplicador === 0 ? " x0" : "";
  return `<span class="tipo${clase}" style="--c: ${colorTipo(tipo)}">${nombreTipo(tipo)}${etiqueta}</span>`;
}

export function listaTipos(tipos) {
  if (tipos.length === 0) return `<span class="nada">Ninguno</span>`;
  return tipos.map((tipo) => insigniaTipo(tipo)).join("");
}

export function urlSprite(id) {
  return id ? `${URL_SPRITES}${id}.png` : null;
}

export function urlIlustracion(id) {
  return id ? `${URL_SPRITES}other/official-artwork/${id}.png` : null;
}

/** Miniatura de una especie de Showdown (o de un id de PokeAPI). Si no hay imagen, sus iniciales. */
export function sprite(nombre, { id, clase = "" } = {}) {
  const idImagen = id ?? especie(nombre)?.id;
  const iniciales = escapar(String(nombre).replace(/[^A-Za-zÀ-ÿ ]/g, " ").split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase());
  if (!idImagen) return `<span class="sprite sin ${clase}" data-iniciales="${iniciales}" aria-hidden="true"></span>`;
  // API web: imágenes de la PokeAPI, alojadas en GitHub (admiten CORS, así el service worker puede guardarlas)
  return `<span class="sprite ${clase}"><img src="${urlSprite(idImagen)}" alt="" loading="lazy" decoding="async" crossorigin="anonymous" width="96" height="96" onerror="this.parentElement.classList.add('sin'); this.parentElement.dataset.iniciales='${iniciales}'; this.remove()"></span>`;
}

export function enlaceExterno(url, texto, clase = "") {
  return `<a class="${clase}" href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${texto}</a>`;
}

export function fechaCorta(milisegundos) {
  return new Date(milisegundos).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function haceCuanto(milisegundos) {
  const minutos = Math.round((Date.now() - milisegundos) / 60_000);
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return fechaCorta(milisegundos);
}

/** «2026-09» → «septiembre de 2026» (o «sept 2026» con estilo "short"). */
export function nombreMes(mes, estilo = "long") {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(anio, numero - 1, 1).toLocaleDateString("es-ES", { month: estilo, year: "numeric" });
}

// ---------------------------------------------------------------------------
// Bloques de pantalla

export function cargando(texto = "Cargando…") {
  return `<div class="tarjeta cargando"><div class="giro" aria-hidden="true"></div><p>${escapar(texto)}</p></div>`;
}

export function aviso(mensaje, detalle = "") {
  return `<div class="tarjeta aviso" role="alert"><p>${escapar(mensaje)}</p>${detalle ? `<p class="aviso-detalle">${detalle}</p>` : ""}</div>`;
}

export function vacio(titulo, texto, accion = "") {
  return `<div class="tarjeta vacio"><p class="vacio-titulo">${escapar(titulo)}</p><p>${texto}</p>${accion}</div>`;
}

export function tituloSeccion(titulo, extra = "", color = "") {
  return `
    <header class="tarjeta-cabecera">
      <h2${color ? ` style="--acento: ${color}"` : ""}>${titulo}</h2>
      ${extra}
    </header>`;
}

/** Cabecera de las pantallas con flecha para volver, título, subtítulo y botones a la derecha. */
export function cabeceraDetalle({ titulo, subtitulo = "", volver = "#/inicio", acciones = "" }) {
  return `
    <header class="cabecera">
      <div class="marca">
        <a class="boton-icono volver" href="${volver}" data-volver aria-label="Volver">${ICONOS.atras}</a>
        <div>
          <p class="cabecera-titulo">${titulo}</p>
          ${subtitulo ? `<p class="marca-sub">${subtitulo}</p>` : ""}
        </div>
      </div>
      <div class="cabecera-acciones">${acciones}</div>
    </header>`;
}

/** Fila de botones para cambiar de formato (VGC, OU, BSS…). */
export function selectorDeFormatos() {
  const actual = formatoActual();
  return `
    <div class="formatos" role="group" aria-label="Formato">
      ${infoMeta().formatos.map((f) => `
        <button type="button" class="formato${f.id === actual ? " activo" : ""}" data-formato="${f.id}" aria-pressed="${f.id === actual}">
          ${f.id === actual ? ICONOS.escudo : ""}<span>${escapar(f.nombre)}</span><small>${escapar(f.modo)}</small>
        </button>`).join("")}
    </div>`;
}

let temporizadorAviso;
export function avisar(mensaje) {
  const elemento = document.querySelector("#aviso-flotante");
  elemento.textContent = mensaje;
  elemento.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => elemento.classList.remove("visible"), 2200);
}

/** Copia un texto al portapapeles (API del navegador: Clipboard API). */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    avisar("Copiado al portapapeles");
    return true;
  } catch {
    avisar("No se ha podido copiar: selecciona el texto y cópialo a mano");
    return false;
  }
}

/** Sugerencias de un campo de texto (elementos <datalist> de index.html). Se rellenan la primera vez. */
export function rellenarLista(id, valores) {
  const lista = document.querySelector(`#${id}`);
  if (lista && lista.childElementCount === 0) {
    lista.innerHTML = [...new Set(valores)].map((valor) => `<option value="${escapar(valor)}"></option>`).join("");
  }
}
