# @vformjs/zod

Zod bridge for [vformjs](https://github.com/daguanren21/vformjs): schema → field rules + parsed submit output.

## Install

```bash
pnpm add @vformjs/zod zod vue
```

With an official UI adapter, prefer its preconfigured `/zod` entry:

```ts
import { useZodForm } from '@vformjs/element-plus/zod'
```

## Quick start

```ts
import { z } from 'zod'
import { submitFail, useZodForm } from '@vformjs/zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

const form = useZodForm({
  schema,
  defaults: { name: '', email: '' },
  onSubmit: async (values) => {
    // values typed as Zod output
    const result = await api.save(values)
    if (!result.ok)
      return submitFail(result.error, { errors: result.fieldErrors })
  },
})
```

All entries return the same flat application-form API as the official UI hooks.
Without a UI host, the resolver validates headlessly; a UI package's `/zod`
entry adds only host binding, error projection, and scrolling.

Typed submit failures preserve parsed Zod output in `values`, expose the API error as
`result.submitError`, and copy optional field errors into the form state.

## Related

| Package | Role |
|---|---|
| `@vformjs/vue` | `useForm` / adapters |
| `@vformjs/element-plus` | Element Plus + `./zod` |
| `@vformjs/element-ui` | element-ui + `./zod` |
| `@vformjs/naive-ui` | Naive UI + `./zod` |
| `@vformjs/ant-design-vue` | Ant Design Vue + `./zod` |

MIT · [Repo](https://github.com/daguanren21/vformjs)
