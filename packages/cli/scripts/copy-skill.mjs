import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(packageRoot, '../../skills/vformjs')
const destination = resolve(packageRoot, 'dist/skill')

rmSync(destination, { force: true, recursive: true })
mkdirSync(dirname(destination), { recursive: true })
cpSync(source, destination, { recursive: true })
