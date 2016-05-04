import { reject, flow, forEach } from 'lodash/fp';
import postcss from 'postcss';
import removeClasses from 'postcss-remove-classes';
import Core from 'css-modules-loader-core';
import Parser from 'css-modules-loader-core/lib/parser';
import FileSystemLoader from 'css-modules-loader-core/lib/file-system-loader';
import generateHashedScopedName from './generateHashedScopedName';
import getStyleImports from './getStyleImports';
import patchGetScopedName, { UNUSED_EXPORT } from './patchGetScopedName';
import getStyleExports from './getStyleExports';
import saveJsExports from './saveJsExports';
import { defaultParser, defaultParserOptions } from 'get-es-imports';


export default postcss.plugin('postcss-modules', ({
  moduleExportDirectory,
  jsFiles,
  recurse = true,
  parser = defaultParser,
  parserOptions = defaultParserOptions,
  generateScopedName = generateHashedScopedName,
  getJsExports = saveJsExports,
  removeUnusedClasses,
  Loader,
} = {}) => {
  let styleImportsPromise;

  const lazyGetDependencies = () => {
    if (!styleImportsPromise) {
      styleImportsPromise = getStyleImports({
        moduleExportDirectory,
        jsFiles,
        recurse,
        parser,
        parserOptions,
      }).then(patchGetScopedName(Core, {
        removeUnusedClasses,
        generateScopedName,
      }));
    }

    return styleImportsPromise;
  };


  return (css, result) => {
    const resultPlugins = flow(
      reject({ postcssPlugin: 'postcss-modules' }),
      reject({ postcssPlugin: 'postcss-modules-es' })
    )(result.processor.plugins);

    const plugins = [
      ...Core.defaultPlugins,
      ...resultPlugins,
    ];

    const loader = typeof Loader === 'function'
      ? new Loader('/', plugins)
      : new FileSystemLoader('/', plugins);

    const cssParser = new Parser(loader.fetch.bind(loader));

    return lazyGetDependencies()
      .then(() => new Promise((res, rej) => {
        postcss([...plugins, cssParser.plugin, removeClasses([UNUSED_EXPORT])])
          .process(css, { from: css.source.input.file })
          .then(() => {
            forEach((source) => {
              css.prepend(source);
            }, loader.sources);

            const styleExports = getStyleExports(cssParser.exportTokens);

            getJsExports(css.source.input.file, styleExports, cssParser.exportTokens);

            res();
          }, rej);
      }));
  };
});
