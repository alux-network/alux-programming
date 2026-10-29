// Runs mdBook for every edition: English at <out>, each translation at <out>/<lang>.
//
// Editions differ only in mdBook configuration, passed as MDBOOK_* environment overrides of
// book.toml; there is no per-language book.toml and no generated source tree. The translation
// itself happens inside mdBook, in the localize.ts preprocessor.
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { languages } from './languages.ts';

/** Runs `mdbook build` in the repository root with `env` overriding book.toml (MDBOOK_A__B = a.b). */
export function mdbook(env: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const build = spawn('mdbook', ['build'], { stdio: 'inherit', env: { ...process.env, ...env } });
    build.on('error', reject);
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`mdbook build exited with ${code}`))));
  });
}

/** Publishes an assembled sibling directory; a failed swap restores the previous output. */
export async function replaceDirectory(staged: string, out: string): Promise<void> {
  const backup = staged + '.previous';
  let previous = false;
  try {
    await rename(out, backup);
    previous = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    await rename(staged, out);
  } catch (error) {
    if (previous) {
      try {
        await rename(backup, out);
      } catch (rollback) {
        // Keep the backup outside staged, so caller cleanup cannot delete the recovery copy.
        throw new AggregateError([error, rollback], `Output replacement failed; previous output retained at ${backup}`);
      }
    }
    throw error;
  }
  if (previous) {
    try {
      await rm(backup, { recursive: true, force: true, maxRetries: 5 });
    } catch (error) {
      // Publication has committed; cleanup must not suppress the dev caller's reload.
      console.warn(`Site published; could not remove previous output at ${backup}`, error);
    }
  }
}

/** Builds and assembles every edition before replacing `out` on the same filesystem. */
export async function buildBook(out = 'book/html'): Promise<void> {
  out = path.resolve(out);
  await mkdir(path.dirname(out), { recursive: true });
  const assembled = await mkdtemp(path.join(path.dirname(out), `.${path.basename(out)}-stage-`));
  const stage = await mkdtemp(path.join(tmpdir(), 'alux-book-'));
  try {
    for (const { code } of languages) {
      const en = code === 'en';
      await mdbook({
        // Read by localize.ts and written to <html lang> by the template.
        MDBOOK_BOOK__LANGUAGE: code,
        MDBOOK_BUILD__BUILD_DIR: path.join(stage, code),
        // mdBook's 404 page resolves its links against site-url.
        MDBOOK_OUTPUT__HTML__SITE_URL: en ? '/' : `/${code}/`,
      });
    }
    // Finish all copying before touching the live output; the final swap only renames directories.
    await cp(path.join(stage, 'en', 'html'), assembled, { recursive: true });
    for (const { code } of languages.slice(1)) {
      await cp(path.join(stage, code, 'html'), path.join(assembled, code), { recursive: true });
    }
    await replaceDirectory(assembled, out);
  } finally {
    await rm(assembled, { recursive: true, force: true });
    await rm(stage, { recursive: true, force: true });
  }
}
