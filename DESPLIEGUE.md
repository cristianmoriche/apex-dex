# Desplegar Apex Dex e instalarla en el iPhone

Apex Dex es una **app web instalable (PWA)**. La forma de tenerla en el iPhone, gratis y hoy mismo, tiene dos pasos:

1. **Publicarla en Internet con GitHub Pages**, que es gratis y no necesita Git: se hace desde el navegador.
2. **Añadirla a la pantalla de inicio desde Safari**. Se instala como una app: con su icono, a pantalla completa y funcionando sin conexión.

La App Store es otra historia: cuesta dinero, necesita un Mac y Apple casi seguro la rechazaría. Está explicado en el [apartado 4](#4-y-por-la-app-store).

---

## 1. Antes de empezar

- [ ] Tu cuenta de GitHub, la de la práctica.
- [ ] La carpeta `apex-dex` completa (`index.html`, `sw.js`, `manifest.webmanifest` y las carpetas `css`, `js`, `datos` e `img`).
- [ ] Un iPhone con **iOS 16.4 o posterior**. La app usa funciones de Safari que llegaron en esa versión.

## 2. Publicarla con GitHub Pages (unos 10 minutos)

### 2.1 Crear el repositorio

1. En [github.com](https://github.com), botón **+** (arriba a la derecha) → **New repository**.
2. **Repository name:** `apex-dex`.
3. Elige **Public**. Con una cuenta gratuita, GitHub Pages solo publica repositorios públicos.
4. No marques **Add a README file**: la carpeta ya trae uno.
5. Pulsa **Create repository**.

### 2.2 Subir los ficheros desde el navegador

1. En el repositorio vacío, pulsa el enlace **uploading an existing file**.
2. Abre la carpeta `apex-dex` en el Explorador de Windows, selecciónalo todo (**Ctrl + A**) y arrástralo a la página de GitHub.
   - Arrastra **el contenido** de la carpeta, no la carpeta `apex-dex`. Así `index.html` queda en la raíz del repositorio; si queda dentro de otra carpeta, la web da error 404.
   - Edge y Chrome mantienen las carpetas al arrastrar. Si alguna no sube, entra en el repositorio y arrástrala sola.
3. Abajo, en **Commit changes**, escribe un mensaje que explique el cambio. Por ejemplo:
   `Versión 2: Apex Dex, app web instalable con datos de Smogon, PokeAPI y Showdown`
4. Pulsa **Commit changes** y comprueba que en el repositorio se ven `index.html`, `sw.js`, `manifest.webmanifest` y las carpetas `css`, `datos`, `herramientas`, `img` y `js`.

### 2.3 Activar GitHub Pages

1. En el repositorio, **Settings** → **Pages** (menú de la izquierda).
2. En **Build and deployment** → **Source**, elige **Deploy from a branch**.
3. En **Branch**, elige **main** y la carpeta **/ (root)**. Pulsa **Save**.
4. Espera uno o dos minutos. En la pestaña **Actions** verás el proceso *pages build and deployment*; cuando se ponga en verde, la web ya está publicada.
5. Vuelve a **Settings → Pages**: arriba aparece **Your site is live at…** con tu dirección, que será esta:

   ```text
   https://TU-USUARIO.github.io/apex-dex/
   ```

6. Ábrela en el ordenador para comprobar que sale la pantalla Home con la tier list.
7. Pon la dirección en el repositorio: en la página principal, ⚙️ junto a **About** → **Website**. Cámbiala también en el `README.md`, en la línea **Pruébala**.

## 3. Instalarla en el iPhone

1. Abre **Safari** y escribe tu dirección (`https://TU-USUARIO.github.io/apex-dex/`).
2. Espera a que cargue la pantalla Home.
3. Toca el botón **Compartir**, el cuadrado con una flecha hacia arriba. En iOS 26, si la barra de Safari está en modo compacto, toca primero **···** y después **Compartir**.
4. Baja y toca **Añadir a pantalla de inicio**.
5. Deja activado **Abrir como app web** (en iOS 26) y comprueba que el nombre es **Apex Dex**.
6. Toca **Añadir**.

Ya está. El icono neón de Apex Dex aparece en la pantalla de inicio y la app se abre a pantalla completa, sin la barra de Safari.

**Qué funciona sin conexión:**
- abrir la app, Home y la tier list;
- Equipos, Matches y Perfil con tus datos;
- las fichas que ya hayas visto.

**Qué necesita Internet:**
- buscar fichas nuevas (PokeAPI);
- la repetición destacada, tu Elo y tus repeticiones (Showdown).

**Dónde quedan tus datos (equipos, combates, perfil y favoritos):**
- Se guardan solo en el iPhone, dentro de la app instalada. No van a ningún servidor.
- La app instalada y Safari guardan cada uno sus datos por separado. Si ya la usabas en Safari, pásalos con **Perfil → Copia de seguridad**: *Descargar copia* en Safari y *Restaurar copia* en la app.
- Si borras el icono de la pantalla de inicio, se borran sus datos: descarga antes una copia.

**En Android:** abre la dirección en Chrome, toca el menú **⋮** y elige **Instalar app** o **Añadir a pantalla de inicio**.

## 4. ¿Y por la App Store?

No la puedo dejar subida a la App Store por ti. Hace falta tu propia cuenta de desarrollador de Apple, y publicar en tu nombre te corresponde a ti. Además, para este proyecto no te lo recomiendo, por lo siguiente.

### 4.1 Lo que pide Apple

| Requisito | Qué supone |
|---|---|
| **Apple Developer Program** | 99 € al año. Se da de alta con tu Apple ID y lo pagas tú. |
| **Un Mac con Xcode** | Las apps de iPhone se compilan y se firman con Xcode, que solo existe para macOS. Capacitor 8, la herramienta para convertir una web en una app de iPhone, pide Xcode 26 o posterior. Hay servicios que compilan en la nube, pero son de pago o tienen pocos minutos gratis, y también necesitan tu cuenta de Apple. |
| **Empaquetar la web** | Con Capacitor: la misma web, metida dentro de una app nativa. |
| **La ficha en App Store Connect** | Nombre, descripción, capturas de pantalla, icono de 1024 px, política de privacidad y clasificación por edades. |
| **La revisión de Apple** | Personas de Apple prueban la app y deciden si la aceptan. |

### 4.2 Por qué la rechazarían casi seguro

- **Norma 5.2.1, propiedad intelectual.** No se puede usar material protegido de otros (marcas u obras con derechos de autor) sin su permiso. Apex Dex usa los nombres de los Pokémon, sus ilustraciones oficiales y un logo con forma de Poké Ball. Todo eso es de Nintendo, Creatures, GAME FREAK y The Pokémon Company, y no tenemos su permiso.
- **Norma 4.2, funcionalidad mínima.** Una app tiene que ofrecer algo más que una web empaquetada, y Apex Dex dentro de Capacitor sería justo eso.

Es decir: pagarías 99 € para que, con mucha probabilidad, no la aceptaran.

### 4.3 Si aun así quieres tenerla como app nativa en tu iPhone

- **Gratis, si tienes un Mac:** con Xcode y tu Apple ID normal («Personal Team») puedes instalarla por cable en tu propio iPhone. Caduca a los 7 días y hay que volver a instalarla.
- **Con la cuenta de 99 €, usando TestFlight:** subes la app a App Store Connect y la instalas con la app TestFlight, sin que salga en la App Store pública. Cada versión dura 90 días. Apple revisa la primera versión que se envía a probadores externos.

### 4.4 Pasos con Capacitor (para cuando tengas Mac y cuenta)

> No los he podido probar, porque hacen falta un Mac y una cuenta de Apple. Son los pasos oficiales de Capacitor 8.

1. En el Mac, instala [Node.js](https://nodejs.org) y Xcode 26 (desde la Mac App Store).
2. En una carpeta nueva, ejecuta:

   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init "Apex Dex" com.tunombre.apexdex --web-dir www
   ```

3. Crea la carpeta `www` y copia en ella `index.html`, `manifest.webmanifest`, `sw.js` y las carpetas `css`, `js`, `datos` e `img`.
4. Genera el proyecto de iPhone y ábrelo en Xcode:

   ```bash
   npx cap add ios
   npx cap open ios
   ```

5. En Xcode: **Signing & Capabilities** → **Team**: tu cuenta. Pon el icono de 1024 px en **Assets → AppIcon**.
6. **Product → Archive** → **Distribute App** → **App Store Connect** → **Upload**.
7. En [App Store Connect](https://appstoreconnect.apple.com) → tu app → **TestFlight**: añádete como probador e instálala desde la app TestFlight del iPhone.

### 4.5 Lo que te recomiendo

Quédate con la PWA de GitHub Pages:
- es gratis y ya funciona;
- se instala en segundos y se actualiza sola;
- la puedes enseñar en clase con su enlace.

Desde la pantalla de inicio se comporta como una app más.

## 5. Actualizar la app

### 5.1 Cuando cambies el código

1. Abre `sw.js` y sube la versión. Por ejemplo, cambia `const VERSION = "2.0.0";` por `const VERSION = "2.0.1";`. Si no la cambias, los móviles no se enteran de que hay versión nueva.
2. En GitHub, en el repositorio: **Add file** → **Upload files**. Arrastra otra vez el contenido de `apex-dex`: los ficheros con el mismo nombre se sustituyen.
3. Escribe un mensaje de commit que diga qué ha cambiado y pulsa **Commit changes**.
4. En uno o dos minutos está publicada. En el iPhone, al abrir la app aparece **«Hay una versión nueva de Apex Dex»**: toca **Actualizar**.

### 5.2 Cada mes, con los datos nuevos de Smogon

Smogon publica las estadísticas de cada mes en los primeros días del mes siguiente.

1. En el ordenador, abre una terminal en la carpeta `apex-dex` y ejecuta (necesita Node.js 18 o posterior):

   ```bash
   node herramientas/generar-datos.mjs
   ```

   El programa descarga las estadísticas, las prepara y escribe `datos/`. También cambia sola la línea `DATOS` de `sw.js`. Si VGC estrena regulación, elige sola la más reciente.
2. Sube a GitHub la carpeta `datos` y `sw.js`.

## 6. Problemas frecuentes

| Problema | Solución |
|---|---|
| Error 404 en `github.io` | `index.html` no está en la raíz del repositorio o Pages no está activado (**Settings → Pages**). Después de activarlo, espera dos minutos. |
| La página sale en blanco o sin diseño | Falta alguna carpeta en el repositorio (`css`, `js`, `datos` o `img`). |
| «No se han podido cargar los datos de la app» | Falta `datos/meta.json`, `datos/diccionario.json` o la carpeta `datos/formatos`. |
| El iPhone no muestra la versión nueva | Cambia `VERSION` en `sw.js` y súbelo. Después cierra la app del todo y vuelve a abrirla. |
| No encuentro «Añadir a pantalla de inicio» | Usa Safari: está en el menú **Compartir**, más abajo. Si no sale, toca **Editar acciones** al final de ese menú. |
| En el ordenador no abre con doble clic | Es normal: necesita un servidor. Mira «Cómo abrirla en el ordenador» en el `README.md`. |

## 7. Privacidad

- Apex Dex no recoge datos ni tiene servidor propio. Todo lo que guardas se queda en tu móvil.
- La app solo pide información pública a la PokeAPI y a Pokémon Showdown.
- Si escribes tu usuario de Showdown, la app se lo manda a Showdown para leer tu Elo y tus repeticiones públicas. No te pide ninguna contraseña.
