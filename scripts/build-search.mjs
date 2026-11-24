/**
 * Rebuild the Pagefind index after VitePress has finished writing dist/.
 *
 * The vitepress-plugin-pagefind hook runs while pages are still being emitted,
 * so it only sees a fraction of them (61 of 190 in practice). Running the CLI
 * directly against the finished dist gives the complete index.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'docs', '.vitepress', 'dist')
const RUNNER = path.join(ROOT, 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs')

if (!fs.existsSync(DIST)) {
  console.error('dist not found — run the VitePress build first')
  process.exit(1)
}
if (!fs.existsSync(RUNNER)) {
  console.error(`pagefind runner not found at ${RUNNER}`)
  process.exit(1)
}

const html = (function count(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) n += count(p)
    else if (e.name.endsWith('.html')) n++
  }
  return n
})(DIST)

console.log(`indexing ${html} html files with pagefind…`)

try {
  // Spawn `node <runner>` so this works identically on Windows and POSIX
  // without shell quoting.
  const out = execFileSync(
    process.execPath,
    [RUNNER, '--site', DIST, '--force-language', 'zh-cn'],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }
  )
  const pages = out.match(/Indexed (\d+) pages/)
  const words = out.match(/Indexed (\d+) words/)
  if (pages) console.log(`pagefind: ${pages[0]}`)
  if (words) console.log(`pagefind: ${words[0]}`)
} catch (err) {
  console.error('pagefind failed')
  console.error(err.stdout?.toString() || '')
  console.error(err.stderr?.toString() || '')
  process.exit(1)
}
