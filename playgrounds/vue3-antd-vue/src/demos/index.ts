import type { Component } from 'vue'
import BasicAntdDemo from './BasicAntdDemo.vue'
import DialogAntdDemo from './DialogAntdDemo.vue'
import ZodAntdDemo from './ZodAntdDemo.vue'

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
    desc: 'a-form + useAntdForm',
    component: BasicAntdDemo,
  },
  {
    id: 'dialog-crud',
    title: '弹窗 新增/编辑/详情',
    desc: '列表无 form；详情 Descriptions',
    component: DialogAntdDemo,
  },
  {
    id: 'zod',
    title: 'Zod + Ant Design Vue',
    desc: 'useZodForm + createAntdAdapter',
    component: ZodAntdDemo,
  },
]
