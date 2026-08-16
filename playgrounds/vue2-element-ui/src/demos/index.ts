import type { Component } from 'vue'
import BasicDemo from './BasicDemo.vue'
import DialogCrudDemo from './DialogCrudDemo.vue'
import DynamicTableDemo from './DynamicTableDemo.vue'
import PageCrudDemo from './PageCrudDemo.vue'

export type DemoId = 'basic' | 'dialog-crud' | 'page-crud' | 'dynamic-table'

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
    desc: 'defaults + rules + submit',
    component: BasicDemo,
  },
  {
    id: 'dialog-crud',
    title: '弹窗 新增/编辑/详情',
    desc: '详情用文字展示',
    component: DialogCrudDemo,
  },
  {
    id: 'page-crud',
    title: '页面 新增/编辑/详情',
    desc: '模拟路由；详情 Descriptions',
    component: PageCrudDemo,
  },
  {
    id: 'dynamic-table',
    title: '复杂动态表单',
    desc: 'el-table 行 + 通配符规则 + 逐行远程选项',
    component: DynamicTableDemo,
  },
]
