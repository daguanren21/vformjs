import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

const repository = 'https://github.com/daguanren21/vformjs'

export default defineConfig({
  title: 'vformjs',
  titleTemplate: ':title · vformjs',
  description: 'Typed CRUD form lifecycle for Vue 2.7 and Vue 3 that keeps your existing UI library.',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['agent-engineering/**'],
  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#f3f0e8', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#141714', media: '(prefers-color-scheme: dark)' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'vformjs' }],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'vformjs',
      description: 'Typed CRUD form lifecycle for Vue 2.7 and Vue 3 that keeps your existing UI library.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide' },
          { text: 'Examples', link: '/examples' },
          { text: 'Why vformjs', link: '/why' },
          { text: 'Migration', link: '/migration' },
          { text: 'API', link: '/api' },
        ],
        sidebar: [
          {
            text: 'Start',
            items: [
              { text: 'Guide', link: '/guide' },
              { text: 'Examples', link: '/examples' },
              { text: 'Why vformjs', link: '/why' },
              { text: 'Vue 2.7 → Vue 3', link: '/migration' },
            ],
          },
          {
            text: 'Reference',
            items: [{ text: 'API', link: '/api' }],
          },
        ],
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: { text: 'Updated' },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'vformjs',
      description: '保留现有 UI 组件库，统一 Vue 2.7 / Vue 3 后台表单的 CRUD 生命周期。',
      themeConfig: {
        nav: [
          { text: '快速开始', link: '/zh/guide' },
          { text: '示例', link: '/zh/examples' },
          { text: '为什么用', link: '/zh/why' },
          { text: '迁移', link: '/zh/migration' },
          { text: 'API', link: '/zh/api' },
        ],
        sidebar: [
          {
            text: '开始',
            items: [
              { text: '快速开始', link: '/zh/guide' },
              { text: '示例入口', link: '/zh/examples' },
              { text: '为什么用 vformjs', link: '/zh/why' },
              { text: 'Vue 2.7 → Vue 3', link: '/zh/migration' },
            ],
          },
          {
            text: '参考',
            items: [{ text: 'API 速查', link: '/zh/api' }],
          },
        ],
        outline: { label: '本页内容', level: [2, 3] },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新' },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
      },
    },
  },
  themeConfig: {
    logo: { src: '/logo.svg', alt: 'vformjs' },
    siteTitle: 'vformjs',
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: repository, ariaLabel: 'vformjs on GitHub' },
    ],
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: 'Edit this page',
    },
    footer: {
      message: 'MIT licensed. Built for forms that already have a UI.',
      copyright: 'Copyright © 2026 vformjs contributors',
    },
  },
  vite: {
    resolve: {
      alias: {
        '@vformjs/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
        '@vformjs/vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
        '@vformjs/zod': fileURLToPath(new URL('../../packages/zod/src/index.ts', import.meta.url)),
        '@vformjs/element-plus': fileURLToPath(new URL('../../packages/element-plus/src/index.ts', import.meta.url)),
      },
    },
  },
})
