import path from 'node:path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

export const resolveProjectPath = (...segments: string[]): string =>
  path.resolve(PROJECT_ROOT, ...segments);
