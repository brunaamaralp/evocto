/**
 * Contract: critical /api routes must have Netlify function + redirect
 * before the SPA fallback — otherwise production returns HTML.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const REQUIRED = [
  'client-portal',
  'client-accesses',
  'approval-workflow',
  'public-briefing',
  'material-deliveries',
  'invite-client',
  'team-members',
  'generate-material',
  'extract-briefing-inicial',
];

describe('netlify API publish contract', () => {
  const toml = readFileSync(resolve(ROOT, 'netlify.toml'), 'utf8');

  it.each(REQUIRED)('has function file for %s', (name) => {
    const path = resolve(ROOT, 'netlify/functions', `${name}.mjs`);
    expect(existsSync(path)).toBe(true);
  });

  it.each(REQUIRED)('has redirect /api/%s before SPA fallback', (name) => {
    expect(toml).toContain(`from = "/api/${name}"`);
    expect(toml).toContain(`to = "/.netlify/functions/${name}"`);
  });

  it('declares SPA fallback after API redirects', () => {
    const apiIdx = toml.indexOf('from = "/api/client-portal"');
    const spaIdx = toml.indexOf('from = "/*"');
    expect(apiIdx).toBeGreaterThan(-1);
    expect(spaIdx).toBeGreaterThan(apiIdx);
  });
});

describe('vite api-dev routes', () => {
  const plugin = readFileSync(resolve(ROOT, 'vite-plugin-api-dev.js'), 'utf8');

  it.each([
    'client-portal',
    'client-accesses',
    'approval-workflow',
    'public-briefing',
    'material-deliveries',
    'extract-briefing-inicial',
  ])('proxies /api/%s in npm run dev', (name) => {
    expect(plugin).toContain(`'/api/${name}'`);
  });
});
