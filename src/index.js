import {
  reject, flow, forEach, partial, map, castArray, keys, difference, isEmpty, without, filter,
  pick,
} from 'lodash/fp';
import { resolve } from 'path';
import postcss from 'postcss';
import removeClasses from 'postcss-remove-classes';
import Core from 'css-modules-loader-core';
import Parser from 'css-modules-loader-core/lib/parser';
import FileSystemLoader from 'css-modules-loader-core/lib/file-system-loader';
import generateHashedScopedName from './generateHashedScopedName';
import getStyleImports, { defaultResolveOptions } from './getStyleImports';
import patchGetScopedName, { UNUSED_EXPORT } from './patchGetScopedName';
import getStyleExports from './getStyleExports';
import saveJsExports from './saveJsExports';
import { defaultParser, defaultParserOptions } from 'get-es-imports-exports';


export { defaultParser, defaultParserOptions, defaultResolveOptions, UNUSED_EXPORT };


const resolveCwd = partial(resolve, [process.cwd()]);
const resolveCwds = flow(
  castArray,
  map(resolveCwd)
);


export default postcss.plugin('postcss-modules', ({
  moduleExportDirectory, // removed
  jsFiles,
  getJsExports = saveJsExports,
  generateScopedName = generateHashedScopedName,
  warnOnUnusedClasses = true,
  removeUnusedClasses = true,
  recurse = true,
  parser = defaultParser,
  parserOptions = defaultParserOptions,
  resolveOptions = defaultResolveOptions,
  Loader,
} = {}) => {
  let styleImportsPromise;

  if (moduleExportDirectory) {
    // FIXME: Remove in v2
    console.log('You no longer need to specify a module export directory. The API will work the same as before'); // eslint-disable-line
  }

  const lazyGetDependencies = () => {
    if (!styleImportsPromise) {
      styleImportsPromise = getStyleImports({
        jsFiles: resolveCwds(jsFiles),
        recurse,
        parser,
        parserOptions,
        resolveOptions,
      });
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

    const file = css.source.input.file;

    return lazyGetDependencies()
      .then(patchGetScopedName(Core, {
        removeUnusedClasses,
        generateScopedName,
        file,
      }))
      .then(({ styleImports, typesPerName }) => new Promise((res, rej) => {
        const jsExports = styleImports[file];

        postcss([...plugins, cssParser.plugin, removeClasses([UNUSED_EXPORT])])
          .process(css, { from: file })
          .then(() => {
            forEach((source) => {
              css.prepend(source);
            }, loader.sources);
          })
          .then(() => {
            const { exportTokens } = cssParser;

            if (!jsExports && !isEmpty(exportTokens)) {
              result.warn('Defined local styles, but the css file was never imported');
            }

            const jsExportsWithoutNs = without(jsExports, '*');

            if (isEmpty(jsExportsWithoutNs)) {
              return { cssExports: {} };
            }

            const cssExports = flow(
              keys,
              filter(name => typesPerName[name] !== 'animation')
            )(exportTokens);
            const invalidImports = difference(jsExportsWithoutNs, cssExports);

            if (!isEmpty(invalidImports)) {
              // TODO: We could be more helpful by saying what file tried to import it, but we don't
              // have that information currently.
              throw new Error(`Cannot import style(s) ${invalidImports.join(', ')} from ${file}`);
            }

            if (warnOnUnusedClasses) {
              const unusedImports = difference(cssExports, jsExportsWithoutNs);

              forEach((unusedImport) => {
                result.warn(`Defined unused style "${unusedImport}"`);
              }, unusedImports);
            }

            const tokensToExport = pick(cssExports, exportTokens);

            return { tokensToExport };
          })
          .then(({ tokensToExport }) => {
            const styleExports = getStyleExports(tokensToExport);

            getJsExports(css.source.input.file, styleExports, tokensToExport);
          })
          .then(() => res())
          .catch((e) => rej(e));
      }));
  };
});
