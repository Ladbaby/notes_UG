import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS = path.join(ROOT, 'docs')
const OUT = path.join(DOCS, 'notes')
const courses = JSON.parse(fs.readFileSync('docs/course-data.json', 'utf8')).courses
const slugMap = JSON.parse(fs.readFileSync('scripts/slug-map.json', 'utf8'))

const warnings = []
const fatal = []

/**
 * Rename these image files — their names leak personal browsing history.
 * `null` means: drop the file entirely (never referenced by any note).
 */
const IMAGE_RENAMES = {
  '大二上/Mind_Map_Data_Structure/image/fuck - 国内版 Bing - 个人 - Microsoft​ Edge 2021_10_17 11_28_11 (2).png': 'bst-01.png',
  '大二上/Mind_Map_Data_Structure/image/fuck - 国内版 Bing - 个人 - Microsoft​ Edge 2021_10_17 11_28_11 (3).png': 'bst-02.png',
  '大二上/Mind_Map_Data_Structure/image/fff - 国内版 Bing - 个人 - Microsoft​ Edge 2021_11_29 10_58_42.png': 'btree-01.png',
  '大二上/Mind_Map_Data_Structure/image/__Ch11-Graphs.ppt 和另外 3 个页面 - 个人 - Microsoft​ Edge 2021_11_28 20_19_53.png': 'graph-01.png',
  '大二上/Mind_Map_Data_Structure/image/__Ch11-Graphs.ppt 和另外 3 个页面 - 个人 - Microsoft​ Edge 2021_11_28 20_31_52.png': 'graph-02.png',
  '大二下/Mind_Map_Computer_Organization/image/金坷垃原版_哔哩哔哩_bilibili 和另外 5 个页面 - 个人 - Microsoft​ Edge 2022_3_19 11_04_26.png': 'co-01.png',
  '大三上/Mind_Map_Network/image/Screenshot (85).png': 'net-01.png',
  '大三上/Mind_Map_OS/image/Screenshot (84).png': 'os-01.png',
  // Orphaned photo of a classroom: shows the course code COMP23xx, the
  // teacher's name and classmates' heads. Not referenced by any note -> drop.
  '大二下/Mind_Map_Database/image/微信图片_20220222112849.jpg': null,
}

/**
 * Text-level scrubs. Applied to the copied file in docs/.
 * `dropLines` removes whole lines matching a regex (plus trailing blanks).
 * `replace` does find/replace on joined content.
 * Kept intentionally narrow per the user's choice: only profanity and
 * personal insults go; everyday grumbling ("离谱", "无语") stays.
 */
const TEXT_FIXES = {
  'docs/notes/y3-fall/operating-systems/ch2-processes-and-threads.md': {
    replace: [
      ['然而我们的勾八老师认为 thread 才是基本单位', '然而课程里把 thread 当作基本单位'],
    ],
  },
  'docs/notes/y2-spring/database/ch14-indexing.md': {
    replace: [
      [
        '所以说。。。狗比书，你为什么要在24.5把所有东西都重新讲一遍？？？我这节的*static hashing*白写了一样',
        '不过 24.5 节会把两者统一讲一遍，所以这一节的 *static hashing* 算是提前预习了',
      ],
    ],
  },
  'docs/notes/y4-spring/information-retrieval/3-language-models.md': {
    dropLines: [/考试要是考这种的话那就真的\s*rnm/],
  },
  'docs/notes/y2-fall/physics/chapter30-induction-and-inductance.md': {
    replace: [['> 垃圾书这也能不给证明', '> 教材在这里没有给出证明']],
  },
  'docs/notes/y3-fall/deep-learning/2-4-ensemble-learning.md': {
    dropLines: [/^\s*什么垃圾\s*ppt\s*$/i],
  },
  'docs/notes/y2-spring/ai/ch3-solving-problems-by-searching.md': {
    replace: [
      ['太智障了，甚至没法估计复杂度', '这个设计过于复杂，甚至连复杂度都难以估计'],
    ],
  },
  'docs/notes/y2-fall/electric-circuits/chapter3-circut-analysis-methods.md': {
    replace: [
      [
        '教材上那种ZZ的死记结论的论述方法压根就没有讲到本质上',
        '教材上那种死记结论的论述方式并没有讲到本质上',
      ],
    ],
  },
  'docs/notes/y2-fall/math-modeling/2-programming-models.md': {
    replace: [['我觉得课件讲的稀烂', '我觉得课件讲得不够清楚']],
  },
  'docs/notes/y3-fall/deep-learning/2-1-classification.md': {
    replace: [['上学期的AI水课上', '上学期的 AI 课上']],
  },
  'docs/notes/y3-fall/computer-networks/ch1-introduction.md': {
    replace: [['老师认为TCP/IP model', '有观点认为 TCP/IP model']],
  },
  // "雨课堂" is the university's lecture-capture portal; the section headings
  // only mean "exercises from the class platform". Rename them neutrally.
  'docs/notes/y3-fall/computer-networks/review.md': {
    replace: [['雨课堂', '课后习题']],
  },
  // Points at a homework handout that is not published here — keep the useful
  // outbound reference, drop the internal one.
  'docs/notes/y2-spring/compilers/ch7-run-time-environments.md': {
    replace: [['参考hw12，其中知识来源于', '这一节的知识来源于']],
  },
}

/* ------------------------------------------------------------------ */
/* path helpers                                                        */
/* ------------------------------------------------------------------ */

const toPosix = (p) => p.split(path.sep).join('/')

/** Resolve a possibly percent-encoded relative link against a source dir. */
function resolveLinkTarget(fromRelDir, rawTarget) {
  let t = rawTarget
  try {
    t = decodeURIComponent(t)
  } catch {
    /* keep raw if it is not valid percent-encoding */
  }
  if (t.startsWith('/')) t = t.slice(1)
  const joined = path.posix.normalize(path.posix.join(fromRelDir, t))
  return joined
}

/** Convert Windows backslashes to forward slashes. Nothing else. */
function normalizeLinkTarget(target) {
  return target.replace(/\\/g, '/')
}

function rewriteMdLinks(content, srcRelPath, newRelPath) {
  const srcDir = path.posix.dirname(srcRelPath)
  const newDir = path.posix.dirname(newRelPath)

  return content.replace(
    /\]\(([^)\s]+\.md)(#[^)]*)?\)/g,
    (match, target, anchor = '') => {
      // Absolute Windows paths and external trees are handled elsewhere.
      if (/^[A-Za-z]:[\\/]/.test(target) || target.startsWith('http')) return match

      const cleaned = normalizeLinkTarget(target)
      const resolved = resolveLinkTarget(srcDir, cleaned)
      const mapped = slugMap.files[resolved]

      if (mapped) {
        const rel = path.posix.relative(newDir, mapped)
        return `](${rel}${anchor || ''})`
      }

      // Already a post-migration path (e.g. a hand-written ../../y2-fall/...).
      if (/^(?:\.\.\/)+y\d-(?:fall|spring)\//.test(cleaned)) {
        return `](${cleaned}${anchor || ''})`
      }

      warnings.push(`unmapped md link: ${srcRelPath} -> ${target}`)
      return match
    }
  )
}

/** image/ or ./image/ -> ./image/ ; fixes Windows backslashes too. */
function fixImagePrefixes(content) {
  let out = content
  // src=".\image\foo.png" and src=".\image/foo.png"
  out = out.replace(/src="\.\\image\\/g, 'src="./image/')
  out = out.replace(/src="\.\\image\//g, 'src="./image/')
  // src="image/foo.png" -> src="./image/foo.png"  (do not double-prefix)
  out = out.replace(/src="(?!\.?\/)image\//g, 'src="./image/')
  // markdown images: ](image/foo.png) -> ](./image/foo.png)
  out = out.replace(/\]\((?!\.?\/)image\//g, '](./image/')
  return out
}

/**
 * Point references at the renamed image files. Runs after prefixing so both
 * `src="./image/OLD"` and `](./image/OLD)` forms are already normalised.
 * Accepts percent-encoded originals too.
 */
function rewriteRenamedImages(content, courseSrc) {
  const relevant = Object.entries(IMAGE_RENAMES).filter(
    ([oldRel, newName]) => newName !== null && oldRel.startsWith(courseSrc + '/image/')
  )
  if (!relevant.length) return content

  // References are inconsistently percent-encoded (some fully, some partially,
  // some not at all), so decode each one before comparing.
  // Stop at a quote (src="..." boundary), the closing paren of a Markdown
  // image, whitespace, or an HTML attribute gap. Parentheses inside the
  // filename itself are legal and must not terminate the match.
  return content.replace(/(?:\.?\/?image\/)([^"'>\s]+)/g, (match, rawName) => {
    let decoded = rawName
    try {
      decoded = decodeURIComponent(rawName)
    } catch {
      /* leave as-is when not decodable */
    }
    for (const [oldRel, newName] of relevant) {
      const oldName = oldRel.slice(courseSrc.length + '/image/'.length)
      if (decoded === oldName) return './image/' + newName
    }
    return match
  })
}

/** Remove Typora's [toc] directive — VitePress has no equivalent. */
function stripToc(content) {
  return content.replace(/^[ \t]*\[toc\][ \t]*\r?\n(\r?\n)?/gim, '')
}

/**
 * VitePress compiles pages as Vue SFC templates, so `{{ ... }}` in the Markdown
 * is parsed as a Vue interpolation and breaks the build.
 *
 * Our notes contain LaTeX converted from Wikipedia, whose array cells come out
 * as `{{a_{11}}}`. Inserting a space between the doubled braces defeats Vue's
 * `{{` detection while preserving the exact brace count, so the formula stays
 * balanced and renders identically (LaTeX ignores whitespace in math mode).
 */
function defuseVueBraces(content) {
  if (!content.includes('{{') && !content.includes('}}')) return content
  return content
    .split('\n')
    .map((line) => {
      if (!line.includes('{{') && !line.includes('}}')) return line
      return line.replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }')
    })
    .join('\n')
}

/** Fix absolute Windows paths and links to the vanished ai-edu-master tree. */
function fixBrokenExternalLinks(content, relPath) {
  let out = content

  // C:/Users/Firefly/... -> site relative link when we know the target,
  // otherwise plain text so nothing personal ships.
  out = out.replace(
    /\[([^\]]+)\]\((?:[A-Za-z]:[\\/])Users[\\/][^)]+?([^\\/)]+\.md)\)/g,
    (m, label, file) => {
      const guess = Object.keys(slugMap.files).find((k) => k.endsWith('/' + file))
      if (!guess) {
        warnings.push(`absolute path link dropped: ${relPath} -> ${file}`)
        return label
      }
      const newDir = path.posix.dirname(relPath)
      const target = slugMap.files[guess]
      return `[${label}](${path.posix.relative(newDir, target)})`
    }
  )

  // Links into the old local ai-edu-master repo: keep the label, drop the link.
  out = out.replace(/\[([^\]]+)\]\(\.\.\/\.\.\/ai-edu-master\/[^)]*\)/g, (m, label) => {
    warnings.push(`external tree link flattened: ${relPath}`)
    return `**${label}**`
  })

  return out
}

/**
 * A footnote whose body is a bare word is parsed by Markdown as a *link
 * reference definition*, so VitePress then treats that word as a page path and
 * fails the build. All such notes here point at local courseware that does not
 * exist in this repo, so rewrite the pair as plain prose instead.
 */
function guardBareFootnoteBodies(content) {
  const bare = new Map()
  content.replace(/^\[\^([^\]]+)\]:\s*(?![[(<`*])(\S.*)$/gm, (m, id, body) => {
    bare.set(id, body.trim())
    return m
  })
  if (!bare.size) return content

  let out = content
  for (const [id, body] of bare) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`^\\[\\^${safe}\\]:[^\\n]*\\n?`, 'gm'), '')
    out = out.replace(
      new RegExp(`\\[\\^${safe}\\]`, 'g'),
      `（延伸阅读：${body}）`
    )
  }
  return out
}

/**
 * Typora's definition-list syntax puts a value on a line starting with `: `.
 * Many notes use it to attach a display formula to a term:
 *
 *     Euclidean distance
 *     : $$D_e(p,q)=\sqrt{…}$$
 *
 * VitePress only recognises `$$` as display math when it starts the line, so
 * the whole formula leaks out as literal text. Rewrite the pair as a bold term
 * followed by a real display-math block, which renders the same but parses.
 */
function fixDefinitionListMath(content) {
  const lines = content.split('\n')
  const out = []
  let i = 0

  const boldPreviousTerm = (indent) => {
    let termIdx = out.length - 1
    while (termIdx >= 0 && out[termIdx].trim() === '') termIdx--
    const term = termIdx >= 0 ? out[termIdx].trim() : ''
    if (!term) return
    if (/^[#|>`*\-]/.test(term)) return
    if (term.startsWith('$$')) return
    out[termIdx] = `${indent}**${term}**`
  }

  while (i < lines.length) {
    const line = lines[i]

    // Form 1: ": $$ ... $$" entirely on one line.
    const single = line.match(/^(\s*):\s*\$\$(.+)\$\$\s*$/)
    if (single) {
      const [, indent, expr] = single
      boldPreviousTerm(indent)
      out.push(`${indent}$$`, `${indent}${expr.trim()}`, `${indent}$$`)
      i++
      continue
    }

    // Form 2: ": $$" opening a block that closes on a later line.
    const open = line.match(/^(\s*):\s*\$\$\s*$/)
    if (open) {
      const indent = open[1]
      let close = -1
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '$$') {
          close = j
          break
        }
      }
      if (close > 0) {
        boldPreviousTerm(indent)
        out.push(`${indent}$$`)
        for (let j = i + 1; j < close; j++) out.push(lines[j])
        out.push(`${indent}$$`)
        i = close + 1
        continue
      }
    }

    out.push(line)
    i++
  }

  return out.join('\n')
}

/**
 * A file may begin with `---`, which Typora renders as a horizontal rule but
 * VitePress/Vue parses as YAML frontmatter. Keep it only when the block really
 * looks like frontmatter (key: value pairs, and short); otherwise drop the
 * leading rule so the parser never sees an unterminated document.
 */
function normalizeLeadingRule(content) {
  if (!content.startsWith('---')) return content
  const lines = content.split('\n')
  if (lines[0].trim() !== '---') return content

  let closeIdx = -1
  for (let i = 1; i < Math.min(lines.length, 31); i++) {
    if (lines[i].trim() === '---') {
      closeIdx = i
      break
    }
  }

  if (closeIdx > 0) {
    const block = lines.slice(1, closeIdx)
    const looksLikeYaml =
      block.length > 0 &&
      block.every((l) => l.trim() === '' || /^[\w-]+\s*:/.test(l.trim()))

    if (looksLikeYaml) {
      // Real frontmatter. Typora exported a `puppeteer:` block that means
      // nothing on the web; drop the whole block (key plus indented children)
      // rather than leaving a dangling nested key behind.
      const kept = []
      let skipping = false
      for (const l of block) {
        if (/^puppeteer\s*:/.test(l)) {
          skipping = true
          continue
        }
        if (skipping) {
          if (l.trim() === '') continue
          if (/^\s+\S/.test(l)) continue
          skipping = false
        }
        kept.push(l)
      }
      const body = lines.slice(closeIdx + 1)
      if (!kept.some((l) => l.trim())) return body.join('\n')
      return ['---', ...kept, '---', ...body].join('\n')
    }
  }

  // Not frontmatter — drop the leading rule and the blank lines after it.
  let i = 1
  while (i < lines.length && lines[i].trim() === '') i++
  return lines.slice(i).join('\n')
}

/* ------------------------------------------------------------------ */
/* copy tree                                                           */
/* ------------------------------------------------------------------ */

function copyDir(src, dest, srcRelPrefix) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    let d = path.join(dest, entry.name)
    const rel = `${srcRelPrefix}/${entry.name}`

    if (entry.isDirectory()) {
      copyDir(s, d, rel)
      continue
    }

    if (Object.prototype.hasOwnProperty.call(IMAGE_RENAMES, rel)) {
      const newName = IMAGE_RENAMES[rel]
      if (newName === null) continue // deliberately excluded
      d = path.join(dest, newName)
      fs.copyFileSync(s, d)
      continue
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      const mapped = slugMap.files[rel]
      if (!mapped) {
        fatal.push(`no slug for md: ${rel}`)
        continue
      }
      let content = fs.readFileSync(s, 'utf8')
      const newRelToDocs = mapped // e.g. y3-fall/os/ch1-introduction.md

      content = stripToc(content)
      content = fixBrokenExternalLinks(content, newRelToDocs)
      content = rewriteMdLinks(content, rel, newRelToDocs)
      content = fixImagePrefixes(content)
      content = rewriteRenamedImages(content, srcRelPrefix)
      content = defuseVueBraces(content)
      content = guardBareFootnoteBodies(content)
      content = fixDefinitionListMath(content)
      content = normalizeLeadingRule(content)

      const destFile = path.join(OUT, mapped)
      fs.mkdirSync(path.dirname(destFile), { recursive: true })
      fs.writeFileSync(destFile, content)
      continue
    }

    fs.copyFileSync(s, d)
  }
}

/* ------------------------------------------------------------------ */
/* run                                                                 */
/* ------------------------------------------------------------------ */

fs.mkdirSync(OUT, { recursive: true })

for (const c of courses) {
  const target = slugMap.courses[c.src]
  if (!target) {
    fatal.push(`course not mapped: ${c.src}`)
    continue
  }
  copyDir(path.join(ROOT, c.src), path.join(OUT, target), c.src)
}

/* apply text scrubs */
let scrubTotal = 0
let scrubApplied = 0
for (const [file, spec] of Object.entries(TEXT_FIXES)) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    fatal.push(`scrub target missing: ${file}`)
    continue
  }
  const raw = fs.readFileSync(abs, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  let lines = raw.split(/\r?\n/)
  let changed = 0

  for (const [find, replace] of spec.replace || []) {
    scrubTotal++
    const joined = lines.join('\n')
    if (joined.includes(find)) {
      lines = joined.split(find).join(replace).split('\n')
      changed++
      scrubApplied++
    } else {
      warnings.push(`scrub pattern not found in ${file}: ${JSON.stringify(find.slice(0, 40))}`)
    }
  }

  for (const re of spec.dropLines || []) {
    scrubTotal++
    const before = lines.length
    const kept = []
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        // Also swallow one following blank line so we don't leave a gap.
        if (lines[i + 1] !== undefined && lines[i + 1].trim() === '') i++
        continue
      }
      kept.push(lines[i])
    }
    if (kept.length !== before) {
      lines = kept
      changed++
      scrubApplied++
    } else {
      warnings.push(`drop pattern matched nothing in ${file}: ${re}`)
    }
  }

  if (changed) fs.writeFileSync(abs, lines.join(eol))
  console.log(`scrubbed ${changed}  ${file}`)
}

/* report */
const mdCount = (function count(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += count(path.join(dir, e.name))
    else if (e.name.endsWith('.md')) n++
  }
  return n
})(OUT)

console.log(`\nmigrated md files: ${mdCount} (expected ${Object.keys(slugMap.files).length})`)
console.log(`warnings: ${warnings.length}`)
warnings.slice(0, 25).forEach((w) => console.log('  ! ' + w))
if (warnings.length > 25) console.log(`  ... and ${warnings.length - 25} more`)

if (fatal.length) {
  console.error(`\nFATAL (${fatal.length}):`)
  fatal.forEach((f) => console.error('  x ' + f))
  process.exit(1)
}
