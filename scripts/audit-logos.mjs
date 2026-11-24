/**
 * Detects slide screenshots whose bottom band contains colored artwork
 * (a university seal or lab logo). Heuristic only: reports candidates for
 * eyeballing, never modifies files.
 *
 * Rationale: the two confirmed leaks (net-01 / os-01) both had a saturated
 * red or blue logo inside the lowest ~8% of the slide area, while ordinary
 * slide content in that band is near-uniform white or plain text.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const NOTES = path.join(ROOT, 'docs', 'notes')

const SAT_THRESHOLD = 0.012 // fraction of saturated pixels in footer band

async function analyse(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  if (!width || !height) return null
  if (width / height < 1.2) return null // portrait-ish, skip
  if (width < 900) return null

  // Lowest 9% of the image, middle 80% horizontally (skip scrollbars).
  const bandTop = Math.floor(height * 0.91)
  const bandH = height - bandTop
  const left = Math.floor(width * 0.1)
  const w = Math.floor(width * 0.8)
  if (bandH < 8 || w < 8) return null

  const { data, info } = await sharp(file)
    .extract({ left, top: bandTop, width: w, height: bandH })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let saturated = 0
  let total = 0
  const ch = info.channels
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    // Colored and not near-white/near-black.
    if (mx - mn > 55 && mx > 90 && mx < 245) saturated++
    total++
  }
  const frac = saturated / total
  return frac >= SAT_THRESHOLD ? { frac, width, height } : null
}

const hits = []
async function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { await walk(p); continue }
    if (!/\.(png|jpe?g)$/i.test(e.name)) continue
    try {
      const r = await analyse(p)
      if (r) hits.push({ path: path.relative(ROOT, p), ...r })
    } catch { /* skip */ }
  }
}
await walk(NOTES)

hits.sort((a, b) => b.frac - a.frac)
console.log(`footer-band candidates: ${hits.length}\n`)
for (const h of hits.slice(0, 40)) {
  console.log(`  ${(h.frac * 100).toFixed(1)}%  ${h.width}x${h.height}  ${h.path}`)
}
if (hits.length > 40) console.log(`  ... and ${hits.length - 40} more`)
