<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import coursesData from '../../../course-data.json'

const { semesters, courses } = coursesData
const BASE = import.meta.env.BASE_URL || '/'

const root = ref(null)
const revealed = ref(new Set())
let io = null

/** Group courses by semester, preserving the declared order. */
const groups = computed(() =>
  semesters
    .map((sem) => ({
      ...sem,
      courses: courses.filter((c) => c.semester === sem.slug),
    }))
    .filter((g) => g.courses.length)
)

function linkFor(c) {
  const base = BASE.endsWith('/') ? BASE : BASE + '/'
  return `${base}notes/${c.semester}/${c.slug}/`
}

onMounted(() => {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    // Show everything immediately; no scroll animation at all.
    revealed.value = new Set(groups.value.map((g) => g.slug))
    return
  }

  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          revealed.value.add(e.target.dataset.sem)
          revealed.value = new Set(revealed.value)
          io.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  )

  root.value
    ?.querySelectorAll('[data-sem]')
    .forEach((el) => io.observe(el))
})

onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="root" class="vc-wrap">
    <div
      v-for="(group, gi) in groups"
      :key="group.slug"
      class="vc-sem"
      :data-sem="group.slug"
      :class="{ 'is-in': revealed.has(group.slug) }"
      :style="{ '--stagger': gi }"
    >
      <div class="vc-sem__head">
        <span class="vc-sem__dot" />
        <h3 class="vc-sem__title">
          <span class="vc-sem__zh">{{ group.labelZh }}</span>
          <span class="vc-sem__en">{{ group.labelEn }}</span>
        </h3>
        <span class="vc-sem__line" />
        <span class="vc-sem__count">{{ group.courses.length }} 门</span>
      </div>

      <ul class="vc-list">
        <li
          v-for="(c, ci) in group.courses"
          :key="c.slug"
          class="vc-card"
          :style="{ '--accent': c.accent, '--i': ci }"
        >
          <a class="vc-card__link" :href="linkFor(c)">
            <span class="vc-card__bar" />
            <span class="vc-card__body">
              <span class="vc-card__zh">{{ c.titleZh }}</span>
              <span class="vc-card__en">{{ c.titleEn }}</span>
            </span>
            <span class="vc-card__arrow" aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
