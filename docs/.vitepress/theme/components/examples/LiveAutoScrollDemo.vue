<script setup lang="ts">
import { r, useElForm } from '@vformjs/element-plus'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus'
import { computed, shallowRef, useTemplateRef } from 'vue'
import type { HomeLocale } from '../../content'
import LiveExampleFrame from './LiveExampleFrame.vue'

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => props.locale === 'zh'
  ? {
      capability: '保存失败定位',
      title: '点击保存，自动滚动到第一个错误字段',
      goal: '操作按钮保持可见，必填字段藏在长表单下方。submit 失败时默认自动滚动，由宿主表单完成字段定位。',
      steps: [
        '保持滚动区在顶部，下方的「审批理由」默认留空。',
        '直接点击保存，不需要先寻找错误字段。',
        '表单自动滚动到底部，并在目标字段旁显示错误。',
        '填写审批理由后再次保存，确认提交成功。',
      ],
      expect: '滚动只发生在表单工作区，保存按钮保持原位；状态面板同步显示目标字段与错误。',
      apis: ['form.submit()', 'scrollToError: true', 'adapter.scrollToField()'],
      stateLabel: '滚动状态',
      viewportLabel: '长表单滚动区域',
      targetHint: '必填目标位于当前滚动区下方',
      actionHint: '无需手动查找字段，直接保存。',
      labels: {
        requestId: '申请编号',
        requester: '申请人',
        team: '所属团队',
        service: '变更服务',
        environment: '目标环境',
        changeWindow: '变更窗口',
        fallback: '回滚方案',
        approvalReason: '审批理由',
      },
      approvalPlaceholder: '说明本次生产变更必须执行的原因',
      requiredApproval: '请填写审批理由',
      save: '保存',
      reset: '重置演示',
      ready: '等待保存',
      failed: '已定位到第一个错误字段',
      saved: '保存成功',
      status: '结果',
    }
  : {
      capability: 'Save-error navigation',
      title: 'Save, then scroll to the first invalid field automatically',
      goal: 'The action stays visible while a required field sits below the long form fold. Failed submit scrolls automatically through the host form.',
      steps: [
        'Leave the form viewport at the top; Approval reason is empty below the fold.',
        'Click Save without searching for the missing field.',
        'The form scrolls to the target and renders its inline error.',
        'Fill Approval reason and save again to confirm success.',
      ],
      expect: 'Only the form workbench scrolls while the Save action stays put; target and errors update in the state panel.',
      apis: ['form.submit()', 'scrollToError: true', 'adapter.scrollToField()'],
      stateLabel: 'Scroll state',
      viewportLabel: 'Long form scroll area',
      targetHint: 'The required target is below this viewport',
      actionHint: 'No manual field search — save directly.',
      labels: {
        requestId: 'Request ID',
        requester: 'Requester',
        team: 'Team',
        service: 'Service',
        environment: 'Environment',
        changeWindow: 'Change window',
        fallback: 'Rollback plan',
        approvalReason: 'Approval reason',
      },
      approvalPlaceholder: 'Explain why this production change must proceed',
      requiredApproval: 'Enter an approval reason',
      save: 'Save',
      reset: 'Reset demo',
      ready: 'Ready to save',
      failed: 'Moved to the first invalid field',
      saved: 'Saved successfully',
      status: 'Result',
    })

const sourceHref = 'https://github.com/daguanren21/vformjs/blob/main/docs/.vitepress/theme/components/examples/LiveAutoScrollDemo.vue'
const viewport = useTemplateRef<HTMLDivElement>('viewport')
const scrollPosition = shallowRef(0)
const targetPath = shallowRef('—')
const status = shallowRef(copy.value.ready)

const form = useElForm({
  defaults: {
    requestId: 'REQ-2026-081',
    requester: 'Ada Lin',
    team: 'Platform',
    service: 'Billing API',
    environment: 'Production',
    changeWindow: 'Friday 22:00 UTC',
    fallback: 'Rollback to v42',
    approvalReason: '',
  },
  rules: {
    approvalReason: [r.required(copy.value.requiredApproval)],
  },
  onSubmit: async () => {
    targetPath.value = '—'
    status.value = copy.value.saved
  },
})

async function submit() {
  targetPath.value = '—'
  status.value = copy.value.ready
  const result = await form.submit()
  if (result.ok)
    return

  targetPath.value = Object.keys(result.errors).find(path => path !== '_form') ?? '—'
  status.value = copy.value.failed
}

function reset() {
  form.reset()
  targetPath.value = '—'
  status.value = copy.value.ready
  viewport.value?.scrollTo({ top: 0 })
}

function updateScrollPosition(event: Event) {
  scrollPosition.value = Math.round((event.currentTarget as HTMLElement).scrollTop)
}
</script>

<template>
  <LiveExampleFrame
    :locale="locale"
    anchor="save-error-scroll"
    index="04"
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
      class="scroll-demo"
      label-position="top"
      @submit.prevent
    >
      <div class="scroll-demo__notice">
        <span class="scroll-demo__signal" aria-hidden="true" />
        <span>{{ copy.targetHint }}</span>
      </div>

      <div
        ref="viewport"
        class="scroll-demo__viewport"
        tabindex="0"
        :aria-label="copy.viewportLabel"
        @scroll="updateScrollPosition"
      >
        <div class="scroll-demo__fields">
          <ElFormItem :label="copy.labels.requestId" prop="requestId">
            <ElInput v-model="form.model.requestId" name="requestId" autocomplete="off" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.requester" prop="requester">
            <ElInput v-model="form.model.requester" name="requester" autocomplete="name" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.team" prop="team">
            <ElInput v-model="form.model.team" name="team" autocomplete="organization" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.service" prop="service">
            <ElInput v-model="form.model.service" name="service" autocomplete="off" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.environment" prop="environment">
            <ElInput v-model="form.model.environment" name="environment" autocomplete="off" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.changeWindow" prop="changeWindow">
            <ElInput v-model="form.model.changeWindow" name="changeWindow" autocomplete="off" />
          </ElFormItem>
          <ElFormItem :label="copy.labels.fallback" prop="fallback">
            <ElInput v-model="form.model.fallback" name="fallback" autocomplete="off" />
          </ElFormItem>
          <ElFormItem
            class="scroll-demo__target"
            :label="copy.labels.approvalReason"
            v-bind="form.item('approvalReason')"
          >
            <ElInput
              v-model="form.model.approvalReason"
              name="approvalReason"
              type="textarea"
              :rows="3"
              :placeholder="copy.approvalPlaceholder"
            />
          </ElFormItem>
        </div>
      </div>

      <div class="scroll-demo__actions">
        <span class="scroll-demo__action-hint">{{ copy.actionHint }}</span>
        <ElButton @click="reset">
          {{ copy.reset }}
        </ElButton>
        <ElButton type="primary" :loading="form.submitting" @click="submit">
          {{ copy.save }}
        </ElButton>
      </div>
    </ElForm>

    <template #state>
      <p><span>scrollTop</span><code>{{ scrollPosition }}px</code></p>
      <p><span>targetPath</span><code>{{ targetPath }}</code></p>
      <p><span>errors</span><code>{{ JSON.stringify(form.errors) }}</code></p>
      <p aria-live="polite">
        <span>{{ copy.status }}</span><code>{{ status }}</code>
      </p>
    </template>
  </LiveExampleFrame>
</template>

<style scoped>
.scroll-demo {
  min-width: 0;
}

.scroll-demo__notice {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  color: var(--ph-ink-soft);
  font-size: 0.82rem;
  line-height: 1.5;
}

.scroll-demo__signal {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--ph-accent);
  box-shadow: 0 0 0 4px var(--ph-accent-wash);
}

.scroll-demo__viewport {
  height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  scroll-padding: 18px;
  scrollbar-gutter: stable;
  border: 1px solid var(--ph-line-strong);
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-sunken);
}

.scroll-demo__viewport:focus-visible {
  outline: 2px solid var(--ph-accent);
  outline-offset: 3px;
}

.scroll-demo__fields {
  padding: 18px;
}

.scroll-demo__target {
  margin-top: 26px;
  padding-top: 24px;
  border-top: 1px solid var(--ph-line);
}

.scroll-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}

.scroll-demo__action-hint {
  min-width: min(100%, 240px);
  flex: 1 1 240px;
  color: var(--ph-ink-faint);
  font-size: 0.78rem;
  line-height: 1.55;
}

.scroll-demo__actions :deep(.el-button) {
  min-height: 44px;
}

@media (max-width: 560px) {
  .scroll-demo__viewport {
    height: 300px;
  }

  .scroll-demo__actions :deep(.el-button) {
    flex: 1 1 calc(50% - 5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-demo__viewport {
    scroll-behavior: auto;
  }
}
</style>
