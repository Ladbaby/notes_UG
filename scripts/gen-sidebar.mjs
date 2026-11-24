/**
 * Builds the VitePress sidebar from docs/course-data.json + the migrated file
 * tree, so the navigation can never drift from what actually exists.
 *
 * Exported as a function so config.mts can call it at load time.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const NOTES = path.join(ROOT, 'docs', 'notes')

/** Turn "2-4-ensemble-learning" into "2.4 Ensemble Learning". */
function prettify(fileSlug) {
  const base = fileSlug.replace(/\.md$/, '')
  let m = base.match(/^ch(\d+)[-_]?(.*)$/i)
  if (m) {
    const rest = m[2] ? ' ' + humanize(m[2]) : ''
    return `Ch${m[1]}${rest}`
  }
  m = base.match(/^(\d+)[-_](\d+)[-_]?(.*)$/)
  if (m) {
    const rest = m[3] ? ' ' + humanize(m[3]) : ''
    return `${m[1]}.${m[2]}${rest}`
  }
  m = base.match(/^(\d+)[-_](.*)$/)
  if (m) {
    const rest = m[2]
    const num = m[1]
    // "2-ipv6" -> "2. IPv6", but keep "10-basic-router-configuration" clean too
    return `${num}. ${humanize(rest)}`
  }
  return humanize(base)
}

function humanize(s) {
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => {
      if (/^(ipv4|ipv6|ip|qos|icmp|dhcpv4|dhcpv6|slaac|ospfv2|uml|sql|cnn|rnn|svm|pca|lda|knn|ir|lm|fa|dl|os|ai|qos)$/i.test(w)) {
        return w.toUpperCase()
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function listMd(dir, prefix = '') {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  )) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) {
      out.push(...listMd(path.join(dir, e.name), rel))
    } else if (e.name.endsWith('.md') && e.name !== 'index.md') {
      out.push(rel)
    }
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

export function buildSidebar() {
  const { semesters, courses } = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs', 'course-data.json'), 'utf8')
  )

  const sidebar = {}

  for (const sem of semesters) {
    const semCourses = courses.filter((c) => c.semester === sem.slug)
    if (!semCourses.length) continue

    const items = []
    for (const c of semCourses) {
      const courseDir = path.join(NOTES, sem.slug, c.slug)
      if (!fs.existsSync(courseDir)) continue

      const files = listMd(courseDir).sort(naturalSort)
      const linkOf = (rel) => `/notes/${sem.slug}/${c.slug}/${rel.replace(/\.md$/, '')}`

      // Top-level chapters; nested folders (cisco/ccna1) become groups.
      const topFiles = files.filter((f) => !f.includes('/'))
      const subDirs = [
        ...new Set(files.filter((f) => f.includes('/')).map((f) => f.split('/')[0])),
      ]

      const chapterItems = topFiles.map((f) => ({
        text: prettify(f),
        link: linkOf(f),
      }))

      const groups = subDirs.map((sd) => ({
        text: humanize(sd),
        collapsed: true,
        items: files
          .filter((f) => f.startsWith(sd + '/'))
          .map((f) => ({
            text: prettify(f.slice(sd.length + 1)),
            link: linkOf(f),
          })),
      }))

      if (!chapterItems.length && !groups.length) continue

      items.push({
        text: `${c.titleZh} · ${c.titleEn}`,
        collapsed: true,
        items: [...chapterItems, ...groups],
      })
    }

    if (!items.length) continue

    sidebar[`/notes/${sem.slug}/`] = [
      {
        text: `${sem.labelZh} · ${sem.labelEn}`,
        items,
      },
    ]
  }

  return sidebar
}
