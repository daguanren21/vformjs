<script setup lang="ts">
import { fieldPath } from '@vformjs/element-plus'
import { useZodForm } from '@vformjs/element-plus/zod'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus'
import { computed, ref } from 'vue'
import { z } from 'zod'
import type { HomeLocale } from '../../content'
import LiveExampleFrame from './LiveExampleFrame.vue'

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => props.locale === 'zh'
  ? {
      capability: '动态数组 + Zod',
      title: '动态数组与 Zod：稳定行 key，提交拿解析后数据',
      goal: 'form.list() 管理动态成员行，fieldPath() 生成宿主 prop；Zod 同时约束数组长度和嵌套字段，并在提交前执行 trim。',
      steps: [
        '空表提交 — 项目与成员报错，滚动定位到第一个错误。',
        '删除唯一成员 — 触发数组级 min(1) 错误。',
        '添加成员并在姓名里夹空格 — 输出返回 trim 后的值。',
      ],
      expect: '输出打印的是 schema 解析后的 JSON，不是原始 model。',
      apis: ['useZodForm({ schema })', 'form.list(\'members\')', 'fieldPath()', 'form.submit()'],
      stateLabel: '运行时状态',
      project: '项目名',
      member: '成员',
      name: '姓名',
      role: '角色',
      add: '添加成员',
      remove: '删除',
      submit: '提交',
      reset: '重置',
      output: '解析结果',
      projectRequired: '请填写项目名',
      nameRequired: '请填写成员姓名',
      memberRequired: '至少保留一名成员',
      roles: { dev: '开发', design: '设计', qa: '测试' },
    }
  : {
      capability: 'Dynamic array + Zod',
      title: 'Dynamic arrays and Zod: stable row keys, parsed output',
      goal: 'form.list() owns dynamic member rows, fieldPath() creates host props, and Zod validates array length and nested fields before returning trimmed submit data.',
      steps: [
        'Submit empty — project and member errors appear, scroll lands on the first.',
        'Remove the only member — the array-level min(1) error fires.',
        'Add a member, pad the name with spaces — output returns it trimmed.',
      ],
      expect: 'The output panel prints schema-parsed JSON, not the raw model.',
      apis: ['useZodForm({ schema })', 'form.list(\'members\')', 'fieldPath()', 'form.submit()'],
      stateLabel: 'Runtime state',
      project: 'Project',
      member: 'Member',
      name: 'Name',
      role: 'Role',
      add: 'Add member',
      remove: 'Remove',
      submit: 'Submit',
      reset: 'Reset',
      output: 'Parsed output',
      projectRequired: 'Enter a project name',
      nameRequired: 'Enter a member name',
      memberRequired: 'Keep at least one member',
      roles: { dev: 'Developer', design: 'Designer', qa: 'QA' },
    })

const sourceHref = 'https://github.com/daguanren21/vformjs/blob/main/docs/.vitepress/theme/components/examples/LiveZodListDemo.vue'

const schema = z.object({
  project: z.string().trim().min(1, copy.value.projectRequired),
  members: z.array(z.object({
    name: z.string().trim().min(1, copy.value.nameRequired),
    role: z.enum(['dev', 'design', 'qa']),
  })).min(1, copy.value.memberRequired),
})

const output = ref('')
const form = useZodForm({
  schema,
  defaults: {
    project: '',
    members: [{ name: '', role: 'dev' as const }],
  },
  onSubmit: async (values) => {
    output.value = JSON.stringify(values, null, 2)
  },
})

const members = form.list('members', {
  defaultItem: () => ({ name: '', role: 'dev' as const }),
})

async function submit() {
  output.value = ''
  const result = await form.submit()
  if (!result.ok) {
    output.value = JSON.stringify(result.errors, null, 2)
  }
}

function reset() {
  form.reset()
  output.value = ''
}
</script>

<template>
  <LiveExampleFrame
    :locale="locale"
    anchor="zod-list"
    index="03"
    :capability="copy.capability"
    :title="copy.title"
    :goal="copy.goal"
    :steps="copy.steps"
    :expect="copy.expect"
    :apis="copy.apis"
    :source-href="sourceHref"
    :state-label="copy.stateLabel"
  >
    <ElForm
      v-bind="form.host"
      class="zod-form"
      label-position="top"
      @submit.prevent
    >
      <ElFormItem
        :label="copy.project"
        prop="project"
        :error="form.errors.project?.[0]"
      >
        <ElInput
          v-model="form.model.project"
          name="project"
          autocomplete="off"
          :placeholder="copy.project"
        />
      </ElFormItem>

      <div class="member-list">
        <div
          v-for="(row, index) in members.fields"
          :key="row.key"
          class="member-row"
        >
          <span class="member-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <ElFormItem
            :label="`${copy.member} ${index + 1} · ${copy.name}`"
            :prop="fieldPath('members', index, 'name')"
            :error="form.errors[fieldPath('members', index, 'name')]?.[0]"
          >
            <ElInput
              v-model="form.model.members[index].name"
              :name="`members.${index}.name`"
              autocomplete="off"
              :placeholder="copy.name"
            />
          </ElFormItem>
          <ElFormItem
            :label="copy.role"
            :prop="fieldPath('members', index, 'role')"
          >
            <ElSelect v-model="form.model.members[index].role" style="width: 100%">
              <ElOption :label="copy.roles.dev" value="dev" />
              <ElOption :label="copy.roles.design" value="design" />
              <ElOption :label="copy.roles.qa" value="qa" />
            </ElSelect>
          </ElFormItem>
          <ElButton class="member-remove" @click="members.remove(index)">
            {{ copy.remove }}
          </ElButton>
        </div>
      </div>

      <div class="zod-actions">
        <ElButton @click="members.append()">
          {{ copy.add }}
        </ElButton>
        <ElButton type="primary" :loading="form.submitting" @click="submit">
          {{ copy.submit }}
        </ElButton>
        <ElButton @click="reset">
          {{ copy.reset }}
        </ElButton>
      </div>
    </ElForm>

    <template #state>
      <p><span>members</span><code>{{ members.fields.length }}</code></p>
      <p><span>submitting</span><code>{{ form.submitting }}</code></p>
      <div class="zod-output">
        <p class="zod-output__bar">
          <span>{{ copy.output }}</span>
          <span>Zod 4</span>
        </p>
        <pre aria-live="polite">{{ output || '{\n  "status": "waiting"\n}' }}</pre>
      </div>
    </template>
  </LiveExampleFrame>
</template>

<style scoped>
.zod-form {
  min-width: 0;
}

.member-list {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.member-row {
  display: grid;
  grid-template-columns: 40px minmax(150px, 1fr) minmax(120px, 0.55fr) auto;
  gap: 12px;
  align-items: end;
  padding: 14px 16px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-sunken);
}

.member-row :deep(.el-form-item) {
  margin-bottom: 0;
}

.member-number {
  align-self: center;
  color: var(--ph-accent);
  font: 700 0.72rem/1 var(--ph-font-mono);
  font-variant-numeric: tabular-nums;
}

.zod-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.zod-output {
  grid-column: 1 / -1;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ph-band-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ph-band-fg) 4%, transparent);
}

.zod-output__bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ph-band-line);
  color: var(--vx-band-muted);
  font: 650 0.66rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.zod-output pre {
  min-height: 200px;
  margin: 0;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  color: var(--vx-band-value);
  font-size: 0.76rem;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .member-row {
    grid-template-columns: 32px 1fr;
  }

  .member-row :deep(.el-form-item),
  .member-remove {
    grid-column: 2;
  }

  .member-remove {
    justify-self: start;
  }
}
</style>
