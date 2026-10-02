// Pantalla Tier list: todos los Pokémon del formato, agrupados por su puesto en la tabla de uso
import { cargarFormato, rutaDex, tierDeUso, TIERS_DE_USO } from "../meta.js";
import { escapar, porcentaje, sprite, cabeceraDetalle, selectorDeFormatos, nombreMes } from "../ui.js";

export async function pintar(vista, { vigente }) {
  const formato = await cargarFormato();
  if (!vigente()) return;
  const grupos = TIERS_DE_USO.map((t) => ({ ...t, pokemon: formato.pokemon.filter((p) => tierDeUso(p.puesto) === t.tier) }));

  vista.innerHTML = `
    ${cabeceraDetalle({ titulo: "Tier list", subtitulo: `${escapar(formato.nombre)} · ${nombreMes(formato.mes)}` })}
    ${selectorDeFormatos()}
    <p class="explicacion">
      Ordenada por el uso en Smogon de ${formato.partidas.toLocaleString("es-ES")} partidas (rating de ${formato.corte} o más).
      <strong>S</strong>: los 6 más usados · <strong>A</strong>: del 7.º al 15.º · <strong>B</strong>: del 16.º al 30.º ·
      <strong>C</strong>: del 31.º al 50.º · <strong>D</strong>: el resto con al menos un 0,5 % de uso.
    </p>
    ${grupos.filter((g) => g.pokemon.length).map((g) => `
      <section class="tier tier-${g.tier.toLowerCase()}">
        <h2 class="tier-letra">${g.tier}</h2>
        <div class="tier-pokemon">
          ${g.pokemon.map((p) => `
            <a class="tier-miembro" href="${rutaDex(p.nombre)}">
              ${sprite(p.nombre)}
              <span class="tier-nombre">${escapar(p.nombre)}</span>
              <span class="tier-uso">#${p.puesto} · ${porcentaje(p.uso)}</span>
            </a>`).join("")}
        </div>
      </section>`).join("")}`;
}
