<script setup>
import { computed } from 'vue'
import toc from '../../../course-toc.json'

const props = defineProps({
  slug: { type: String, required: true },
})

const B = import.meta.env.BASE_URL || '/'
const base = B.endsWith('/') ? B : B + '/'

const data = computed(() => toc[props.slug] || null)

/** Root-level chapters first, then one block per nested folder. */
const sections = computed(() => {
  const d = data.value
  if (!d) return []
  const out = []
  if (d.chapters?.length) {
    out.push({ name: null, items: d.chapters })
  }
  for (const g of d.groups ?? []) {
    out.push({ name: g.name, items: g.items })
  }
  return out
})

/** Sequential numbering across every section, computed once. */
const numbered = computed(() => {
  let n = 0
  return sections.value.map((s) => ({
    name: s.name,
    items: s.items.map((it) => {
      const seq = String(++n).padStart(2, '0')
      // Many chapter titles already carry the author's own number ("2. IPV6",
      // "Ch3 Determinants"). Showing our index next to it reads as a mistake,
      // so fall back to a plain bullet when the title self-numbers.
      const selfNumbered = /^(\d+(\.\d+)*\.?|ch\d+)/i.test(it.text.trim())
      return { ...it, num: selfNumbered ? '' : seq }
    }),
  }))
})

const count = computed(() =>
  (data.value?.chapters?.length ?? 0) +
  (data.value?.groups ?? []).reduce((a, g) => a + g.items.length, 0)
)

const groupCount = computed(() => (data.value?.groups ?? []).length)

const href = (rel) =>
  base + 'notes/' + data.value.dir + '/' + rel.replace(/^\.\//, '')
</script>

<template>
  <div v-if="data" class="ci" :style="{ '--accent': data.accent }">
    <div class="ci-glow" aria-hidden="true" />

    <header class="ci-head">
      <p class="ci-crumb">
        <span class="ci-badge">{{ data.semesterZh }}</span>
        <span>{{ data.semesterEn }}</span>
      </p>

      <h1 class="ci-title">{{ data.titleZh }}</h1>
      <p class="ci-sub">{{ data.titleEn }}</p>

      <dl class="ci-stats">
        <div>
          <dt>Notes</dt>
          <dd>{{ count }}</dd>
        </div>
        <div v-if="groupCount">
          <dt>Topics</dt>
          <dd>{{ groupCount }}</dd>
        </div>
        <div>
          <dt>Read</dt>
          <dd>{{ data.minutes }}<small>min</small></dd>
        </div>
      </dl>
    </header>

    <div class="ci-body">
      <section v-for="(sec, si) in numbered" :key="si" class="ci-sec">
        <h3 v-if="sec.name" class="ci-group">{{ sec.name }}</h3>
        <a v-for="row in sec.items" :key="row.href" class="ci-item" :href="href(row.href)">
          <span class="ci-num">{{ row.num }}</span>
          <span class="ci-text">{{ row.text }}</span>
          <span class="ci-arrow" aria-hidden="true">→</span>
        </a>
      </section>
    </div>

    <a v-if="data.firstChapter" class="ci-cta" :href="href('./' + data.firstChapter)">
      从第一章开始读 <span aria-hidden="true">→</span>
    </a>

    <nav v-if="data.prev || data.next" class="ci-pager">
      <a
        v-if="data.prev"
        class="ci-pager__link ci-pager__link--prev"
        :href="base + 'notes/' + data.prev.dir + '/'"
      >
        <small>上一门课</small>
        <span>{{ data.prev.titleZh }}</span>
      </a>
      <span v-else />
      <a
        v-if="data.next"
        class="ci-pager__link ci-pager__link--next"
        :href="base + 'notes/' + data.next.dir + '/'"
      >
        <small>下一门课</small>
        <span>{{ data.next.titleZh }}</span>
      </a>
    </nav>
  </div>

  <div v-else class="ci ci--missing">
    <p>找不到这门课的目录。</p>
  </div>
</template>
