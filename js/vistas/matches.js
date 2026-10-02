// Pantalla Matches: tu historial de combates, importado de Pokémon Showdown o apuntado a mano
import { infoMeta, formatoActual, resumenFormato, nombreDeEspecie, nombresDeEspecies, rutaDex, aId } from "../meta.js";
import { leer, guardar, nuevoId, resumenCombates } from "../estado.js";
import { buscarRepeticiones, leerRepeticion, urlRepeticion, SinDatos } from "../showdown.js";
import {
  ICONOS, escapar, porcentaje, sprite, tituloSeccion, avisar, cargando, aviso, fechaCorta, haceCuanto,
  enlaceExterno, rellenarLista,
} from "../ui.js";

const LETRA = { victoria: "V", derrota: "D", empate: "E" };
let rivalesNuevos = []; // Pokémon del rival que se van añadiendo en el formulario manual
let vistaPrevia = null; // repetición leída, pendiente de guardar

export async function pintar(vista, { vigente }) {
  rellenarLista("lista-pokemon", nombresDeEspecies());
  const { combates, perfil, equipos } = leer();
  const resumen = resumenCombates();
  const ordenados = [...combates].sort((a, b) => b.fecha - a.fecha);
  vistaPrevia = null;

  vista.innerHTML = `<div class="pantalla">
    <header class="cabecera">
      <div>
        <p class="cabecera-titulo grande">Matches</p>
        <p class="marca-sub">${resumen.total ? `${resumen.total} ${resumen.total === 1 ? "combate registrado" : "combates registrados"}` : "Tu historial de combates"}</p>
      </div>
      <div class="cabecera-acciones">
        <button type="button" class="boton pequeno" data-accion="ir-registrar">${ICONOS.mas} Registrar</button>
      </div>
    </header>

    ${tarjetaResumen(resumen, combates)}

    <section class="tarjeta">
      ${tituloSeccion("Importar de Showdown", "", "var(--morado)")}
      <form id="importar-repeticion" class="formulario en-linea">
        <label class="crece">Enlace de la repetición
          <input name="enlace" type="url" inputmode="url" placeholder="https://replay.pokemonshowdown.com/…" autocomplete="off" autocapitalize="none" spellcheck="false">
        </label>
        <button type="submit" class="boton">Leer</button>
      </form>
      <div id="vista-previa"></div>
    </section>

    ${perfil.showdown
      ? `<section class="tarjeta" id="mis-repeticiones">${tituloSeccion(`Repeticiones de ${escapar(perfil.showdown)}`)}${cargando("Buscando en Showdown…")}</section>`
      : `<section class="tarjeta"><p class="nota-datos">Pon tu usuario de Showdown en <a class="enlace" href="#/perfil">Perfil</a> y aquí aparecerán tus repeticiones públicas para importarlas con un toque.</p></section>`}

    ${formularioManual(equipos)}
    ${rivalesFrecuentes(combates)}

    <section class="tarjeta">
      ${tituloSeccion("Historial", `<p class="chip">${combates.length}</p>`)}
      ${ordenados.length ? `<div class="combates">${ordenados.map(tarjetaCombate).join("")}</div>` : `<p class="nada">Aún no hay combates.</p>`}
    </section>
  </div>`;

  conectar(vista, vigente);
  if (perfil.showdown) cargarMisRepeticiones(vista, perfil.showdown, vigente);
}

function tarjetaResumen(resumen, combates) {
  const porFormato = new Map();
  for (const c of combates) {
    const fila = porFormato.get(c.formato) ?? { nombre: resumenFormato(c.formato)?.corto ?? c.formatoNombre ?? c.formato, victorias: 0, derrotas: 0 };
    if (c.resultado === "victoria") fila.victorias++;
    if (c.resultado === "derrota") fila.derrotas++;
    porFormato.set(c.formato, fila);
  }
  const racha = resumen.racha;
  return `
    <section class="tarjeta resumen-combates">
      <div class="cifras">
        <div><strong class="verde">${resumen.victorias}</strong><span>Victorias</span></div>
        <div><strong class="rojo">${resumen.derrotas}</strong><span>Derrotas</span></div>
        <div><strong class="cian">${resumen.porcentaje ?? "–"}${resumen.porcentaje !== null ? "<small>%</small>" : ""}</strong><span>Ganadas</span></div>
        <div><strong class="dorado">${racha ? racha.cuantos : "–"}</strong><span>${racha ? (racha.tipo === "victoria" ? "Racha ganando" : "Racha perdiendo") : "Racha"}</span></div>
      </div>
      ${resumen.porcentaje !== null ? `<div class="barra-resultado" aria-hidden="true"><span style="--ancho: ${resumen.porcentaje}%"></span></div>` : ""}
      ${porFormato.size ? `<p class="ficha-chips">${[...porFormato.values()].map((f) => `<span class="chip">${escapar(f.nombre)}: ${f.victorias} V · ${f.derrotas} D</span>`).join("")}</p>` : ""}
    </section>`;
}

function formularioManual(equipos) {
  // Fecha de hoy en la hora del móvil (toISOString usa la hora universal y de noche daría el día anterior)
  const ahora = new Date();
  const hoy = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return `
    <section class="tarjeta" id="registrar">
      ${tituloSeccion("Registrar a mano", "", "var(--verde)")}
      <form id="manual" class="formulario">
        <fieldset class="opciones">
          <legend>Resultado</legend>
          <label><input type="radio" name="resultado" value="victoria" checked> Victoria</label>
          <label><input type="radio" name="resultado" value="derrota"> Derrota</label>
          <label><input type="radio" name="resultado" value="empate"> Empate</label>
        </fieldset>
        <div class="dos-columnas">
          <label>Formato
            <select name="formato">
              ${infoMeta().formatos.map((f) => `<option value="${f.id}"${f.id === formatoActual() ? " selected" : ""}>${escapar(f.nombre)}</option>`).join("")}
              <option value="otro">Otro</option>
            </select>
          </label>
          <label>Fecha<input type="date" name="fecha" value="${hoy}" max="${hoy}"></label>
        </div>
        <label>Tu equipo
          <select name="equipo">
            <option value="">Sin equipo</option>
            ${equipos.map((e) => `<option value="${e.id}"${e.id === leer().equipoActivo ? " selected" : ""}>${escapar(e.nombre)}</option>`).join("")}
          </select>
        </label>
        <label>Rival<input name="rival" placeholder="Nombre del rival" maxlength="40" autocomplete="off"></label>
        <div class="en-linea">
          <label class="crece">Pokémon del rival
            <input id="rival-pokemon" list="lista-pokemon" placeholder="Ej. Incineroar" autocomplete="off" autocapitalize="none" spellcheck="false">
          </label>
          <button type="button" class="boton secundario" data-accion="anadir-rival">Añadir</button>
        </div>
        <div class="chips-rival" id="chips-rival">${chipsRival()}</div>
        <label>Notas<textarea name="notas" rows="3" maxlength="500" placeholder="Qué funcionó, qué no…"></textarea></label>
        <button type="submit" class="boton">Guardar combate</button>
      </form>
    </section>`;
}

function chipsRival() {
  if (!rivalesNuevos.length) return `<p class="nada">Añade hasta 6 Pokémon.</p>`;
  return rivalesNuevos.map((nombre, i) => `
    <span class="chip-pokemon">${sprite(nombre)}${escapar(nombre)}
      <button type="button" data-accion="quitar-rival" data-indice="${i}" aria-label="Quitar a ${escapar(nombre)}">×</button>
    </span>`).join("");
}

function rivalesFrecuentes(combates) {
  const cuenta = new Map();
  for (const c of combates) {
    for (const nombre of new Set(c.equipoRival)) {
      const fila = cuenta.get(nombre) ?? { veces: 0, victorias: 0, jugados: 0 };
      fila.veces++;
      if (c.resultado !== "empate") fila.jugados++;
      if (c.resultado === "victoria") fila.victorias++;
      cuenta.set(nombre, fila);
    }
  }
  const top = [...cuenta].sort((a, b) => b[1].veces - a[1].veces).slice(0, 6);
  if (!top.length) return "";
  return `
    <section class="tarjeta">
      ${tituloSeccion("Rivales más vistos", "", "var(--rojo)")}
      <div class="counters">
        ${top.map(([nombre, f]) => `
          <a class="counter" href="${rutaDex(nombre)}">${sprite(nombre)}<span>${escapar(nombre)}<small>Visto ${f.veces} ${f.veces === 1 ? "vez" : "veces"}</small></span>
            <strong>${f.jugados ? porcentaje(Math.round((f.victorias / f.jugados) * 100)) : "–"}</strong></a>`).join("")}
      </div>
      <p class="nota-datos">El porcentaje es cuántas veces ganaste cuando lo llevaba el rival.</p>
    </section>`;
}

function tarjetaCombate(c) {
  const formato = resumenFormato(c.formato)?.nombre ?? c.formatoNombre ?? c.formato;
  return `
    <article class="combate ${c.resultado}">
      <div class="combate-cabecera">
        <span class="resultado ${c.resultado}" aria-label="${c.resultado}">${LETRA[c.resultado]}</span>
        <div>
          <p class="combate-rival">vs. ${escapar(c.rival || "Rival")}</p>
          <p class="combate-meta">${escapar(formato)} · ${fechaCorta(c.fecha)}${c.rating ? ` · Rating ${c.rating}` : ""}</p>
        </div>
        <button type="button" class="boton-icono pequeno" data-accion="borrar-combate" data-id="${c.id}" aria-label="Borrar este combate">${ICONOS.papelera}</button>
      </div>
      ${c.miEquipo.length || c.equipoRival.length ? `
        <div class="contra">
          <div class="lado">${c.miEquipo.map((n) => sprite(n)).join("") || `<span class="nada">–</span>`}</div>
          <span class="vs">VS</span>
          <div class="lado">${c.equipoRival.map((n) => sprite(n)).join("") || `<span class="nada">–</span>`}</div>
        </div>` : ""}
      ${c.notas ? `<p class="combate-notas">${escapar(c.notas)}</p>` : ""}
      ${c.repeticion ? enlaceExterno(urlRepeticion(c.repeticion), `${ICONOS.externo} Ver repetición`, "enlace") : ""}
    </article>`;
}

// ---------------------------------------------------------------------------
// Repeticiones de Showdown

async function cargarMisRepeticiones(vista, usuario, vigente) {
  const contenedor = vista.querySelector("#mis-repeticiones");
  try {
    const lista = await buscarRepeticiones({ usuario });
    if (!vigente()) return;
    const importadas = new Set(leer().combates.map((c) => c.repeticion).filter(Boolean));
    contenedor.innerHTML = `
      ${tituloSeccion(`Repeticiones de ${escapar(usuario)}`, `<p class="chip">${lista.length}</p>`)}
      ${lista.length ? `
        <ul class="repeticiones">
          ${lista.slice(0, 15).map((r) => `
            <li>
              <div>
                <p>${escapar(r.players.join(" vs. "))}</p>
                <p class="combate-meta">${escapar(r.format)} · ${haceCuanto(r.uploadtime * 1000)}${r.rating ? ` · Rating ${r.rating}` : ""}</p>
              </div>
              ${importadas.has(r.id)
                ? `<span class="chip verde">Importada</span>`
                : `<button type="button" class="boton pequeno" data-accion="importar-de-lista" data-id="${escapar(r.id)}">Importar</button>`}
            </li>`).join("")}
        </ul>`
        : `<p class="nada">No hay repeticiones públicas de ${escapar(usuario)}. En Showdown, al acabar una partida, pulsa «Upload and share replay».</p>`}`;
  } catch {
    if (!vigente()) return;
    contenedor.innerHTML = `${tituloSeccion(`Repeticiones de ${escapar(usuario)}`)}${aviso("No se ha podido conectar con Pokémon Showdown.")}`;
  }
}

function ladoDelJugador(repeticion) {
  const yo = aId(leer().perfil.showdown);
  return yo ? repeticion.jugadores.findIndex((j) => aId(j) === yo) : -1;
}

function combateDesdeRepeticion(repeticion, lado) {
  const resultado = repeticion.ganador === "" ? "empate"
    : aId(repeticion.ganador) === aId(repeticion.jugadores[lado]) ? "victoria" : "derrota";
  const nombres = (lista) => lista.map((n) => nombreDeEspecie(n) ?? n);
  return {
    id: nuevoId(),
    fecha: repeticion.fecha,
    resultado,
    formato: repeticion.formatoId,
    formatoNombre: repeticion.formato,
    rival: repeticion.jugadores[1 - lado],
    miEquipo: nombres(repeticion.equipos[lado]),
    equipoRival: nombres(repeticion.equipos[1 - lado]),
    equipoId: null,
    notas: "",
    repeticion: repeticion.id,
    rating: repeticion.rating,
  };
}

function guardarRepeticion(repeticion, lado) {
  if (repeticion.ganador === null) {
    avisar("Esa partida no llegó a terminar");
    return false;
  }
  if (leer().combates.some((c) => c.repeticion === repeticion.id)) {
    avisar("Ese combate ya está en tu historial");
    return false;
  }
  const combate = combateDesdeRepeticion(repeticion, lado);
  guardar((e) => e.combates.push(combate));
  avisar(`Guardado: ${combate.resultado} contra ${combate.rival}`);
  return true;
}

function vistaPreviaHtml(repeticion) {
  const lado = ladoDelJugador(repeticion);
  return `
    <div class="previa">
      <p class="combate-meta">${escapar(repeticion.formato)} · ${fechaCorta(repeticion.fecha)}${repeticion.rating ? ` · Rating ${repeticion.rating}` : ""}</p>
      <p>Ganador: <strong>${repeticion.ganador === "" ? "empate" : escapar(repeticion.ganador ?? "sin terminar")}</strong></p>
      <fieldset class="opciones">
        <legend>¿Quién eras tú?</legend>
        ${repeticion.jugadores.map((j, i) => `<label><input type="radio" name="yo" value="${i}"${i === lado ? " checked" : ""}> ${escapar(j)}</label>`).join("")}
      </fieldset>
      <div class="contra">
        <div class="lado">${repeticion.equipos[0].map((n) => sprite(nombreDeEspecie(n) ?? n)).join("")}</div>
        <span class="vs">VS</span>
        <div class="lado">${repeticion.equipos[1].map((n) => sprite(nombreDeEspecie(n) ?? n)).join("")}</div>
      </div>
      <button type="button" class="boton" data-accion="guardar-repeticion">Guardar combate</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Botones y formularios

function conectar(vista, vigente) {
  const pantalla = vista.querySelector(".pantalla");
  const repintar = () => {
    const posicion = window.scrollY;
    pintar(vista, { vigente }).then(() => window.scrollTo(0, posicion));
  };
  const anadirRival = () => {
    const campo = pantalla.querySelector("#rival-pokemon");
    const nombre = nombreDeEspecie(campo.value);
    if (!nombre) {
      avisar(campo.value.trim() ? `No encuentro a «${campo.value.trim()}»` : "Escribe un Pokémon");
      return;
    }
    if (rivalesNuevos.length >= 6) {
      avisar("Como mucho 6 Pokémon");
      return;
    }
    rivalesNuevos.push(nombre);
    campo.value = "";
    pantalla.querySelector("#chips-rival").innerHTML = chipsRival();
  };

  pantalla.querySelector("#importar-repeticion").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const enlace = new FormData(evento.target).get("enlace").trim();
    const destino = pantalla.querySelector("#vista-previa");
    if (!enlace) {
      avisar("Pega el enlace de una repetición");
      return;
    }
    destino.innerHTML = cargando("Leyendo la repetición…");
    try {
      vistaPrevia = await leerRepeticion(enlace);
      destino.innerHTML = vistaPreviaHtml(vistaPrevia);
    } catch (error) {
      destino.innerHTML = aviso(error instanceof SinDatos
        ? "No encuentro esa repetición. Comprueba el enlace (si es privada, copia el enlace completo)."
        : "No se ha podido conectar con Pokémon Showdown.");
    }
  });

  pantalla.querySelector("#rival-pokemon").addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      anadirRival();
    }
  });

  pantalla.querySelector("#manual").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.target);
    const equipo = leer().equipos.find((e) => e.id === datos.get("equipo"));
    const formato = datos.get("formato");
    const fecha = datos.get("fecha") ? new Date(`${datos.get("fecha")}T12:00:00`).getTime() : Date.now();
    const combate = {
      id: nuevoId(),
      fecha,
      resultado: datos.get("resultado"),
      formato,
      formatoNombre: formato === "otro" ? "Otro formato" : resumenFormato(formato)?.nombre,
      rival: datos.get("rival").trim(),
      miEquipo: equipo ? equipo.miembros.map((m) => m.especie) : [],
      equipoRival: [...rivalesNuevos],
      equipoId: equipo?.id ?? null,
      notas: datos.get("notas").trim(),
      repeticion: null,
      rating: null,
    };
    guardar((e) => e.combates.push(combate));
    rivalesNuevos = [];
    avisar("Combate guardado");
    repintar();
  });

  pantalla.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    switch (boton.dataset.accion) {
      case "ir-registrar":
        pantalla.querySelector("#registrar").scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "anadir-rival":
        anadirRival();
        break;
      case "quitar-rival":
        rivalesNuevos.splice(Number(boton.dataset.indice), 1);
        pantalla.querySelector("#chips-rival").innerHTML = chipsRival();
        break;
      case "guardar-repeticion": {
        const elegido = pantalla.querySelector("input[name=yo]:checked");
        if (!elegido) {
          avisar("Elige quién eras tú");
          return;
        }
        if (vistaPrevia && guardarRepeticion(vistaPrevia, Number(elegido.value))) repintar();
        break;
      }
      case "importar-de-lista": {
        boton.disabled = true;
        try {
          const repeticion = await leerRepeticion(boton.dataset.id);
          const lado = ladoDelJugador(repeticion);
          if (lado < 0) {
            vistaPrevia = repeticion;
            pantalla.querySelector("#vista-previa").innerHTML = vistaPreviaHtml(repeticion);
            pantalla.querySelector("#vista-previa").scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (guardarRepeticion(repeticion, lado)) {
            repintar();
          }
        } catch {
          avisar("No se ha podido leer la repetición");
        } finally {
          boton.disabled = false;
        }
        break;
      }
      case "borrar-combate":
        if (!confirm("¿Borrar este combate del historial?")) return;
        guardar((e) => { e.combates = e.combates.filter((c) => c.id !== boton.dataset.id); });
        avisar("Combate borrado");
        repintar();
        break;
    }
  });
}
