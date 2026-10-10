#!/usr/bin/env node
/*
 * Genera design-system/tokens/tokens.css a partir de design-system/tokens/*.json.
 *
 *   node design-system/scripts/build-tokens.mjs           → (re)escribe tokens.css
 *   node design-system/scripts/build-tokens.mjs --check   → falla si tokens.css no
 *                                                           está al día (útil en CI)
 *
 * tokens.css es un archivo GENERADO: no se edita a mano. Los componentes CSS solo
 * consumen sus variables (--ds-*), así que los JSON son la única fuente de verdad.
 *
 * Nombres: --ds-<prefijo>-<ruta-en-kebab-case>
 *   colors.json      feedback.danger        → --ds-color-feedback-danger
 *   typography.json  scale.body.lineHeight  → --ds-font-body-line-height
 *   typography.json  family.sans            → --ds-font-family-sans
 *   spacing.json     radii.medium           → --ds-radii-medium
 *   sizes.json       control.min-height.sm  → --ds-control-min-height-sm
 *   motion.json      duration.fast          → --ds-duration-fast
 *   shadows.json     md                     → --ds-shadow-md
 *
 * Modos claro/oscuro: un token cuyo valor es { "light": …, "dark": … } genera
 * su valor claro en :root y el oscuro en dos bloques:
 *   - @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }
 *     → sigue al sistema salvo que la app fuerce el modo claro.
 *   - :root[data-theme="dark"] → modo oscuro forzado por la app.
 *
 * Unidades: duration.* → ms; claves sin unidad (UNITLESS) → número tal cual;
 * resto de números → px. Las cadenas se copian tal cual.
 * La clave _meta de cada archivo es documentación, no un token: se ignora.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKENS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'tokens');
const OUT_FILE = join(TOKENS_DIR, 'tokens.css');

/* Prefijo por archivo (sin entrada → sin prefijo) y primer nivel a omitir. */
const PREFIX = { colors: 'color', typography: 'font', shadows: 'shadow' };
const STRIP_ROOT = { typography: 'scale' };
const UNITLESS = /(weight|lineheight|line-height|multiplier|opacity|z-index|ratio|scale|lines)$/i;

const kebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const isModeLeaf = (value) =>
  value !== null &&
  typeof value === 'object' &&
  Object.keys(value).length === 2 &&
  'light' in value &&
  'dark' in value;

function toCssValue(path, value) {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number') {
    throw new Error(`Token ${path.join('.')} tiene un valor no soportado: ${JSON.stringify(value)}`);
  }
  const key = path[path.length - 1];
  if (path[0] === 'duration') return `${value}ms`;
  if (UNITLESS.test(String(key))) return String(value);
  return value === 0 ? '0' : `${value}px`;
}

function flatten(obj, path = [], out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (path.length === 0 && key === '_meta') continue;
    const next = [...path, key];
    if (isModeLeaf(value)) out.push({ path: next, value });
    else if (value !== null && typeof value === 'object') flatten(value, next, out);
    else out.push({ path: next, value });
  }
  return out;
}

function build() {
  const files = readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.json')).sort();
  const seen = new Map();
  const sections = [];
  const darkSections = [];

  for (const file of files) {
    const name = file.replace(/\.json$/, '');
    const json = JSON.parse(readFileSync(join(TOKENS_DIR, file), 'utf8'));
    const lines = [];
    const darkLines = [];

    for (const { path, value } of flatten(json)) {
      const namePath = STRIP_ROOT[name] === path[0] ? path.slice(1) : path;
      const cssName = `--ds-${[PREFIX[name], ...namePath].filter(Boolean).map(kebab).join('-')}`;
      const source = `${name}.${path.join('.')}`;
      if (seen.has(cssName)) {
        throw new Error(`Colisión de nombre ${cssName}: ${seen.get(cssName)} y ${source}`);
      }
      seen.set(cssName, source);

      if (isModeLeaf(value)) {
        lines.push(`${cssName}: ${toCssValue(path, value.light)}; /* ${source}.light */`);
        darkLines.push(`${cssName}: ${toCssValue(path, value.dark)}; /* ${source}.dark */`);
      } else {
        lines.push(`${cssName}: ${toCssValue(path, value)}; /* ${source} */`);
      }
    }
    sections.push({ file, lines });
    if (darkLines.length) darkSections.push({ file, lines: darkLines });
  }

  const block = (list, indent) =>
    list
      .map(({ file, lines }) => [`${indent}/* ${file} */`, ...lines.map((l) => indent + l)].join('\n'))
      .join('\n\n');

  const out = [
    '/*',
    ' * ARCHIVO GENERADO — no editar a mano.',
    ' * Fuente: design-system/tokens/*.json',
    ' * Regenerar: node design-system/scripts/build-tokens.mjs',
    ' */',
    ':root {',
    '  color-scheme: light;',
    '',
    block(sections, '  '),
    '}',
  ];

  if (darkSections.length) {
    out.push(
      '',
      '/* Modo oscuro según el sistema, salvo que la app fuerce data-theme="light". */',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      '    color-scheme: dark;',
      '',
      block(darkSections, '    '),
      '  }',
      '}',
      '',
      '/* Modo oscuro forzado por la app. */',
      ':root[data-theme="dark"] {',
      '  color-scheme: dark;',
      '',
      block(darkSections, '  '),
      '}',
    );
  }

  out.push('');
  return out.join('\n');
}

const css = build();

if (process.argv.includes('--check')) {
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '';
  if (current.replace(/\r\n/g, '\n') !== css) {
    console.error('tokens.css está desactualizado. Ejecuta: node design-system/scripts/build-tokens.mjs');
    process.exit(1);
  }
  console.log('tokens.css al día.');
} else {
  writeFileSync(OUT_FILE, css);
  console.log(`Generado ${OUT_FILE}`);
}
