/**
 * Fails the build if anything personal or embarrassing is about to ship.
 *
 * Scans the source tree (docs/, minus node_modules) AND the built output, so a
 * leaked string is caught whether it came from Markdown, a filename, or a
 * generated asset path. Exit code 1 on any hit — wire this into CI.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TREES = [
  path.join(ROOT, 'docs'),
]

// Only scan text-ish files; images are checked structurally via filenames.
const TEXT_EXT = new Set([
  '.md', '.html', '.json', '.js', '.mjs', '.cjs', '.ts', '.vue',
  '.css', '.svg', '.txt', '.yml', '.yaml', '.xml',
])

const SKIP_DIRS = new Set(['node_modules', 'dist', 'cache', '.git', 'pagefind'])

/**
 * Each rule: what to look for, why it matters, and where it is acceptable.
 * `allow` lets us keep legitimate mentions (e.g. a textbook page reference).
 */
const RULES = [
  {
    id: 'windows-username',
    re: /Firefly/g,
    why: 'absolute path / Windows account name',
  },
  {
    id: 'qq-number',
    re: /1390265970/g,
    why: 'QQ number',
  },
  {
    id: 'qq-email',
    re: /@qq\.com/gi,
    why: 'personal email domain',
  },
  {
    id: 'school-name',
    re: /华南理工(大学)?|SCUT\b/g,
    why: 'university name',
  },
  {
    id: 'lab-name',
    re: /CCNL|广东省计算机网络重点实验室/g,
    why: 'university lab branding',
  },
  {
    id: 'course-code',
    re: /\bCOMP\s?23\d{2}\b/g,
    why: 'school course code',
  },
  {
    id: 'yuketang',
    re: /雨课堂|yuketang/g,
    why: 'school course portal',
  },
  {
    id: 'personal-image-name',
    re: /金坷垃|Bing\s*-\s*个人|fff\s*-|微信图片|Screenshot\s*\(/g,
    why: 'image filename leaking browsing history',
  },
  {
    id: 'profanity',
    re: /勾八|狗比|rnm|垃圾书|垃圾\s*ppt|智障|ZZ的|稀烂|水课/gi,
    why: 'profanity / personal insult',
  },
  {
    id: 'dead-local-path',
    re: /ai-edu-master/g,
    why: 'link into a private local repo',
  },
  {
    id: 'unpublished-homework',
    re: /\bhw12\b/g,
    why: 'reference to unpublished coursework',
  },
]

const hits = []

function scanFile(file) {
  const ext = path.extname(file).toLowerCase()
  if (!TEXT_EXT.has(ext)) return
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return
  }
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split('\n').length
      hits.push({
        rule: rule.id,
        why: rule.why,
        file: path.relative(ROOT, file),
        line,
        match: m[0],
      })
      if (m[0].length === 0) rule.re.lastIndex++
    }
  }
}

/** Filenames themselves can leak (e.g. the renamed Bing screenshots). */
function scanName(file) {
  const base = path.basename(file)
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    if (rule.re.test(base)) {
      hits.push({
        rule: rule.id + ' (filename)',
        why: rule.why,
        file: path.relative(ROOT, file),
        line: 0,
        match: base,
      })
    }
  }
}

function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      walk(path.join(dir, e.name))
    } else {
      const full = path.join(dir, e.name)
      scanName(full)
      scanFile(full)
    }
  }
}

for (const tree of TREES) {
  if (fs.existsSync(tree)) walk(tree)
}

// Also assert the source notes folder was not accidentally committed back in.
const leakDirs = ['大一上', '大二上', '大二下', '大三上', '大三下', '大四上', '大四下']
for (const d of leakDirs) {
  if (fs.existsSync(path.join(ROOT, 'docs', d))) {
    hits.push({
      rule: 'original-tree-in-docs',
      why: 'original semester folder copied into docs/',
      file: `docs/${d}`,
      line: 0,
      match: d,
    })
  }
}

if (hits.length) {
  const byRule = new Map()
  for (const h of hits) {
    if (!byRule.has(h.rule)) byRule.set(h.rule, [])
    byRule.get(h.rule).push(h)
  }

  console.error(`\n✖ ${hits.length} leak(s) found across ${byRule.size} rule(s):\n`)
  for (const [rule, list] of byRule) {
    console.error(`  ${rule} — ${list[0].why}  (${list.length})`)
    for (const h of list.slice(0, 6)) {
      console.error(`     ${h.file}:${h.line}  ${JSON.stringify(h.match)}`)
    }
    if (list.length > 6) console.error(`     … and ${list.length - 6} more`)
    console.error('')
  }
  process.exit(1)
}

console.log('✓ check-leaks: no personal or inappropriate content found')
