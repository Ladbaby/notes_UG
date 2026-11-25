<script setup>
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'

const props = defineProps({
  /** Approximate particle count at a 1440x900 viewport. */
  density: { type: Number, default: 96 },
  /** Max distance (CSS px) for drawing a connecting line. */
  linkDistance: { type: Number, default: 150 },
  /**
   * Selector for the element whose visibility decides whether we animate.
   *
   * The field is a sibling of the hero (both live in .vn-home-wrap), so its own
   * bounding box can scroll out of view either way. We observe the hero because
   * that is the meaningful signal: if the hero is gone, the decoration is too.
   */
  watchTarget: { type: String, default: '.vn-hero' },
})

const canvas = ref(null)
const root = ref(null)
const reduced = ref(false)

let ctx = null
let raf = 0
let running = false
let lastDraw = 0
let w = 0
let h = 0
let dpr = 1
let particles = []
let pulses = []
let resizeObserver = null
let mediaQuery = null
let onMqChange = null
let io = null
let pulseAccum = 0
let visible = false
let palette = { dot: 'rgba(180,205,255,0.7)', line: '126,166,255', dark: true }

/**
 * Pre-rendered glow sprites.
 *
 * `createRadialGradient` is not cached by the browser: calling it inside the
 * draw loop (once per pulse, once per hero star) was measurably the most
 * expensive thing the canvas did. Each sprite is drawn once into a tiny
 * offscreen canvas and then blitted with drawImage, which is a straight GPU
 * upload of an already-rasterised texture.
 */
let spriteCool = null
let spriteWarm = null
let spriteStarDark = null
let spriteStarLight = null

function makeGlowSprite(rgb, size = 32) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (!g) return null
  const r = size / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  // Hot core first, then the soft halo: one blit now reads as both.
  grad.addColorStop(0, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.18, `rgba(${rgb},0.6)`)
  grad.addColorStop(0.45, `rgba(${rgb},0.22)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.beginPath()
  g.arc(r, r, r, 0, Math.PI * 2)
  g.fill()
  return c
}

/** Glow with a bright opaque pin-prick at the centre (for hero stars). */
function makeStarSprite(rgb, size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (!g) return null
  const r = size / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.12, `rgba(${rgb},0.85)`)
  grad.addColorStop(0.45, `rgba(${rgb},0.22)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.beginPath()
  g.arc(r, r, r, 0, Math.PI * 2)
  g.fill()
  return c
}

function buildSprites() {
  spriteCool = makeGlowSprite('150,220,255', 32)
  spriteWarm = makeGlowSprite('255,196,130', 32)
  spriteStarDark = makeStarSprite('150,190,255', 64)
  spriteStarLight = makeStarSprite('70,100,210', 64)
}

/*
 * 24fps ceiling.
 *
 * This canvas is a slow drift of sub-pixel dots and hairlines — motion that
 * gains nothing perceptible above ~24fps. Each frame costs the browser a full
 * re-upload of the backing store (~747k px here), so the frame rate is the
 * dominant term: 30 -> 24 is a straight 20% cut in per-second pixel traffic.
 */
const FRAME_MS = 1000 / 24
const pointer = { x: -9999, y: -9999, active: false }
const smooth = { x: -9999, y: -9999 }

/** Read the active theme's colours so the field matches light or dark. */
function readPalette() {
  const dark = document.documentElement.classList.contains('dark')
  palette = dark
    ? { dot: 'rgba(214,230,255,0.95)', line: '126,166,255', dark: true }
    : { dot: 'rgba(38,58,140,0.8)', line: '62,88,200', dark: false }
}

function sizeCanvas() {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  w = Math.max(1, Math.round(rect.width))
  h = Math.max(1, Math.round(rect.height))
  /*
   * DPR 1 for a blurred constellation.
   *
   * Everything drawn here is sub-pixel dots, hairlines and soft radial glows —
   * there are no hard edges to keep crisp, so a dpr of 1 is visually
   * indistinguishable from 2 while costing a quarter of the fill rate. dpr 2
   * quadruples the pixels the compositor has to upload every frame, and this was
   * the single largest GPU cost on the page.
   */
  /*
   * Render at HALF resolution, then let CSS scale it up.
   *
   * Everything drawn is a soft dot, a hairline or a radial glow — there are no
   * hard edges to resolve, and the canvas is then gently upscaled by the
   * compositor. Dropping from 1x to 0.5x is a 4x reduction in the pixels that
   * have to be rasterised and uploaded every frame, which is what actually costs
   * GPU on a page with no other expensive effects.
   */
  dpr = 0.5
  el.width = Math.round(w * dpr)
  el.height = Math.round(h * dpr)
  ctx = el.getContext('2d', { alpha: true, desynchronized: true })
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
}

function seed() {
  const mobile = w < 768
  const target = Math.round(
    props.density * Math.min(1, (w * h) / (1440 * 900)) * (mobile ? 0.5 : 1)
  )
  const count = Math.max(24, Math.min(props.density, target))

  particles = Array.from({ length: count }, (_, i) => {
    // A few "hero" stars are bigger and glow, so the field has depth.
    const hero = i % 11 === 0
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: hero ? 2.4 + Math.random() * 1.6 : 1.5 + Math.random() * 1.3,
      hero,
      // Slow twinkle, phase-offset so they don't blink together.
      phase: Math.random() * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.0006,
    }
  })
  pulses = []
}

/**
 * Pulse budget.
 *
 * Previously: spawn chance 0.02/frame at 30fps with a ~2s lifetime gave
 * 0.6 spawns/sec x ~2s ≈ 1.2 concurrent pulses, so the effect was essentially
 * invisible — one lonely dot at a time. We now drive spawns off a fixed rate
 * and keep several alive at once so the field reads as "energy flowing".
 */
const PULSE_MAX = 22
const PULSE_LIFE_S = 2.6
const PULSE_TRAVEL = 0.55 // t units per second, so a pulse crosses a link in ~1.8s

function spawnPulse() {
  if (particles.length < 2) return
  const a = particles[(Math.random() * particles.length) | 0]
  const near = particles.filter((p) => {
    if (p === a) return false
    const dx = p.x - a.x
    const dy = p.y - a.y
    return dx * dx + dy * dy < 190 * 190
  })
  if (!near.length) return
  pulses.push({
    a,
    b: near[(Math.random() * near.length) | 0],
    t: 0,
    // Slight variance keeps them from marching in lockstep.
    speed: PULSE_TRAVEL * (0.8 + Math.random() * 0.5),
    hue: Math.random() < 0.34 ? 'warm' : 'cool',
  })
}

function step(now, dt = 1 / 30) {
  const link2 = props.linkDistance * props.linkDistance

  // Pointer easing: the spotlight and gravity follow lazily, which reads as
  // "magnetic" instead of twitchy.
  if (pointer.active) {
    smooth.x += (pointer.x - smooth.x) * 0.09
    smooth.y += (pointer.y - smooth.y) * 0.09
  }

  for (const p of particles) {
    if (pointer.active) {
      const dx = smooth.x - p.x
      const dy = smooth.y - p.y
      const d2 = dx * dx + dy * dy
      if (d2 < 46000 && d2 > 1) {
        const inv = 0.00024
        p.vx += dx * inv
        p.vy += dy * inv
      }
    }

    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.995
    p.vy *= 0.995

    const sp = Math.hypot(p.vx, p.vy)
    if (sp < 0.035) {
      p.vx += (Math.random() - 0.5) * 0.028
      p.vy += (Math.random() - 0.5) * 0.028
    }

    if (p.x < -10) p.x = w + 10
    else if (p.x > w + 10) p.x = -10
    if (p.y < -10) p.y = h + 10
    else if (p.y > h + 10) p.y = -10
  }

  ctx.clearRect(0, 0, w, h)

  // --- connections ---
  // Alpha is quantised into a few buckets and each bucket is stroked as ONE
  // path. Stroking every link individually meant hundreds of beginPath/stroke
  // calls per frame, which dominated the 2D context's command overhead.
  const BUCKETS = 4
  const paths = Array.from({ length: BUCKETS }, () => [])
  const alphas = [0.06, 0.13, 0.2, 0.28]

  ctx.lineWidth = 1
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i]
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > link2) continue

      let alpha = (1 - d2 / link2) * 0.26

      // Links near the cursor light up, so moving the mouse draws the graph.
      if (pointer.active) {
        const mx = (a.x + b.x) * 0.5 - smooth.x
        const my = (a.y + b.y) * 0.5 - smooth.y
        const md2 = mx * mx + my * my
        if (md2 < 32000) alpha += (1 - md2 / 32000) * 0.5
      }

      let bi = Math.round((alpha / 0.3) * (BUCKETS - 1))
      if (bi < 0) bi = 0
      else if (bi >= BUCKETS) bi = BUCKETS - 1
      paths[bi].push(a.x, a.y, b.x, b.y)
    }
  }

  for (let b = 0; b < BUCKETS; b++) {
    const list = paths[b]
    if (!list.length) continue
    // Use the bucket's nominal alpha; exact per-link values are imperceptible.
    const a = (alphas[b] * (palette.line ? 1 : 1)).toFixed(3)
    ctx.strokeStyle = `rgba(${palette.line},${a})`
    ctx.beginPath()
    for (let k = 0; k < list.length; k += 4) {
      ctx.moveTo(list[k], list[k + 1])
      ctx.lineTo(list[k + 2], list[k + 3])
    }
    ctx.stroke()
  }

  // --- energy pulses travelling along existing links ---
  // Rate-based spawning: keep roughly PULSE_MAX alive, refilling at a steady
  // cadence instead of a rare per-frame dice roll.
  pulseAccum += dt
  const spawnInterval = PULSE_LIFE_S / PULSE_MAX
  while (pulseAccum >= spawnInterval && pulses.length < PULSE_MAX) {
    pulseAccum -= spawnInterval
    spawnPulse()
  }
  if (pulses.length > PULSE_MAX * 2) pulseAccum = 0 // don't let debt pile up

  for (let i = pulses.length - 1; i >= 0; i--) {
    const pu = pulses[i]
    pu.t += pu.speed * dt
    if (pu.t >= 1) {
      pulses.splice(i, 1)
      continue
    }
    const x = pu.a.x + (pu.b.x - pu.a.x) * pu.t
    const y = pu.a.y + (pu.b.y - pu.a.y) * pu.t
    // Fade in and out; brightest mid-link.
    const fade = Math.sin(pu.t * Math.PI)

    // Pre-rendered sprite instead of a per-pulse createRadialGradient: making a
    // gradient object every frame (up to PULSE_MAX times) is pure CPU work and
    // showed up as the dominant canvas cost.
    const sprite = pu.hue === 'warm' ? spriteWarm : spriteCool
    if (sprite) {
      // The pulse sprite carries its own bright core, so one blit is enough.
      const size = 26
      ctx.globalAlpha = fade
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
      ctx.globalAlpha = 1
    }
  }

  // --- stars, with hero glow + twinkle ---
  // Ordinary stars are collected into a single path and filled once; hero stars
  // use the pre-rendered glow sprite. Building a radial gradient per star per
  // frame was the other big CPU cost.
  const twinkles = []
  for (const p of particles) {
    if (p.hero) {
      const tw = 0.7 + 0.3 * Math.sin(now * p.speed + p.phase)
      const sprite = palette.dark ? spriteStarDark : spriteStarLight
      if (sprite) {
        // The sprite bakes in both the halo and a bright core, so a single
        // blit replaces the previous drawImage + arc + fill triple.
        const size = p.r * 11
        ctx.globalAlpha = 0.95 * tw
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size)
        ctx.globalAlpha = 1
      }
    } else {
      twinkles.push(p)
    }
  }

  // Non-hero stars, batched into a few alpha buckets so they can still twinkle
  // without one fill() per star. 4 buckets is indistinguishable from per-star
  // alpha but keeps this to four draw calls.
  const DOT_BUCKETS = 4
  const dots = Array.from({ length: DOT_BUCKETS }, () => new Path2D())
  for (const p of twinkles) {
    const tw = 0.62 + 0.38 * Math.sin(now * p.speed + p.phase)
    let bi = Math.round(tw * (DOT_BUCKETS - 1))
    if (bi < 0) bi = 0
    else if (bi >= DOT_BUCKETS) bi = DOT_BUCKETS - 1
    const path = dots[bi]
    path.moveTo(p.x + p.r, p.y)
    path.arc(p.x, p.y, p.r, 0, Math.PI * 2)
  }
  for (let b = 0; b < DOT_BUCKETS; b++) {
    const a = 0.45 + (b / (DOT_BUCKETS - 1)) * 0.55
    ctx.fillStyle = palette.dot.replace(/[\d.]+\),?$/, a.toFixed(2) + ')')
    ctx.fill(dots[b])
  }
}

function loop(now) {
  if (!running) return
  raf = requestAnimationFrame(loop)
  if (now - lastDraw < FRAME_MS) return
  // Clamp dt so a background tab or long stall can't teleport every pulse.
  const dt = Math.min(0.1, (now - (lastDraw || now)) / 1000)
  lastDraw = now
  if (ctx) step(now, dt)
}

function start() {
  // Animate only when the hero is actually on screen AND the tab is visible.
  // Centralising both conditions here means every caller (mount, resize,
  // IntersectionObserver, theme toggle, visibilitychange) stays consistent —
  // previously a theme toggle could restart the loop while the tab was hidden.
  if (running || reduced.value || !visible || document.hidden) return
  running = true
  lastDraw = 0
  raf = requestAnimationFrame(loop)
}

function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  // Deliberately NOT clearing: the field is a fixed backdrop that should stay
  // visible while scrolling, so the final frame is left on screen as a static
  // image. Cancelling the rAF loop is what stops it costing anything.
}

function isHeroOnScreen() {
  const el = canvas.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < (window.innerHeight || 0) && r.width > 0
}

function onVisibility() {
  if (document.hidden) {
    stop()
    return
  }
  // Re-derive visibility from geometry. `visible` is only written by the
  // IntersectionObserver, which does NOT fire again when a background tab is
  // brought to the foreground — so relying on the stored flag left the field
  // permanently frozen after switching tabs back.
  visible = isHeroOnScreen()
  start()
}

function onPointerMove(e) {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  pointer.x = e.clientX - rect.left
  pointer.y = e.clientY - rect.top
  pointer.active = true

  // Feed the CSS spotlight too.
  if (root.value) {
    root.value.style.setProperty('--mx', `${pointer.x}px`)
    root.value.style.setProperty('--my', `${pointer.y}px`)
    root.value.classList.add('is-pointing')
  }
}

function onPointerLeave() {
  pointer.active = false
  pointer.x = -9999
  pointer.y = -9999
  root.value?.classList.remove('is-pointing')
}

onMounted(() => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mediaQuery = mq
  reduced.value = mq.matches

  readPalette()
  buildSprites()
  sizeCanvas()

  resizeObserver = new ResizeObserver(() => {
    sizeCanvas()
    start()
  })
  if (canvas.value) resizeObserver.observe(canvas.value)

  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else stop()
    },
    { threshold: 0.01 }
  )
  // Watch the hero, NOT the canvas: the canvas is position:fixed and therefore
  // always "intersecting", which would keep it animating forever while the user
  // scrolls through notes. The field is a *sibling* of the hero (both live in
  // .vn-home-wrap), so closest() must be applied from the parent element.
  const scope = root.value?.parentElement || document
  const target =
    scope.querySelector?.(props.watchTarget) ||
    root.value?.closest(props.watchTarget) ||
    null
  if (target) io.observe(target)
  else if (canvas.value) io.observe(canvas.value)

  document.addEventListener('visibilitychange', onVisibility)

  // Pointer tracking lives on the wrapper so the CSS spotlight can react even
  // while the canvas itself is not animating.
  const layer = root.value
  layer?.addEventListener('pointermove', onPointerMove, { passive: true })
  layer?.addEventListener('pointerleave', onPointerLeave, { passive: true })

  onMqChange = (e) => {
    reduced.value = e.matches
    if (e.matches) {
      stop()
    } else {
      nextTick(() => {
        sizeCanvas()
        start()
      })
    }
  }
  mq.addEventListener?.('change', onMqChange)

  // Re-read colours when the site theme is toggled.
  const themeObserver = new MutationObserver(() => {
    readPalette()
    // Only resume if the hero is still on screen. Toggling the theme while
    // scrolled down must not resurrect the frozen field over the note cards.
    if (visible && !reduced.value) start()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  root.value && Object.defineProperty(root.value, '__themeObs', { value: themeObserver })

  // Seed visibility synchronously so the first frame paints even if the
  // IntersectionObserver callback is delayed.
  const heroEl = scope.querySelector?.(props.watchTarget)
  if (heroEl) {
    const r = heroEl.getBoundingClientRect()
    visible = r.bottom > 0 && r.top < window.innerHeight
  }

  start()
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  const layer = root.value
  layer?.removeEventListener('pointermove', onPointerMove)
  layer?.removeEventListener('pointerleave', onPointerLeave)
  layer?.__themeObs?.disconnect()
  if (mediaQuery && onMqChange) {
    mediaQuery.removeEventListener?.('change', onMqChange)
  }
})
</script>

<template>
  <div
    ref="root"
    class="vn-field"
    :class="{ 'vn-field--static': reduced }"
    aria-hidden="true"
  >
    <div class="vn-field__grid" />
    <div class="vn-field__glow vn-field__glow--a" />
    <div class="vn-field__glow vn-field__glow--b" />
    <div class="vn-field__glow vn-field__glow--c" />
    <canvas v-show="!reduced" ref="canvas" class="vn-field__canvas" />
    <div v-if="reduced" class="vn-field__fallback" />
    <div class="vn-field__spot" />
  </div>
</template>
