import { readdirSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
  '.vue',
])

const SKIP_DIRECTORIES: ReadonlySet<string> = new Set([
  '.git',
  '.turbo',
  '.vitepress',
  'coverage',
  'dist',
  'node_modules',
])

export interface CollectSourceFileOptions {
  includePackageJson?: boolean
}

/** Deterministically collect project source files while skipping generated trees. */
export function collectSourceFiles(
  root: string,
  options: CollectSourceFileOptions = {},
  current = root,
  files: string[] = [],
): string[] {
  for (const entry of readdirSync(current).sort()) {
    const path = resolve(current, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry))
        collectSourceFiles(root, options, path, files)
      continue
    }
    if (
      SOURCE_EXTENSIONS.has(extname(entry))
      || (options.includePackageJson && entry === 'package.json')
    ) {
      files.push(path)
    }
  }
  return files
}
