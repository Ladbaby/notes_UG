/**
 * Runs before every build and fails loudly if the tracked content is missing.
 *
 * `npm run migrate` regenerates docs/notes/ from the original semester folders,
 * but those folders are gitignored — CI only ever sees the committed docs/
 * tree. Without this check a fresh clone would build a site with zero notes
 * and still report success.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const NOTES = path.join(ROOT, 'docs', 'notes')
const COURSES = path.join(ROOT, 'docs', 'course-data.json')

const problems = []

if (!fs.existsSync(COURSES)) {
  problems.push('docs/course-data.json is missing')
}

if (!fs.existsSync(NOTES)) {
  problems.push('docs/notes/ is missing')
} else {
  const md = (function count(dir) {
    let n = 0
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) n += count(p)
      else if (e.name.endsWith('.md')) n++
    }
    return n
  })(NOTES)

  if (md < 180) problems.push(`docs/notes/ only has ${md} markdown files (expected ~189)`)
}

if (problems.length) {
  console.error('\n✖ preflight failed:')
  for (const p of problems) console.error('   ' + p)
  console.error(
    '\nIf this is a fresh clone, the migrated content should already be ' +
      'committed.\nIf you are working locally and just deleted it, run:\n' +
      '   npm run migrate\n'
  )
  process.exit(1)
}

console.log('✓ preflight: docs/ content present')
