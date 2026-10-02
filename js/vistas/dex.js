// Pantalla Stats & Dex: la ficha de un Pokémon (PokeAPI) con sus datos competitivos (Smogon)
import { buscarPokemon, NoEncontrado } from "../pokeapi.js";
import {
  cargarFormato, infoMeta, formatoActual, claveDeBusqueda, nombreDeClave, entradaParaDex, especie, rutaDex,
  tierDeUso, nombreHabilidad, nombreObjeto, nombreMovimiento, estadisticasReales, textoSpread, valoresDeSpread,
  setMasUsado, nombresDeEspecies, dic,
} from "../meta.js";
import { calcularDanoRecibido, agruparPorMultiplicador, superefectivoContra, colorTipo, nombreTipo } from "../tipos.js";
import { leer, guardar, apuntarReciente, esFavorito, cambiarFavorito, nuevoId } from "../estado.js";
import {
  ICONOS, escapar, decimal, porcentaje, numeroPokedex, insigniaTipo, listaTipos, sprite, cabeceraDetalle,
  tituloSeccion, cargando, aviso, avisar, rellenarLista,
} from "../ui.js";

const ESTADISTICAS = [
  { clave: "hp", nombre: "PS", color: "var(--stat-ps)" },
  { clave: "attack", nombre: "Atq", color: "var(--stat-ataque)" },
  { clave: "defense", nombre: "Def", color: "var(--stat-defensa)" },
  { clave: "special-attack", nombre: "AtEsp", color: "var(--stat-ataque-especial)" },
  { clave: "special-defense", nombre: "DefEsp", color: "var(--stat-defensa-especial)" },
  { clave: "speed", nombre: "Vel", color: "var(--stat-velocidad)" },
];
const ESTADISTICA_MAXIMA = 255; // la estadística base más alta que puede tener un Pokémon
const ULTIMO_NUMERO = 1025;     // último número de la Pokédex nacional
const POR_DEFECTO = "dragapult";
const unir = new Intl.ListFormat("es", { type: "conjunction" });

export async function pintar(vista, { clave, forma, vigente }) {
  const busqueda = clave ? claveDeBusqueda(clave) : (leer().recientes[0] ?? POR_DEFECTO);
  const resumen = infoMeta().formatos.find((f) => f.id === formatoActual());

  vista.innerHTML = `
    <div id="dex-cabecera">${cabeceraDetalle({ titulo: "Detalle Pokédex", subtitulo: `${escapar(resumen.corto)} Meta` })}</div>
    <form class="buscador" role="search" id="buscador">
      <label for="busqueda" class="solo-lectores">Nombre o número del Pokémon</label>
      <input id="busqueda" type="search" list="lista-pokemon" placeholder="Nombre o número"
        autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">
      <button type="submit">Buscar</button>
      <button type="button" class="boton-icono" id="aleatorio" aria-label="Pokémon aleatorio" title="Pokémon aleatorio">${ICONOS.dado}</button>
    </form>
    <div id="dex-contenido">${cargando("Buscando en la Pokédex…")}</div>`;
  rellenarLista("lista-pokemon", nombresDeEspecies());
  conectarBuscador(vista);

  const contenido = vista.querySelector("#dex-contenido");
  if (!/^[a-z0-9-]+$/.test(busqueda)) {
    contenido.innerHTML = aviso("Escribe solo letras, números o guiones (ejemplo: mr-mime).");
    return;
  }

  let pokemon;
  let formato;
  try {
    [pokemon, formato] = await Promise.all([buscarPokemon(busqueda), cargarFormato()]);
  } catch (error) {
    if (!vigente()) return;
    if (error instanceof NoEncontrado) {
      contenido.innerHTML = aviso(`No existe ningún Pokémon con el nombre o el número «${busqueda}».`,
        "Prueba con su nombre en inglés (ej. «iron-valiant») o con su número de la Pokédex.");
    } else {
      console.error(error);
      contenido.innerHTML = aviso("No se ha podido conectar con la PokeAPI. Revisa tu conexión a Internet.");
    }
    return;
  }
  if (!vigente()) return;

  // Si se buscó por número (716), la dirección pasa a llevar el nombre (#/dex/xerneas)
  if (pokemon.clave !== busqueda || !clave) {
    history.replaceState(history.state, "", `#/dex/${pokemon.clave}${forma ? `?forma=${encodeURIComponent(forma)}` : ""}`);
  }
  apuntarReciente(pokemon.clave);

  // Formas que la PokeAPI aún no tiene (Arceus-Fuego, Genesect con disco…): tipos y estadísticas de Showdown
  const formaAproximada = forma && especie(forma)?.aproximada ? especie(forma) : null;
  if (formaAproximada) {
    pokemon.tipos = formaAproximada.tipos;
    pokemon.estadisticas = pokemon.estadisticas.map((s, i) => ({ ...s, valor: formaAproximada.base[i] }));
    pokemon.esFormaBase = false;
  }

  const nombreShowdown = forma ?? nombreDeClave(pokemon.clave);
  const { formas, elegida } = entradaParaDex(formato, nombreShowdown);
  const estado = { pokemon, formato, nombreShowdown, formas, elegida, aproximada: Boolean(formaAproximada) };

  vista.querySelector("#dex-cabecera").innerHTML = cabecera(estado);
  contenido.innerHTML = ficha(estado);
  conectarFicha(vista, estado);
  if (!elegida) buscarEnOtrosFormatos(vista, estado, vigente);
}

function conectarBuscador(vista) {
  const formulario = vista.querySelector("#buscador");
  const campo = vista.querySelector("#busqueda");
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (!texto) {
      avisar("Escribe el nombre o el número de un Pokémon");
      return;
    }
    campo.blur(); // cierra el teclado del móvil
    location.hash = `#/dex/${encodeURIComponent(claveDeBusqueda(texto))}`;
  });
  vista.querySelector("#aleatorio").addEventListener("click", () => {
    location.hash = `#/dex/${1 + Math.floor(Math.random() * ULTIMO_NUMERO)}`;
  });
}

function cabecera({ pokemon, formato }) {
  const favorito = esFavorito(pokemon.clave);
  return cabeceraDetalle({
    titulo: `<span class="numero">${numeroPokedex(pokemon.numero)}</span> Detalle Pokédex`,
    subtitulo: `${escapar(formato.corto)} Meta`,
    acciones: `
      <button type="button" class="boton-icono estrella${favorito ? " activa" : ""}" id="favorito" aria-pressed="${favorito}"
        aria-label="${favorito ? "Quitar de favoritos" : "Añadir a favoritos"}">${ICONOS.estrella}</button>
      <button type="button" class="boton pequeno" id="al-equipo">${ICONOS.mas} Equipo</button>`,
  });
}

// ---------------------------------------------------------------------------
// La ficha

function ficha(estado) {
  return `
    ${tarjetaPrincipal(estado)}
    ${tarjetaEstadisticas(estado)}
    ${tarjetaEficacia(estado)}
    <div id="competitivo">${competitivo(estado)}</div>
    <section class="tarjeta">
      ${tituloSeccion("Descripción de la Pokédex")}
      <p class="descripcion">${escapar(estado.pokemon.descripcion ?? "No hay descripción en español.")}</p>
    </section>`;
}

function tarjetaPrincipal({ pokemon, formato, elegida, nombreShowdown, aproximada }) {
  const e = especie(nombreShowdown);
  const habilidadTop = elegida?.habilidades[0];
  const teraTop = formato.tera ? elegida?.tera?.[0] : null;
  const objetoTop = elegida?.objetos[0];
  const ultimo = formato.tera
    ? { titulo: "Tera más usado", valor: teraTop ? nombreTipo(teraTop[0]) : "—", color: teraTop ? colorTipo(teraTop[0]) : null }
    : { titulo: "Objeto más usado", valor: objetoTop ? nombreObjeto(objetoTop[0]) : "—", color: "var(--dorado)" };
  const sePuedeOir = pokemon.grito && document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"');

  return `
    <article class="tarjeta ficha" style="--color-1: ${colorTipo(pokemon.tipos[0])}; --color-2: ${colorTipo(pokemon.tipos.at(-1))}">
      <div class="ficha-cabecera">
        <div>
          <p class="ficha-chips">
            ${elegida ? `<span class="chip tier-${tierDeUso(elegida.puesto).toLowerCase()}">${tierDeUso(elegida.puesto)} tier</span>
              <span class="chip">${escapar(formato.corto)} Top #${elegida.puesto}</span>` : ""}
            ${e?.tier ? `<span class="chip">Smogon ${escapar(e.tier)}</span>` : e?.tierNatDex ? `<span class="chip">NatDex ${escapar(e.tierNatDex)}</span>` : ""}
          </p>
          <h1 class="nombre">${escapar(pokemon.esFormaBase || !nombreShowdown ? pokemon.nombre : nombreShowdown)}</h1>
          <p class="categoria">${escapar(pokemon.categoria)}</p>
        </div>
        <div class="tipos">${pokemon.tipos.map((t) => insigniaTipo(t)).join("")}</div>
      </div>

      <div class="ilustracion">
        ${pokemon.imagen
          ? `<img src="${escapar(pokemon.imagen)}" alt="Ilustración oficial de ${escapar(pokemon.nombre)}" width="475" height="475" crossorigin="anonymous">`
          : `<p class="sin-imagen">Sin imagen</p>`}
        ${sePuedeOir ? `<button type="button" class="boton-icono boton-grito" id="grito" aria-label="Escuchar su grito">${ICONOS.sonido}</button>` : ""}
      </div>
      ${elegida?.roles.length ? `<p class="rol">${ICONOS.rayo}<span>${elegida.roles.map(escapar).join(" · ")}</span></p>` : ""}

      <dl class="datos">
        <div><dt>Altura</dt><dd>${decimal(pokemon.altura)} m</dd></div>
        <div><dt>Peso</dt><dd>${decimal(pokemon.peso)} kg</dd></div>
        <div><dt>Habilidad</dt><dd class="cian">${escapar(nombreHabilidad(habilidadTop?.[0] ?? pokemon.habilidades[0]?.id ?? ""))}</dd></div>
        <div><dt>${ultimo.titulo}</dt><dd${ultimo.color ? ` style="color: ${ultimo.color}"` : ""}>${escapar(ultimo.valor)}</dd></div>
      </dl>
      <p class="habilidades">
        Habilidades: ${pokemon.habilidades.map((h) => `<span class="habilidad${h.oculta ? " oculta" : ""}">${escapar(nombreHabilidad(h.id))}${h.oculta ? " <small>(oculta)</small>" : ""}</span>`).join(" · ")}
      </p>
      ${aproximada ? `<p class="nota-datos">La PokeAPI aún no tiene la forma ${escapar(nombreShowdown)}: la imagen es de su forma base, y los tipos y las estadísticas, de Pokémon Showdown.</p>` : ""}
    </article>`;
}

function tarjetaEstadisticas({ pokemon, formato, elegida, nombreShowdown }) {
  const base = pokemon.estadisticas.map((s) => s.valor);
  const total = base.reduce((suma, valor) => suma + valor, 0);
  const mayor = Math.max(...base);
  // Las estadísticas reales solo se calculan si los datos de uso son de esta misma forma
  const mismaForma = elegida && elegida.nombre === (nombreShowdown ?? "") && elegida.spreads.length;
  const [naturaleza, valoresTexto, uso] = mismaForma ? elegida.spreads[0] : [];
  const reales = mismaForma ? estadisticasReales(base, naturaleza, valoresDeSpread(valoresTexto), formato) : null;
  const efecto = mismaForma ? dic().naturalezas[naturaleza] : null;

  return `
    <section class="tarjeta">
      ${tituloSeccion("Estadísticas base", `<p class="chip">Total BST <strong>${total}</strong></p>`)}
      <ul class="estadisticas">
        ${ESTADISTICAS.map((info, i) => {
          const marca = efecto?.sube === i ? "+" : efecto?.baja === i ? "−" : "";
          return `
          <li class="estadistica${base[i] === mayor ? " destacada" : ""}">
            <span class="estadistica-nombre">${info.nombre}${base[i] === mayor ? ICONOS.rayo : ""}</span>
            <span class="estadistica-valor">${base[i]}</span>
            <span class="barra" style="--ancho: ${Math.min(100, (base[i] / ESTADISTICA_MAXIMA) * 100).toFixed(1)}%; --color: ${info.color}"><span></span></span>
            ${reales ? `<span class="estadistica-real${marca ? " con-naturaleza" : ""}" title="Estadística real">${reales[i]}${marca ? `<small>${marca}</small>` : ""}</span>` : ""}
          </li>`;
        }).join("")}
      </ul>
      ${mismaForma ? `
        <div class="spread">
          <span>Spread más usado (${porcentaje(uso)})</span>
          <strong>${escapar(textoSpread(naturaleza, valoresDeSpread(valoresTexto)))}</strong>
          <small>${formato.champions
            ? "Pokémon Champions: nivel 50 y puntos de estadística (máx. 32 por estadística y 66 en total)."
            : `Estadísticas reales a nivel ${formato.nivel} con 31 IVs.`}</small>
        </div>` : ""}
    </section>`;
}

function tarjetaEficacia({ pokemon, formato }) {
  const grupos = agruparPorMultiplicador(calcularDanoRecibido(pokemon.tipos));
  const debiles = [...grupos[4].map((t) => [t, 4]), ...grupos[2].map((t) => [t, 2])];
  const resiste = [...grupos[0].map((t) => [t, 0]), ...grupos[0.25].map((t) => [t, 0.25]), ...grupos[0.5].map((t) => [t, 0.5])];
  return `
    <section class="tarjeta">
      ${tituloSeccion("Eficacia de tipos", `<p class="chip">Matchup ${escapar(formato.corto)}</p>`, "var(--morado)")}
      <h3 class="grupo-titulo debil">${ICONOS.alerta} Débil contra</h3>
      <div class="insignias">${debiles.length ? debiles.map(([t, m]) => insigniaTipo(t, m)).join("") : `<span class="nada">Ningún tipo</span>`}</div>
      <h3 class="grupo-titulo resiste">${ICONOS.escudo} Resistencias e inmunidades</h3>
      <div class="insignias">${resiste.length ? resiste.map(([t, m]) => insigniaTipo(t, m)).join("") : `<span class="nada">Ningún tipo</span>`}</div>
      <h3 class="grupo-titulo inmune">${ICONOS.rayo} Sus ataques son superefectivos contra</h3>
      ${pokemon.tipos.map((tipo) => `
        <div class="linea-ataque">
          ${insigniaTipo(tipo)}
          <span class="flecha" aria-hidden="true">→</span>
          <span class="insignias">${listaTipos(superefectivoContra(tipo))}</span>
        </div>`).join("")}
    </section>`;
}

// ---------------------------------------------------------------------------
// Datos competitivos (Smogon)

function competitivo(estado) {
  const { formato, elegida, formas } = estado;
  if (!elegida) {
    return `
      <section class="tarjeta proximamente">
        ${tituloSeccion("Competitivo", `<p class="chip">${escapar(formato.corto)}</p>`, "var(--dorado)")}
        <p>No aparece en ${escapar(formato.nombre)} este mes${formas.length ? "" : " (o se usa en menos del 0,5 % de los equipos)"}.</p>
        ${formas.length ? `<p class="formas-aviso">Se usa en otra forma:</p>${chipsDeFormas(estado)}` : ""}
        <p id="otros-formatos" class="nota-datos"></p>
      </section>`;
  }

  const nombre = elegida.nombre;
  const tiposPropios = especie(nombre)?.tipos ?? estado.pokemon.tipos;
  return `
    ${formas.length > 1 ? `<section class="tarjeta">${tituloSeccion("Formas en el meta")}${chipsDeFormas(estado)}</section>` : ""}

    <section class="tarjeta">
      ${tituloSeccion("Mejores sinergias y compañeros", `<p class="chip dorado">Uso conjunto</p>`, "var(--dorado)")}
      <div class="companeros">
        ${elegida.companeros.slice(0, 4).map(([companero, pct], i) => tarjetaCompanero(nombre, tiposPropios, companero, pct, i, formato)).join("")}
      </div>
    </section>

    <section class="tarjeta">
      ${tituloSeccion("Movimientos meta (top sets)", `<p class="chip">Frecuencia ${escapar(formato.corto)}</p>`)}
      <div class="movimientos">${elegida.movimientos.slice(0, 8).map(([id, pct]) => tarjetaMovimiento(id, pct)).join("")}</div>
    </section>

    <section class="tarjeta">
      ${tituloSeccion("Objetos y habilidades", "", "var(--verde)")}
      <h3 class="grupo-titulo">Objetos</h3>
      ${barrasDeUso(elegida.objetos.slice(0, 4).map(([id, pct]) => [nombreObjeto(id), pct]))}
      <h3 class="grupo-titulo">Habilidades</h3>
      ${barrasDeUso(elegida.habilidades.map(([id, pct]) => [nombreHabilidad(id), pct]))}
      ${formato.tera && elegida.tera?.length ? `
        <h3 class="grupo-titulo">Teratipos</h3>
        ${barrasDeUso(elegida.tera.map(([tipo, pct]) => [nombreTipo(tipo), pct, colorTipo(tipo)]))}` : ""}
    </section>

    ${elegida.counters.length ? `
      <section class="tarjeta">
        ${tituloSeccion("Checks y counters", `<p class="chip">Le ganan</p>`, "var(--rojo)")}
        <p class="nota-datos">Porcentaje de enfrentamientos en los que ${escapar(nombre)} acabó debilitado o tuvo que cambiarse.</p>
        <div class="counters">
          ${elegida.counters.slice(0, 6).map(([rival, pct]) => `
            <a class="counter" href="${rutaDex(rival)}">${sprite(rival)}<span>${escapar(rival)}</span><strong>${porcentaje(pct)}</strong></a>`).join("")}
        </div>
      </section>` : ""}

    <p class="nota-datos fuente">
      Datos de Smogon: ${escapar(formato.nombre)}, ${formato.mes}, partidas con rating de ${formato.corte} o más.
      ${escapar(nombre)} es el n.º ${elegida.puesto} en uso (${porcentaje(elegida.uso)} de los equipos).
    </p>`;
}

function chipsDeFormas({ formas, elegida }) {
  return `
    <div class="formas">
      ${formas.map((f) => `
        <button type="button" class="forma${f === elegida ? " activa" : ""}" data-forma="${escapar(f.nombre)}">
          ${sprite(f.nombre)}<span>${escapar(f.nombre)}</span><small>${porcentaje(f.uso)}</small>
        </button>`).join("")}
    </div>`;
}

function tarjetaCompanero(nombre, tiposPropios, companero, pct, indice, formato) {
  const colores = ["var(--cian)", "var(--verde)", "var(--rojo)", "var(--morado)"];
  const suEntrada = formato.porNombre.get(companero);
  const set = suEntrada
    ? [nombreHabilidad(suEntrada.habilidades[0]?.[0] ?? ""), nombreObjeto(suEntrada.objetos[0]?.[0] ?? "")].filter(Boolean).join(" · ")
    : "";
  return `
    <a class="companero" href="${rutaDex(companero)}" style="--c: ${colores[indice % colores.length]}">
      ${sprite(companero)}
      <div class="companero-texto">
        <p class="companero-nombre">${escapar(companero)}</p>
        ${set ? `<p class="companero-set">${escapar(set)}</p>` : ""}
        <p class="companero-explicacion">${escapar(explicarSinergia(nombre, tiposPropios, companero))}</p>
      </div>
      <p class="companero-porcentaje"><strong>${porcentaje(pct)}</strong><small>juntos</small></p>
    </a>`;
}

/** Explica con la tabla de tipos por qué dos Pokémon se complementan. */
export function explicarSinergia(nombre, tiposPropios, companero) {
  const tiposCompanero = especie(companero)?.tipos;
  if (!tiposCompanero) return "";
  const recibePropio = calcularDanoRecibido(tiposPropios);
  const recibeCompanero = calcularDanoRecibido(tiposCompanero);
  const leCubre = Object.keys(recibePropio).filter((t) => recibePropio[t] > 1 && recibeCompanero[t] < 1);
  const loCubre = Object.keys(recibeCompanero).filter((t) => recibeCompanero[t] > 1 && recibePropio[t] < 1);
  const partes = [];
  if (leCubre.length) {
    partes.push(`Aguanta ${unir.format(leCubre.map(nombreTipo))}, ${leCubre.length === 1 ? "una debilidad" : "debilidades"} de ${nombre}.`);
  }
  if (loCubre.length) partes.push(`${nombre} le cubre ${unir.format(loCubre.map(nombreTipo))}.`);
  return partes.join(" ") || "No se cubren debilidades de tipo: se juntan por la estrategia del equipo.";
}

function tarjetaMovimiento(id, pct) {
  const m = dic().movimientos[id];
  const detalle = m ? [
    `${nombreTipo(m.tipo)} / ${m.clase}`,
    m.potencia ? `<span class="potencia">${m.potencia} Pot</span>` : null,
    m.precision ? `${m.precision} % Prec` : null,
  ].filter(Boolean).join(" · ") : "";
  return `
    <div class="movimiento" style="--c: ${m ? colorTipo(m.tipo) : "var(--borde)"}">
      <p class="movimiento-cabecera"><strong>${escapar(nombreMovimiento(id))}</strong><span>${porcentaje(pct)}</span></p>
      <p class="movimiento-detalle">${detalle}</p>
    </div>`;
}

function barrasDeUso(filas) {
  return `
    <ul class="usos">
      ${filas.map(([nombre, pct, color]) => `
        <li>
          <span class="uso-nombre">${escapar(nombre)}</span>
          <span class="barra" style="--ancho: ${Math.min(100, pct)}%; --color: ${color ?? "var(--cian)"}"><span></span></span>
          <span class="uso-pct">${porcentaje(pct)}</span>
        </li>`).join("")}
    </ul>`;
}

// Si no se usa en el formato elegido, se mira si aparece en los otros
async function buscarEnOtrosFormatos(vista, estado, vigente) {
  const otros = infoMeta().formatos.filter((f) => f.id !== estado.formato.id);
  const encontrados = [];
  for (const resumen of otros) {
    try {
      const formato = await cargarFormato(resumen.id);
      const { elegida } = entradaParaDex(formato, estado.nombreShowdown);
      if (elegida) encontrados.push({ resumen, elegida });
    } catch {
      // sin ese formato guardado y sin conexión: se omite
    }
  }
  const destino = vista.querySelector("#otros-formatos");
  if (!vigente() || !destino || !encontrados.length) return;
  destino.innerHTML = `Sí aparece en: ${encontrados.map(({ resumen, elegida }) => `
    <button type="button" class="enlace" data-formato="${resumen.id}">${escapar(resumen.nombre)} (n.º ${elegida.puesto}, ${porcentaje(elegida.uso)})</button>`).join(" · ")}`;
}

// ---------------------------------------------------------------------------
// Botones

function conectarFicha(vista, estado) {
  vista.querySelector("#favorito").addEventListener("click", (evento) => {
    const ahora = cambiarFavorito(estado.pokemon.clave);
    const boton = evento.currentTarget;
    boton.classList.toggle("activa", ahora);
    boton.setAttribute("aria-pressed", String(ahora));
    boton.setAttribute("aria-label", ahora ? "Quitar de favoritos" : "Añadir a favoritos");
    avisar(ahora ? "Añadido a favoritos" : "Quitado de favoritos");
  });

  vista.querySelector("#al-equipo").addEventListener("click", () => anadirAlEquipo(estado));

  vista.querySelector("#grito")?.addEventListener("click", () => {
    new Audio(estado.pokemon.grito).play().catch(() => avisar("No se ha podido reproducir el grito"));
  });

  vista.querySelector("#competitivo").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-forma]");
    if (!boton) return;
    estado.elegida = estado.formas.find((f) => f.nombre === boton.dataset.forma) ?? estado.elegida;
    vista.querySelector("#competitivo").innerHTML = competitivo(estado);
  });
}

function anadirAlEquipo({ pokemon, formato, elegida, nombreShowdown }) {
  const nombre = elegida?.nombre ?? nombreShowdown ?? pokemon.nombre;
  const datos = leer();
  const activo = datos.equipos.find((e) => e.id === datos.equipoActivo) ?? datos.equipos[0];
  if (activo && activo.miembros.length >= 6) {
    avisar(`«${activo.nombre}» ya tiene 6 Pokémon`);
    return;
  }
  const miembro = elegida ? setMasUsado(elegida, formato) : {
    especie: nombre, objeto: null, habilidad: pokemon.habilidades[0]?.id ?? null, tera: null,
    naturaleza: "Serious", valores: [0, 0, 0, 0, 0, 0], movimientos: [],
  };
  let destino = activo;
  guardar((e) => {
    if (!destino) {
      destino = { id: nuevoId(), nombre: "Mi equipo", formato: formato.id, miembros: [], creado: Date.now() };
      e.equipos.push(destino);
    }
    destino.miembros.push(miembro);
    destino.editado = Date.now();
    e.equipoActivo = destino.id;
  });
  avisar(`${nombre} añadido a «${destino.nombre}»${elegida ? " con su set más usado" : ""}`);
}
