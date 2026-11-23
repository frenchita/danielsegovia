# Guía de publicación y redacción

Referencia para publicar notas en danielsegovia.com desde n8n (o cualquier cliente HTTP). Está pensada para usarse también como **instrucciones del modelo que redacta**: las secciones "Reglas de redacción" y "HTML permitido" se pueden pegar tal cual en el prompt.

---

## 1. El request

```
POST https://danielsegovia.com/api/posts
Authorization: Bearer <API_TOKEN>
Content-Type: application/json; charset=utf-8
```

El body tiene que ir en **UTF-8**. Si llega mal codificado, la API responde `422`.

### Ejemplo completo (español + inglés en el mismo POST)

Un solo POST crea la nota en los dos idiomas: cada idioma va dentro de `translations` con su propio slug, título, resumen, tags y contenido. Las dos versiones quedan enlazadas entre sí (hreflang) y comparten categoría y fecha de publicación.

```json
{
  "category": "tutoriales",
  "publish_at": "2026-11-24T09:42:00-03:00",
  "translations": {
    "es": {
      "slug": "como-filtrar-archivos-con-ls-y-grep",
      "title": "Cómo filtrar archivos en la terminal con ls y grep",
      "excerpt": "Una guía corta para encontrar archivos por nombre combinando ls y grep, con ejemplos que podés copiar y el equivalente en PowerShell.",
      "tags": ["Terminal", "Linux", "Productividad"],
      "content_html": "<p>Cuando una carpeta tiene cientos de archivos, buscar a ojo no escala. Con <code>ls</code> y <code>grep</code> lo resolvés en una línea.</p><h2>El comando básico</h2><p>Listá los archivos y filtrá los que contienen una palabra:</p><pre><code class=\"language-bash\">ls | grep \"hola\"</code></pre><p>El pipe (<code>|</code>) envía la salida de <code>ls</code> a <code>grep</code>, que muestra solo las líneas que coinciden.</p><h2>Variantes útiles</h2><ul><li><strong>Sin distinguir mayúsculas:</strong> agregá <code>-i</code>.</li><li><strong>Excluir coincidencias:</strong> usá <code>-v</code>.</li></ul><pre><code class=\"language-bash\">ls | grep -i \"informe\"\nls | grep -v \".tmp\"</code></pre><h2>En Windows</h2><p>El equivalente en PowerShell:</p><pre><code class=\"language-powershell\">Get-ChildItem | Where-Object { $_.Name -like \"*hola*\" }</code></pre><h2>Resumen</h2><table><thead><tr><th>Objetivo</th><th>Comando</th></tr></thead><tbody><tr><td>Filtrar por nombre</td><td><code>ls | grep \"texto\"</code></td></tr><tr><td>Ignorar mayúsculas</td><td><code>ls | grep -i \"texto\"</code></td></tr></tbody></table>"
    },
    "en": {
      "slug": "how-to-filter-files-with-ls-and-grep",
      "title": "How to filter files in the terminal with ls and grep",
      "excerpt": "A short guide to finding files by name by combining ls and grep, with copy-ready examples and the PowerShell equivalent.",
      "tags": ["Terminal", "Linux", "Productivity"],
      "content_html": "<p>When a folder has hundreds of files, scanning it by eye does not scale. With <code>ls</code> and <code>grep</code> you can solve it in one line.</p><h2>The basic command</h2><p>List the files and keep the ones that contain a word:</p><pre><code class=\"language-bash\">ls | grep \"hello\"</code></pre><p>The pipe (<code>|</code>) sends the output of <code>ls</code> to <code>grep</code>, which prints only the matching lines.</p><h2>Useful variants</h2><ul><li><strong>Case-insensitive:</strong> add <code>-i</code>.</li><li><strong>Exclude matches:</strong> use <code>-v</code>.</li></ul><pre><code class=\"language-bash\">ls | grep -i \"report\"\nls | grep -v \".tmp\"</code></pre><h2>On Windows</h2><p>The PowerShell equivalent:</p><pre><code class=\"language-powershell\">Get-ChildItem | Where-Object { $_.Name -like \"*hello*\" }</code></pre><h2>Summary</h2><table><thead><tr><th>Goal</th><th>Command</th></tr></thead><tbody><tr><td>Filter by name</td><td><code>ls | grep \"text\"</code></td></tr><tr><td>Ignore case</td><td><code>ls | grep -i \"text\"</code></td></tr></tbody></table>"
    }
  }
}
```

Con este POST quedan publicadas, después de las 9:42 (hora de Argentina) del 24/11:

- `https://danielsegovia.com/tutoriales/como-filtrar-archivos-con-ls-y-grep/`
- `https://danielsegovia.com/en/tutorials/how-to-filter-files-with-ls-and-grep/`

Sobre los idiomas:

- **`es` es obligatorio; `en` es opcional.** Si mandás solo `es`, la nota existe solo en español. Podés sumar el inglés después reenviando el POST con el mismo slug en español más el bloque `en`.
- **Cada idioma tiene su slug**, escrito en ese idioma y único dentro de él.
- **Los tags van por idioma** y se escriben en ese idioma (`Productividad` / `Productivity`); los nombres propios quedan igual (`Linux`).
- **La traducción tiene que ser completa**: mismo contenido y mismos bloques de código, adaptando los ejemplos cuando corresponda.
- Para quitar la versión en inglés: `PATCH /api/posts/:id` con `{"translations": {"en": null}}`.

### Categorías permitidas

Una nota tiene una sola categoría. En `category` mandá el valor de la primera columna; también se acepta el slug en inglés (`tutorials`, `news`…) o el id numérico en `category_id`.

| Valor (`category`) | id | Español: nombre y URL | Inglés: nombre y URL | Para qué tipo de nota |
|---|---|---|---|---|
| `tutoriales` | 1 | Tutoriales · `/tutoriales/` | Tutorials · `/en/tutorials/` | Guías paso a paso: desarrollo, herramientas, cloud, IA aplicada |
| `actualidad` | 2 | Actualidad · `/actualidad/` | News · `/en/news/` | Noticias de tecnología explicadas con contexto |
| `inteligencia-artificial` | 3 | Inteligencia Artificial · `/inteligencia-artificial/` | Artificial Intelligence · `/en/artificial-intelligence/` | Modelos, herramientas y casos de IA en productos y equipos |
| `seguridad` | 4 | Seguridad · `/seguridad/` | Security · `/en/security/` | Ciberseguridad, vulnerabilidades y buenas prácticas |
| `arquitectura` | 5 | Arquitectura · `/arquitectura/` | Architecture · `/en/architecture/` | Arquitectura de software, sistemas distribuidos, escalabilidad |
| `negocios` | 6 | Negocios · `/negocios/` | Business · `/en/business/` | Estrategia, liderazgo, startups y el negocio de la tecnología |

Cualquier otro valor devuelve `422` con la lista de categorías válidas. Si una nota encaja en dos, elegí la del enfoque principal y usá los tags para el resto. Por ejemplo, una vulnerabilidad en un modelo de IA va en `seguridad`, con el tag `Inteligencia artificial`.

### Campos

| Campo | Obligatorio | Reglas |
|---|---|---|
| `category` | sí | Uno de los valores de la tabla de arriba |
| `publish_at` | no | ISO 8601 **con zona horaria** (`-03:00` o `Z`). Fecha futura = programada. Si se envía sin `status`, se asume `published` |
| `status` | no | `published` o `draft`. Sin `status` ni `publish_at`, la nota queda como **borrador**. Con `published` y sin fecha, se publica en el momento |
| `translations.es` | sí | Versión en español |
| `translations.en` | no | Versión en inglés, con la misma estructura |
| `…slug` | sí | 3–120 caracteres, `a-z`, `0-9` y guiones, único por idioma. Reenviar el mismo slug en español actualiza la nota |
| `…title` | sí | 5–200 caracteres (ideal: 50–70) |
| `…excerpt` | sí | 20–320 caracteres (ideal: 140–160). Es la meta description |
| `…tags` | no | Hasta 10 (ideal: 2–5), de 2 a 40 caracteres. Array o texto separado por comas |
| `…content_html` | sí | HTML con los tags permitidos (abajo). Mínimo ~50 caracteres de texto |

### Respuestas

- `201` creada · `200` actualizada (mismo slug en español).
- `401` token inválido · `409` el slug de alguno de los dos idiomas lo usa otra nota · `422` validación (el mensaje indica el campo).
- La nota aparece en el sitio cuando termina el rebuild (~1 min). Si está programada, poco después de su `publish_at` (el cron revisa cada 15 min).

---

## 2. HTML permitido

Todo lo que no esté en esta lista se elimina al guardar.

| Uso | Tags |
|---|---|
| Párrafos y saltos | `<p>`, `<br>`, `<hr>` |
| Énfasis | `<strong>`, `<em>`, `<u>`, `<s>`, `<del>`, `<mark>`, `<small>`, `<sub>`, `<sup>` |
| Títulos | `<h2>`, `<h3>`, `<h4>` (`<h1>` se convierte en `<h2>`) |
| Links | `<a href="https://...">` (solo http, https, mailto o rutas internas) |
| Listas | `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>` |
| Citas | `<blockquote>`, `<q>`, `<cite>` |
| Tablas | `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>` |
| Código | `<code>`, `<pre>`, `<kbd>` |
| Otros | `<abbr title="...">`, `<figure>`, `<figcaption>` |

Se eliminan: imágenes, scripts, estilos, iframes, formularios, comentarios y casi todos los atributos (`style`, `class`, `onclick`, etc.). `<b>` e `<i>` se convierten en `<strong>` y `<em>`. Los links externos se abren en una pestaña nueva automáticamente.

---

## 3. Bloques de código

**Código en línea** (un comando o nombre dentro de una frase): `<code>`.

```html
<p>Usá <code>grep -i</code> para ignorar mayúsculas.</p>
```

**Bloque de código** (se muestra en una caja oscura con el lenguaje y el botón **Copiar**): `<pre><code class="language-xxx">`.

```html
<pre><code class="language-bash">ls | grep "hola"</code></pre>
```

Reglas:

1. **Siempre `<pre><code>`**, con el código dentro de `<code>`.
2. **El lenguaje va en `class="language-xxx"`** del `<code>`. Es la única clase que se conserva. Sin clase, la caja dice "Código". Valores comunes: `bash`, `shell`, `powershell`, `cmd`, `javascript`, `typescript`, `json`, `html`, `css`, `sql`, `python`, `go`, `rust`, `java`, `csharp`, `php`, `yaml`, `dockerfile`, `nginx`, `graphql`, `diff`, `http`, `text`.
3. **Escapá los caracteres HTML** dentro del código: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`. Las comillas pueden ir tal cual.
4. **Los saltos de línea se respetan**: en el JSON van como `\n`.
5. **No incluyas el prompt** (`$`, `>`, `PS C:\>`) para que lo que se copie funcione al pegarlo.
6. **Un comando por bloque**, o varios relacionados en líneas separadas. El botón copia el bloque completo.

Ejemplo con caracteres especiales, tal como queda dentro del JSON:

```json
"content_html": "<pre><code class=\"language-javascript\">if (a &lt; b &amp;&amp; c &gt; d) {\n  console.log('ok');\n}</code></pre>"
```

---

## 4. Reglas de redacción

Para el modelo que escribe las notas:

**Tono y voz**

- Primera persona, español rioplatense neutro ("vos", "podés"), claro y directo. Es la voz de un CTO con 24 años de experiencia: criterio técnico, sin hype ni marketing.
- Explicá el **por qué importa**, no solo el qué. Cerrá con una lectura propia o una recomendación práctica.
- Nada de relleno ("en el mundo actual…", "es importante destacar…") ni cierres genéricos.

**Estructura**

- **Título** (`title`): 50–70 caracteres, con el tema principal al inicio. Sin clickbait ni mayúsculas sostenidas.
- **Resumen** (`excerpt`): 140–160 caracteres, una o dos frases que respondan qué pasó o qué vas a aprender. Se usa como meta description y en las tarjetas.
- **Primer párrafo**: resume la nota en 2–3 frases e incluye el término principal.
- **Secciones** con `<h2>` (y `<h3>` si hace falta). Nunca `<h1>`: el título ya lo es. Con 3 o más `<h2>`, el sitio arma un índice automático.
- **Párrafos cortos** (2–4 frases). Listas para pasos o enumeraciones; tablas para comparaciones.
- **Largo**: 300–600 palabras en notas de actualidad; 600–1200 en tutoriales.

**Redacción propia, sin fuentes**

- Las notas son redacciones propias: leés medios para informarte y después escribís con tu tono. No se citan ni se enlazan fuentes externas, y no existe campo para la fuente.
- No menciones medios ni autores ("según X", "como publicó Y"). Contá el hecho y tu lectura.
- Cifras, fechas y nombres exactos; si algo no está confirmado, decilo.
- Nunca copies párrafos ni frases de lo que leíste: reescribí todo con palabras propias.

**SEO**

- Un tema principal por nota, presente en el título, el slug, el resumen y el primer párrafo.
- **Slug**: corto, en minúsculas, sin acentos ni stopwords innecesarias (`como-filtrar-archivos-con-ls-y-grep`).
- **Tags**: 2–5, específicos y reutilizables entre notas (productos, empresas, tecnologías, temas): `OpenAI`, `Kubernetes`, `Brechas de datos`. Escribilos siempre igual para que se agrupen.
- Links a la documentación oficial cuando corresponda.

**Formato técnico**

- Comandos, archivos, variables y funciones en `<code>`. Bloques de varias líneas en `<pre><code class="language-xxx">`.
- Sin imágenes (por ahora no se muestran).
- Sin HTML fuera de la lista permitida; no uses `style` ni `class` (salvo `language-xxx`).
