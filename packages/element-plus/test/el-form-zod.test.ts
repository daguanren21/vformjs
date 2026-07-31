import { mount, flushPromises } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useZodForm } from '../src/use-zod-form'

const schema = z.object({
  username: z.string().min(3, '至少 3 位'),
  email: z.email('邮箱不正确'),
}).refine(v => v.username !== 'admin', {
  message: '用户名不能为 admin',
  path: ['username'],
})

function createHarness(defaults: { username: string, email: string }) {
  return defineComponent({
    name: 'ZodElFormHarness',
    setup() {
      const form = useZodForm({
        schema,
        defaults,
      })
      // Explicit host bind — reliable under @vue/test-utils
      const onFormRef = (inst: unknown) => {
        form.bindHost(inst)
      }
      return { form, onFormRef }
    },
    template: `
      <el-form
        :ref="onFormRef"
        :model="form.model"
        :rules="form.rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.model.username" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.model.email" />
        </el-form-item>
      </el-form>
    `,
  })
}

describe('useZodForm + ElForm host integration', () => {
  it('host-bound submit surfaces refine + email errors via FormResult', async () => {
    const wrapper = mount(createHarness({ username: 'admin', email: 'bad' }), {
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    await flushPromises()

    const form = (wrapper.vm as any).form
    // Host must be bound (not the unbound fallback path)
    expect(wrapper.findComponent({ name: 'ElForm' }).exists()).toBe(true)

    const res = await form.submit()
    expect(res.ok).toBe(false)
    if (res.ok)
      return

    // Must not be the unbound-host marker
    expect(res.errors._form?.[0] ?? '').not.toMatch(/not bound/)
    // refine on username + email rule
    expect(res.errors.username?.[0]).toContain('admin')
    expect(res.errors.email?.[0]).toContain('邮箱')

    // Field rules themselves reject with the same messages (what ElForm uses for red text)
    const userRule = form.rules.username[0]
    await expect(userRule.validator({}, 'admin')).rejects.toThrow(/admin/)
    const emailRule = form.rules.email[0]
    await expect(emailRule.validator({}, 'bad')).rejects.toThrow(/邮箱/)

    wrapper.unmount()
  })

  it('host-bound submit succeeds after fixing values', async () => {
    const wrapper = mount(createHarness({ username: 'admin', email: 'bad' }), {
      global: { plugins: [ElementPlus] },
    })
    await nextTick()
    await flushPromises()

    const form = (wrapper.vm as any).form
    const first = await form.submit()
    expect(first.ok).toBe(false)

    form.model.username = 'alice'
    form.model.email = 'a@b.com'
    await flushPromises()

    const second = await form.submit()
    expect(second.ok).toBe(true)
    if (second.ok) {
      expect(second.values.username).toBe('alice')
      expect(second.values.email).toBe('a@b.com')
    }

    // rules resolve when valid
    await expect(form.rules.username[0].validator({}, 'alice')).resolves.toBeUndefined()
    await expect(form.rules.email[0].validator({}, 'a@b.com')).resolves.toBeUndefined()

    wrapper.unmount()
  })

  it('array schema generates members.i.name rules after list append', async () => {
    const listSchema = z.object({
      members: z.array(z.object({
        name: z.string().min(1, '姓名必填'),
      })),
    })

    // Host shell only — array rule expansion is form API, not template-dependent
    const Harness = defineComponent({
      setup() {
        const form = useZodForm({
          schema: listSchema,
          defaults: { members: [{ name: 'a' }] },
        })
        const members = form.list('members', {
          defaultItem: () => ({ name: '' }),
        })
        const onFormRef = (inst: unknown) => form.bindHost(inst)
        return { form, members, onFormRef }
      },
      template: `
        <el-form :ref="onFormRef" :model="form.model" :rules="form.rules">
          <el-form-item prop="members.0.name">
            <el-input v-model="form.model.members[0].name" />
          </el-form-item>
        </el-form>
      `,
    })

    const wrapper = mount(Harness, { global: { plugins: [ElementPlus] } })
    await nextTick()
    await flushPromises()

    const form = (wrapper.vm as any).form
    const members = (wrapper.vm as any).members
    expect(form.rules['members.0.name']).toBeTruthy()

    members.append({ name: '' })
    form.notifyChange('members')
    await Promise.resolve()
    await Promise.resolve()
    await flushPromises()

    expect(form.rules['members.1.name']).toBeTruthy()
    await expect(form.rules['members.1.name'][0].validator({}, '')).rejects.toThrow(/姓名/)

    wrapper.unmount()
  })
})
