import test from 'ava';
import { forEach, flow, map } from 'lodash/fp';
import { join } from 'path';
import { parse } from 'espree';
import { readFileSync } from 'fs';
import postcss from 'postcss';
import modulesEs, { defaultParserOptions, UNUSED_EXPORT } from '../src';

const baseDir = join(__dirname, 'cases');
const localImports = join(baseDir, 'local-imports');
const unusedExport = join(baseDir, 'unused-export');
const namespaceImport = join(baseDir, 'namespace-import');
const defaultImport = join(baseDir, 'default-import');
const namespaceImportInvalidExportKeyword =
  join(baseDir, 'namespace-import-invalid-export-keyword');
const namespaceImportInvalidExportHyphen =
  join(baseDir, 'namespace-import-invalid-export-hyphen');
const composesImport = join(baseDir, 'composes-import');

const parseWithDefaultOptions = contents => parse(contents, defaultParserOptions);
const styleExportsIsValid = flow(
  map('contents'),
  forEach(parseWithDefaultOptions)
);

test.serial('local imports from single entry', t => {
  t.plan(6);

  const moduleExportDirectory = join(localImports, 'styles');
  const button = join(moduleExportDirectory, 'button.css');
  const typography = join(moduleExportDirectory, 'typography.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(localImports, 'App.js'),
      moduleExportDirectory,
      getJsExports(filename, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
      },
    }),
  ]);

  return Promise.all([
    processor
      .process(readFileSync(button, 'utf-8'), { from: button })
      .then(({ messages, css }) => {
        t.is(css.indexOf(UNUSED_EXPORT), -1);
        t.is(messages.length, 0);
      }),
    processor
      .process(readFileSync(typography, 'utf-8'), { from: typography })
      .then(({ messages, css }) => {
        t.is(css.indexOf(UNUSED_EXPORT), -1);
        t.is(messages.length, 0);
      }),
  ]);
});

test.serial('local imports from files', t => {
  t.plan(6);

  const moduleExportDirectory = join(localImports, 'styles');
  const button = join(moduleExportDirectory, 'button.css');
  const typography = join(moduleExportDirectory, 'typography.css');

  const processor = postcss([
    modulesEs({
      jsFiles: [
        join(localImports, 'App.js'),
        join(localImports, 'Button.js'),
        join(localImports, 'Paragraph.js'),
      ],
      recurse: false,
      moduleExportDirectory,
      getJsExports(filename, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
      },
    }),
  ]);

  return Promise.all([
    processor
      .process(readFileSync(button, 'utf-8'), { from: button })
      .then(({ css, messages }) => {
        t.is(css.indexOf(UNUSED_EXPORT), -1);
        t.is(messages.length, 0);
      }),
    processor
      .process(readFileSync(typography, 'utf-8'), { from: typography })
      .then(({ css, messages }) => {
        t.is(css.indexOf(UNUSED_EXPORT), -1);
        t.is(messages.length, 0);
      }),
  ]);
});

test.serial('unused export', t => {
  t.plan(5);

  const moduleExportDirectory = join(unusedExport, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(unusedExport, 'App.js'),
      moduleExportDirectory,
      getJsExports(filename, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
      },
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .then(({ css, messages }) => {
      t.is(css.indexOf(UNUSED_EXPORT), -1);
      t.is(messages.length, 1);
      t.is(messages[0].type, 'warning');
      t.is(messages[0].text, 'Defined unused style "primary"');
    });
});

test.serial('unused export without minification', t => {
  t.plan(2);

  const moduleExportDirectory = join(unusedExport, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(unusedExport, 'App.js'),
      moduleExportDirectory,
      removeUnusedClasses: false,
      getJsExports() {},
      generateScopedName(name) {
        // Expect to call twice
        t.true(['base', 'primary'].indexOf(name) !== -1);
        return name;
      },
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button });
});

test.serial('default import', t => {
  t.plan(5);

  const moduleExportDirectory = join(defaultImport, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(defaultImport, 'App.js'),
      moduleExportDirectory,
      getJsExports(filename, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
      },
      generateScopedName(name) {
        // Expect to call twice
        t.true(['default', 'primary'].indexOf(name) !== -1);
        return name;
      },
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .then(({ css, messages }) => {
      t.is(css.indexOf(UNUSED_EXPORT), -1);
      t.is(messages.length, 0);
    });
});

test.serial('namespace import', t => {
  t.plan(2);

  const moduleExportDirectory = join(namespaceImport, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImport, 'App.js'),
      moduleExportDirectory,
      getJsExports() {},
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .then(({ css, messages }) => {
      t.is(css.indexOf(UNUSED_EXPORT), -1);
      t.is(messages.length, 0);
    });
});

test.serial('namespace import invalid export keyword', t => {
  t.plan(1);

  const moduleExportDirectory = join(namespaceImportInvalidExportKeyword, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImportInvalidExportKeyword, 'App.js'),
      moduleExportDirectory,
      getJsExports() {},
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .catch((e) => {
      t.is(e.message, 'Class name super is invalid');
    });
});

test.serial('namespace import invalid export hyphen', t => {
  t.plan(1);

  const moduleExportDirectory = join(namespaceImportInvalidExportHyphen, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImportInvalidExportHyphen, 'App.js'),
      moduleExportDirectory,
      getJsExports() {},
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .catch((e) => {
      t.is(e.message, 'Class name -test is invalid');
    });
});

test.serial('composes import', t => {
  t.plan(1);

  const moduleExportDirectory = join(composesImport, 'styles');
  const button = join(moduleExportDirectory, 'button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(composesImport, 'App.js'),
      moduleExportDirectory,
      getJsExports() {},
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .then(({ css }) => {
      t.is(css.indexOf(UNUSED_EXPORT), -1);
    });
});
