import type { Component } from 'vue'
import BasicNaiveDemo from './BasicNaiveDemo.vue'
import DialogNaiveDemo from './DialogNaiveDemo.vue'
import ZodNaiveDemo from './ZodNaiveDemo.vue'

export type DemoId = 'basic' | 'dialog-crud' | 'zod'

export interface DemoMeta {
  id: DemoId
  title: string
  desc: string
  component: Component
}

export const demos: DemoMeta[] = [
  {
    id: 'basic',
    title: '基础表单',
    desc: 'n-form + useNaiveForm',
    component: BasicNaiveDemo,
  },
  {
    id: 'dialog-crud',
    title: '弹窗 新增/编辑/详情',
    desc: '列表无 form；详情 Descriptions',
    component: DialogNaiveDemo,
  },
  {
    id: 'zod',
    title: 'Zod + Naive',
    desc: 'useZodForm + createNaiveAdapter',
    component: ZodNaiveDemo,
  },
]
