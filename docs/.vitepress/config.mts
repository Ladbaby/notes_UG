import { defineConfig } from 'vitepress'
import markdownItMark from 'markdown-it-mark'
import { pagefindPlugin, chineseSearchOptimize } from 'vitepress-plugin-pagefind'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { buildSidebar } from '../../scripts/gen-sidebar.mjs'

const REPO = 'notes-UG'
const BASE = process.env.DOCS_BASE || `/${REPO}/`

export default withMermaid(
  defineConfig({
    base: BASE,
    srcDir: '.',
    cleanUrls: true,
    lang: 'zh-CN',
    title: '课程笔记',
    description:
      '本科四年课程复习笔记 — 计算机系统、机器学习、网络与数据库的完整知识图谱',
    // Default to the dark showcase look; the nav toggle switches to a full
    // light theme (both modes are first-class in custom.css).
    appearance: 'dark',
    lastUpdated: false,

    head: [
      ['meta', { name: 'theme-color', content: '#0b1020' }],
      ['link', { rel: 'icon', href: `${BASE}favicon.svg`, type: 'image/svg+xml' }],
    ],

    // Dead cross-file links are cleaned by scripts/migrate.mjs; keep the build
    // strict so any regression fails CI instead of shipping silently.
    ignoreDeadLinks: false,

    markdown: {
      lineNumbers: true,
      // VitePress's built-in KaTeX support. This must be used instead of
      // markdown-it-mathjax3: VitePress compiles Markdown into a Vue template
      // first, so a plain markdown-it plugin never sees the `$…$` source.
      math: true,
      config(md) {
        md.use(markdownItMark)
      },
    },

    mermaid: {
      // Keep it light: no interaction handlers needed for static diagrams.
      theme: 'dark',
    },
    mermaidPlugin: {
      class: 'mermaid',
    },

    themeConfig: {
      outline: { level: [2, 3], label: '本页目录' },
      nav: [
        { text: '首页', link: '/' },
        { text: '知识图谱', link: '/graph' },
        { text: '全部课程', link: '/courses' },
      ],
      sidebar: buildSidebar(),
      search: { provider: 'local' },
      docFooter: { prev: '上一篇', next: '下一篇' },
      returnToTopLabel: '回到顶部',
      sidebarMenuLabel: '目录',
      darkModeSwitchLabel: '主题',
      socialLinks: [],
    },

    vite: {
      // Mermaid imports `fastdom` and `fastdom/extensions/fastdom-promised.js`,
      // both CommonJS with no ESM `default` export. Left raw, Vite's dev
      // loader throws "does not provide an export named 'default'" and the
      // whole app fails to mount. The specifier must match mermaid's exactly
      // (including the `.js`), otherwise it is not rewritten to the
      // pre-bundled copy.
      optimizeDeps: {
        include: [
          'medium-zoom',
          'fastdom',
          'fastdom/extensions/fastdom-promised',
          'fastdom/extensions/fastdom-promised.js',
        ],
      },
      plugins: [
        pagefindPlugin({
          customSearchQuery: chineseSearchOptimize,
          btnPlaceholder: '搜索',
          placeholder: '搜索笔记…',
          emptyText: '没有找到结果',
          heading: '共 {{searchResult}} 条结果',
          forceLanguage: 'zh-cn',
          excludeSelector: ['img', 'a.header-anchor', '.no-search'],
        }),
      ],
    },
  })
)
