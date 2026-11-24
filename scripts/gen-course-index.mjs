/**
 * Creates a landing page for every course directory.
 *
 * Without these, clicking a course on /courses led to a 404: the cards linked
 * to `/notes/<semester>/<course>/`, and no `index.md` existed at that path.
 *
 * Each generated page is four lines of Markdown that mount <CourseIndex>,
 * which renders the header, the chapter list and prev/next links from
 * docs/course-toc.json. Keeping the page itself tiny means the whole listing
 * is produced in one place (the component) and still server-renders.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const DOCS = path.join(ROOT, 'docs')
const NOTES = path.join(DOCS, 'notes')
const TOC_FILE = path.join(DOCS, 'course-toc.json')

const { semesters, courses } = JSON.parse(
  fs.readFileSync(path.join(DOCS, 'course-data.json'), 'utf8')
)
const semBySlug = Object.fromEntries(semesters.map((s) => [s.slug, s]))

/** Mirror gen-sidebar's humanizing so the sidebar and page agree. */
function humanize(s) {
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => {
      if (
        /^(ipv4|ipv6|ip|qos|icmp|dhcpv4|dhcpv6|slaac|ospfv2|uml|sql|cnn|rnn|svm|pca|lda|knn|ir|lm|fa|dl|os|ai)$/i.test(
          w
        )
      ) {
        return w.toUpperCase()
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function prettify(fileSlug) {
  const base = fileSlug.replace(/\.md$/, '')
  let m = base.match(/^ch(\d+)[-_]?(.*)$/i)
  if (m) return `Ch${m[1]}${m[2] ? ' ' + humanize(m[2]) : ''}`
  m = base.match(/^(\d+)[-_](\d+)[-_]?(.*)$/)
  if (m) return `${m[1]}.${m[2]}${m[3] ? ' ' + humanize(m[3]) : ''}`
  m = base.match(/^(\d+)[-_](.*)$/)
  if (m) return `${m[1]}. ${humanize(m[2])}`
  return humanize(base)
}

function listMd(dir, prefix = '') {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...listMd(path.join(dir, e.name), rel))
    else if (e.name.endsWith('.md') && e.name !== 'index.md') out.push(rel)
  }
  return out
}

function naturalSort(a, b) {
  const na = a.match(/\d+/g)
  const nb = b.match(/\d+/g)
  if (na && nb) {
    for (let i = 0; i < Math.min(na.length, nb.length); i++) {
      const d = Number(na[i]) - Number(nb[i])
      if (d) return d
    }
  }
  return a.localeCompare(b, 'en')
}

/** Rough reading time: ~350 CJK characters or ~200 words per minute. */
function readingMinutes(dir, files) {
  let cjk = 0
  let words = 0
  for (const f of files) {
    let text = ''
    try {
      text = fs.readFileSync(path.join(dir, f), 'utf8')
    } catch {
      continue
    }
    cjk += (text.match(/[\u4e00-\u9fff]/g) || []).length
    words += (text.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length
  }
  return Math.max(1, Math.round(cjk / 350 + words / 200))
}

const toc = {}
let written = 0

// Walk the courses in catalogue order so each page can offer prev/next.
const ordered = courses.filter((c) =>
  fs.existsSync(path.join(NOTES, c.semester, c.slug))
)

for (const course of courses) {
  const sem = semBySlug[course.semester]
  if (!sem) continue

  const dir = path.join(NOTES, course.semester, course.slug)
  if (!fs.existsSync(dir)) continue

  const files = listMd(dir).sort(naturalSort)
  if (!files.length) continue

  // Chapters at the course root, plus one group per nested folder.
  //
  // Grouping by contiguous runs of the same folder does not work here: the
  // alphabetical sort interleaves `1-Introduction` with `cisco/CCNA1/...`, so
  // the same heading would repeat a dozen times.
  const top = []
  const folderMap = new Map()

  for (const f of files) {
    const base = f.replace(/\.md$/, '')
    if (!f.includes('/')) {
      top.push({ text: prettify(f), href: `./${base}` })
      continue
    }
    const parts = base.split('/')
    const leaf = parts.pop()
    const key = parts.join('/')
    if (!folderMap.has(key)) folderMap.set(key, [])
    folderMap.get(key).push({ text: prettify(leaf), href: `./${base}` })
  }

  const folderLabel = (key) =>
    key
      .split('/')
      .map((seg) => {
        const h = humanize(seg)
        return h.replace(/^Ccna(\d)$/i, 'CCNA$1')
      })
      .join(' · ')

  const groups = [...folderMap.entries()]
    .sort((a, b) => naturalSort(a[0], b[0]))
    .map(([key, items]) => ({
      name: folderLabel(key),
      items: items.sort((x, y) => naturalSort(x.href, y.href)),
    }))

  const chapters = top

  const pos = ordered.findIndex((c) => c.slug === course.slug)
  const prevC = pos > 0 ? ordered[pos - 1] : null
  const nextC = pos >= 0 && pos < ordered.length - 1 ? ordered[pos + 1] : null
  const brief = (c) =>
    c ? { dir: `${c.semester}/${c.slug}`, titleZh: c.titleZh } : null

  toc[course.slug] = {
    titleZh: course.titleZh,
    titleEn: course.titleEn,
    accent: course.accent,
    // Full path segment: links must include the semester or the route 404s.
    dir: `${course.semester}/${course.slug}`,
    semesterZh: sem.labelZh,
    semesterEn: sem.labelEn,
    minutes: readingMinutes(dir, files),
    chapters,
    groups,
    firstChapter:
      (chapters[0] || groups[0]?.items[0])?.href.replace(/^\.\//, '') ?? null,
    prev: brief(prevC),
    next: brief(nextC),
  }

  const page = `---
title: ${course.titleZh}
sidebar: true
aside: false
outline: false
description: ${course.titleZh} ${course.titleEn} 课程笔记
editLink: false
lastUpdated: false
---

<CourseIndex slug="${course.slug}" />
`

  fs.writeFileSync(path.join(dir, 'index.md'), page, 'utf8')
  written++
}

fs.writeFileSync(TOC_FILE, JSON.stringify(toc, null, 2) + '\n', 'utf8')

console.log(`course index pages: ${written} (${Object.keys(toc).length} in toc)`)
