<script setup>
/**
 * Obsidian-style knowledge graph.
 *
 * Behaviour, in the order it was asked for:
 *  - Every node is always drawn. Notes that share no terms still hang off their
 *    course hub, so nothing is ever invisible.
 *  - NO text at rest. Labels appear only for the hovered node and its
 *    neighbours.
 *  - Hover highlights the node, its edges and its neighbourhood, and dims the
 *    rest.
 *  - A short intro animation on mount only. After that the graph is static:
 *    zero frames per second while idle (the user is GPU-sensitive).
 *  - Course nodes are hubs, so clusters form around them.
 */
import { onMounted, onBeforeUnmount, ref, computed, shallowRef } from 'vue'
import graphData from '../../../graph-data.json'

const box = ref(null)
const canvas = ref(null)
const hovered = ref(null)
const selectedTerm = ref(null)
const activeCourses = ref(new Set())
const zoomPct = ref('100%')
const settled = ref(false)

const nodes = shallowRef([])
const links = shallowRef([])
const courses = ref([])
const legend = ref(graphData.legend)
const stats = ref({ notes: 0, links: 0 })

let ctx = null
let w = 0
let h = 0
let dpr = 1
let raf = 0
let needsDraw = false
let ro = null
let themeObs = null
let laidOut = false

/** Intro animation. Runs exactly once, on mount. */
const intro = { start: 0, running: false, done: false }
const INTRO_MS = 1500

/**
 * Precomputed intro start positions.
 *
 * The effect is a particle implosion then explosion: nodes start bunched near
 * the centre and travel out to their settled spots. fromX/fromY are computed
 * once so the per-frame cost is a single lerp per node.
 */
function prepareIntro() {
  const cx = w / 2
  const cy = h / 2
  for (const n of nodes.value) {
    const dx = n.x - cx
    const dy = n.y - cy
    const d = Math.hypot(dx, dy) || 1
    // 0.94 means nodes start at 6% of their distance from the centre: a tight
    // knot that visibly bursts outward.
    const pull = 0.94
    const jitter = 9
    n.fromX = cx + dx * (1 - pull) + (Math.random() - 0.5) * jitter
    n.fromY = cy + dy * (1 - pull) + (Math.random() - 0.5) * jitter
    n.travel = Math.min(1, d / Math.max(1, Math.hypot(cx, cy)))
  }
}

/** Eased, staggered position of a node during the intro. */
function introPos(n, p) {
  if (p >= 1) return [n.x, n.y]
  const delay = 0.42 * (n.travel ?? 0.5)
  const local = Math.max(0, Math.min(1, (p - delay) / (1 - delay)))
  const e = 1 - Math.pow(1 - local, 5)
  return [n.fromX + (n.x - n.fromX) * e, n.fromY + (n.y - n.fromY) * e]
}

const view = { x: 0, y: 0, k: 1 }
/** Cached hub sprites, keyed by tint+state. Rebuilding gradients for 21 hubs on
 *  every frame was a large part of the zoom cost. */
const hubSprites = new Map()

/**
 * Discrete alpha levels for the batched edge strokes.
 *
 * Dark mode needs a far higher floor: the panel behind it is near-black, so a
 * 0.18-alpha hairline composites to roughly the same value as the background.
 */
const EDGE_LEVELS = 5
const EDGE_ALPHA_DARK = [0.16, 0.26, 0.36, 0.46, 0.58]
const EDGE_ALPHA_LIGHT = [0.06, 0.11, 0.17, 0.23, 0.3]

/** Quantise a continuous alpha to a level index. */
function edgeLevel(a) {
  const start = theme.dark ? 0.16 : 0.06
  const step = theme.dark ? 0.105 : 0.06
  return Math.min(EDGE_LEVELS - 1, Math.max(0, Math.round((a - start) / step)))
}
const pointer = { down: false, moved: false, movedAt: 0 }
const drag = { x: 0, y: 0, vx: 0, vy: 0 }

const theme = {
  dark: true,
  label: 'rgba(232,238,255,0.95)',
  labelHot: '#ffffff',
  plate: 'rgba(8,12,26,0.74)',
  edgeTerm: '150,180,255',
  edgeCourse: '122,150,214',
  ring: 'rgba(255,255,255,0.42)',
}

function readTheme() {
  const dark = document.documentElement.classList.contains('dark')
  theme.dark = dark
  theme.label = dark ? 'rgba(232,238,255,0.95)' : 'rgba(22,30,58,0.92)'
  theme.labelHot = dark ? '#ffffff' : '#0b1020'
  theme.plate = dark ? 'rgba(8,12,26,0.74)' : 'rgba(255,255,255,0.84)'
  theme.edgeTerm = dark ? '142,174,255' : '52,84,176'
  theme.edgeCourse = dark ? '118,148,216' : '96,120,176'
  theme.ring = dark ? 'rgba(255,255,255,0.42)' : 'rgba(20,28,60,0.42)'
  // Glow/alpha multipliers. On white, everything needs to be stronger to read.
  theme.glow = dark ? 1 : 1.55
  theme.halo = dark ? 1 : 1.5
  theme.nodeAlpha = dark ? 1 : 1
}

const isCourse = (n) => n.type === 'course'

function radiusOf(n) {
  if (isCourse(n)) return Math.min(17, 6.5 + Math.sqrt(n.count) * 1.25)
  return 2.2 + Math.sqrt(Math.max(0, n.degree - 1)) * 1.0
}

// --- data ------------------------------------------------------------------
function prepare() {
  const degree = new Map()
  for (const l of graphData.links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1)
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1)
  }

  nodes.value = graphData.nodes.map((n) => ({
    ...n,
    degree: degree.get(n.id) ?? 0,
    courseId: n.type === 'course' ? n.id : n.courseId,
    // 0 = far, 1 = near. Drives glow strength only.
    depth: n.type === 'course' ? 1 : 0.35 + Math.min(0.5, (degree.get(n.id) ?? 0) / 26),
  }))
  links.value = graphData.links
  courses.value = graphData.nodes
    .filter((n) => n.type === 'course')
    .map((n) => ({ id: n.id, title: n.title, count: n.count }))

  stats.value = {
    notes: graphData.nodes.filter((n) => n.type === 'note').length,
    links: graphData.links.length,
  }
}

// --- layout ----------------------------------------------------------------
/**
 * Cluster layout: 21 course hubs spaced evenly around an ellipse, each note
 * confined to a disc around its own hub.
 *
 * A free force simulation was tried first and it failed for a specific reason:
 * the 733 term edges outnumber the 189 course edges by 4:1, so cross-course
 * attraction beat course membership and all 189 notes collapsed into one
 * undifferentiated middle mass. Confining notes to a per-cluster radius makes
 * the clusters unconditional, and term edges still get drawn as bridges
 * between them, which is the interesting part anyway.
 */
function layout() {
  const ns = nodes.value
  const byId = new Map(ns.map((n) => [n.id, n]))

  const courseList = ns.filter(isCourse)
  const buckets = new Map()
  for (const n of ns) {
    if (isCourse(n)) continue
    if (!buckets.has(n.courseId)) buckets.set(n.courseId, [])
    buckets.get(n.courseId).push(n)
  }

  // --- 1. size each cluster ------------------------------------------------
  // Radius from the note count, so a 20-note course visibly outweighs a 3-note
  // one. 7.6px per sqrt(note) keeps the 189 notes at a comfortable dot density.
  for (const c of courseList) {
    const count = (buckets.get(c.id) ?? []).length
    c.discR = 26 + 7.6 * Math.sqrt(Math.max(1, count))
  }

  // --- 2. pack the hubs ----------------------------------------------------
  // Sunflower seeding then pairwise separation. A plain ring was tried and left
  // the middle of the canvas empty; packing fills the area and looks organic,
  // which is what Obsidian's graph view does.
  const cx = w / 2
  const cy = h / 2
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))
  const pad = 12

  // Order by semester then title so neighbouring bubbles tend to be from the
  // same part of the degree.
  const ordered = [...courseList].sort(
    (m, n) => m.semester.localeCompare(n.semester) || m.title.localeCompare(n.title)
  )

  const availW = Math.max(120, w - pad * 2)
  const availH = Math.max(120, h - pad * 2)
  ordered.forEach((c, i) => {
    const t = Math.sqrt((i + 0.5) / ordered.length)
    const ang = i * GOLDEN
    c.x = cx + Math.cos(ang) * t * availW * 0.46
    c.y = cy + Math.sin(ang) * t * availH * 0.46
    c.vx = 0
    c.vy = 0
    c.pinned = true
  })

  const GAP = 16
  for (let step = 0; step < 420; step++) {
    const decay = Math.max(0.1, 1 - step / 420)
    for (let i = 0; i < ordered.length; i++) {
      const A = ordered[i]
      for (let j = i + 1; j < ordered.length; j++) {
        const B = ordered[j]
        let dx = B.x - A.x
        let dy = B.y - A.y
        let d = Math.hypot(dx, dy)
        const min = A.discR + B.discR + GAP
        if (d >= min) continue
        if (d < 0.01) {
          dx = Math.random() - 0.5
          dy = Math.random() - 0.5
          d = Math.hypot(dx, dy) || 1
        }
        const push = ((min - d) / d) * 0.5 * decay
        A.x -= dx * push
        A.y -= dy * push
        B.x += dx * push
        B.y += dy * push
      }
    }
    // Keep the whole packing inside the canvas.
    for (const c of ordered) {
      const r = c.discR
      c.x = Math.min(w - r - 4, Math.max(r + 4, c.x))
      c.y = Math.min(h - r - 4, Math.max(r + 4, c.y))
    }
  }

  // --- 3. place notes inside each disc ------------------------------------
  for (const c of ordered) {
    const list = buckets.get(c.id) ?? []
    const R = Math.max(10, c.discR - 6)
    list.forEach((n, i) => {
      const jr = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.16 + 0.92
      const ja = ((Math.sin(i * 78.233) * 12345.6789) % 1) * 0.5
      const r = R * Math.sqrt((i + 0.5) / Math.max(1, list.length)) * jr
      const ang = i * GOLDEN + ja
      n.x = c.x + Math.cos(ang) * r
      n.y = c.y + Math.sin(ang) * r
      n.vx = 0
      n.vy = 0
      n.pinned = false
    })

    // Local relaxation so the dots do not stack, then a hard clamp back into
    // the disc. Only same-cluster pairs interact, so this cannot drift.
    for (let step = 0; step < 160; step++) {
      const alpha = Math.max(0.1, 1 - step / 160)
      for (let i = 0; i < list.length; i++) {
        const m = list[i]
        for (let j = i + 1; j < list.length; j++) {
          const n = list[j]
          let dx = n.x - m.x
          let dy = n.y - m.y
          let d2 = dx * dx + dy * dy
          if (d2 < 0.0001) {
            dx = (Math.random() - 0.5) * 2
            dy = (Math.random() - 0.5) * 2
            d2 = dx * dx + dy * dy
          }
          const d = Math.sqrt(d2)
          const min = 13
          if (d >= min) continue
          const f = ((min - d) / d) * 0.5 * alpha
          m.x -= dx * f
          m.y -= dy * f
          n.x += dx * f
          n.y += dy * f
        }
      }
      for (const n of list) {
        const dx = n.x - c.x
        const dy = n.y - c.y
        const d = Math.hypot(dx, dy)
        if (d > R) {
          n.x = c.x + (dx / d) * R
          n.y = c.y + (dy / d) * R
        }
      }
    }
  }

  // --- 4. fit --------------------------------------------------------------
  // Uniform scale: per-axis scaling would squash the discs into ellipses.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of ns) {
    const r = isCourse(n) ? n.discR : 0
    if (n.x - r < minX) minX = n.x - r
    if (n.x + r > maxX) maxX = n.x + r
    if (n.y - r < minY) minY = n.y - r
    if (n.y + r > maxY) maxY = n.y + r
  }
  const gw = Math.max(1, maxX - minX)
  const gh = Math.max(1, maxY - minY)
  const fitPad = 26
  const sc = Math.min((w - fitPad * 2) / gw, (h - fitPad * 2) / gh)
  const offX = (w - gw * sc) / 2
  const offY = (h - gh * sc) / 2
  for (const n of ns) {
    n.x = offX + (n.x - minX) * sc
    n.y = offY + (n.y - minY) * sc
    if (isCourse(n)) n.discR *= sc
  }

  laidOut = true
}

// --- canvas ----------------------------------------------------------------
function resize() {
  const el = canvas.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return

  w = Math.round(r.width)
  h = Math.round(r.height)
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(w * dpr)
  el.height = Math.round(h * dpr)

  ctx = el.getContext('2d', { alpha: true })
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  rectCache = null
  rectScroll = { x: window.scrollX, y: window.scrollY }
  if (!laidOut) layout()
  requestDraw()
}

/**
 * Frame just the nodes that pass the current filters.
 *
 * Filtering to one course otherwise leaves its cluster at its original spot,
 * tiny, surrounded by empty canvas. Fitting keeps the filtered result readable
 * without the user having to zoom manually.
 */
function fitToVisible() {
  const activeC = activeCourses.value
  const term = selectedTerm.value
  if (activeC.size === 0 && !term) {
    view.x = 0
    view.y = 0
    view.k = 1
    zoomPct.value = '100%'
    requestDraw()
    return
  }

  const visible = new Set()
  for (const n of nodes.value) {
    if (activeC.size > 0 && !activeC.has(n.courseId)) continue
    visible.add(n.id)
  }
  if (term) {
    // A term filter keeps only the notes that actually carry that edge, plus
    // the course hubs they belong to.
    const keep = new Set()
    for (const l of links.value) {
      if (l.term === term) {
        keep.add(l.source)
        keep.add(l.target)
      }
    }
    for (const id of [...visible]) if (!keep.has(id)) visible.delete(id)
  }
  if (visible.size === 0) {
    requestDraw()
    return
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of nodes.value) {
    if (!visible.has(n.id)) continue
    const r = radiusOf(n) + 14
    if (n.x - r < minX) minX = n.x - r
    if (n.x + r > maxX) maxX = n.x + r
    if (n.y - r < minY) minY = n.y - r
    if (n.y + r > maxY) maxY = n.y + r
  }
  const gw = Math.max(1, maxX - minX)
  const gh = Math.max(1, maxY - minY)
  const pad = 20
  const k = Math.min(5.5, Math.min((w - pad * 2) / gw, (h - pad * 2) / gh))
  view.k = Math.max(0.4, k)
  view.x = w / 2 - ((minX + maxX) / 2) * view.k
  view.y = h / 2 - ((minY + maxY) / 2) * view.k
  zoomPct.value = Math.round(view.k * 100) + '%'
  requestDraw()
}

function requestDraw() {
  needsDraw = true
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    if (!needsDraw) return
    needsDraw = false
    draw()
  })
}

/** Hovered node + its direct neighbours, or null when nothing is hovered. */
function neighbourhood() {
  const cur = hovered.value
  if (!cur) return null
  const s = new Set([cur.id])
  for (const l of links.value) {
    if (l.source === cur.id) s.add(l.target)
    else if (l.target === cur.id) s.add(l.source)
  }
  return s
}

/**
 * Render the graph.
 *
 * Written for cheap redraws, because every zoom tick and pan frame goes through
 * here. The rules it follows:
 *  - node positions are resolved once into a flat Float64Array, never per edge
 *  - edges are accumulated into 8 paths (2 colours x 4 alpha buckets) and
 *    stroked 8 times, not 922
 *  - note dots are accumulated per tint+alpha bucket and filled ~40 times
 *  - course hubs come from cached offscreen sprites via drawImage
 */
function draw() {
  if (!ctx || !laidOut) return
  ctx.clearRect(0, 0, w, h)

  const ns = nodes.value
  const near = neighbourhood()
  const term = selectedTerm.value
  const activeC = activeCourses.value
  const k = view.k
  const ox = view.x
  const oy = view.y
  const hotId = hovered.value?.id ?? null
  const anyFilter = activeC.size > 0 || !!term

  // Intro progress 0 to 1; 1 once settled.
  const p = intro.done ? 1 : Math.min(1, (performance.now() - intro.start) / INTRO_MS)
  // Alpha reaches full almost immediately so the motion is what you see, not a
  // fade-in. Previously opacity only completed after the motion had stopped,
  // which made the whole intro read as a dim flicker.
  const fade = Math.min(1, p / 0.12)

  const passCourse = (n) => activeC.size === 0 || activeC.has(n.courseId)

  // ---- resolve positions once ------------------------------------------
  const N = ns.length
  const sx = new Float64Array(N)
  const sy = new Float64Array(N)
  const idx = new Map()

  for (let i = 0; i < N; i++) {
    const n = ns[i]
    idx.set(n.id, i)
    let gx = n.x
    let gy = n.y
    if (p < 1) {
      // Inlined introPos to avoid one array allocation per node per frame.
      const delay = 0.5 * (n.travel ?? 0.5)
      const local = p <= delay ? 0 : (p - delay) / (1 - delay)
      const e = 1 - Math.pow(1 - Math.min(1, local), 5)
      gx = n.fromX + (n.x - n.fromX) * e
      gy = n.fromY + (n.y - n.fromY) * e
    }
    sx[i] = gx * k + ox
    sy[i] = gy * k + oy
  }

  // ---- cluster halos ----------------------------------------------------
  // Faint tinted disc per course. Painted with a cached sprite too: at 21
  // gradients per frame this was the second-largest cost after the edges.
  for (let i = 0; i < N; i++) {
    const n = ns[i]
    if (!isCourse(n) || !passCourse(n)) continue
    const rad = (n.discR ?? 60) * k * 1.06
    if (rad < 10) continue
    const sp = haloSprite(n.tint, near && !near.has(n.id))
    // For halos the sprite is exactly its radius, so h doubles as the body.
    const scale = rad / sp.h
    ctx.drawImage(sp.c, sx[i] - rad, sy[i] - rad, sp.c.width * scale, sp.c.height * scale)
  }

  // ---- edges (batched) --------------------------------------------------
  // Key layout: colour (0 = course, 1 = term) * EDGE_LEVELS + alpha level.
  const buckets = []
  for (let i = 0; i < EDGE_LEVELS * 2; i++) buckets.push([])
  const hot = []

  for (let li = 0; li < links.value.length; li++) {
    const l = links.value[li]
    const ia = idx.get(l.source)
    const ib = idx.get(l.target)
    if (ia === undefined || ib === undefined) continue

    const a = ns[ia]
    const b = ns[ib]
    const outOfFilter = !passCourse(a) || !passCourse(b)
    if (outOfFilter && !anyFilter) continue

    const isHot = near ? near.has(l.source) && near.has(l.target) : false
    if (near && !isHot) continue

    const ax = sx[ia]
    const ay = sy[ia]
    const bx = sx[ib]
    const by = sy[ib]

    // Cheap reject for off-canvas links.
    if ((ax < -80 && bx < -80) || (ax > w + 80 && bx > w + 80)) continue
    if ((ay < -80 && by < -80) || (ay > h + 80 && by > h + 80)) continue

    // Base alpha by kind. Dark needs a much higher floor than light because the
    // background there is near-black.
    const base = theme.dark
      ? l.kind === 'course' ? 0.34 : 0.29
      : l.kind === 'course' ? 0.2 : 0.17
    let alpha = base

    if (outOfFilter) alpha = theme.dark ? 0.07 : 0.05
    else if (term && l.term !== term) alpha = theme.dark ? 0.08 : 0.06
    else if (!isHot) {
      // Distance falloff. Kept mild: it should organise the hairball, not erase
      // the long links. Previously 0.45 with a 0.035 floor made them invisible.
      const span = Math.hypot(a.x - b.x, a.y - b.y)
      const far = Math.min(1, span / Math.max(140, w * 0.5))
      alpha *= 1 - 0.3 * far * far
    }

    const mdx = bx - ax
    const mdy = by - ay
    const mlen = Math.hypot(mdx, mdy) || 1
    const bow = Math.min(14, mlen * 0.055)
    const midX = (ax + bx) / 2 + (-mdy / mlen) * bow
    const midY = (ay + by) / 2 + (mdx / mlen) * bow

    if (isHot) {
      hot.push(ax, ay, midX, midY, bx, by)
      continue
    }

    // Quantise to discrete levels so edges batch into a handful of strokes.
    const level = edgeLevel(alpha)
    const key = (l.kind === 'course' ? 0 : EDGE_LEVELS) + level
    const arr = buckets[key]
    arr.push(ax, ay, midX, midY, bx, by)
  }

  const levels = theme.dark ? EDGE_ALPHA_DARK : EDGE_ALPHA_LIGHT
  for (let bi = 0; bi < EDGE_LEVELS * 2; bi++) {
    const arr = buckets[bi]
    if (arr.length === 0) continue
    const course = bi < EDGE_LEVELS
    const a = levels[course ? bi : bi - EDGE_LEVELS]
    ctx.strokeStyle = 'rgba(' + (course ? theme.edgeCourse : theme.edgeTerm) + ',' + a * fade + ')'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let q = 0; q < arr.length; q += 6) {
      ctx.moveTo(arr[q], arr[q + 1])
      ctx.quadraticCurveTo(arr[q + 2], arr[q + 3], arr[q + 4], arr[q + 5])
    }
    ctx.stroke()
  }

  // Highlighted edges: wide soft pass plus a thin bright pass.
  if (hot.length) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle =
        pass === 0
          ? 'rgba(' + theme.edgeTerm + ',0.16)'
          : 'rgba(' + theme.edgeTerm + ',0.95)'
      ctx.lineWidth = pass === 0 ? 4.5 : 1.35
      ctx.beginPath()
      for (let q = 0; q < hot.length; q += 6) {
        ctx.moveTo(hot[q], hot[q + 1])
        ctx.quadraticCurveTo(hot[q + 2], hot[q + 3], hot[q + 4], hot[q + 5])
      }
      ctx.stroke()
    }
  }

  // ---- course hubs (cached sprites) ------------------------------------
  const zoom = Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62)
  for (let i = 0; i < N; i++) {
    const n = ns[i]
    if (!isCourse(n)) continue
    if (!passCourse(n) && !anyFilter) continue
    const isHot = hotId === n.id
    const r = Math.max(3, radiusOf(n) * zoom * (isHot ? 1.18 : 1))
    const sp = hubSprite(n.tint, isHot)
    // sp.bodyR is the sprite's on-canvas body radius; the canvas itself extends
    // to the glow (3.6x). Scale so the body matches r.
    const scale = r / sp.bodyR
    const half = sp.h * scale
    ctx.globalAlpha = (!passCourse(n) ? 0.12 : near && !near.has(n.id) ? 0.3 : 1) * fade
    ctx.drawImage(sp.c, sx[i] - half, sy[i] - half, sp.c.width * scale, sp.c.height * scale)
  }
  ctx.globalAlpha = 1

  // ---- note dots (batched per tint + alpha bucket) ----------------------
  const dotBuckets = new Map()
  const hotDots = []
  for (let i = 0; i < N; i++) {
    const n = ns[i]
    if (isCourse(n)) continue
    const inFilter = passCourse(n)
    if (!inFilter && !anyFilter) continue
    const x = sx[i]
    const y = sy[i]
    if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue

    const isHot = hotId === n.id
    const r = Math.max(0.7, radiusOf(n) * zoom * (isHot ? 1.3 : 1))

    let alpha = 1
    if (!inFilter) alpha = 0.12
    else if (near && !near.has(n.id)) alpha = 0.14
    else if (term && !n.terms.includes(term)) alpha = 0.22
    alpha *= fade

    if (isHot) {
      hotDots.push(x, y, r)
      continue
    }

    const b = Math.min(2, Math.round(alpha * 2))
    const key = n.tint + '|' + b
    let arr = dotBuckets.get(key)
    if (!arr) {
      arr = []
      dotBuckets.set(key, arr)
    }
    arr.push(x, y, r)
  }

  const DOT_ALPHA = [0.5, 0.78, 1]
  for (const [key, arr] of dotBuckets) {
    const cut = key.indexOf('|')
    const tint = key.slice(0, cut)
    const a = DOT_ALPHA[Number(key.slice(cut + 1))]
    ctx.globalAlpha = a
    ctx.fillStyle = tint
    ctx.beginPath()
    for (let q = 0; q < arr.length; q += 3) {
      ctx.moveTo(arr[q] + arr[q + 2], arr[q + 1])
      ctx.arc(arr[q], arr[q + 1], arr[q + 2], 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Hovered note: glow behind, then the dot on top.
  for (let q = 0; q < hotDots.length; q += 3) {
    const x = hotDots[q]
    const y = hotDots[q + 1]
    const r = hotDots[q + 2]
    const g = ctx.createRadialGradient(x, y, r, x, y, r * 5)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---- labels ----
  if (near) drawLabels(near, idx, sx, sy, zoom, fade)

  if (!settled.value) settled.value = true
}

/**
 * Offscreen sprite for one course hub: halo + shaded body + rim.
 *
 * Rendered once at HUB_REF_R and scaled by the caller, so the number of cached
 * canvases is bounded by (tints x hot x theme) instead of by zoom level.
 */
const HUB_REF_R = 22

function hubSprite(tint, isHot) {
  const key = tint + '|hub|' + (isHot ? 1 : 0) + '|' + (theme.dark ? 1 : 0)
  const hit = hubSprites.get(key)
  if (hit) return hit

  const r = HUB_REF_R
  const h = Math.ceil(r * 3.6) + 3
  const size = h * 2
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const cx = h
  const cy = h

  const gs = theme.glow
  const glow = g.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 3.6)
  glow.addColorStop(0, hexA(tint, (isHot ? 0.5 : 0.3) * gs))
  glow.addColorStop(0.35, hexA(tint, (isHot ? 0.16 : 0.09) * gs))
  glow.addColorStop(1, hexA(tint, 0))
  g.fillStyle = glow
  g.beginPath()
  g.arc(cx, cy, r * 3.6, 0, Math.PI * 2)
  g.fill()

  const body = g.createRadialGradient(cx - r * 0.35, cy - r * 0.38, r * 0.15, cx, cy, r * 1.05)
  body.addColorStop(0, hexA('#ffffff', theme.dark ? 0.55 : 0.42))
  body.addColorStop(0.42, hexA(tint, 1))
  body.addColorStop(1, hexA(tint, 0.82))
  g.fillStyle = body
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()

  g.strokeStyle = isHot ? theme.labelHot : theme.ring
  g.lineWidth = isHot ? 1.6 : 1.1
  g.beginPath()
  g.arc(cx, cy, r + (isHot ? 4.5 : 2.5), 0, Math.PI * 2)
  g.stroke()

  const sprite = { c, h, bodyR: r }
  hubSprites.set(key, sprite)
  return sprite
}

/** Offscreen sprite for one cluster halo. Also fixed-size + scaled. */
const HALO_REF_R = 64

function haloSprite(tint, dim) {
  const key = tint + '|halo|' + (dim ? 1 : 0) + '|' + (theme.dark ? 1 : 0)
  const hit = hubSprites.get(key)
  if (hit) return hit

  const rad = HALO_REF_R
  const size = rad * 2
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  const strength = (dim ? 0.05 : 0.1) * theme.halo
  const grd = g.createRadialGradient(rad, rad, rad * 0.15, rad, rad, rad)
  grd.addColorStop(0, hexA(tint, strength))
  grd.addColorStop(0.7, hexA(tint, strength * 0.55))
  grd.addColorStop(1, hexA(tint, 0))
  g.fillStyle = grd
  g.beginPath()
  g.arc(rad, rad, rad, 0, Math.PI * 2)
  g.fill()

  const sprite = { c, h: rad }
  hubSprites.set(key, sprite)
  return sprite
}

/**
 * Label placement with collision avoidance.
 *
 * The naive "centred under the dot" approach produced stacked, unreadable text
 * wherever nodes were dense. This walks candidates in priority order (hovered
 * node first, then by degree) and tries eight anchors, keeping a box only if it
 * does not overlap one already placed.
 */
function drawLabels(near, idx, sx, sy, zoom, fade) {
  const hotId = hovered.value?.id ?? null
  const boxes = []

  const fits = (bx, by, bw, bh) => {
    for (const b of boxes) {
      if (bx < b[2] && bx + bw > b[0] && by < b[3] && by + bh > b[1]) return false
    }
    return true
  }

  const candidates = nodes.value
    .filter((n) => near.has(n.id))
    .sort((a, b) => {
      if (a.id === hotId) return -1
      if (b.id === hotId) return 1
      return b.degree - a.degree
    })

  for (const n of candidates) {
    const i = idx.get(n.id)
    if (i === undefined) continue
    const x = sx[i]
    const y = sy[i]
    if (x < -120 || x > w + 120 || y < -40 || y > h + 40) continue

    const hub = isCourse(n)
    const size = hub ? 12.5 : 11.5
    ctx.font = (hub ? '650 ' : '520 ') + size + 'px ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif'
    const text = n.title.length > 26 ? n.title.slice(0, 25) + '…' : n.title
    const tw = ctx.measureText(text).width
    const bw = tw + 11
    const bh = size + 7
    const r = radiusOf(n) * zoom
    const pad = r + 6

    // Anchor order: below, above, right, left, then the four diagonals. In a
    // dense cluster the cardinals are often taken.
    const tries = [
      [x - bw / 2, y + pad],
      [x - bw / 2, y - pad - bh],
      [x + pad, y - bh / 2],
      [x - pad - bw, y - bh / 2],
      [x + pad * 0.7, y + pad * 0.7],
      [x - bw - pad * 0.7, y + pad * 0.7],
      [x + pad * 0.7, y - bh - pad * 0.7],
      [x - bw - pad * 0.7, y - bh - pad * 0.7],
    ]

    let placed = null
    for (const t of tries) {
      const bx = t[0]
      const by = t[1]
      if (bx < 4 || by < 4 || bx + bw > w - 4 || by + bh > h - 4) continue
      if (fits(bx, by, bw, bh)) {
        placed = [bx, by]
        break
      }
    }
    if (!placed) continue
    boxes.push([placed[0], placed[1], placed[0] + bw, placed[1] + bh])

    ctx.globalAlpha = fade
    ctx.fillStyle = theme.plate
    roundRect(placed[0], placed[1], bw, bh, 5)
    ctx.fill()
    ctx.strokeStyle = hexA(n.tint, 0.5)
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = hotId === n.id ? theme.labelHot : theme.label
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(text, placed[0] + 5.5, placed[1] + 3.5)
    ctx.globalAlpha = 1
  }
}

function roundRect(x, y, rw, rh, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + rw, y, x + rw, y + rh, r)
  ctx.arcTo(x + rw, y + rh, x, y + rh, r)
  ctx.arcTo(x, y + rh, x, y, r)
  ctx.arcTo(x, y, x + rw, y, r)
  ctx.closePath()
}

/** '#rrggbb' + alpha → 'rgba(...)' */
function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return `rgba(140,160,220,${a})`
  const v = parseInt(m[1], 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}

// --- intro (once) ----------------------------------------------------------
const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function runIntro() {
  if (reduceMotion()) {
    intro.done = true
    requestDraw()
    return
  }
  prepareIntro()
  intro.start = performance.now()
  intro.running = true
  const tick = () => {
    draw()
    if (performance.now() - intro.start < INTRO_MS) {
      requestAnimationFrame(tick)
    } else {
      intro.running = false
      intro.done = true
      requestDraw()
    }
  }
  requestAnimationFrame(tick)
}

// --- interaction -----------------------------------------------------------
/**
 * Cached canvas rect.
 *
 * Calling getBoundingClientRect() on every wheel tick and every pointermove
 * forces a synchronous layout, which showed up as zoom jitter. The rect only
 * changes on resize/scroll, so it is cached and invalidated explicitly.
 */
let rectCache = null
let rectScroll = { x: 0, y: 0 }
let onScroll = null

/**
 * Canvas rect in viewport coordinates, cached across events.
 *
 * Scrolling changes left/top without changing width/height, so the cache is
 * keyed on the scroll offset as well: a scroll invalidates it, a resize
 * invalidates it, anything else reuses it. This keeps hover and zoom anchored
 * to the right place without calling getBoundingClientRect() on every move.
 */
function canvasRect() {
  const sx = window.scrollX
  const sy = window.scrollY
  if (!rectCache || rectScroll.x !== sx || rectScroll.y !== sy) {
    rectCache = canvas.value.getBoundingClientRect()
    rectScroll = { x: sx, y: sy }
  }
  return rectCache
}

function localPoint(e) {
  const r = canvasRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

/**
 * Nearest node to a canvas-space point, or null.
 *
 * The hit radius uses the node's *maximum* drawn size (the hovered scale), not
 * its resting size. Testing against the resting radius made the hover flicker
 * at the rim of a node: the node grew on hover, the pointer drifted onto the
 * enlarged edge, the test failed, it shrank back, and the hit returned.
 */
function nodeAt(sx, sy) {
  const k = view.k
  const zoom = Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62)
  let best = null
  let bestD = Infinity
  let bestR = 0

  const currentId = hovered.value?.id ?? null

  for (const n of nodes.value) {
    const x = n.x * k + view.x
    const y = n.y * k + view.y
    const d = Math.hypot(x - sx, y - sy)
    // 1.3 is the note hover scale, 1.18 for hubs; use the larger so the target
    // never shrinks underneath the pointer.
    const drawn = radiusOf(n) * zoom * 1.3
    const reach = Math.max(11, drawn + 7)
    if (d > reach) continue

    // Hysteresis: the node already hovered keeps priority unless a competitor
    // is significantly closer. Without this, overlapping hit discs made the
    // highlight jump between neighbouring nodes while the pointer barely moved.
    const bias = n.id === currentId ? 0.55 : 1
    const score = d * bias

    if (score < bestD) {
      bestD = score
      bestR = reach
      best = n
    }
  }
  return bestD <= bestR ? best : null
}

function onMove(e) {
  const p = localPoint(e)
  if (pointer.down) {
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > 3) pointer.moved = true
    view.x = drag.vx + dx
    view.y = drag.vy + dy
    requestDraw()
    return
  }
  const hit = nodeAt(p.x, p.y)
  const changed = (hit?.id ?? 0) !== (hovered.value?.id ?? 0)
  hovered.value = hit
  canvas.value.style.cursor = hit ? 'pointer' : 'grab'
  if (changed) requestDraw()
}

function onDown(e) {
  pointer.down = true
  pointer.moved = false
  drag.x = e.clientX
  drag.y = e.clientY
  drag.vx = view.x
  drag.vy = view.y
  canvas.value.style.cursor = 'grabbing'
}

function onUp() {
  pointer.down = false
  canvas.value.style.cursor = hovered.value ? 'pointer' : 'grab'
  if (pointer.moved || !hovered.value) return

  const base = import.meta.env.BASE_URL || '/'
  const b = base.endsWith('/') ? base : base + '/'
  const n = hovered.value
  if (isCourse(n)) {
    const slug = n.id.replace(/^c:/, '').split('/')[1]
    window.location.href = `${b}notes/${n.semester}/${slug}/`
  } else {
    window.location.href = b + n.url
  }
}

function onLeave() {
  pointer.down = false
  if (hovered.value) {
    hovered.value = null
    requestDraw()
  }
}

function onWheel(e) {
  e.preventDefault()
  const r = canvasRect()
  const mx = e.clientX - r.left
  const my = e.clientY - r.top
  const before = view.k
  const next = Math.min(4, Math.max(0.4, before * (e.deltaY < 0 ? 1.13 : 1 / 1.13)))
  view.x = mx - ((mx - view.x) / before) * next
  view.y = my - ((my - view.y) / before) * next
  view.k = next
  if (zoomPct.value !== Math.round(next * 100) + '%') {
    zoomPct.value = Math.round(next * 100) + '%'
  }
  requestDraw()
}

// --- controls --------------------------------------------------------------
function toggleTerm(t) {
  selectedTerm.value = selectedTerm.value === t ? null : t
  if (selectedTerm.value) activeCourses.value = new Set()
  fitToVisible()
}

function toggleCourse(id) {
  const s = new Set(activeCourses.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  activeCourses.value = s
  if (s.size > 0) selectedTerm.value = null
  fitToVisible()
}

function reset() {
  selectedTerm.value = null
  activeCourses.value = new Set()
  fitToVisible()
}

const tip = computed(() => {
  const n = hovered.value
  if (!n) return null
  if (isCourse(n)) {
    return { title: n.title, meta: `${n.count} 篇笔记`, terms: n.terms.slice(0, 5) }
  }
  return {
    title: n.title,
    meta: `${n.course} · ${Math.max(0, n.degree - 1)} 条关联`,
    terms: n.terms.slice(0, 5),
  }
})

onMounted(() => {
  readTheme()
  prepare()
  resize()
  runIntro()

  // Any scroll could move the canvas, so drop the cached rect. The scrollX/Y
  // check in canvasRect() already covers this; this listener is belt and
  // braces for programmatic scrolling and anchor jumps.
  onScroll = () => {
    rectCache = null
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  if (import.meta.env.DEV) {
    window.__gxReplay = () => {
      prepareIntro()
      intro.done = false
      intro.start = performance.now()
      runIntro()
    }
  }

  ro = new ResizeObserver(() => {
    // Only re-layout on real size changes; the intro's own writes must not
    // trigger a re-fit.
    const el = canvas.value
    if (!el) return
    const r = el.getBoundingClientRect()
    if (Math.round(r.width) === w && Math.round(r.height) === h) return
    resize()
  })
  if (box.value) ro.observe(box.value)

  themeObs = new MutationObserver(() => {
    readTheme()
    hubSprites.clear()
    requestDraw()
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  const el = canvas.value
  el.addEventListener('pointermove', onMove, { passive: true })
  el.addEventListener('pointerdown', onDown, { passive: true })
  el.addEventListener('pointerup', onUp, { passive: true })
  el.addEventListener('pointerleave', onLeave, { passive: true })
  el.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  if (onScroll) window.removeEventListener('scroll', onScroll)
  ro?.disconnect()
  themeObs?.disconnect()
  const el = canvas.value
  el?.removeEventListener('pointermove', onMove)
  el?.removeEventListener('pointerdown', onDown)
  el?.removeEventListener('pointerup', onUp)
  el?.removeEventListener('pointerleave', onLeave)
  el?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div class="gx">
    <div class="gx-bar">
      <div class="gx-terms">
        <button
          v-for="t in legend"
          :key="t.term"
          class="gx-chip"
          :class="{ 'is-on': selectedTerm === t.term }"
          @click="toggleTerm(t.term)"
        >
          {{ t.term }}<span class="gx-chip__n">{{ t.count }}</span>
        </button>
      </div>
      <div class="gx-tools">
        <span class="gx-zoom">{{ zoomPct }}</span>
        <button class="gx-btn" @click="reset">重置</button>
      </div>
    </div>

    <div ref="box" class="gx-stage">
      <canvas ref="canvas" />

      <transition name="gx-fade">
        <div v-if="tip" class="gx-tip">
          <strong>{{ tip.title }}</strong>
          <span>{{ tip.meta }}</span>
          <span v-if="tip.terms.length" class="gx-tip__terms">{{ tip.terms.join(' · ') }}</span>
        </div>
      </transition>

      <div class="gx-hint">悬停查看 · 点击打开 · 拖拽平移 · 滚轮缩放</div>
    </div>

    <div class="gx-courses">
      <button
        v-for="c in courses"
        :key="c.id"
        class="gx-course"
        :class="{ 'is-on': activeCourses.has(c.id) }"
        @click="toggleCourse(c.id)"
      >
        {{ c.title }}
      </button>
    </div>

    <p class="gx-meta">
      {{ courses.length }} 门课程、{{ stats.notes }} 篇笔记、{{ stats.links }} 条关联。
    </p>
  </div>
</template>

<style scoped>
.gx {
  margin: 1.4rem 0 2.5rem;
}

.gx-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
}

.gx-terms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  flex: 1;
}

.gx-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.26rem 0.6rem;
  font-size: 0.77rem;
  border-radius: 999px;
  border: 1px solid var(--vn-line);
  background: var(--vn-card-solid);
  color: var(--vn-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.gx-chip:hover {
  color: var(--vn-text);
  border-color: color-mix(in srgb, var(--vn-accent) 45%, transparent);
}

.gx-chip.is-on {
  color: #fff;
  background: var(--vn-accent);
  border-color: transparent;
}

.gx-chip__n {
  font-size: 0.68rem;
  opacity: 0.6;
}

.gx-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gx-zoom {
  font-size: 0.73rem;
  font-variant-numeric: tabular-nums;
  color: var(--vn-muted);
  min-width: 3rem;
  text-align: right;
}

.gx-btn {
  padding: 0.26rem 0.68rem;
  font-size: 0.77rem;
  border-radius: 8px;
  border: 1px solid var(--vn-line);
  background: var(--vn-card-solid);
  color: var(--vn-text);
  cursor: pointer;
}

.gx-btn:hover {
  border-color: color-mix(in srgb, var(--vn-accent) 45%, transparent);
}

.gx-stage {
  position: relative;
  height: clamp(470px, 74vh, 840px);
  border: 1px solid var(--vn-line);
  border-radius: 16px;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(
      42% 34% at 26% 12%,
      color-mix(in srgb, var(--vn-glow-a) 34%, transparent),
      transparent 70%
    ),
    radial-gradient(
      46% 38% at 78% 88%,
      color-mix(in srgb, var(--vn-glow-b) 30%, transparent),
      transparent 72%
    ),
    radial-gradient(120% 90% at 50% 50%, transparent 46%, rgba(0, 0, 0, 0.28) 100%),
    color-mix(in srgb, var(--vn-card-solid) 96%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--vn-line-strong) 70%, transparent),
    inset 0 0 60px -20px color-mix(in srgb, var(--vn-glow-a) 40%, transparent);
}

/* Speck layer: a static starfield, painted once by the compositor. Two
   radial-gradient tiles at coprime pitches give a non-repeating-looking grain
   without a single animated pixel. */
.gx-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.5;
  display: none;
  background-image:
    radial-gradient(1px 1px at 20px 30px, color-mix(in srgb, var(--vn-text) 45%, transparent), transparent),
    radial-gradient(1px 1px at 70px 90px, color-mix(in srgb, var(--vn-text) 30%, transparent), transparent),
    radial-gradient(1.5px 1.5px at 120px 50px, color-mix(in srgb, var(--vn-text) 22%, transparent), transparent);
  background-size: 170px 170px, 230px 230px, 310px 310px;
}

/* Speck layer and vignette only on dark: on white they read as dirt. */
:global(html.dark) .gx-stage::before {
  display: block;
}

/* No entrance veil here on purpose. One used to sit above the canvas and fade
   out over 1.1s, which hid the whole particle intro behind an opaque sheet and
   made the graph look like it only became visible after it had stopped moving.
   The canvas fades itself in over the first 12% of the intro instead. */

.gx-stage canvas {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.gx-tip {
  position: absolute;
  z-index: 3;
  left: 0.9rem;
  bottom: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  max-width: 22rem;
  padding: 0.6rem 0.8rem;
  border-radius: 11px;
  border: 1px solid var(--vn-line-strong);
  background: color-mix(in srgb, var(--vn-card-solid-hover) 96%, transparent);
  box-shadow: 0 8px 28px -12px rgba(0, 0, 0, 0.5);
  font-size: 0.78rem;
  pointer-events: none;
  backdrop-filter: blur(6px);
}

.gx-tip strong {
  color: var(--vn-text);
  font-weight: 620;
  line-height: 1.35;
}

.gx-tip span {
  color: var(--vn-muted);
}

.gx-tip__terms {
  font-size: 0.72rem !important;
  opacity: 0.85;
}

.gx-fade-enter-active,
.gx-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.gx-fade-enter-from,
.gx-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.gx-hint {
  position: absolute;
  z-index: 3;
  right: 0.9rem;
  bottom: 0.8rem;
  font-size: 0.71rem;
  color: var(--vn-muted);
  opacity: 0.65;
  pointer-events: none;
}

.gx-courses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.85rem;
}

.gx-course {
  padding: 0.22rem 0.55rem;
  font-size: 0.74rem;
  border-radius: 7px;
  border: 1px solid var(--vn-line);
  background: transparent;
  color: var(--vn-muted);
  cursor: pointer;
}

.gx-course:hover {
  color: var(--vn-text);
}

.gx-course.is-on {
  color: var(--vn-text);
  border-color: color-mix(in srgb, var(--vn-accent) 55%, transparent);
  background: color-mix(in srgb, var(--vn-accent) 14%, transparent);
}

.gx-meta {
  font-size: 0.78rem;
  color: var(--vn-muted);
  margin: 0.85rem 0 0;
  line-height: 1.6;
}

@media (max-width: 767px) {
  .gx-stage {
    height: 64vh;
  }

  .gx-tip,
  .gx-hint {
    display: none;
  }
}


</style>
