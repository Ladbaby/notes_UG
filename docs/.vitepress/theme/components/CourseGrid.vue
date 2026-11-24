<script setup>
import { computed } from 'vue'
import coursesData from '../../../course-data.json'

const { semesters, courses } = coursesData
const BASE = import.meta.env.BASE_URL || '/'

const semLabel = Object.fromEntries(semesters.map((s) => [s.slug, s.labelZh]))

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
</script>

<template>
  <div class="cg-wrap">
    <section v-for="g in groups" :key="g.slug" class="cg-section">
      <h2 class="cg-heading">
        <span>{{ g.labelZh }}</span>
        <small>{{ g.labelEn }}</small>
      </h2>
      <div class="cg-grid">
        <a
          v-for="c in g.courses"
          :key="c.slug"
          class="cg-item"
          :href="linkFor(c)"
          :style="{ '--accent': c.accent }"
        >
          <span class="cg-item__accent" />
          <span class="cg-item__zh">{{ c.titleZh }}</span>
          <span class="cg-item__en">{{ c.titleEn }}</span>
        </a>
      </div>
    </section>
  </div>
</template>
