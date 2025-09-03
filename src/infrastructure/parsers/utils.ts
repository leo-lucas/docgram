import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Recursively collect files with the given extension from the provided paths.
 * Errors are logged but do not interrupt the search.
 */
export async function collectFiles(paths: string[], extension = '.ts'): Promise<string[]> {
  const files: string[] = [];
  for (const target of paths) {
    await walk(target, files, extension);
  }
  return files;
}

async function walk(target: string, files: string[], extension: string): Promise<void> {
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(target);
      await Promise.all(entries.map(entry => walk(path.join(target, entry), files, extension)));
    } else if (target.endsWith(extension)) {
      files.push(target);
    }
  } catch (err) {
    console.error(`Error accessing ${target}:`, err);
  }
}

/**
 * Determine the namespace of a file based on its directory structure.
 */
export function namespaceOf(file: string): string | undefined {
  const dir = path.relative(process.cwd(), path.dirname(file));
  return dir ? dir.split(path.sep).join('.') : undefined;
}
