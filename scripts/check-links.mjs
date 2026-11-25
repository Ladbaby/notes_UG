/**
 * Verifies every internal link and image reference in docs/ resolves to a real
 * file. Catches the classic drift after renaming folders or images.
 *
 * Exit code 1 on any broken reference.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS = path.join(ROOT, 'docs')
const PUBLIC = path.join(DOCS, 'public')

/**
 * Site base path, read from config.mts so it cannot drift from the real deploy
 * prefix. Hardcoding it here previously meant a repo rename would silently
 * break route resolution.
 */
const BASE = (() => {
  const src = fs.readFileSync(path.join(DOCS, '.vitepress', 'config.mts'), 'utf8')
  const m = /const REPO = ['`]([^'`]+)['`]/.exec(src)
  return m ? '/' + m[1] : '/'
})()


const broken = []
const checked = { md: 0, img: 0 }

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.vitepress') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.md')) out.push(p)
  }
  return out
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function exists(p) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

function stripAnchor(target) {
  const i = target.indexOf('#')
  return i === -1 ? target : target.slice(0, i)
}

for (const file of walk(DOCS)) {
  const dir = path.dirname(file)
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)

  // --- HTML <img src="..."> ---
  for (const m of text.matchAll(/<img[^>]*\ssrc="([^"]+)"/gi)) {
    const raw = m[1]
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) continue
    checked.img++
    const target = path.resolve(dir, decodeSafe(raw))
    if (!exists(target)) {
      broken.push({ file: rel, kind: 'img', ref: raw })
    }
  }

  // --- Markdown ![alt](path) ---
  for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const raw = m[1]
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) continue
    checked.img++
    const target = path.resolve(dir, decodeSafe(stripAnchor(raw)))
    if (!exists(target)) {
      broken.push({ file: rel, kind: 'img', ref: raw })
    }
  }

  // --- Internal .md links ---
  for (const m of text.matchAll(/\]\(([^)\s]+\.md)(#[^)]*)?\)/g)) {
    const raw = m[1]
    if (/^(https?:)?\/\//.test(raw)) continue
    checked.md++
    const target = path.resolve(dir, decodeSafe(raw))
    if (!exists(target)) {
      broken.push({ file: rel, kind: 'md', ref: raw })
    }
  }

  // --- Root-absolute links must exist in public/ or be a built route ---
  for (const m of text.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const raw = m[1]
    if (raw.startsWith(BASE + '/')) continue // already based
    checked.md++
    const clean = decodeSafe(stripAnchor(raw)).replace(/^\//, '')
    const candidates = [
      path.join(PUBLIC, clean),
      path.join(DOCS, clean),
      path.join(DOCS, clean + '.md'),
    ]
    if (!candidates.some(exists)) {
      broken.push({ file: rel, kind: 'abs', ref: raw })
    }
  }
}

console.log(`checked ${checked.md} internal links and ${checked.img} image refs`)

/*
 * Route validation.
 *
 * The scans above only catch links written in Markdown. It missed two real
 * 404s that shipped: course cards pointing at `/notes/<sem>/<course>/` when no
 * index page existed, and the generated course pages omitting the semester
 * segment. Both were assembled in Vue components, invisible to a Markdown
 * regex.
 *
 * So: collect every `href="/…"` in the built HTML and assert it resolves to a
 * real file (or a directory with index.html) in dist/.
 */
const DIST = path.join(DOCS, '.vitepress', 'dist')
const routeMisses = []
let routeChecked = 0

if (fs.existsSync(DIST)) {
  function builtHtml(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        // pagefind ships its own UI assets, not site routes
        if (e.name === 'pagefind') continue
        builtHtml(p, out)
      } else if (e.name.endsWith('.html')) out.push(p)
    }
    return out
  }

  /** Map a site path to the file dist/ would serve for it. */
  function resolveRoute(p) {
    let rel = p
    if (rel.startsWith(BASE + '/')) rel = rel.slice(BASE.length)
    else if (rel === BASE) rel = '/'
    rel = decodeSafe(rel.split('#')[0].split('?')[0])
    if (rel === '/' || rel === '') rel = '/index.html'
    const abs = path.join(DIST, rel.replace(/^\//, ''))
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true
    // cleanUrls: /a/b -> a/b.html   |   directory style: /a/b/ -> a/b/index.html
    if (fs.existsSync(abs + '.html')) return true
    if (fs.existsSync(path.join(abs, 'index.html'))) return true
    return false
  }

  for (const file of builtHtml(DIST)) {
    const html = fs.readFileSync(file, 'utf8')
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1]
      if (/\.[a-z0-9]{2,5}$/i.test(href)) {
        // Asset link (css/js/svg/png…) — check the file itself.
        routeChecked++
        if (!resolveRoute(href)) {
          routeMisses.push({
            file: path.relative(DIST, file),
            ref: href,
          })
        }
        continue
      }
      routeChecked++
      if (!resolveRoute(href)) {
        routeMisses.push({ file: path.relative(DIST, file), ref: href })
      }
    }
  }
}

console.log(`checked ${routeChecked} rendered route links`)

if (routeMisses.length) {
  const uniq = [...new Map(routeMisses.map((r) => [r.ref, r])).values()]
  console.error(`\n✖ ${uniq.length} broken route(s) in built HTML:\n`)
  for (const r of uniq.slice(0, 25)) {
    console.error(`     ${r.ref}`)
    console.error(`       from ${r.file}`)
  }
  if (uniq.length > 25) console.error(`     … and ${uniq.length - 25} more`)
  console.error('')
  process.exit(1)
}

if (broken.length) {
  const byKind = new Map()
  for (const b of broken) {
    if (!byKind.has(b.kind)) byKind.set(b.kind, [])
    byKind.get(b.kind).push(b)
  }
  console.error(`\n✖ ${broken.length} broken reference(s):\n`)
  for (const [kind, list] of byKind) {
    console.error(`  ${kind} (${list.length})`)
    for (const b of list.slice(0, 20)) {
      console.error(`     ${b.file}  ->  ${b.ref}`)
    }
    if (list.length > 20) console.error(`     … and ${list.length - 20} more`)
    console.error('')
  }
  process.exit(1)
}

console.log('✓ check-links: all internal references resolve')
