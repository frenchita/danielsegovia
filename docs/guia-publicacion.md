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

### Ejemplo completo

```json
{
  "category": "tutoriales",
  "publish_at": "2026-11-24T09:42:00-03:00",
  "source_url": "https://www.gnu.org/software/grep/manual/grep.html",
  "translations": {
    "es": {
      "slug": "como-filtrar-archivos-con-ls-y-grep",
      "title": "Cómo filtrar archivos en la terminal con ls y grep",
      "excerpt": "Una guía corta para encontrar archivos por nombre combinando ls y grep, con ejemplos que podés copiar y el equivalente en PowerShell.",
      "tags": ["Terminal", "Linux", "Productividad"],
      "content_html": "<p>Cuando una carpeta tiene cientos de archivos, buscar a ojo no escala. Con <code>ls</code> y <code>grep</code> lo resolvés en una línea.</p><h2>El comando básico</h2><p>Listá los archivos y filtrá los que contienen una palabra:</p><pre><code class=\"language-bash\">ls | grep \"hola\"</code></pre><p>El pipe (<code>|</code>) envía la salida de <code>ls</code> a <code>grep</code>, que muestra solo las líneas que coinciden.</p><h2>Variantes útiles</h2><ul><li><strong>Sin distinguir mayúsculas:</strong> agregá <code>-i</code>.</li><li><strong>Excluir coincidencias:</strong> usá <code>-v</code>.</li></ul><pre><code class=\"language-bash\">ls | grep -i \"informe\"\nls | grep -v \".tmp\"</code></pre><h2>En Windows</h2><p>El equivalente en PowerShell:</p><pre><code class=\"language-powershell\">Get-ChildItem | Where-Object { $_.Name -like \"*hola*\" }</code></pre><h2>Resumen</h2><table><thead><tr><th>Objetivo</th><th>Comando</th></tr></thead><tbody><tr><td>Filtrar por nombre</td><td><code>ls | grep \"texto\"</code></td></tr><tr><td>Ignorar mayúsculas</td><td><code>ls | grep -i \"texto\"</code></td></tr></tbody></table><p>Más opciones en el <a href=\"https://www.gnu.org/software/grep/manual/grep.html\">manual oficial de grep</a>.</p>"
    }
  }
}
```

### Campos

| Campo | Obligatorio | Reglas |
|---|---|---|
| `category` | sí | `tutoriales`, `actualidad`, `inteligencia-artificial`, `seguridad`, `arquitectura`, `negocios` |
| `publish_at` | no | ISO 8601 **con zona horaria** (`-03:00` o `Z`). Futuro = programada. Sin `status`, se asume `published`. Sin fecha, se publica ya |
| `status` | no | `published` o `draft` (default `draft` si no hay `publish_at`) |
| `source_url` | no | URL http(s) de la fuente principal |
| `translations.es` | sí | `en` es opcional (misma estructura) |
| `slug` | sí | 3–120 caracteres, `a-z`, `0-9` y guiones, único por idioma. Mismo slug = actualiza la nota |
| `title` | sí | 5–200 caracteres (ideal: 50–70) |
| `excerpt` | sí | 20–320 caracteres (ideal: 140–160). Es la meta description |
| `tags` | no | Hasta 10 (ideal: 2–5), de 2 a 40 caracteres. Array o texto separado por comas |
| `content_html` | sí | HTML con los tags permitidos (abajo). Mínimo ~50 caracteres de texto |

### Respuestas

- `201` creada · `200` actualizada (mismo slug).
- `401` token inválido · `409` el slug lo usa otra nota · `422` validación (el mensaje indica el campo).
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

**Precisión y fuentes**

- Solo datos verificables en la fuente. Cifras, fechas y nombres exactos; si algo no está confirmado, decilo.
- Enlazá la fuente principal en `source_url` y, si suma, dentro del texto con `<a>`.
- No copies párrafos de la fuente: resumí con palabras propias. Citas textuales solo breves y en `<blockquote>`.

**SEO**

- Un tema principal por nota, presente en el título, el slug, el resumen y el primer párrafo.
- **Slug**: corto, en minúsculas, sin acentos ni stopwords innecesarias (`como-filtrar-archivos-con-ls-y-grep`).
- **Tags**: 2–5, específicos y reutilizables entre notas (productos, empresas, tecnologías, temas): `OpenAI`, `Kubernetes`, `Brechas de datos`. Escribilos siempre igual para que se agrupen.
- Links a la documentación oficial cuando corresponda.

**Formato técnico**

- Comandos, archivos, variables y funciones en `<code>`. Bloques de varias líneas en `<pre><code class="language-xxx">`.
- Sin imágenes (por ahora no se muestran).
- Sin HTML fuera de la lista permitida; no uses `style` ni `class` (salvo `language-xxx`).
