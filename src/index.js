import {
  reject, flow, forEach, partial, map, castArray, keys, difference, isEmpty,
} from 'lodash/fp';
import { resolve } from 'path';
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


const resolveCwd = partial(resolve, [process.cwd()]);
const resolveCwds = flow(
  castArray,
  map(resolveCwd)
);


export default postcss.plugin('postcss-modules', ({
  moduleExportDirectory,
  jsFiles,
  getJsExports = saveJsExports,
  generateScopedName = generateHashedScopedName,
  warnOnUnusedClasses = true,
  removeUnusedClasses = true,
  recurse = true,
  parser = defaultParser,
  parserOptions = defaultParserOptions,
  Loader,
} = {}) => {
  let styleImportsPromise;

  const lazyGetDependencies = () => {
    if (!styleImportsPromise) {
      styleImportsPromise = getStyleImports({
        moduleExportDirectory: resolveCwd(moduleExportDirectory),
        jsFiles: resolveCwds(jsFiles),
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
      .then((styleImports) => new Promise((res, rej) => {
        const file = css.source.input.file;

        postcss([...plugins, cssParser.plugin, removeClasses([UNUSED_EXPORT])])
          .process(css, { from: file })
          .then(() => {
            forEach((source) => {
              css.prepend(source);
            }, loader.sources);

            const { exportTokens } = cssParser;

            const cssExports = keys(exportTokens);
            const invalidImports = difference(styleImports, cssExports);
            const unusedImports = difference(cssExports, styleImports);

            if (warnOnUnusedClasses && !isEmpty(unusedImports)) {
              result.warn(`Defined unused style(s) ${unusedImports.join(', ')} in ${file}`);
            }

            if (!isEmpty(invalidImports)) {
              // TODO: We could be more helpful by saying what file tried to import it, but we don't
              // have that information currently.
              throw new Error(`Cannot import style(s) ${invalidImports.join(', ')} from ${file}`);
            }

            const styleExports = getStyleExports(exportTokens);

            getJsExports(css.source.input.file, styleExports, exportTokens);

            res();
          }, rej);
      }));
  };
});
