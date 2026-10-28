// Runs mdBook for every edition: English at <out>, each translation at <out>/<lang>.
//
// Editions differ only in mdBook configuration, passed as MDBOOK_* environment overrides of
// book.toml; there is no per-language book.toml and no generated source tree. The translation
// itself happens inside mdBook, in the localize.ts preprocessor.
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
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

/** Builds every edition into a temporary directory, then replaces `out` with the result. */
export async function buildBook(out = 'book/html'): Promise<void> {
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
    // Publish only once every edition has built, so a failure never leaves a mixed site.
    await rm(out, { recursive: true, force: true });
    await cp(path.join(stage, 'en', 'html'), out, { recursive: true });
    for (const { code } of languages.slice(1)) {
      await cp(path.join(stage, code, 'html'), path.join(out, code), { recursive: true });
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
