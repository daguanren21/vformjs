/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // monorepo scopes
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'vue',
        'zod',
        'shared',
        'schema',
        'element-plus',
        'element-ui',
        'playground',
        'ci',
        'deps',
        'release',
        'docs',
        'repo',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
}
