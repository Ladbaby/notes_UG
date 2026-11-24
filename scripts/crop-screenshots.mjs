/**
 * Crops the two full-screen screenshots that leaked school branding.
 *
 * Both originals were 2560x1440 full-desktop captures. The useful slide
 * content sits inside the browser viewport; everything outside it exposed
 * either the Windows taskbar, the 雨课堂 address bar, or the university
 * seal printed in the PPT slide footer (华南理工大学 / CCNL lab / COMP23xx).
 *
 * Run AFTER scripts/migrate.mjs (it rewrites the already-copied files).
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()

const JOBS = [
  {
    file: 'docs/notes/y3-fall/computer-networks/image/net-01.png',
    // Drop: left thumbnail rail, right taskbar, PPT footer band with the
    // 华南理工大学 seal and the "CCNL 广东省计算机网络重点实验室" logo.
    extract: { left: 575, top: 50, width: 1745, height: 1175 },
    note: 'Screenshot (85) — course marking scheme slide',
  },
  {
    file: 'docs/notes/y3-fall/operating-systems/image/os-01.png',
    // Drop: browser tabs + yuketang URL bar, the classroom sidebar,
    // and the university seal sitting in the slide's bottom-left corner.
    extract: { left: 662, top: 286, width: 1494, height: 998 },
    note: 'Screenshot (84) — course schedule slide',
  },
]

let failed = 0
for (const job of JOBS) {
  const abs = path.join(ROOT, job.file)
  if (!fs.existsSync(abs)) {
    console.error(`MISSING: ${job.file}`)
    failed++
    continue
  }
  const before = await sharp(abs).metadata()
  if (
    before.width === job.extract.width &&
    before.height === job.extract.height
  ) {
    console.log(`skip (already cropped): ${job.file}`)
    continue
  }
  const tmp = abs + '.tmp'
  await sharp(abs).extract(job.extract).toFile(tmp)
  fs.renameSync(tmp, abs)
  const after = await sharp(abs).metadata()
  console.log(
    `cropped ${job.file}\n  ${before.width}x${before.height} -> ${after.width}x${after.height}  (${job.note})`
  )
}

if (failed) {
  console.error(`\n${failed} crop job(s) failed`)
  process.exit(1)
}
