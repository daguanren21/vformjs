# Runnable examples

Three live demos run directly on this page, in the order an integration usually meets them: dialog CRUD modes, conditional linkage, then dynamic arrays with Zod. Each holds its own form instance — edit fields, submit, and reset to inspect the state.

- [Dialog CRUD](#dialog-crud) — `form.load()` across create, edit, and detail
- [Conditional linkage](#conditional-linkage) — `when`, `whenRules`, and `linkage`
- [Dynamic arrays and Zod](#zod-list) — `form.list()` rows with schema-parsed submit data

<LiveCrudDialogDemo locale="en" />

<LiveConditionalDemo locale="en" />

<LiveZodListDemo locale="en" />

## Repository playgrounds

The repository ships four complete playgrounds against real UI libraries.

### Element Plus · Vue 3

Covers basic forms, CRUD dialogs and pages, conditional fields, cross-field rules, dynamic arrays, Zod, and custom adapters.

```bash
pnpm dev:vue3
```

[Browse the source](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-element-plus)

### element-ui · Vue 2.7

Covers the same create, edit, detail, reset, and submit lifecycle on the legacy stack.

```bash
pnpm dev:vue2
```

[Browse the source](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue2-element-ui)

### Naive UI · Vue 3

Uses the official `@vformjs/naive-ui` package for `useNaiveForm`, dialog modes, host validation, and Zod.

```bash
pnpm dev:naive
```

[Browse the source](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-naive-ui)

### Ant Design Vue · Vue 3

Uses the official `@vformjs/ant-design-vue` package for partial validation, scrolling, dialog modes, and Zod.

```bash
pnpm dev:antd
```

[Browse the source](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-antd-vue)

## What to verify

A useful evaluation covers behavior, not just the first render:

1. Submit an empty form and inspect host errors.
2. Load edit data, change a value, and inspect `dirty` and `changedPaths`.
3. Reset and confirm the loaded record returns.
4. Apply API errors with `setErrors()` and edit the failing field.
5. Switch to detail and confirm submit is rejected.

[Try the live state on the home page](/#live-demo).

## Feedback

Questions and integration results go to the repository:

- [GitHub Discussions](https://github.com/daguanren21/vformjs/discussions) — usage questions and show-and-tell
- [Integration-feedback issue](https://github.com/daguanren21/vformjs/issues/new?template=integration-feedback.yml) — what worked or blocked adoption
