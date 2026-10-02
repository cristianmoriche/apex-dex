// Pantalla Home: repetición destacada, formatos, tier list destacada y núcleos del meta
import { cargarFormato, infoMeta, especie, nombreHabilidad, rutaDex, nombreDesdeClave, nombreDeClave, ABREVIATURAS } from "../meta.js";
import { leer, resumenCombates } from "../estado.js";
import { buscarRepeticiones, urlRepeticion } from "../showdown.js";
import { analizarDefensa, colorTipo } from "../tipos.js";
import {
  ICONOS, ICONO_ESTILO, escapar, decimal, porcentaje, numeroPokedex, insigniaTipo, sprite,
  selectorDeFormatos, nombreMes, haceCuanto, enlaceExterno,
} from "../ui.js";

const COLORES_ESTADISTICA = [
  "var(--stat-ps)", "var(--stat-ataque)", "var(--stat-defensa)",
  "var(--stat-ataque-especial)", "var(--stat-defensa-especial)", "var(--stat-velocidad)",
];
const COLORES_NUCLEO = ["var(--cian)", "var(--dorado)", "var(--morado)", "var(--verde)"];

export async function pintar(vista, { vigente }) {
  const formato = await cargarFormato();
  if (!vigente()) return;
  const meta = infoMeta();
  const { perfil, recientes } = leer();

  vista.innerHTML = `
    ${cabecera(perfil, meta)}

    <section class="destacado" id="repeticion" aria-label="Repetición destacada">
      <div class="destacado-texto">
        <p class="destacado-etiquetas"><span class="en-vivo">Showdown</span><span>${escapar(formato.nombre)}</span></p>
        <p class="destacado-titulo">Buscando partidas…</p>
      </div>
    </section>

    ${selectorDeFormatos()}

    <section class="seccion">
      <header class="seccion-cabecera">
        <div>
          <h2>Tier list destacada <span class="chip dorado">S tier</span></h2>
          <p>${escapar(formato.nombre)} · uso de ${nombreMes(meta.mes)}</p>
        </div>
        <a class="ver-todo" href="#/tierlist">Ver todo ›</a>
      </header>
      <div class="cartas-tier">${formato.pokemon.slice(0, 4).map(cartaTier).join("")}</div>
    </section>

    <section class="seccion">
      <header class="seccion-cabecera">
        <div>
          <h2>Sinergias de equipo</h2>
          <p>Los tríos que más se repiten en ${escapar(formato.corto)}</p>
        </div>
        <span class="chip cian">Núcleos activos</span>
      </header>
      ${titulosDeNucleos(formato.nucleos).map((titulo, i) => cartaNucleo(formato.nucleos[i], i, titulo)).join("")}
    </section>

    ${recientes.length ? `
      <section class="seccion">
        <header class="seccion-cabecera"><div><h2>Búsquedas recientes</h2></div></header>
        <div class="recientes">
          ${recientes.map((clave) => {
            const nombre = nombreDesdeClave(clave);
            return `<a class="reciente" href="#/dex/${encodeURIComponent(clave)}">${sprite(nombreDeClave(clave) ?? nombre, { id: especie(nombreDeClave(clave))?.id })}<span>${escapar(nombre)}</span></a>`;
          }).join("")}
        </div>
      </section>` : ""}

    <p class="pie">
      Uso: Smogon (${nombreMes(meta.mes)}, partidas con rating de ${formato.corte} o más) · Pokédex: PokeAPI ·
      Partidas: Pokémon Showdown. Apex Dex es un proyecto educativo no oficial.
    </p>`;

  repeticionDestacada(vista.querySelector("#repeticion"), formato, vigente);
}

function cabecera(perfil, meta) {
  const resumen = resumenCombates();
  const avatar = perfil.avatar && especie(perfil.avatar) ? sprite(perfil.avatar) : `<span class="sprite sin" data-iniciales="${escapar((perfil.nombre || "?").charAt(0).toUpperCase())}"></span>`;
  return `
    <header class="cabecera">
      <div class="marca">
        <span class="logo" aria-hidden="true">${ICONOS.logo}</span>
        <div>
          <p class="marca-nombre">APEX DEX</p>
          <p class="marca-sub">Meta · ${nombreMes(meta.mes, "short")}</p>
        </div>
      </div>
      <div class="cabecera-acciones">
        <a class="boton-icono" href="#/dex" aria-label="Buscar un Pokémon">${ICONOS.buscar}</a>
        <a class="perfil-chip" href="#/perfil" aria-label="Perfil">
          ${avatar}
          <span>
            <strong>${escapar(perfil.nombre || "Entrenador/a")}</strong>
            <small>${resumen.total ? `${resumen.victorias} V · ${resumen.derrotas} D` : "Sin combates"}</small>
          </span>
        </a>
      </div>
    </header>`;
}

// Showdown no tiene partidas «en directo» públicas por API, pero sí las repeticiones recientes:
// se elige la de rating más alto entre las últimas que se han subido del formato.
async function repeticionDestacada(contenedor, formato, vigente) {
  try {
    const lista = await buscarRepeticiones({ formato: formato.id });
    if (!vigente()) return;
    const elegida = [...lista].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (!elegida) {
      contenedor.remove();
      return;
    }
    contenedor.innerHTML = `
      <div class="destacado-texto">
        <p class="destacado-etiquetas"><span class="en-vivo">Reciente</span><span>${escapar(formato.nombre)}</span></p>
        <p class="destacado-titulo">Repetición destacada</p>
        <p class="destacado-sub">${elegida.rating ? `Rating ${elegida.rating}` : "Partida pública"} · ${haceCuanto(elegida.uploadtime * 1000)}</p>
        <p class="destacado-jugadores">${escapar(elegida.players[0])} <span>vs.</span> ${escapar(elegida.players[1])}</p>
      </div>
      <div class="destacado-accion">
        <span class="destacado-icono" aria-hidden="true">${ICONOS.trofeo}</span>
        ${enlaceExterno(urlRepeticion(elegida.id), "Ver", "boton-ver")}
      </div>`;
  } catch {
    if (!vigente()) return;
    contenedor.innerHTML = `
      <div class="destacado-texto">
        <p class="destacado-etiquetas"><span class="en-vivo apagado">Sin conexión</span></p>
        <p class="destacado-sub">La repetición destacada de Pokémon Showdown aparecerá cuando vuelva Internet.</p>
      </div>`;
  }
}

function cartaTier(p) {
  const e = especie(p.nombre);
  const tipos = e?.tipos ?? [];
  // Sus tres estadísticas base más altas, en el orden de siempre (PS, Atq, Def…)
  const mejores = (e?.base ?? [])
    .map((valor, i) => ({ valor, i }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i);
  return `
    <a class="carta-tier" href="${rutaDex(p.nombre)}" style="--c: ${colorTipo(tipos[0])}">
      <div class="carta-tier-cabecera">
        <span class="numero">${e ? numeroPokedex(e.num) : ""}</span>
        <span class="insignias mini">${tipos.map((t) => insigniaTipo(t)).join("")}</span>
      </div>
      <div class="carta-tier-cuerpo">
        ${sprite(p.nombre, { clase: "grande" })}
        <div>
          <p class="carta-nombre">${escapar(p.nombre)}</p>
          <p class="carta-sub">${escapar(nombreHabilidad(p.habilidades[0]?.[0] ?? ""))}</p>
        </div>
      </div>
      <ul class="mini-estadisticas">
        ${mejores.map(({ valor, i }) => `
          <li>
            <span>${ABREVIATURAS[i]}</span><strong>${valor}</strong>
            <span class="barra" style="--ancho: ${Math.min(100, (valor / 200) * 100).toFixed(0)}%; --color: ${COLORES_ESTADISTICA[i]}"><span></span></span>
          </li>`).join("")}
      </ul>
      <p class="etiquetas">
        <span>#${p.puesto} · ${porcentaje(p.uso)}</span>
        ${p.roles.slice(0, 2).map((rol) => `<span>${escapar(rol)}</span>`).join("")}
      </p>
    </a>`;
}

// Cada núcleo se llama por su estilo (lluvia, Espacio Raro…); si ya hay otro con ese nombre,
// por el Pokémon que aparece por primera vez en él
function titulosDeNucleos(nucleos) {
  const usados = new Set();
  return nucleos.map((nucleo, i) => {
    let titulo = nucleo.estilo ? `Núcleo ${nucleo.estilo}` : `Núcleo ${nucleo.miembros[0]}`;
    if (usados.has(titulo)) {
      const vistos = new Set(nucleos.slice(0, i).flatMap((n) => n.miembros));
      titulo = `Núcleo ${nucleo.miembros.find((m) => !vistos.has(m)) ?? nucleo.miembros[1]}`;
    }
    usados.add(titulo);
    return titulo;
  });
}

function cartaNucleo(nucleo, indice, titulo) {
  const tipos = nucleo.miembros.map((m) => especie(m)?.tipos ?? []);
  const resistidos = analizarDefensa(tipos).filter((t) => t.resisten + t.inmunes > 0).length;
  const icono = ICONOS[ICONO_ESTILO[nucleo.estilo]] ?? ICONOS.escudo;
  return `
    <article class="nucleo" style="--c: ${COLORES_NUCLEO[indice % COLORES_NUCLEO.length]}">
      <div class="nucleo-cabecera">
        <span class="nucleo-icono" aria-hidden="true">${icono}</span>
        <div>
          <h3>${escapar(titulo)}</h3>
          <p>${nucleo.miembros.map(escapar).join(" / ")}</p>
        </div>
        <p class="nucleo-nota">${decimal(nucleo.juntos)}<small> %</small></p>
      </div>
      <div class="nucleo-sprites">
        ${nucleo.miembros.map((m) => `<a href="${rutaDex(m)}" aria-label="${escapar(m)}">${sprite(m)}</a>`).join("")}
        <p>Entre los tres resisten <strong>${resistidos}/18</strong> tipos</p>
      </div>
      <div class="nucleo-pie">
        <span>Juntos en sus equipos</span>
        <span class="barra" style="--ancho: ${Math.min(100, nucleo.juntos)}%; --color: var(--c)"><span></span></span>
        <strong>${porcentaje(nucleo.juntos)}</strong>
      </div>
    </article>`;
}
