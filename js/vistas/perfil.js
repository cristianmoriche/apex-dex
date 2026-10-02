// Pantalla Perfil: tus datos, tu Elo en Showdown, favoritos, instalación, copia de seguridad y créditos
import {
  infoMeta, formatoActual, resumenFormato, especie, nombreDeEspecie, nombresDeEspecies, nombreDeClave, nombreDesdeClave,
} from "../meta.js";
import { leer, guardar, resumenCombates, exportar, importar, borrarTodo } from "../estado.js";
import { perfilDeJugador, urlPerfil, SinDatos } from "../showdown.js";
import {
  ICONOS, escapar, sprite, tituloSeccion, avisar, cargando, aviso, nombreMes, enlaceExterno, rellenarLista, fechaCorta,
} from "../ui.js";

export const VERSION_APP = "2.0";

export async function pintar(vista, { vigente }) {
  rellenarLista("lista-pokemon", nombresDeEspecies());
  const datos = leer();
  const { perfil } = datos;
  const resumen = resumenCombates();
  const meta = infoMeta();
  // En el iPhone, navigator.standalone dice si se ha abierto desde el icono de la pantalla de inicio
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const avatar = perfil.avatar && especie(perfil.avatar)
    ? sprite(perfil.avatar, { clase: "enorme" })
    : `<span class="sprite enorme sin" data-iniciales="${escapar((perfil.nombre || "?").charAt(0).toUpperCase())}"></span>`;

  vista.innerHTML = `<div class="pantalla">
    <header class="cabecera">
      <div>
        <p class="cabecera-titulo grande">Perfil</p>
        <p class="marca-sub">${instalada ? "App instalada en este móvil" : "Abierta en el navegador"}</p>
      </div>
    </header>

    <section class="tarjeta entrenador">
      ${avatar}
      <div>
        <p class="entrenador-nombre">${escapar(perfil.nombre || "Entrenador/a")}</p>
        <p class="marca-sub">${perfil.showdown ? `Showdown: ${escapar(perfil.showdown)}` : "Sin usuario de Showdown"}</p>
        <p class="entrenador-formato">Formato: ${escapar(resumenFormato()?.nombre ?? "")}</p>
      </div>
    </section>

    <section class="tarjeta">
      <div class="cifras">
        <div><strong class="cian">${datos.equipos.length}</strong><span>Equipos</span></div>
        <div><strong class="morado">${resumen.total}</strong><span>Combates</span></div>
        <div><strong class="verde">${resumen.porcentaje ?? "–"}${resumen.porcentaje !== null ? "<small>%</small>" : ""}</strong><span>Ganados</span></div>
        <div><strong class="dorado">${datos.favoritos.length}</strong><span>Favoritos</span></div>
      </div>
    </section>

    <section class="tarjeta">
      ${tituloSeccion("Tus datos")}
      <form id="perfil" class="formulario">
        <label>Nombre<input name="nombre" value="${escapar(perfil.nombre)}" maxlength="24" autocomplete="nickname"></label>
        <label>Usuario de Pokémon Showdown
          <input name="showdown" value="${escapar(perfil.showdown)}" maxlength="18" autocomplete="off" autocapitalize="none" spellcheck="false">
        </label>
        <label>Formato favorito
          <select name="formato">
            ${meta.formatos.map((f) => `<option value="${f.id}"${f.id === formatoActual() ? " selected" : ""}>${escapar(f.nombre)} · ${escapar(f.modo)}</option>`).join("")}
          </select>
        </label>
        <label>Pokémon de tu avatar
          <input name="avatar" list="lista-pokemon" value="${escapar(perfil.avatar ?? "")}" placeholder="Ej. Dragapult" autocomplete="off" autocapitalize="none" spellcheck="false">
        </label>
        <button type="submit" class="boton">Guardar</button>
      </form>
      <p class="nota-datos">Tu usuario de Showdown sirve para ver tu Elo y para importar tus repeticiones en Matches. No se pide contraseña: solo se leen datos públicos.</p>
    </section>

    ${perfil.showdown ? `<section class="tarjeta" id="elo">${tituloSeccion("Tu Elo en Showdown", "", "var(--morado)")}${cargando("Consultando Showdown…")}</section>` : ""}

    <section class="tarjeta">
      ${tituloSeccion("Favoritos", `<p class="chip">${datos.favoritos.length}</p>`, "var(--dorado)")}
      ${datos.favoritos.length ? `
        <div class="favoritos">
          ${datos.favoritos.map((clave) => `
            <a class="favorito" href="#/dex/${encodeURIComponent(clave)}">
              ${sprite(nombreDeClave(clave) ?? clave, { id: especie(nombreDeClave(clave))?.id })}
              <span>${escapar(nombreDesdeClave(clave))}</span>
            </a>`).join("")}
        </div>` : `<p class="nada">Marca Pokémon con la estrella de su ficha y aparecerán aquí.</p>`}
    </section>

    ${instalada ? "" : `
      <section class="tarjeta instalar">
        ${tituloSeccion("Instálala en tu iPhone", "", "var(--verde)")}
        <ol class="pasos">
          <li>Abre esta página en <strong>Safari</strong>.</li>
          <li>Toca <strong>Compartir</strong> ${ICONOS.compartir} (en iOS 26 está dentro del botón <strong>···</strong> de la barra).</li>
          <li>Elige <strong>Añadir a pantalla de inicio</strong> y deja activado <strong>Abrir como app web</strong>.</li>
          <li>Toca <strong>Añadir</strong>. Tendrás Apex Dex con su icono, a pantalla completa y funcionando sin conexión.</li>
        </ol>
      </section>`}

    <section class="tarjeta">
      ${tituloSeccion("Copia de seguridad")}
      <p class="nota-datos">Tus equipos, combates y favoritos se guardan solo en este móvil. Descarga una copia para no perderlos o para pasarlos a otro dispositivo.</p>
      <div class="botones-fila">
        <button type="button" class="boton" data-accion="exportar">${ICONOS.descargar} Descargar copia</button>
        <label class="boton secundario">${ICONOS.subir} Restaurar copia
          <input type="file" accept="application/json,.json" id="restaurar" class="solo-lectores">
        </label>
      </div>
      <button type="button" class="boton peligro pequeno" data-accion="borrar">${ICONOS.papelera} Borrar todos mis datos</button>
    </section>

    <section class="tarjeta acerca">
      ${tituloSeccion("Acerca de Apex Dex")}
      <p>Versión ${VERSION_APP} · Datos de uso de ${nombreMes(meta.mes)}, preparados el ${fechaCorta(new Date(`${meta.generado}T12:00:00`).getTime())}.</p>
      <h3 class="grupo-titulo">APIs y fuentes de datos</h3>
      <ul class="lista-apis">
        <li><strong>PokeAPI</strong> (API web): fichas, imágenes y descripciones, en directo.</li>
        <li><strong>Smogon</strong> (estadísticas de uso): uso, sets, compañeros y counters de cada mes, preparados con <code>herramientas/generar-datos.mjs</code>.</li>
        <li><strong>Pokémon Showdown</strong> (API web): repeticiones y Elo en directo, y datos del simulador (tiers, movimientos y objetos).</li>
        <li><strong>APIs del navegador</strong>: Fetch, Web Storage, Service Worker, Cache Storage, Clipboard e History.</li>
        <li><strong>Google Fonts</strong>: tipografías Space Grotesk y JetBrains Mono.</li>
      </ul>
      <p class="nota-datos">
        Apex Dex es un proyecto educativo de 1.º de DAM, sin ánimo de lucro y no oficial. No está afiliado a Nintendo,
        Creatures, GAME FREAK, The Pokémon Company, Smogon ni Pokémon Showdown. Pokémon y los nombres de los Pokémon
        son marcas de sus respectivos propietarios.
      </p>
    </section>
  </div>`;

  conectar(vista, vigente);
  if (perfil.showdown) cargarElo(vista, perfil.showdown, vigente);
}

async function cargarElo(vista, usuario, vigente) {
  const contenedor = vista.querySelector("#elo");
  try {
    const jugador = await perfilDeJugador(usuario);
    if (!vigente()) return;
    const filas = jugador.valoraciones.slice(0, 12);
    contenedor.innerHTML = `
      ${tituloSeccion("Tu Elo en Showdown", enlaceExterno(urlPerfil(usuario), `${ICONOS.externo}<span class="solo-lectores">Ver el perfil en Showdown</span>`, "boton-icono pequeno"), "var(--morado)")}
      ${filas.length ? `
        <table class="tabla">
          <thead><tr><th scope="col">Formato</th><th scope="col">Elo</th><th scope="col">GXE</th><th scope="col">V–D</th></tr></thead>
          <tbody>
            ${filas.map((v) => `
              <tr>
                <th scope="row">${escapar(nombreDeFormatoShowdown(v.formato))}</th>
                <td><strong>${v.elo}</strong></td>
                <td>${v.gxe ?? "–"}</td>
                <td>${v.victorias ?? 0}–${v.derrotas ?? 0}</td>
              </tr>`).join("")}
          </tbody>
        </table>`
        : `<p class="nada">${escapar(jugador.nombre)} aún no tiene partidas puntuadas.</p>`}
      <p class="nota-datos">GXE: probabilidad estimada de ganar a un rival cualquiera del ladder.</p>`;
  } catch (error) {
    if (!vigente()) return;
    contenedor.innerHTML = `${tituloSeccion("Tu Elo en Showdown")}${aviso(error instanceof SinDatos
      ? `No existe ningún usuario «${usuario}» en Pokémon Showdown.`
      : "No se ha podido conectar con Pokémon Showdown.")}`;
  }
}

// Los formatos de la app tienen nombre bonito; el resto, a partir de su id («gen2ou» → «Gen 2 OU»)
function nombreDeFormatoShowdown(id) {
  const conocido = resumenFormato(id)?.nombre;
  if (conocido) return conocido;
  const partes = id.match(/^gen(\d+)(.*)$/);
  const resto = partes ? partes[2] : id;
  const tier = resto.length <= 4 ? resto.toUpperCase() : resto;
  return partes ? `Gen ${partes[1]} ${tier}` : tier;
}

function conectar(vista, vigente) {
  const pantalla = vista.querySelector(".pantalla");
  const repintar = () => pintar(vista, { vigente });

  pantalla.querySelector("#perfil").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.target);
    const textoAvatar = datos.get("avatar").trim();
    const avatar = textoAvatar ? nombreDeEspecie(textoAvatar) : null;
    if (textoAvatar && !avatar) {
      avisar(`No encuentro a «${textoAvatar}»`);
      return;
    }
    guardar((e) => {
      e.perfil.nombre = datos.get("nombre").trim();
      e.perfil.showdown = datos.get("showdown").trim();
      e.perfil.formato = datos.get("formato");
      e.perfil.avatar = avatar;
    });
    avisar("Perfil guardado");
    repintar();
  });

  pantalla.querySelector("#restaurar").addEventListener("change", async (evento) => {
    const fichero = evento.target.files[0];
    if (!fichero) return;
    if (!confirm("La copia sustituirá a todos los datos de este móvil. ¿Seguimos?")) return;
    try {
      importar(await fichero.text());
      avisar("Copia restaurada");
      repintar();
    } catch (error) {
      avisar(error.message.includes("Apex Dex") ? error.message : "Ese fichero no es una copia válida");
    }
  });

  pantalla.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    if (boton.dataset.accion === "exportar") {
      descargar(exportar(), `apex-dex-copia-${new Date().toISOString().slice(0, 10)}.json`);
      avisar("Copia descargada");
    } else if (boton.dataset.accion === "borrar") {
      if (!confirm("¿Borrar tu perfil, equipos, combates y favoritos de este móvil? No se puede deshacer.")) return;
      borrarTodo();
      avisar("Datos borrados");
      repintar();
    }
  });
}

/** Descarga un texto como fichero (en el iPhone se abre la hoja para guardarlo en Archivos). */
function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  const enlace = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
