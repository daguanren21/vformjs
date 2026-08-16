export type HomeLocale = 'en' | 'zh'

export interface HomeLink {
  label: string
  href: string
}

export interface HomeSignal {
  value: string
  label: string
}

export interface HomeFeature {
  marker: string
  title: string
  description: string
  detail: string
}

export interface HomeStep {
  number: string
  title: string
  description: string
  code: string
}

export interface HomeDecision {
  name: string
  approach: string
  lifecycle: string
  fit: string
}

export interface LiveDemoCopy {
  eyebrow: string
  title: string
  description: string
  modes: {
    create: string
    edit: string
    detail: string
  }
  fields: {
    name: string
    email: string
  }
  placeholders: {
    name: string
    email: string
  }
  actions: {
    submit: string
    reset: string
    loadError: string
  }
  status: {
    clean: string
    dirty: string
    submitted: string
    readonly: string
  }
}

export interface HomeCopy {
  locale: HomeLocale
  eyebrow: string
  title: string
  titleAccent: string
  description: string
  primaryAction: HomeLink
  secondaryAction: HomeLink
  heroNote: string
  signals: HomeSignal[]
  problem: {
    eyebrow: string
    title: string
    description: string
    beforeLabel: string
    afterLabel: string
    before: string[]
    after: string[]
  }
  demo: LiveDemoCopy
  features: {
    eyebrow: string
    title: string
    description: string
    items: HomeFeature[]
  }
  workflow: {
    eyebrow: string
    title: string
    description: string
    steps: HomeStep[]
  }
  decision: {
    eyebrow: string
    title: string
    description: string
    columns: {
      name: string
      approach: string
      lifecycle: string
      fit: string
    }
    rows: HomeDecision[]
    note: string
  }
  finalCta: {
    eyebrow: string
    title: string
    description: string
    primaryAction: HomeLink
    secondaryAction: HomeLink
  }
}

export const homeCopy: Record<HomeLocale, HomeCopy> = {
  en: {
    locale: 'en',
    eyebrow: 'Vue 2.7 + Vue 3 · Keep your UI library',
    title: 'One lifecycle for every',
    titleAccent: 'admin form.',
    description: 'Keep Element, Naive UI, or Ant Design Vue. vformjs standardizes create, edit, detail, validation, linkage, arrays, and server errors without replacing your components.',
    primaryAction: { label: 'Build the first form', href: '/guide' },
    secondaryAction: { label: 'Try the live state', href: '#live-demo' },
    heroNote: 'Start with @vformjs/element-plus. Drop to useForm only when you need a custom host.',
    signals: [
      { value: '2.7 + 3', label: 'Vue runtimes' },
      { value: '4', label: 'verified UI paths' },
      { value: '73', label: 'behavior tests' },
      { value: '9.54 kB', label: 'core gzip' },
    ],
    problem: {
      eyebrow: 'The gap between UI and business state',
      title: 'Your Form component validates fields. The rest still repeats.',
      description: 'Admin projects keep rewriting mode switches, reset baselines, submit guards, conditional rules, list keys, and API error handling. vformjs keeps the host Form in charge of visual validation and gives the repeated lifecycle one typed API.',
      beforeLabel: 'Repeated in each screen',
      afterLabel: 'Owned by the form instance',
      before: ['dialog mode branches', 'reset timing and stale errors', 'array row keys', 'submit loading flags', 'conditional rule cleanup'],
      after: ["load('create' | 'edit' | 'detail')", 'dirty + changedPaths', "form.list('contacts')", 'submit() + submitting', 'when + conditional rules'],
    },
    demo: {
      eyebrow: 'Live product state',
      title: 'Switch mode. Edit a field. Watch the contract move.',
      description: 'This small form runs the same baseline, dirty, server-error, and read-only semantics exposed by the public API.',
      modes: { create: 'Create', edit: 'Edit', detail: 'Detail' },
      fields: { name: 'Name', email: 'Email' },
      placeholders: { name: 'Ada Lovelace…', email: 'ada@example.com…' },
      actions: { submit: 'Submit', reset: 'Reset', loadError: 'Load API error' },
      status: { clean: 'clean baseline', dirty: 'unsaved changes', submitted: 'submitted', readonly: 'read-only detail' },
    },
    features: {
      eyebrow: 'A thin orchestration layer',
      title: 'The host renders. vformjs keeps the lifecycle coherent.',
      description: 'Each API exists to remove a repeated production concern. The library does not ship replacement inputs or a second design system.',
      items: [
        { marker: '01', title: 'Three modes, one owner', description: 'Create, edit, and detail share one form instance inside the dialog or page.', detail: "load('edit', detail) rebases reset and dirty state." },
        { marker: '02', title: 'Host-native validation', description: 'Element, Naive UI, and Antd keep their own rules, red text, and focus behavior.', detail: 'Adapters bridge validate, clear, and scroll.' },
        { marker: '03', title: 'Typed server errors', description: 'API field errors stay reactive and clear when their field changes.', detail: 'form.setErrors() → errors → scrollToFirstError().' },
        { marker: '04', title: 'Linkage without a renderer', description: 'Keep native templates while centralizing conditional state and dependent options.', detail: 'when, conditional rules, and linkage remain plain TypeScript.' },
        { marker: '05', title: 'Stable dynamic rows', description: 'Append, move, replace, and remove nested rows without using array indexes as keys.', detail: "form.list('items') exposes stable rows." },
        { marker: '06', title: 'Schema when you need it', description: 'Use Zod for schema-only validation and parsed submit output.', detail: 'The UI adapter remains optional for headless validation.' },
      ],
    },
    workflow: {
      eyebrow: 'The short path',
      title: 'Defaults, one host binding, then business code.',
      description: 'The recommended Element Plus entry configures the adapter and infers the model type from defaults.',
      steps: [
        { number: '01', title: 'Describe defaults and rules', description: 'Defaults infer model and submit types.', code: "useElForm({ defaults, rules, onSubmit })" },
        { number: '02', title: 'Bind the existing Form', description: 'One binding wires ref, model, and rules.', code: '<el-form v-bind="form.host">' },
        { number: '03', title: 'Drive the lifecycle', description: 'Load records, submit, reset, and inspect dirty state.', code: "form.load('edit', detail)" },
      ],
    },
    decision: {
      eyebrow: 'Pick the right layer',
      title: 'vformjs fits teams that want to keep their current UI Form.',
      description: 'A form library decision gets easier when state ownership is explicit.',
      columns: { name: 'Option', approach: 'State and validation', lifecycle: 'CRUD lifecycle', fit: 'Good fit when' },
      rows: [
        { name: 'Native UI Form', approach: 'Host-owned', lifecycle: 'Hand-written per screen', fit: 'The project has only a few simple forms' },
        { name: 'vformjs', approach: 'Host validation + shared state', lifecycle: 'Built in', fit: 'Admin screens repeat across an existing UI library' },
        { name: 'vee-validate / Vuelidate', approach: 'Independent form engine', lifecycle: 'Application-defined', fit: 'The team wants field-level headless control' },
        { name: 'FormKit / FormCreate', approach: 'Component or schema runtime', lifecycle: 'Framework-owned', fit: 'The team wants generated or low-code forms' },
      ],
      note: 'Do not bind vformjs and another complete form engine to the same fields. Pick one state owner.',
    },
    finalCta: {
      eyebrow: 'A safe place to start',
      title: 'Move one repeated dialog form first.',
      description: 'Keep the business components. Standardize mode, reset, submit, and errors, then decide whether the layer earns a place in the next screen.',
      primaryAction: { label: 'Open the guide', href: '/guide' },
      secondaryAction: { label: 'Browse examples', href: '/examples' },
    },
  },
  zh: {
    locale: 'zh',
    eyebrow: 'Vue 2.7 / Vue 3 · 保留现有 UI 组件库',
    title: '把后台表单的重复状态',
    titleAccent: '收进一套 API。',
    description: 'Element、Naive UI、Ant Design Vue 继续负责控件和校验提示。vformjs 管 create、edit、detail、联动、动态数组和服务端错误。',
    primaryAction: { label: '跑通第一个表单', href: '/zh/guide' },
    secondaryAction: { label: '现场改一遍状态', href: '#live-demo' },
    heroNote: 'Element Plus 项目直接用 @vformjs/element-plus。自研 UI 再下沉到 useForm。',
    signals: [
      { value: '2.7 + 3', label: 'Vue 版本' },
      { value: '4', label: '已验证 UI 路径' },
      { value: '73', label: '行为测试' },
      { value: '9.54 kB', label: 'core gzip' },
    ],
    problem: {
      eyebrow: 'UI Form 之外的重复代码',
      title: '字段校验有组件管，表单生命周期还散在每个页面里。',
      description: '后台项目会反复写模式切换、重置基线、提交锁、条件规则、数组 key 和接口错误。vformjs 沿用宿主 Form 的红字和焦点，只把这些重复状态收回到一个有类型的实例里。',
      beforeLabel: '每个页面重新写',
      afterLabel: '交给 form 实例',
      before: ['弹窗模式分支', '重置时机和旧错误', '动态行 key', '提交 loading', '条件规则清理'],
      after: ["load('create' | 'edit' | 'detail')", 'dirty + changedPaths', "form.list('contacts')", 'submit() + submitting', 'when + 条件 rules'],
    },
    demo: {
      eyebrow: '现场状态',
      title: '切模式、改字段，看同一份契约怎么动。',
      description: '下面的小表单直接演示 baseline、dirty、服务端错误和详情只读语义。',
      modes: { create: '新建', edit: '编辑', detail: '详情' },
      fields: { name: '姓名', email: '邮箱' },
      placeholders: { name: '例如：林然…', email: 'name@example.com…' },
      actions: { submit: '提交', reset: '重置', loadError: '写入接口错误' },
      status: { clean: '基线未改', dirty: '有未保存修改', submitted: '已提交', readonly: '详情只读' },
    },
    features: {
      eyebrow: '一层薄编排',
      title: '宿主负责渲染，vformjs 把生命周期接稳。',
      description: '每个 API 都对应后台表单里一段常见的重复代码。库里没有替代输入框，也不会再塞一套设计系统。',
      items: [
        { marker: '01', title: '三个模式，一个实例', description: '新建、编辑、详情都由弹窗或表单页里的同一个 form 管。', detail: "load('edit', detail) 会同步重置基线和 dirty。" },
        { marker: '02', title: '沿用宿主校验', description: 'Element、Naive UI、Antd 继续管理 rules、红字和滚动。', detail: 'adapter 只桥接 validate、clear 和 scroll。' },
        { marker: '03', title: '接口错误回到字段', description: '服务端字段错误保持响应式，字段一改，旧错误就清掉。', detail: 'form.setErrors() → errors → scrollToFirstError()。' },
        { marker: '04', title: '联动留在业务代码里', description: '模板照常写，显隐、动态规则和下拉选项集中到 TypeScript。', detail: 'when、条件 rules、linkage 各管一件事。' },
        { marker: '05', title: '动态行有稳定 key', description: '新增、移动、替换、删除嵌套行，不再拿数组下标充当 key。', detail: "form.list('items') 提供稳定 rows。" },
        { marker: '06', title: 'Schema 按需接入', description: '需要 schema-only 校验和转换后的提交值时，再用 Zod。', detail: '无 UI 宿主也能完成 schema 校验。' },
      ],
    },
    workflow: {
      eyebrow: '最短接入路径',
      title: '写 defaults，绑定一次宿主，剩下的是业务代码。',
      description: 'Element Plus 入口已经配好 adapter，model 和 onSubmit 的类型直接从 defaults 推出来。',
      steps: [
        { number: '01', title: '写默认值和规则', description: 'defaults 同时确定模型和提交参数类型。', code: 'useElForm({ defaults, rules, onSubmit })' },
        { number: '02', title: '绑定现有 Form', description: '一个 v-bind 接好 ref、model 和 rules。', code: '<el-form v-bind="form.host">' },
        { number: '03', title: '驱动表单生命周期', description: '加载记录、提交、重置，再读取 dirty。', code: "form.load('edit', detail)" },
      ],
    },
    decision: {
      eyebrow: '怎么选',
      title: '团队想保留现有 UI Form，vformjs 才进入候选。',
      description: '先定字段状态由谁持有，选型会简单很多。',
      columns: { name: '方案', approach: '状态和校验', lifecycle: 'CRUD 生命周期', fit: '适用场景' },
      rows: [
        { name: 'UI 库原生 Form', approach: '宿主持有', lifecycle: '每页手写', fit: '项目只有少量简单表单' },
        { name: 'vformjs', approach: '宿主校验 + 共享状态', lifecycle: '内置', fit: '后台页面多，继续使用现有 UI 库' },
        { name: 'vee-validate / Vuelidate', approach: '独立表单引擎', lifecycle: '业务自行组织', fit: '团队需要字段级 headless 控制' },
        { name: 'FormKit / FormCreate', approach: '组件或 Schema Runtime', lifecycle: '框架持有', fit: '团队要生成式或低代码表单' },
      ],
      note: '同一批字段不要同时绑定 vformjs 和另一套完整表单引擎。状态只留一个主人。',
    },
    finalCta: {
      eyebrow: '从哪里开始',
      title: '先换掉一个重复最多的弹窗表单。',
      description: '业务组件照旧。模式、重置、提交和错误先统一一遍，再看下一张页面还要不要继续用。',
      primaryAction: { label: '打开快速开始', href: '/zh/guide' },
      secondaryAction: { label: '查看示例入口', href: '/zh/examples' },
    },
  },
}
