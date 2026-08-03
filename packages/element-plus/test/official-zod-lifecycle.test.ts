import { describe, expect, it, vi } from 'vitest'
import { useZodForm as useAntdZodForm } from '../../ant-design-vue/src/use-zod-form'
import { useZodForm as useNaiveZodForm } from '../../naive-ui/src/use-zod-form'
import { z } from 'zod'

const schema = z.object({
  members: z.array(z.object({
    email: z.email('invalid email'),
  })),
}).superRefine(({ members }, ctx) => {
  const seen = new Set<string>()
  members.forEach((member, index) => {
    if (seen.has(member.email)) {
      ctx.addIssue({
        code: 'custom',
        message: 'duplicate email',
        path: ['members', index, 'email'],
      })
    }
    seen.add(member.email)
  })
})

async function flushRules() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('official adapter Zod array lifecycle', () => {
  it.each([
    {
      name: 'Naive UI',
      create: useNaiveZodForm,
      host: () => ({
        validate: vi.fn(async () => {}),
        restoreValidation: vi.fn(),
      }),
    },
    {
      name: 'Ant Design Vue',
      create: useAntdZodForm,
      host: () => ({
        validateFields: vi.fn(async () => ({})),
        clearValidate: vi.fn(),
        scrollToField: vi.fn(),
      }),
    },
  ])('$name rebuilds array refine rules and validates after host rebind', async ({ create, host }) => {
    const firstHost = host()
    const form = create({
      schema,
      defaults: { members: [{ email: 'member@example.com' }] },
    })
    form.host.ref(firstHost)
    form.host.ref(null)

    form.list('members', {
      defaultItem: () => ({ email: '' }),
    }).append({ email: 'member@example.com' })
    form.notifyChange('members')
    await flushRules()

    expect(form.rules['members.1.email']).toBeTruthy()
    const duplicate = await form.validateField('members.1.email')
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok)
      expect(duplicate.errors['members.1.email']).toEqual(['duplicate email'])

    const secondHost = host()
    form.host.ref(secondHost)
    form.model.members[1]!.email = 'other@example.com'
    form.notifyChange('members.1.email')

    expect((await form.validateField('members.1.email')).ok).toBe(true)
    if ('validate' in secondHost)
      expect(secondHost.validate).toHaveBeenCalled()
    else
      expect(secondHost.validateFields).toHaveBeenCalledWith([['members', 1, 'email']])

    form.list('members').remove(1)
    form.notifyChange('members')
    await flushRules()
    expect(form.rules['members.1.email']).toBeUndefined()
  })
})
