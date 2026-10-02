// Lo que la app recuerda en el móvil: perfil, equipos, combates, favoritos y búsquedas recientes.
// API del navegador: Web Storage (localStorage). Los datos se quedan solo en este dispositivo:
// para pasarlos a otro, Perfil → Copia de seguridad.

const CLAVE = "apex-dex";
const MAXIMO_RECIENTES = 8;

const INICIAL = {
  version: 1,
  perfil: { nombre: "", showdown: "", formato: null, avatar: null },
  equipos: [],
  equipoActivo: null,
  combates: [],
  favoritos: [],
  recientes: [],
};

let estado = cargar();

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    return completar(guardado);
  } catch {
    return structuredClone(INICIAL);
  }
}

function completar(datos) {
  const base = structuredClone(INICIAL);
  if (!datos || typeof datos !== "object") return base;
  return {
    ...base,
    ...datos,
    perfil: { ...base.perfil, ...datos.perfil },
    equipos: Array.isArray(datos.equipos) ? datos.equipos : [],
    combates: Array.isArray(datos.combates) ? datos.combates : [],
    favoritos: Array.isArray(datos.favoritos) ? datos.favoritos : [],
    recientes: Array.isArray(datos.recientes) ? datos.recientes : [],
  };
}

function escribir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (error) {
    // Navegación privada o almacenamiento lleno: la app sigue funcionando, pero no recordará los cambios
    console.warn("No se ha podido guardar en el móvil", error);
  }
}

export function leer() {
  return estado;
}

/** Aplica un cambio al estado y lo guarda: guardar((e) => e.favoritos.push("dragapult")). */
export function guardar(cambio) {
  cambio(estado);
  escribir();
}

export function nuevoId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function apuntarReciente(clave) {
  guardar((e) => {
    e.recientes = [clave, ...e.recientes.filter((c) => c !== clave)].slice(0, MAXIMO_RECIENTES);
  });
}

export function esFavorito(clave) {
  return estado.favoritos.includes(clave);
}

export function cambiarFavorito(clave) {
  const ahora = !esFavorito(clave);
  guardar((e) => {
    e.favoritos = ahora ? [clave, ...e.favoritos] : e.favoritos.filter((c) => c !== clave);
  });
  return ahora;
}

export function equipo(id) {
  return estado.equipos.find((e) => e.id === id);
}

/** Victorias, derrotas y racha de una lista de combates. */
export function resumenCombates(combates = estado.combates) {
  const victorias = combates.filter((c) => c.resultado === "victoria").length;
  const derrotas = combates.filter((c) => c.resultado === "derrota").length;
  const ordenados = [...combates].sort((a, b) => b.fecha - a.fecha);
  let racha = 0;
  const ultimo = ordenados[0]?.resultado;
  for (const combate of ordenados) {
    if (combate.resultado !== ultimo || ultimo === "empate") break;
    racha++;
  }
  const jugados = victorias + derrotas;
  return {
    victorias,
    derrotas,
    total: combates.length,
    porcentaje: jugados ? Math.round((victorias / jugados) * 100) : null,
    racha: ultimo && ultimo !== "empate" ? { tipo: ultimo, cuantos: racha } : null,
  };
}

export function exportar() {
  return JSON.stringify({ app: "Apex Dex", exportado: new Date().toISOString(), ...estado }, null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  if (datos?.app !== "Apex Dex") throw new Error("El fichero no es una copia de Apex Dex");
  const { app, exportado, ...resto } = datos;
  estado = completar(resto);
  escribir();
}

export function borrarTodo() {
  estado = structuredClone(INICIAL);
  escribir();
}
