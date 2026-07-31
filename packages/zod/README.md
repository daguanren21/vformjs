# @vformjs/zod

Zod bridge for [vformjs](https://github.com/daguanren21/vformjs): schema → field rules + parsed submit output.

## Install

```bash
pnpm add @vformjs/zod zod vue
```

With Element Plus / element-ui you can also use the UI package entry:

```ts
import { useZodForm } from '@vformjs/element-plus/zod'
```

## Quick start

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/zod'
import { createElementPlusAdapter } from '@vformjs/element-plus'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

const form = useZodForm({
  schema,
  defaults: { name: '', email: '' },
  adapter: createElementPlusAdapter(),
  onSubmit: async (values) => {
    // values typed as Zod output
    await api.save(values)
  },
})
```

## Related

| Package | Role |
|---|---|
| `@vformjs/vue` | `useForm` / adapters |
| `@vformjs/element-plus` | Element Plus + `./zod` |
| `@vformjs/element-ui` | element-ui + `./zod` |

MIT · [Repo](https://github.com/daguanren21/vformjs)
