<script setup>
import ConstellationCanvas from './ConstellationCanvas.vue'
import CourseConstellation from './CourseConstellation.vue'

const stats = [
  { n: '21', l: '课程' },
  { n: '189', l: '笔记' },
  { n: '1.5k+', l: '图片' },
  { n: '7', l: '学期' },
]

const BASE = import.meta.env.BASE_URL || '/'
const withBase = (p) => {
  const base = BASE.endsWith('/') ? BASE : BASE + '/'
  return base + p.replace(/^\//, '')
}
</script>

<template>
  <div class="vn-home-wrap">
    <div class="vn-hero-shell">
      <ConstellationCanvas :density="96" :link-distance="150" />

      <header class="vn-hero">
        <span class="vn-eyebrow">
          <span class="vn-eyebrow__dot" aria-hidden="true" />
          Undergraduate Notes · 2020 – 2024
        </span>

        <h1 class="vn-hero__title">
          四年课程笔记<br />
          <em>一张可检索的知识图谱</em>
        </h1>

        <p class="vn-hero__sub">
          从线性代数到深度学习，从操作系统到信息检索。
          <strong>21 门课、189 篇笔记</strong>，按学期与学科组织，
          全部支持全文检索与公式渲染。
        </p>

        <div class="vn-stats">
          <div v-for="s in stats" :key="s.l" class="vn-stat">
            <span class="vn-stat__n">{{ s.n }}</span>
            <span class="vn-stat__l">{{ s.l }}</span>
          </div>
        </div>

        <div class="vn-actions">
          <a class="vn-btn vn-btn--primary" :href="withBase('graph')">
            浏览知识图谱 →
          </a>
          <a class="vn-btn vn-btn--ghost" :href="withBase('courses')">
            全部课程
          </a>
        </div>

        <a class="vn-scroll" href="#course-map">
          <span class="vn-scroll__line" aria-hidden="true" />
          向下滚动
        </a>
      </header>
    </div>

    <div class="vn-home">
      <section id="course-map" class="vn-section">
        <div class="vn-section__title"><span>Course Map</span></div>
        <CourseConstellation />
      </section>
    </div>
  </div>
</template>
