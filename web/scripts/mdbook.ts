import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse, stringify } from 'smol-toml';
import { record } from './mdbook-model.ts';
import type { LanguageCode } from '../src/locale-routing.ts';

export const projectRoot = path.resolve(import.meta.dirname, '../..');
export const cacheRoot = path.resolve(projectRoot, 'web/.cache/mdbook');

/** Derive a web-only mdBook build without changing the original publishing config. */
export async function buildMdBook(
  locale: LanguageCode = 'en'
): Promise<{ json: string; html: string }> {
  const directory = locale === 'en' ? cacheRoot : path.join(cacheRoot, locale);
  const source = await fs.readFile(path.join(projectRoot, 'book.toml'), 'utf8');
  const config = parse(source);
  const book = record(config.book, 'book.toml [book]');
  const sourceDirectory = typeof book.src === 'string' ? book.src : 'src';
  book.src = path.resolve(projectRoot, sourceDirectory);
  book.language = locale;
  const output = record(config.output ?? {}, 'book.toml [output]');
  const html = record(output.html ?? {}, '[output.html]');
  for (const key of ['additional-css', 'additional-js']) {
    const files = html[key];
    if (Array.isArray(files))
      html[key] = files.map((file) => path.resolve(projectRoot, String(file)));
  }
  const preprocessors = record(config.preprocessor ?? {}, 'preprocessors');
  preprocessors['reader-source-translations'] = {
    command: `"${process.execPath}" "${path.join(import.meta.dirname, 'mdbook-localization.ts')}"`,
    before: ['links', 'index', 'reader-line-endings', 'admonish', 'katex']
  };
  preprocessors['reader-line-endings'] = {
    command: `"${process.execPath}" "${path.join(import.meta.dirname, 'mdbook-line-endings.ts')}"`,
    before: ['admonish', 'katex']
  };
  preprocessors['reader-math-annotations'] = {
    command: `"${process.execPath}" "${path.join(import.meta.dirname, 'mdbook-math-annotations.ts')}"`,
    after: ['katex']
  };
  for (const value of Object.values(preprocessors)) {
    const settings = record(value, 'preprocessor settings');
    if (
      Array.isArray(settings.renderers) &&
      settings.renderers.includes('html')
    )
      settings.renderers = [...settings.renderers, 'reader-json'];
  }
  const admonish = record(preprocessors.admonish, 'admonish preprocessor');
  const renderers = record(
    admonish.renderer ?? {},
    'admonish renderer settings'
  );
  renderers['reader-json'] = { render_mode: 'html' };
  admonish.renderer = renderers;
  const katex = record(preprocessors.katex, 'KaTeX preprocessor');
  katex['pre-render'] = true;
  katex['no-css'] = true;
  katex.output = 'htmlAndMathml';
  config.preprocessor = preprocessors as typeof config.preprocessor;
  config.output = {
    html,
    'reader-json': {
      command: `"${process.execPath}" "${path.join(import.meta.dirname, 'mdbook-json.ts')}"`
    }
  } as typeof config.output;
  config.build = {
    ...record(config.build ?? {}, '[build]'),
    'build-dir': path.join(directory, 'build')
  } as typeof config.build;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'book.toml'), stringify(config));
  const command = process.env.MDBOOK_BINARY || 'mdbook';
  const result = spawnSync(command, ['build', directory], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true
  });
  if (result.error)
    throw new Error(
      'Cannot run mdbook. Install the pinned mdBook/admonish/KaTeX tools documented in web/README.md, or set MDBOOK_BINARY.',
      { cause: result.error }
    );
  if (result.status !== 0)
    throw new Error(
      `mdBook failed (${result.status}); reader data was not replaced`
    );
  return {
    json: path.join(directory, 'build/reader-json/book.json'),
    html: path.join(directory, 'build/html')
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  await buildMdBook();
