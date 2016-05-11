import test from 'ava';
import { forEach, flow, map, startsWith } from 'lodash/fp';
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
const animations = join(baseDir, 'animations');
const animationsDuplicateNames = join(baseDir, 'animations-duplicate-names');
const multipleStyleDirectories = join(baseDir, 'multiple-style-directories');
const noCss = join(baseDir, 'no-css');
const noCssWithBinding = join(baseDir, 'no-css-with-binding');

const parseWithDefaultOptions = contents => parse(contents, defaultParserOptions);
const styleExportsIsValid = flow(
  map('contents'),
  forEach(parseWithDefaultOptions)
);

test.serial('local imports from single entry', t => {
  t.plan(6);

  const button = join(localImports, 'styles/button.css');
  const typography = join(localImports, 'styles/typography.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(localImports, 'App.js'),
      getJsExports(name, jsFile) {
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

test.serial('local imports from files', t => {
  t.plan(6);

  const button = join(localImports, 'styles/button.css');
  const typography = join(localImports, 'styles/typography.css');

  const processor = postcss([
    modulesEs({
      jsFiles: [
        join(localImports, 'App.js'),
        join(localImports, 'Button.js'),
        join(localImports, 'Paragraph.js'),
      ],
      recurse: false,
      getJsExports(name, jsFile) {
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

  const button = join(unusedExport, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(unusedExport, 'App.js'),
      getJsExports(name, jsFile) {
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

  const button = join(unusedExport, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(unusedExport, 'App.js'),
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

  const button = join(defaultImport, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(defaultImport, 'App.js'),
      getJsExports(name, jsFile) {
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
  t.plan(3);

  const button = join(namespaceImport, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImport, 'App.js'),
      getJsExports(name, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
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

test.serial('namespace import invalid export keyword', t => {
  t.plan(1);

  const button = join(namespaceImportInvalidExportKeyword, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImportInvalidExportKeyword, 'App.js'),
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

  const button = join(namespaceImportInvalidExportHyphen, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(namespaceImportInvalidExportHyphen, 'App.js'),
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
  t.plan(3);

  const button = join(composesImport, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(composesImport, 'App.js'),
      getJsExports(name, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
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

test.serial('animations', t => {
  t.plan(4);

  const button = join(animations, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(animations, 'App.js'),
      getJsExports(name, jsFile) {
        styleExportsIsValid(jsFile);
        t.pass();
      },
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .then(({ css, messages }) => {
      t.is(css.indexOf(UNUSED_EXPORT), -1);
      t.not(css.indexOf('fadeIn'), -1);
      t.is(messages.length, 0);
    });
});

test.serial('animations duplicate names', t => {
  t.plan(1);

  const button = join(animationsDuplicateNames, 'styles/button.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(animationsDuplicateNames, 'App.js'),
      getJsExports() {},
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .catch((e) => {
      t.is(e.message,
        'You defined default as both a class and an animation. ' +
        'See https://github.com/css-modules/postcss-modules-scope/issues/8'
      );
    });
});

test.serial('works with multiple style files', t => {
  t.plan(6);

  const button = join(multipleStyleDirectories, 'button/button.css');
  const typography = join(multipleStyleDirectories, 'typography/typography.css');

  const processor = postcss([
    modulesEs({
      jsFiles: join(multipleStyleDirectories, 'App.js'),
      getJsExports(name, jsFile) {
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

test.serial('it will throw when the css file is not found', t => {
  t.plan(1);

  const button = join(localImports, 'styles/button.css'); // any file will do here

  const processor = postcss([
    modulesEs({
      jsFiles: join(noCss, 'App.js'),
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .catch((e) => {
      t.true(startsWith('Cannot find module \'./styles/button.css\'', e.message));
    });
});

test.serial('it will ignore binding files when the css file is not found', t => {
  t.plan(1);

  const button = join(localImports, 'styles/button.css'); // any file will do here

  const processor = postcss([
    modulesEs({
      jsFiles: join(noCssWithBinding, 'App.js'),
    }),
  ]);

  return processor
    .process(readFileSync(button, 'utf-8'), { from: button })
    .catch((e) => {
      t.true(startsWith('Cannot find module \'./styles/button.css\'', e.message));
    });
});
