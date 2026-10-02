// Pantalla Equipos: equipos de hasta 6 Pokémon, su análisis y el paso de ida y vuelta a Showdown
import {
  cargarFormato, infoMeta, formatoActual, resumenFormato, especie, rutaDex, dic, nombreDeEspecie, nombresDeEspecies,
  nombreObjeto, nombreHabilidad, nombreMovimiento, buscarId, estadisticasReales, setMasUsado,
  maximoPorEstadistica, maximoTotal, ABREVIATURAS,
} from "../meta.js";
import { TIPOS, analizarDefensa, coberturaOfensiva, colorTipo, nombreTipo } from "../tipos.js";
import { leer, guardar, nuevoId, equipo as buscarEquipo } from "../estado.js";
import { importarEquipo, exportarEquipo } from "../showdown.js";
import {
  ICONOS, escapar, insigniaTipo, listaTipos, sprite, cabeceraDetalle, tituloSeccion, aviso, vacio, avisar, copiar,
  rellenarLista, fechaCorta,
} from "../ui.js";

const MAXIMO_MIEMBROS = 6;
let abierto = null; // miembro cuyo editor de set está abierto, para no cerrarlo al repintar

export async function pintar(vista, { id, vigente }) {
  if (id) {
    await pintarEditor(vista, id, vigente);
  } else {
    pintarLista(vista);
  }
}

// ---------------------------------------------------------------------------
// Lista de equipos

function pintarLista(vista) {
  const { equipos, equipoActivo } = leer();
  vista.innerHTML = `
    <header class="cabecera">
      <div>
        <p class="cabecera-titulo grande">Equipos</p>
        <p class="marca-sub">${equipos.length} ${equipos.length === 1 ? "equipo guardado" : "equipos guardados"} en este móvil</p>
      </div>
      <div class="cabecera-acciones">
        <button type="button" class="boton pequeno" id="nuevo">${ICONOS.mas} Nuevo</button>
      </div>
    </header>

    ${equipos.length
      ? equipos.map((e) => cartaEquipo(e, e.id === equipoActivo)).join("")
      : vacio("Aún no tienes equipos", "Crea uno con «Nuevo», impórtalo de Showdown o añade Pokémon desde su ficha con el botón «+ Equipo».")}

    <section class="tarjeta">
      ${tituloSeccion("Importar de Showdown")}
      <p class="nota-datos">En el Teambuilder de Showdown, abre el equipo y pulsa <strong>Import/Export</strong>. Copia el texto y pégalo aquí.</p>
      <form id="importar" class="formulario">
        <label class="solo-lectores" for="texto-importar">Texto del equipo</label>
        <textarea id="texto-importar" rows="7" spellcheck="false" autocapitalize="none"
          placeholder="Dragapult @ Choice Specs&#10;Ability: Infiltrator&#10;Tera Type: Ghost&#10;…"></textarea>
        <button type="submit" class="boton">Importar equipo</button>
      </form>
    </section>`;

  vista.querySelector("#nuevo").addEventListener("click", () => {
    const nuevo = crearEquipo(`Equipo ${leer().equipos.length + 1}`);
    location.hash = `#/equipos/${nuevo.id}`;
  });

  vista.querySelector("#importar").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const texto = vista.querySelector("#texto-importar").value;
    const miembros = importarEquipo(texto).map(normalizarMiembro);
    if (miembros.length === 0) {
      avisar("No he encontrado ningún Pokémon en el texto");
      return;
    }
    const nuevo = crearEquipo(`Importado el ${fechaCorta(Date.now())}`, miembros);
    avisar(`Equipo importado con ${miembros.length} Pokémon`);
    location.hash = `#/equipos/${nuevo.id}`;
  });
}

function cartaEquipo(e, activo) {
  const defensa = analizarDefensa(e.miembros.map((m) => especie(m.especie)?.tipos ?? []));
  const puntosDebiles = defensa.filter((d) => d.puntoDebil).map((d) => nombreTipo(d.tipo));
  const formato = resumenFormato(e.formato);
  return `
    <a class="tarjeta carta-equipo${activo ? " activa" : ""}" href="#/equipos/${e.id}">
      <div class="carta-equipo-cabecera">
        <p class="carta-nombre">${escapar(e.nombre)}</p>
        <p class="ficha-chips">
          ${activo ? `<span class="chip cian">Activo</span>` : ""}
          <span class="chip">${escapar(formato?.corto ?? e.formato)}</span>
        </p>
      </div>
      <div class="huecos">
        ${Array.from({ length: MAXIMO_MIEMBROS }, (_, i) => e.miembros[i] ? sprite(e.miembros[i].especie) : `<span class="hueco" aria-hidden="true"></span>`).join("")}
      </div>
      <p class="carta-equipo-pie ${puntosDebiles.length ? "mal" : ""}">
        ${e.miembros.length === 0 ? "Vacío"
          : puntosDebiles.length ? `${ICONOS.alerta} Punto débil: ${escapar(puntosDebiles.join(", "))}`
          : `${ICONOS.escudo} Sin puntos débiles graves`}
      </p>
    </a>`;
}

function crearEquipo(nombre, miembros = []) {
  const nuevo = { id: nuevoId(), nombre, formato: formatoActual(), miembros, creado: Date.now(), editado: Date.now() };
  guardar((e) => {
    e.equipos.unshift(nuevo);
    e.equipoActivo = nuevo.id;
  });
  return nuevo;
}

/** Pone el nombre de la especie como en el diccionario («great tusk» → «Great Tusk»). */
function normalizarMiembro(set) {
  return {
    ...set,
    especie: nombreDeEspecie(set.especie) ?? set.especie,
    tera: set.tera && TIPOS[set.tera] ? set.tera : null,
    naturaleza: set.naturaleza && dic().naturalezas[set.naturaleza] ? set.naturaleza : "Serious",
  };
}

function setVacio(nombre) {
  return {
    especie: nombre, objeto: null, habilidad: especie(nombre)?.habilidades[0] ?? null, tera: null,
    naturaleza: "Serious", valores: [0, 0, 0, 0, 0, 0], movimientos: [],
  };
}

// ---------------------------------------------------------------------------
// Editor de un equipo

async function pintarEditor(vista, id, vigente) {
  const eq = buscarEquipo(id);
  if (!eq) {
    vista.innerHTML = `${cabeceraDetalle({ titulo: "Equipo", volver: "#/equipos" })}${aviso("Este equipo ya no existe.")}`;
    return;
  }
  const idFormato = infoMeta().formatos.some((f) => f.id === eq.formato) ? eq.formato : formatoActual();
  const formato = await cargarFormato(idFormato);
  if (!vigente()) return;
  rellenarLista("lista-pokemon", nombresDeEspecies());
  rellenarLista("lista-movimientos", Object.values(dic().movimientos).map((m) => m.es));
  rellenarLista("lista-objetos", Object.values(dic().objetos).map((o) => o.es));
  const activo = leer().equipoActivo === eq.id;

  // Todo va dentro de un bloque nuevo en cada repintado, para que sus botones no acumulen manejadores
  vista.innerHTML = `<div class="pantalla">
    ${cabeceraDetalle({
      titulo: escapar(eq.nombre),
      subtitulo: `${eq.miembros.length}/${MAXIMO_MIEMBROS} · ${escapar(formato.nombre)}`,
      volver: "#/equipos",
      acciones: `<button type="button" class="boton-icono peligro" data-accion="borrar" aria-label="Borrar el equipo">${ICONOS.papelera}</button>`,
    })}

    <section class="tarjeta">
      <form class="formulario dos-columnas" id="datos-equipo">
        <label>Nombre<input name="nombre" value="${escapar(eq.nombre)}" maxlength="40" autocomplete="off"></label>
        <label>Formato
          <select name="formato">
            ${infoMeta().formatos.map((f) => `<option value="${f.id}"${f.id === formato.id ? " selected" : ""}>${escapar(f.nombre)}</option>`).join("")}
          </select>
        </label>
      </form>
      ${activo
        ? `<p class="nota-datos">Es tu equipo activo: el botón «+ Equipo» de las fichas añade aquí.</p>`
        : `<button type="button" class="boton secundario pequeno" data-accion="activar">Usar como equipo activo</button>`}
    </section>

    <div class="miembros">${eq.miembros.map((m, i) => tarjetaMiembro(m, i, formato)).join("")}</div>

    ${eq.miembros.length < MAXIMO_MIEMBROS ? `
      <section class="tarjeta">
        <form id="anadir" class="formulario en-linea">
          <label class="crece">Añadir Pokémon
            <input name="especie" list="lista-pokemon" placeholder="Nombre (ej. Incineroar)" autocomplete="off" autocapitalize="none" spellcheck="false">
          </label>
          <button type="submit" class="boton">${ICONOS.mas} Añadir</button>
        </form>
        <p class="nota-datos">Si aparece en los datos de uso de ${escapar(formato.nombre)}, se añade con su set más usado.</p>
      </section>` : ""}

    ${eq.miembros.length ? analisis(eq, formato) : ""}
    ${eq.miembros.length ? `
      <section class="tarjeta">
        ${tituloSeccion("Exportar a Showdown")}
        <p class="nota-datos">En Showdown: Teambuilder → New Team → Import from text. Pega el texto y pulsa Save.</p>
        <textarea class="exportado" rows="10" readonly aria-label="Equipo en formato de Showdown">${escapar(exportarEquipo(eq.miembros, dic()))}</textarea>
        <button type="button" class="boton" data-accion="copiar">${ICONOS.copiar} Copiar texto</button>
      </section>` : ""}
  </div>`;

  conectarEditor(vista, eq, formato, vigente);
}

function tarjetaMiembro(m, i, formato) {
  const e = especie(m.especie);
  const tipos = e?.tipos ?? [];
  const reales = e ? estadisticasReales(e.base, m.naturaleza, m.valores, formato) : null;
  const set = [
    m.objeto && nombreObjeto(m.objeto),
    m.habilidad && nombreHabilidad(m.habilidad),
    m.tera && formato.tera && `Tera ${nombreTipo(m.tera)}`,
  ].filter(Boolean);
  return `
    <article class="tarjeta miembro" style="--c: ${colorTipo(tipos[0])}">
      <div class="miembro-cabecera">
        ${sprite(m.especie, { clase: "grande" })}
        <div class="miembro-texto">
          <a class="miembro-nombre" href="${rutaDex(m.especie)}">${escapar(m.especie)}</a>
          <p class="insignias mini">${tipos.map((t) => insigniaTipo(t)).join("")}</p>
          <p class="miembro-set">${set.length ? set.map(escapar).join(" · ") : "Sin set"}</p>
        </div>
        <button type="button" class="boton-icono pequeno" data-accion="quitar" data-indice="${i}" aria-label="Quitar a ${escapar(m.especie)}">${ICONOS.papelera}</button>
      </div>
      <ul class="miembro-movimientos">
        ${m.movimientos.length
          ? m.movimientos.map((id) => {
            const movimiento = dic().movimientos[id];
            return `<li style="--c: ${movimiento ? colorTipo(movimiento.tipo) : "var(--borde)"}">${escapar(nombreMovimiento(id))}</li>`;
          }).join("")
          : `<li class="sin-movimientos">Sin movimientos</li>`}
      </ul>
      ${reales ? `<p class="miembro-stats">${reales.map((valor, j) => `<span>${ABREVIATURAS[j]} <strong>${valor}</strong></span>`).join("")}</p>` : ""}
      <details class="editor-set" data-indice="${i}"${abierto === i ? " open" : ""}>
        <summary>Editar set</summary>
        ${formularioSet(m, i, formato)}
      </details>
    </article>`;
}

function formularioSet(m, i, formato) {
  const entrada = formato.porNombre.get(m.especie);
  const habilidades = [...new Set([
    ...(especie(m.especie)?.habilidades ?? []),
    ...(entrada?.habilidades.map(([id]) => id) ?? []),
    ...(m.habilidad ? [m.habilidad] : []),
  ])];
  const maximo = maximoPorEstadistica(formato);
  const sugerencia = (lista, j) => (lista?.[j] ? escapar(nombreMovimiento(lista[j][0])) : `Movimiento ${j + 1}`);
  return `
    <form class="formulario set" data-indice="${i}">
      <label>Objeto
        <input name="objeto" list="lista-objetos" value="${escapar(m.objeto ? nombreObjeto(m.objeto) : "")}" autocomplete="off"
          placeholder="${entrada?.objetos[0] ? escapar(nombreObjeto(entrada.objetos[0][0])) : "Sin objeto"}">
      </label>
      <label>Habilidad
        <select name="habilidad">
          ${habilidades.map((id) => `<option value="${id}"${id === m.habilidad ? " selected" : ""}>${escapar(nombreHabilidad(id))}</option>`).join("")}
        </select>
      </label>
      ${formato.tera ? `
        <label>Teratipo
          <select name="tera">
            <option value="">Sin teratipo</option>
            ${Object.keys(TIPOS).map((t) => `<option value="${t}"${t === m.tera ? " selected" : ""}>${nombreTipo(t)}</option>`).join("")}
          </select>
        </label>` : ""}
      <label>Naturaleza
        <select name="naturaleza">
          ${Object.entries(dic().naturalezas).map(([n, d]) => `
            <option value="${n}"${n === m.naturaleza ? " selected" : ""}>${escapar(d.es)}${d.sube !== undefined ? ` (+${ABREVIATURAS[d.sube]} −${ABREVIATURAS[d.baja]})` : ""}</option>`).join("")}
        </select>
      </label>
      <fieldset class="valores">
        <legend>${formato.champions ? "Puntos de estadística" : "EVs"} (máx. ${maximo} cada una y ${maximoTotal(formato)} en total)</legend>
        ${ABREVIATURAS.map((abreviatura, j) => `
          <label>${abreviatura}<input name="valor${j}" type="number" inputmode="numeric" min="0" max="${maximo}" step="1" value="${m.valores[j]}"></label>`).join("")}
      </fieldset>
      <fieldset class="movs">
        <legend>Movimientos</legend>
        ${[0, 1, 2, 3].map((j) => `
          <input name="mov${j}" list="lista-movimientos" aria-label="Movimiento ${j + 1}" autocomplete="off" autocapitalize="none"
            value="${escapar(m.movimientos[j] ? nombreMovimiento(m.movimientos[j]) : "")}" placeholder="${sugerencia(entrada?.movimientos, j)}">`).join("")}
      </fieldset>
      <div class="botones-fila">
        <button type="submit" class="boton">Guardar set</button>
        ${entrada ? `<button type="button" class="boton secundario" data-accion="set-usado" data-indice="${i}">Set más usado</button>` : ""}
      </div>
    </form>`;
}

function analisis(eq, formato) {
  const defensa = analizarDefensa(eq.miembros.map((m) => especie(m.especie)?.tipos ?? []));
  const puntosDebiles = defensa.filter((d) => d.puntoDebil);
  // Tipos con los que ataca: los de sus movimientos de daño o, si aún no tiene movimientos, los suyos
  const tiposDeAtaque = [...new Set(eq.miembros.flatMap((m) => {
    const deDano = m.movimientos.map((id) => dic().movimientos[id]).filter((mov) => mov && mov.clase !== "Estado" && mov.potencia).map((mov) => mov.tipo);
    return deDano.length ? deDano : (especie(m.especie)?.tipos ?? []);
  }))];
  const { cubiertos, sinCubrir } = coberturaOfensiva(tiposDeAtaque);
  const velocidades = eq.miembros
    .map((m) => ({ nombre: m.especie, valor: especie(m.especie) ? estadisticasReales(especie(m.especie).base, m.naturaleza, m.valores, formato)[5] : null }))
    .filter((v) => v.valor)
    .sort((a, b) => b.valor - a.valor);
  const puntos = (cuantos, color) => (cuantos ? `<span class="puntos ${color}" aria-label="${cuantos}">${"●".repeat(cuantos)}</span>` : `<span class="nada">–</span>`);

  return `
    <section class="tarjeta">
      ${tituloSeccion("Debilidades del equipo", `<p class="chip">${eq.miembros.length} Pokémon</p>`, "var(--rojo)")}
      <p class="resumen-analisis ${puntosDebiles.length ? "mal" : "bien"}">
        ${puntosDebiles.length
          ? `${ICONOS.alerta} Puntos débiles: ${escapar(puntosDebiles.map((d) => nombreTipo(d.tipo)).join(", "))}. Tres o más son débiles y nadie lo resiste.`
          : `${ICONOS.escudo} Ningún tipo pilla a tres o más sin que alguien lo resista.`}
      </p>
      <table class="tabla-defensa">
        <thead><tr><th scope="col">Ataque</th><th scope="col">Débiles</th><th scope="col">Resisten</th><th scope="col">Inmunes</th></tr></thead>
        <tbody>
          ${defensa.map((d) => `
            <tr${d.puntoDebil ? ` class="punto-debil"` : ""}>
              <th scope="row">${insigniaTipo(d.tipo)}</th>
              <td>${puntos(d.debiles, "rojo")}</td>
              <td>${puntos(d.resisten, "verde")}</td>
              <td>${puntos(d.inmunes, "cian")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </section>

    <section class="tarjeta">
      ${tituloSeccion("Cobertura ofensiva", `<p class="chip">${cubiertos.length}/18</p>`, "var(--verde)")}
      <p class="nota-datos">Con los tipos de sus movimientos de daño (o con sus propios tipos, si aún no tienen movimientos).</p>
      <h3 class="grupo-titulo resiste">Superefectivos contra</h3>
      <div class="insignias">${listaTipos(cubiertos)}</div>
      <h3 class="grupo-titulo debil">Sin cubrir</h3>
      <div class="insignias">${listaTipos(sinCubrir)}</div>
    </section>

    ${velocidades.length ? `
      <section class="tarjeta">
        ${tituloSeccion("Orden de velocidad", `<p class="chip">Nivel ${formato.nivel}</p>`, "var(--dorado)")}
        <ol class="velocidades">
          ${velocidades.map((v) => `<li>${sprite(v.nombre)}<span>${escapar(v.nombre)}</span><strong>${v.valor}</strong></li>`).join("")}
        </ol>
      </section>` : ""}`;
}

function conectarEditor(vista, eq, formato, vigente) {
  const repintar = async () => {
    const posicion = window.scrollY;
    await pintarEditor(vista, eq.id, vigente);
    window.scrollTo(0, posicion);
  };
  const cambiar = (cambio) => {
    guardar((e) => {
      const destino = e.equipos.find((x) => x.id === eq.id);
      cambio(destino, e);
      destino.editado = Date.now();
    });
  };

  vista.querySelector("#datos-equipo").addEventListener("change", (evento) => {
    const { name, value } = evento.target;
    if (name === "nombre" && !value.trim()) return;
    cambiar((destino) => { destino[name] = name === "nombre" ? value.trim() : value; });
    repintar();
  });

  vista.querySelector("#anadir")?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const texto = new FormData(evento.target).get("especie").trim();
    const nombre = texto && nombreDeEspecie(texto);
    if (!nombre) {
      avisar(texto ? `No encuentro a «${texto}»` : "Escribe el nombre de un Pokémon");
      return;
    }
    const entrada = formato.porNombre.get(nombre);
    cambiar((destino) => destino.miembros.push(entrada ? setMasUsado(entrada, formato) : setVacio(nombre)));
    avisar(`${nombre} añadido${entrada ? " con su set más usado" : ""}`);
    repintar();
  });

  for (const formulario of vista.querySelectorAll("form.set")) {
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const indice = Number(formulario.dataset.indice);
      const nuevo = leerSet(new FormData(formulario), formato);
      if (!nuevo) return;
      cambiar((destino) => Object.assign(destino.miembros[indice], nuevo));
      abierto = null;
      avisar("Set guardado");
      repintar();
    });
  }

  for (const detalles of vista.querySelectorAll("details.editor-set")) {
    detalles.addEventListener("toggle", () => {
      if (detalles.open) abierto = Number(detalles.dataset.indice);
      else if (abierto === Number(detalles.dataset.indice)) abierto = null;
    });
  }

  vista.querySelector(".pantalla").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    const indice = Number(boton.dataset.indice);
    switch (boton.dataset.accion) {
      case "borrar":
        if (!confirm(`¿Borrar el equipo «${eq.nombre}»? No se puede deshacer.`)) return;
        guardar((e) => {
          e.equipos = e.equipos.filter((x) => x.id !== eq.id);
          if (e.equipoActivo === eq.id) e.equipoActivo = e.equipos[0]?.id ?? null;
        });
        avisar("Equipo borrado");
        location.hash = "#/equipos";
        break;
      case "activar":
        guardar((e) => { e.equipoActivo = eq.id; });
        avisar("Ahora es tu equipo activo");
        repintar();
        break;
      case "quitar": {
        const nombre = eq.miembros[indice]?.especie;
        cambiar((destino) => destino.miembros.splice(indice, 1));
        abierto = null;
        avisar(`${nombre} quitado del equipo`);
        repintar();
        break;
      }
      case "set-usado": {
        const entrada = formato.porNombre.get(eq.miembros[indice]?.especie);
        if (!entrada) return;
        cambiar((destino) => Object.assign(destino.miembros[indice], setMasUsado(entrada, formato)));
        avisar("Set más usado aplicado");
        repintar();
        break;
      }
      case "copiar":
        copiar(vista.querySelector(".exportado").value);
        break;
    }
  });
}

/** Lee el formulario de un set y comprueba que todo existe y que el reparto es válido. */
function leerSet(datos, formato) {
  const textoObjeto = datos.get("objeto").trim();
  const objeto = textoObjeto ? buscarId("objetos", textoObjeto) : null;
  if (textoObjeto && !objeto) {
    avisar(`No encuentro el objeto «${textoObjeto}»`);
    return null;
  }
  const textos = [0, 1, 2, 3].map((j) => datos.get(`mov${j}`).trim()).filter(Boolean);
  const movimientos = textos.map((texto) => buscarId("movimientos", texto));
  const desconocido = textos.find((_, k) => !movimientos[k]);
  if (desconocido) {
    avisar(`No encuentro el movimiento «${desconocido}»`);
    return null;
  }
  if (new Set(movimientos).size !== movimientos.length) {
    avisar("Hay un movimiento repetido");
    return null;
  }
  const maximo = maximoPorEstadistica(formato);
  const valores = ABREVIATURAS.map((_, j) => Math.max(0, Math.min(maximo, Math.round(Number(datos.get(`valor${j}`)) || 0))));
  const total = valores.reduce((suma, v) => suma + v, 0);
  if (total > maximoTotal(formato)) {
    avisar(`El reparto suma ${total}: el máximo es ${maximoTotal(formato)}`);
    return null;
  }
  return {
    objeto,
    habilidad: datos.get("habilidad") || null,
    tera: datos.get("tera") || null,
    naturaleza: datos.get("naturaleza"),
    valores,
    movimientos,
  };
}
