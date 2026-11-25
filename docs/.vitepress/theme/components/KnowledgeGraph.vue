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
const INTRO_MS = 850

const view = { x: 0, y: 0, k: 1 }
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
  theme.edgeTerm = dark ? '150,180,255' : '62,92,182'
  theme.edgeCourse = dark ? '122,150,214' : '112,134,186'
  theme.ring = dark ? 'rgba(255,255,255,0.42)' : 'rgba(20,28,60,0.32)'
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

function draw() {
  if (!ctx || !laidOut) return
  ctx.clearRect(0, 0, w, h)

  const byId = new Map(nodes.value.map((n) => [n.id, n]))
  const near = neighbourhood()
  const term = selectedTerm.value
  const activeC = activeCourses.value
  const k = view.k
  const ox = view.x
  const oy = view.y

  // Intro progress: 0 → 1. Node radius and alpha grow with it.
  const p = intro.done ? 1 : Math.min(1, (performance.now() - intro.start) / INTRO_MS)
  const ease = 1 - Math.pow(1 - p, 3)

  const passCourse = (n) => activeC.size === 0 || activeC.has(n.courseId)

  // ---- edges ----
  for (const l of links.value) {
    const termMiss = term && l.term !== term
    const a = byId.get(l.source)
    const b = byId.get(l.target)
    if (!a || !b) continue
    if (!passCourse(a) || !passCourse(b)) {
      if (activeC.size === 0) continue
    }

    if (near) {
      // On hover, unrelated edges disappear rather than merely dimming; a dim
      // 900-edge hairball still competes with the highlighted neighbourhood.
      if (!near.has(l.source) || !near.has(l.target)) continue
    }

    const outOfFilter = !passCourse(a) || !passCourse(b)
    const hot = near && near.has(l.source) && near.has(l.target)
    let alpha = hot ? 0.8 : l.kind === 'course' ? 0.09 : 0.11
    if (outOfFilter) alpha = 0.018
    if (termMiss) alpha = term ? 0.03 : alpha

    // Distance falloff. Cross-cluster term edges span most of the canvas, and at
    // uniform alpha they form a haze that fights the clusters. Short links stay
    // crisp, long ones recede.
    if (!hot) {
      const span = Math.hypot(a.x - b.x, a.y - b.y)
      const far = Math.min(1, span / Math.max(120, w * 0.42))
      alpha *= 1 - 0.72 * far * far
    }

    const rgb = l.kind === 'course' ? theme.edgeCourse : theme.edgeTerm
    ctx.strokeStyle = `rgba(${rgb},${alpha * ease})`
    ctx.lineWidth = hot ? 1.25 : 0.75
    ctx.beginPath()
    ctx.moveTo(a.x * k + ox, a.y * k + oy)
    ctx.lineTo(b.x * k + ox, b.y * k + oy)
    ctx.stroke()
  }

  // ---- nodes ----
  for (const n of nodes.value) {
    const outOfFilter = !passCourse(n)
    if (outOfFilter && activeC.size === 0) continue
    const x = n.x * k + ox
    const y = n.y * k + oy
    if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue

    const off = near ? !near.has(n.id) : false
    const termMissNode = term ? !n.terms.includes(term) : false
    const zoom = Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62)
    const r = Math.max(0.6, radiusOf(n) * zoom * (0.35 + 0.65 * ease))

    ctx.globalAlpha = (off ? 0.13 : outOfFilter ? 0.07 : termMissNode ? 0.22 : 1) * ease

    if (isCourse(n)) {
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.4)
      g.addColorStop(0, hexA(n.tint, 0.4))
      g.addColorStop(1, hexA(n.tint, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 3.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = n.tint
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = theme.ring
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(x, y, r + 2.5, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.fillStyle = n.tint
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    if (hovered.value?.id === n.id) {
      ctx.strokeStyle = theme.labelHot
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(x, y, r + 3.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }

  const showHubLabel = (n) =>
    hovered.value?.id === n.id ||
    (near && near.has(n.id)) ||
    activeCourses.value.has(n.courseId)

  if (near || activeCourses.value.size > 0) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const n of nodes.value) {
      if (!isCourse(n) || !passCourse(n) || !showHubLabel(n)) continue
      const zoom = Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62)
      const dx = n.x - w / 2
      const dy = n.y - h / 2
      const dl = Math.hypot(dx, dy) || 1
      const rr = radiusOf(n) * zoom
      const x = (n.x + (dx / dl) * rr * 1.05) * k + ox
      const y = (n.y + (dy / dl) * rr * 1.05) * k + oy
      if (x < -90 || x > w + 90 || y < -24 || y > h + 22) continue

      ctx.font = `620 12px ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif`
      const text = n.title.length > 16 ? n.title.slice(0, 15) + '…' : n.title
      const tw = ctx.measureText(text).width
      ctx.fillStyle = theme.plate
      roundRect(x - tw / 2 - 5, y - 3, tw + 10, 18, 5)
      ctx.fill()
      ctx.fillStyle = hovered.value?.id === n.id ? theme.labelHot : theme.label
      ctx.fillText(text, x, y)
    }
  }

  // ---- note labels: only on hover ----
  if (near) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const n of nodes.value) {
      if (!near.has(n.id) || !passCourse(n) || isCourse(n)) continue
      const zoom = Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62)
      const x = n.x * k + ox
      const y = n.y * k + oy + radiusOf(n) * zoom + 6
      if (x < -90 || x > w + 90 || y < -24 || y > h + 24) continue

      const size = 11.5
      ctx.font = `520 ${size}px ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif`
      const text = n.title.length > 28 ? n.title.slice(0, 27) + '…' : n.title
      const tw = ctx.measureText(text).width

      ctx.fillStyle = theme.plate
      roundRect(x - tw / 2 - 5, y - 2.5, tw + 10, size + 6, 4.5)
      ctx.fill()

      ctx.fillStyle = hovered.value?.id === n.id ? theme.labelHot : theme.label
      ctx.fillText(text, x, y)
    }
  }

  if (!settled.value) settled.value = true
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
function localPoint(e) {
  const r = canvas.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function nodeAt(sx, sy) {
  const k = view.k
  let best = null
  let bestD = Infinity
  for (const n of nodes.value) {
    const x = n.x * k + view.x
    const y = n.y * k + view.y
    const d = Math.hypot(x - sx, y - sy)
    const hit = Math.max(11, radiusOf(n) * Math.pow(Math.min(1.7, Math.max(0.78, k)), 0.62) + 7)
    if (d < hit && d < bestD) {
      bestD = d
      best = n
    }
  }
  return best
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
  const r = canvas.value.getBoundingClientRect()
  const mx = e.clientX - r.left
  const my = e.clientY - r.top
  const before = view.k
  const next = Math.min(4, Math.max(0.4, before * (e.deltaY < 0 ? 1.13 : 1 / 1.13)))
  view.x = mx - ((mx - view.x) / before) * next
  view.y = my - ((my - view.y) / before) * next
  view.k = next
  zoomPct.value = Math.round(next * 100) + '%'
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
  <div class="gx" :class="{ 'is-ready': settled }">
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
  background:
    radial-gradient(
      58% 46% at 50% 2%,
      color-mix(in srgb, var(--vn-glow-a) 40%, transparent),
      transparent 72%
    ),
    color-mix(in srgb, var(--vn-card-solid) 94%, transparent);
}

/* Entrance veil: lifts as the canvas finishes its 850ms intro, so the graph
   fades in instead of popping. */
.gx-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--vn-card-solid);
  opacity: 1;
  transition: opacity 0.8s ease 0.1s;
}

.gx.is-ready .gx-stage::after {
  opacity: 0;
}

.gx-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.gx-tip {
  position: absolute;
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

@media (prefers-reduced-motion: reduce) {
  .gx-stage::after {
    transition: none;
  }
}
</style>
