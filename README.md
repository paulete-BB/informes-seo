# Informes de Posicionamiento Web — Automatizados

Sistema de informes SEO mensuales para clientes de la agencia. Cada mes, GitHub
Actions consulta Google Analytics 4, Google Search Console y PageSpeed Insights,
y publica un dashboard online por cliente en GitHub Pages. **Costo: $0.**

## Cómo funciona

```
GitHub Actions (día 3 de cada mes)
   └── scripts/fetch_data.py
         ├── GA4 Data API  ──────────► sesiones, conversiones, engagement…
         ├── Search Console API ─────► clics, posiciones, keywords…
         └── PageSpeed Insights ─────► Core Web Vitals
               └── docs/data/<cliente>.json  ──► GitHub Pages (docs/index.html)
```

Las credenciales viven en un *secret* del repositorio: nunca se exponen en la
página pública. El dashboard solo lee archivos JSON estáticos.

## Configuración inicial (una sola vez, ~20 minutos)

### 1. Crear la service account de Google

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto (ej. `informes-agencia`).
2. En **APIs y servicios → Biblioteca**, habilita estas dos APIs:
   - **Google Analytics Data API**
   - **Google Search Console API**
3. En **IAM y administración → Cuentas de servicio**, crea una cuenta de servicio
   (ej. `informes-seo`). No necesita roles del proyecto.
4. Entra a la cuenta creada → pestaña **Claves** → **Agregar clave → JSON**.
   Se descargará un archivo `.json`: guárdalo, es la credencial.
5. Copia el **email** de la service account (algo como
   `informes-seo@informes-agencia.iam.gserviceaccount.com`).

### 2. Dar acceso a los datos de cada cliente

Por **cada cliente** (lo haces una vez al entregar su sitio web):

- **GA4**: Admin → Administración de accesos a la propiedad → ➕ → agrega el
  email de la service account con rol **Lector**.
- **Search Console**: Configuración → Usuarios y permisos → Agregar usuario →
  email de la service account con permiso **Total** (o Restringido).

### 3. Configurar el repositorio en GitHub

1. Sube este repositorio a GitHub (puede ser **privado**: GitHub Pages funciona
   en repos privados con plan Pro/Team, o usa repo público — los datos del
   dashboard son visibles para quien tenga la URL en ambos casos).
2. En **Settings → Secrets and variables → Actions → New repository secret**:
   - Nombre: `GOOGLE_CREDENTIALS`
   - Valor: pega el **contenido completo** del archivo JSON de la service account.
3. En **Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`,
   carpeta = `/docs`. Guarda. Tu dashboard quedará en
   `https://<usuario>.github.io/<repo>/`.

### 4. Registrar tus clientes

Edita `clients.json`. Un bloque por cliente:

```json
{
  "id": "panaderia-luna",
  "nombre": "Panadería Luna",
  "ga4_property_id": "987654321",
  "gsc_site_url": "sc-domain:panaderialuna.cl",
  "url_principal": "https://www.panaderialuna.cl",
  "terminos_marca": ["panaderia luna", "panaderialuna"],
  "keywords_objetivo": ["panaderia providencia", "pan amasado santiago"]
}
```

- **ga4_property_id**: en GA4 → Admin → Detalles de la propiedad (número de 9 dígitos).
- **gsc_site_url**: si la propiedad de Search Console es de dominio usa
  `sc-domain:dominio.cl`; si es de prefijo de URL usa `https://www.dominio.cl/`.
- **terminos_marca**: variantes del nombre del cliente, para separar tráfico de
  marca vs. genérico.
- **keywords_objetivo**: las palabras clave pactadas con el cliente (5–10).

### 5. Primera ejecución

Pestaña **Actions** → workflow *"Actualizar informes de posicionamiento"* →
**Run workflow**. En 1–2 minutos los JSON aparecerán en `docs/data/` y el
dashboard estará disponible. Después se ejecuta solo, el día 3 de cada mes.


## Agregar clientes desde el dashboard (recomendado)

El dashboard incluye el botón **＋ Agregar cliente**, que abre un formulario y
guarda el cliente directamente en `clients.json` del repositorio, disparando la
generación del informe al instante. La primera vez te pedirá conectarte a GitHub:

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. *Repository access*: **solo este repositorio**.
3. *Permissions*: **Contents → Read and write** y **Actions → Read and write**.
4. Pega el token en el formulario. Queda guardado solo en tu navegador
   (localStorage); nunca se publica en la página.

Importante: el formulario no puede otorgar los accesos en Google — antes de
guardar un cliente, agrega el email de la service account como Lector en su GA4
y como usuario en su Search Console (paso 2 de la configuración inicial).

## Visibilidad en buscadores IA

El informe incluye una sección con las sesiones y usuarios que llegan al sitio
referidos desde **ChatGPT, Gemini, Perplexity, Copilot y Claude** (medido en
GA4 por fuente de sesión). Si el cliente no registra visitas desde IA, el
informe lo señala como oportunidad para el servicio SEO + AEO + GEO.

## Uso con clientes

- Cada cliente tiene una URL directa: `https://<usuario>.github.io/<repo>/#id-del-cliente`.
- El botón **Exportar PDF** imprime el informe con estilos optimizados, listo
  para adjuntar en un correo.
- El informe compara siempre el **último mes calendario completo** contra el
  mes anterior.

## Limitaciones conocidas

- Search Console publica datos con ~2 días de retraso; por eso el workflow
  corre el día 3.
- PageSpeed Insights puede no devolver datos de campo (CWV reales) para sitios
  con poco tráfico; en ese caso se muestra solo el puntaje de laboratorio.
- La distribución de rankings se calcula sobre las primeras 1.000 consultas
  con impresiones del mes.
- Los datos del dashboard son públicos para quien conozca la URL. Si necesitas
  privacidad real por cliente, considera un repo privado + GitHub Pages con
  control de acceso (plan Enterprise) o mover el hosting a Cloudflare Access.

## Estructura del repositorio

```
clients.json                      ← configuración de clientes (editas esto)
scripts/fetch_data.py             ← consulta las APIs y genera los JSON
.github/workflows/
  actualizar-informes.yml         ← automatización mensual
docs/
  index.html                      ← dashboard (GitHub Pages)
  data/                           ← JSON generados automáticamente
```
