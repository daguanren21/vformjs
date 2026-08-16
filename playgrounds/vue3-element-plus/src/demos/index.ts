import type { Component } from 'vue'
import BasicDemo from './BasicDemo.vue'
import ConditionalDemo from './ConditionalDemo.vue'
import CrossFieldDemo from './CrossFieldDemo.vue'
import CustomAdapterDemo from './CustomAdapterDemo.vue'
import DialogCrudDemo from './DialogCrudDemo.vue'
import DynamicListDemo from './DynamicListDemo.vue'
import PageCrudDemo from './PageCrudDemo.vue'
import RulesDemo from './RulesDemo.vue'
import ZodDemo from './ZodDemo.vue'
import ZodListDemo from './ZodListDemo.vue'

export type DemoId =
  | 'basic'
  | 'dialog-crud'
  | 'page-crud'
  | 'rules'
  | 'conditional'
  | 'dynamic-list'
  | 'cross-field'
  | 'zod'
  | 'zod-list'
  | 'custom-adapter'

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
    desc: '列表无 form；详情用文字展示',
    component: DialogCrudDemo,
  },
  {
    id: 'page-crud',
    title: '页面 新增/编辑/详情',
    desc: '模拟路由；详情 Descriptions',
    component: PageCrudDemo,
  },
  {
    id: 'rules',
    title: '自定义 Rules',
    desc: 'pattern / phone / numberRange…',
    component: RulesDemo,
  },
  {
    id: 'conditional',
    title: '条件显隐联动',
    desc: 'when / conditional rules / 省市联动',
    component: ConditionalDemo,
  },
  {
    id: 'dynamic-list',
    title: '动态数组',
    desc: 'form.list + fieldPath',
    component: DynamicListDemo,
  },
  {
    id: 'cross-field',
    title: '跨字段校验',
    desc: '密码确认 equalTo',
    component: CrossFieldDemo,
  },
  {
    id: 'zod',
    title: 'Zod Schema',
    desc: '可选 useZodForm',
    component: ZodDemo,
  },
  {
    id: 'zod-list',
    title: 'Zod 动态数组',
    desc: 'schema array + form.list',
    component: ZodListDemo,
  },
  {
    id: 'custom-adapter',
    title: '自定义 Adapter',
    desc: '非 Element 宿主 / Naive 思路',
    component: CustomAdapterDemo,
  },
]
