// i18n coverage report: `node scripts/i18n_check.mjs` (add --strict to fail on gaps)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../inertia/', import.meta.url).pathname
const strict = process.argv.includes('--strict')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const dictSource = readFileSync(join(ROOT, 'lib/i18n/tr.ts'), 'utf8')
const dictKeys = new Set()
for (const m of dictSource.matchAll(/^ {2}(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"):/gm)) {
  dictKeys.add((m[1] ?? m[2]).replace(/\\'/g, "'"))
}

const files = walk(ROOT).filter((f) => f.endsWith('.tsx') && !f.includes('/lib/'))
const untranslated = []
const missingKeys = new Map()

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const rel = file.replace(ROOT, '')
  const usesT = /useT\(/.test(src)

  // visible text between tags or in text-bearing attributes that is not wrapped in t()
  const jsxText = [...src.matchAll(/>\s*([A-Z][A-Za-z][^<>{}\n]{2,})\s*</g)].map((m) => m[1].trim())
  const attrText = [...src.matchAll(/\b(?:title|placeholder|aria-label|label|description)="([^"{}]*[A-Za-z]{3,}[^"{}]*)"/g)].map((m) => m[1])
  const hardcoded = [...jsxText, ...attrText]
  if (hardcoded.length > 0) untranslated.push({ rel, usesT, count: hardcoded.length, sample: hardcoded[0] })

  for (const m of src.matchAll(/\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    const key = (m[1] ?? m[2]).replace(/\\'/g, "'")
    if (!dictKeys.has(key)) {
      if (!missingKeys.has(key)) missingKeys.set(key, rel)
    }
  }
}

untranslated.sort((a, b) => b.count - a.count)
console.log(`Dictionary entries: ${dictKeys.size}`)
console.log(`Files: ${files.length}, with hardcoded visible text: ${untranslated.length}`)
for (const u of untranslated) {
  console.log(`  ${String(u.count).padStart(3)}  ${u.rel}${u.usesT ? '' : '  (no useT)'}  e.g. "${u.sample.slice(0, 50)}"`)
}
console.log(`\nt() keys missing from the Turkish dictionary: ${missingKeys.size}`)
for (const [key, rel] of missingKeys) console.log(`  ${rel}: ${key.slice(0, 80)}`)

if (strict && (untranslated.length > 0 || missingKeys.size > 0)) process.exit(1)
