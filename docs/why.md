# Why vformjs

UI libraries already provide capable Form components. In a real admin project, field rendering and validation are only part of the work. Mode switching, reset baselines, submit state, conditional rules, dynamic rows, and API errors still get rebuilt in each dialog and page.

vformjs gives that repeated lifecycle one typed owner while keeping the existing UI Form in charge of validation feedback.

## The boundary

The UI library keeps:

- inputs, labels, layout, and accessibility;
- rule execution and field-level error presentation;
- focus, scroll, and component-specific behavior.

vformjs keeps:

- create, edit, and detail modes;
- defaults, reset baselines, dirty state, and changed paths;
- submit state and structured results;
- conditional visibility, rules, and linkage;
- stable dynamic arrays;
- reactive API field errors.

## When it fits

vformjs is a good candidate when a Vue admin project:

- already uses Element Plus, element-ui, Naive UI, or Ant Design Vue;
- has many CRUD dialogs or form pages;
- wants to keep native templates and components;
- repeats the same load, reset, submit, and linkage code;
- needs one API across Vue 2.7 and Vue 3 projects.

## When another tool is clearer

Use the UI library directly when the project has only a few simple forms.

Use vee-validate, Vuelidate, or TanStack Form when the team wants an independent field-level form engine. Do not bind two complete engines to the same fields.

Use FormKit, FormCreate, Vueform, or Formily when schema rendering, generated inputs, or visual form building is the product requirement.

## Validation ownership stays explicit

`rules` in vformjs describe rules for a real host Form. Active rules without an adapter return a configuration error instead of silently passing. Schema-only forms use `useZodForm`, which validates through Zod without a UI host.

```ts
// Existing Element Plus host owns visual validation.
const form = useElForm({ defaults, rules, onSubmit })

// No UI host: Zod owns validation.
const form = useZodForm({ schema, defaults, onSubmit })
```

[Build the first form](/guide) or [inspect the runnable examples](/examples).
