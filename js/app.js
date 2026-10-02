// Apex Dex · versión 2 de la Pokémon App: una app web para el móvil que se instala como app (PWA).
// Este fichero arranca la app y decide qué pantalla se ve según la dirección (#/inicio, #/dex/dragapult…).
import { cargarMeta, dic, infoMeta } from "./meta.js";
import { usarTablaDeTipos } from "./tipos.js";
import { guardar } from "./estado.js";
import { aviso, avisar, escapar } from "./ui.js";
import * as inicio from "./vistas/inicio.js";
import * as dex from "./vistas/dex.js";
import * as tierlist from "./vistas/tierlist.js";
import * as equipos from "./vistas/equipos.js";
import * as matches from "./vistas/matches.js";
import * as perfil from "./vistas/perfil.js";

const PANTALLAS = { inicio, dex, tierlist, equipos, matches, perfil };
// Pestaña de la barra inferior que se ilumina en cada pantalla
const PESTANA = { inicio: "inicio", tierlist: "inicio", dex: "dex", equipos: "equipos", matches: "matches", perfil: "perfil" };

const vista = document.querySelector("#vista");
let turno = 0;       // para descartar pantallas que terminan de cargar cuando ya se ha ido a otra
let profundidad = 0; // pasos desde la primera pantalla abierta (ver apuntarProfundidad)

arrancar();

async function arrancar() {
  // Los enlaces de la primera versión (?p=887) siguen funcionando
  const antiguo = new URLSearchParams(location.search).get("p");
  if (antiguo) history.replaceState(history.state, "", `${location.pathname}#/dex/${encodeURIComponent(antiguo)}`);

  try {
    await cargarMeta();
  } catch (error) {
    console.error(error);
    vista.innerHTML = aviso("No se han podido cargar los datos de la app.", "Comprueba la conexión y vuelve a abrirla.");
    return;
  }
  usarTablaDeTipos(dic().tabla);
  conectarEventosGlobales();
  apuntarProfundidad(0);
  window.addEventListener("hashchange", () => {
    apuntarProfundidad(profundidad + 1);
    enrutar();
  });
  await enrutar();
  registrarServiceWorker();
}

// History API: cada pantalla del historial guarda a cuántos pasos está de la primera.
// Así la flecha de volver solo usa «atrás» si hay una pantalla de la app detrás (y no sale de la app).
function apuntarProfundidad(siEsNueva) {
  if (typeof history.state?.profundidad === "number") {
    profundidad = history.state.profundidad; // se ha vuelto a una pantalla ya visitada
  } else {
    profundidad = siEsNueva;
    history.replaceState({ profundidad }, "");
  }
}

/** «#/dex/golisopod?forma=Golisopod-Mega» → { seccion: "dex", parametros: ["golisopod"], consulta } */
function leerRuta() {
  const [ruta, consulta = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [seccion = "inicio", ...parametros] = ruta.split("/").filter(Boolean).map((parte) => {
    try {
      return decodeURIComponent(parte);
    } catch {
      return parte;
    }
  });
  return { seccion: PANTALLAS[seccion] ? seccion : "inicio", parametros, consulta: new URLSearchParams(consulta) };
}

async function enrutar() {
  const miTurno = ++turno;
  const { seccion, parametros, consulta } = leerRuta();
  for (const enlace of document.querySelectorAll(".barra-inferior a")) {
    if (enlace.dataset.seccion === PESTANA[seccion]) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
  try {
    await PANTALLAS[seccion].pintar(vista, {
      id: parametros[0],
      clave: parametros[0]?.toLowerCase(),
      forma: consulta.get("forma"),
      vigente: () => miTurno === turno,
    });
  } catch (error) {
    if (miTurno !== turno) return;
    console.error(error);
    vista.innerHTML = aviso("Algo ha fallado al abrir esta pantalla.", escapar(error.message));
  }
}

function conectarEventosGlobales() {
  document.addEventListener("click", (evento) => {
    // Botones de formato (VGC, OU, BSS…): se guarda la elección y se repinta la pantalla
    const botonFormato = evento.target.closest("[data-formato]");
    if (botonFormato) {
      const formato = infoMeta().formatos.find((f) => f.id === botonFormato.dataset.formato);
      if (!formato) return;
      guardar((e) => { e.perfil.formato = formato.id; });
      avisar(`Formato: ${formato.nombre}`);
      enrutar();
      return;
    }
    // Flecha de volver: atrás en el historial si se llegó desde otra pantalla de la app
    const volver = evento.target.closest("[data-volver]");
    if (volver && profundidad > 0) {
      evento.preventDefault();
      history.back();
    }
  });
}

// ---------------------------------------------------------------------------
// Service worker: guarda la app en el móvil y avisa cuando hay una versión nueva

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const habiaVersionAnterior = Boolean(navigator.serviceWorker.controller);
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaVersionAnterior || recargando) return;
    recargando = true;
    location.reload();
  });

  navigator.serviceWorker.register("sw.js").then((registro) => {
    const avisarSiHayNueva = () => {
      if (registro.waiting && navigator.serviceWorker.controller) mostrarActualizacion(registro.waiting);
    };
    avisarSiHayNueva();
    registro.addEventListener("updatefound", () => {
      registro.installing?.addEventListener("statechange", avisarSiHayNueva);
    });
    // Las apps de la pantalla de inicio pueden pasar días abiertas: se comprueba al volver a ellas
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registro.update().catch(() => {});
    });
  }).catch((error) => console.warn("No se ha podido registrar el service worker", error));
}

function mostrarActualizacion(trabajador) {
  const barra = document.querySelector("#actualizacion");
  barra.hidden = false;
  barra.querySelector("button").onclick = () => {
    barra.querySelector("button").disabled = true;
    trabajador.postMessage("actualizar");
  };
}
