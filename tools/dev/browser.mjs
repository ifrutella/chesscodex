// The local Chromium browser the dev tools drive (tools/dev/axe.mjs, tools/dev/cssdiff.mjs,
// tests/e2e): $EDGE_PATH, else Edge or Chrome where Windows, Linux or macOS install them.
import { existsSync } from 'node:fs';

const PATHS = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function browserPath() {
  const path = PATHS.find((p) => existsSync(p));
  if (!path) throw new Error('No Edge or Chrome found; set EDGE_PATH');
  return path;
}
