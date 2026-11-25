import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { watch, nextTick } from 'vue'
import mediumZoom from 'medium-zoom'
import './custom.css'

import ConstellationCanvas from './components/ConstellationCanvas.vue'
import CourseConstellation from './components/CourseConstellation.vue'
import CourseGrid from './components/CourseGrid.vue'
import HomeHero from './components/HomeHero.vue'
import AllCourses from './components/AllCourses.vue'
import CourseIndex from './components/CourseIndex.vue'
import KnowledgeGraph from './components/KnowledgeGraph.vue'

let zoom

function initZoom() {
  // medium-zoom on note images only; skip the landing page.
  const selector = '.vp-doc img, .vp-doc .medium-zoom-image'
  const images = Array.from(document.querySelectorAll(selector))
  if (!images.length) return

  if (!zoom) {
    zoom = mediumZoom({ background: 'rgba(6, 10, 22, 0.9)', margin: 24 })
  }
  zoom.detach()
  zoom.attach(images)
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('ConstellationCanvas', ConstellationCanvas)
    app.component('CourseConstellation', CourseConstellation)
    app.component('CourseGrid', CourseGrid)
    app.component('HomeHero', HomeHero)
    app.component('AllCourses', AllCourses)
    app.component('CourseIndex', CourseIndex)
    app.component('KnowledgeGraph', KnowledgeGraph)

    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = () => {
        nextTick(() => initZoom())
      }
    }
  },
  setup() {
    const route = useRoute()
    if (typeof window !== 'undefined') {
      watch(
        () => route.path,
        () => nextTick(() => initZoom())
      )
      // Initial page.
      nextTick(() => initZoom())
    }
  },
}
