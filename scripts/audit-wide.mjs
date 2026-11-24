/**
 * Lists images that are full-screen-desktop captures, which are the ones
 * likely to carry browser chrome / taskbars / PPT footers with the school
 * seal. Used for manual review — this script only reports, it never edits.
 *
 * Usage:
 *   node scripts/audit-wide.mjs            # summary by course
 *   node scripts/audit-wide.mjs --list     # every candidate path
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const NOTES = path.join(ROOT, 'docs', 'notes')

// Resolutions Windows/Chrome produce for a whole-desktop capture.
const DESKTOP_SHAPES = new Set([
  '1920x1080', '2560x1440', '3840x2160', '1366x768',
  '1600x900', '1440x900', '1680x1050', '1280x720',
])

const listMode = process.argv.includes('--list')
const hits = []

async function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      await walk(p)
      continue
    }
    if (!/\.(png|jpe?g)$/i.test(e.name)) continue
    try {
      const m = await sharp(p).metadata()
      const key = `${m.width}x${m.height}`
      const wide = m.width / m.height > 1.75 && m.width >= 1280
      if (DESKTOP_SHAPES.has(key) || (wide && m.width >= 2200)) {
        hits.push({
          path: path.relative(ROOT, p),
          size: `${m.width}x${m.height}`,
          exactDesktop: DESKTOP_SHAPES.has(key),
          bytes: fs.statSync(p).size,
        })
      }
    } catch {
      /* skip unreadable */
    }
  }
}

await walk(NOTES)

hits.sort((a, b) => Number(b.exactDesktop) - Number(a.exactDesktop) || b.bytes - a.bytes)

const byCourse = new Map()
for (const h of hits) {
  const parts = h.path.split(path.sep)
  const key = parts.slice(2, 4).join('/')
  byCourse.set(key, (byCourse.get(key) || 0) + 1)
}

console.log(`candidates: ${hits.length}\n`)
console.log('by course:')
for (const [k, v] of [...byCourse.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`)
}

const exact = hits.filter((h) => h.exactDesktop)
console.log(`\nexact desktop resolutions (highest risk): ${exact.length}`)
for (const h of exact) console.log(`  ${h.size}  ${(h.bytes / 1024 / 1024).toFixed(1)}MB  ${h.path}`)

if (listMode) {
  console.log('\nall candidates:')
  for (const h of hits) console.log(`  ${h.size}\t${h.path}`)
}
