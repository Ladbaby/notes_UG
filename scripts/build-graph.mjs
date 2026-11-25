/**
 * Builds the knowledge-graph dataset for /graph.
 *
 * Model
 * -----
 * The graph is bipartite-ish but flattened for rendering:
 *
 *   note  ──shared term──  note
 *
 * Two notes get an edge when they both discuss a term from TERMS. A naive
 * "pair every note sharing a term" approach explodes: `index` alone appears in
 * 42 notes, which is 861 edges from one term. So each note is instead linked to
 * at most MAX_PER_TERM notes that share its *rarest* term — rare terms are the
 * informative ones, and this keeps the graph readable.
 *
 * Output: docs/graph-data.json  (nodes, links, legend)
 *
 * Run: node scripts/build-graph.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const DOCS = 'docs'
const NOTES = path.join(DOCS, 'notes')
const OUT = path.join(DOCS, 'graph-data.json')

/**
 * Terms worth linking on. Lowercased, matched as whole words where the term is
 * short enough to be ambiguous (`index`, `hash`), plain substring otherwise.
 *
 * Grouped only for readability — the graph itself is term-agnostic.
 */
const TERMS = {
  systems: [
    'cache', 'cache miss', 'virtual memory', 'page table', 'paging',
    'interrupt', 'DMA', 'pipeline', 'instruction set', 'register',
    'context switch', 'scheduling', 'deadlock', 'semaphore', 'mutex',
    'file system', 'inode', 'system call', 'memory management',
  ],
  networks: [
    'TCP', 'UDP', 'IP', 'routing', 'subnet', 'congestion control',
    '三次握手', '滑动窗口', 'OSPF', 'BGP', 'Ethernet', 'ARP',
    'DNS', 'HTTP', 'socket',
  ],
  data: [
    'B+ tree', 'B-tree', 'hash table', 'index', 'transaction', 'ACID',
    'normalization', 'SQL', 'join', 'primary key', 'foreign key',
  ],
  algorithms: [
    'dynamic programming', 'greedy', 'divide and conquer', 'backtracking',
    'sorting', 'binary search', 'heap', 'graph traversal', 'DFS', 'BFS',
    '时间复杂度', 'NP', 'shortest path', 'minimum spanning tree',
  ],
  ai: [
    'gradient descent', 'backpropagation', 'neural network', 'overfitting',
    'regularization', 'SVM', 'PCA', 'k-means', 'entropy', 'loss function',
    '卷积', '池化', 'attention', 'transformer', 'Bayes', 'likelihood',
    'viterbi', 'hidden markov',
  ],
  theory: [
    'DFA', 'NFA', 'regular expression', 'context-free grammar', 'parsing',
    'lexical analysis', 'LL', 'LR', 'Turing', 'decidable',
  ],
  signals: [
    'Fourier', 'convolution', 'sampling', 'filter', 'frequency domain',
    '离散傅里叶', 'histogram', 'edge detection',
  ],
  math: [
    'eigenvalue', 'eigenvector', 'matrix', 'determinant', 'rank',
    'probability', 'variance', 'expectation', 'convex',
  ],
  // Hardware / physics notes are largely formulas and VHDL, so without these
  // the whole first half of the degree sits isolated from everything else.
  hardware: [
    'logic', 'boolean', 'boolean algebra', 'truth table', 'flip-flop',
    'state machine', 'combinational', 'sequential circuit', 'VHDL',
    'signal', 'voltage', 'magnetic',
  ],
}

/** Terms short/ambiguous enough that substring matching produces false hits. */
const WHOLE_WORD = new Set(['ip', 'll', 'lr', 'np', 'dfs', 'bfs', 'sql', 'join', 'index', 'hash', 'heap', 'filter', 'pca', 'svm', 'tcp', 'udp', 'arp', 'dns', 'http', 'bgp', 'ospf', 'acid', 'dma', 'turing', 'll', 'register'])

const MAX_PER_TERM = 4 // how many neighbours a note may gain from one term

function walkNotes(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'image') continue
      walkNotes(p, out)
    } else if (e.name.endsWith('.md')) {
      out.push(p)
    }
  }
  return out
}

/** First meaningful H1/H2 or the filename, trimmed for display. */
function titleOf(src, relSlug) {
  const lines = src.split('\n')
  for (const line of lines) {
    const m = /^#{1,2}\s+(.+?)\s*$/.exec(line)
    if (m) return m[1].replace(/[`*_[\]()]/g, '').trim().slice(0, 60)
  }
  return relSlug
}

function matches(text, term) {
  const t = term.toLowerCase()
  if (WHOLE_WORD.has(t)) {
    // Word-ish boundary that tolerates CJK neighbours.
    const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i')
    return re.test(text)
  }
  // Plain substring is more forgiving for Chinese terms and multi-word phrases.
  return text.includes(t)
}

const courseData = JSON.parse(fs.readFileSync(path.join(DOCS, 'course-data.json'), 'utf8'))
const courseByDir = new Map()
for (const c of courseData.courses) courseByDir.set(`${c.semester}/${c.slug}`, c)

const allTerms = Object.values(TERMS).flat()
const files = walkNotes(NOTES).sort()

/** @type {{id:string,title:string,course:string,semester:string,accent:string,url:string,terms:string[]}[]} */
const noteNodes = []
const termFreq = new Map()
const termToNotes = new Map()

for (const file of files) {
  const rel = path.relative(NOTES, file).split(path.sep).join('/')
  const [semester, course] = rel.split('/')
  const slug = rel.replace(/\.md$/, '')
  const src = fs.readFileSync(file, 'utf8')
  const lower = src.toLowerCase()

  // Course landing pages are navigation, not content — skip them.
  if (slug.endsWith('/index')) continue

  const hit = allTerms.filter((term) => matches(lower, term))
  const meta = courseByDir.get(`${semester}/${course}`)

  noteNodes.push({
    id: `n:${slug}`,
    type: 'note',
    title: titleOf(src, slug.split('/').pop()),
    courseId: `c:${semester}/${course}`,
    course: meta?.titleZh ?? course,
    semester,
    tint: meta?.accent ?? '#7f8cb4',
    url: `notes/${slug}`,
    terms: hit,
  })

  for (const term of hit) {
    termFreq.set(term, (termFreq.get(term) ?? 0) + 1)
    if (!termToNotes.has(term)) termToNotes.set(term, [])
    termToNotes.get(term).push(`n:${slug}`)
  }
}

// --- course hubs -----------------------------------------------------------
// One node per course, so every note has somewhere to attach and the layout
// naturally forms a cluster per course.
const courseMeta = new Map()
for (const n of noteNodes) {
  if (!courseMeta.has(n.courseId)) {
    courseMeta.set(n.courseId, {
      id: n.courseId,
      type: 'course',
      title: n.course,
      semester: n.semester,
      tint: n.tint,
      count: 0,
      terms: [],
    })
  }
  courseMeta.get(n.courseId).count++
}
const courseNodes = [...courseMeta.values()]

// --- links -----------------------------------------------------------------
const links = []
const seen = new Set()

// Every note hangs off its course hub. This is what guarantees that a note with
// no shared terms is still visible, and what makes courses read as clusters.
for (const n of noteNodes) {
  links.push({ source: n.courseId, target: n.id, kind: 'course' })
}

for (const node of noteNodes) {
  // Rarest first: a term shared by 3 notes says more than one shared by 42.
  const ranked = [...node.terms].sort((a, b) => termFreq.get(a) - termFreq.get(b))
  const perTerm = new Map()

  for (const term of ranked) {
    if (termFreq.get(term) > 12) continue
    for (const other of termToNotes.get(term) ?? []) {
      if (other === node.id) continue
      const used = perTerm.get(term) ?? 0
      if (used >= MAX_PER_TERM) break

      const key = node.id < other ? `${node.id}|${other}` : `${other}|${node.id}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: node.id, target: other, kind: 'term', term })
      perTerm.set(term, used + 1)
    }
  }
}

// --- degree & legend -------------------------------------------------------
const degree = new Map()
for (const l of links) {
  degree.set(l.source, (degree.get(l.source) ?? 0) + 1)
  degree.set(l.target, (degree.get(l.target) ?? 0) + 1)
}

// Legend comes from the LINKS, not raw term frequency: a term can appear in 38
// notes yet produce zero edges, and such a chip would filter to nothing.
const legendCounts = new Map()
for (const l of links) {
  if (l.kind !== 'term') continue
  legendCounts.set(l.term, (legendCounts.get(l.term) ?? 0) + 1)
}
const legend = [...legendCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 14)
  .map(([term, count]) => ({ term, count }))

// A course node advertises its most characteristic terms.
for (const c of courseNodes) {
  const counts = new Map()
  for (const n of noteNodes) {
    if (n.courseId !== c.id) continue
    for (const t of n.terms) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  c.terms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t)
}

const nodes = [...courseNodes, ...noteNodes].map((n) => ({
  ...n,
  degree: degree.get(n.id) ?? 0,
}))

fs.writeFileSync(
  OUT,
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), nodes, links, legend }) + String.fromCharCode(10)
)

const noteDeg = noteNodes.map((n) => degree.get(n.id) ?? 0)
const onlyCourse = noteDeg.filter((d) => d <= 1).length
console.log(`graph-data.json: ${courseNodes.length} courses + ${noteNodes.length} notes, ${links.length} links`)
console.log(`  term links: ${links.filter((l) => l.kind === 'term').length}`)
console.log(`  notes with only their course link: ${onlyCourse}`)
console.log(`  legend: ${legend.map((l) => `${l.term}(${l.count})`).slice(0, 6).join(', ')}`)
console.log(`  size: ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`)
