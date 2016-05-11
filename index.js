'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UNUSED_EXPORT = exports.defaultResolveOptions = exports.defaultParserOptions = exports.defaultParser = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _fp = require('lodash/fp');

var _path = require('path');

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _postcssRemoveClasses = require('postcss-remove-classes');

var _postcssRemoveClasses2 = _interopRequireDefault(_postcssRemoveClasses);

var _cssModulesLoaderCore = require('css-modules-loader-core');

var _cssModulesLoaderCore2 = _interopRequireDefault(_cssModulesLoaderCore);

var _parser = require('css-modules-loader-core/lib/parser');

var _parser2 = _interopRequireDefault(_parser);

var _fileSystemLoader = require('css-modules-loader-core/lib/file-system-loader');

var _fileSystemLoader2 = _interopRequireDefault(_fileSystemLoader);

var _stringHash = require('string-hash');

var _stringHash2 = _interopRequireDefault(_stringHash);

var _getEsImportsExports = require('get-es-imports-exports');

var _getEsImportsExports2 = _interopRequireDefault(_getEsImportsExports);

var _fs = require('fs');

var _lodash = require('lodash');

var _isKeywordJs = require('is-keyword-js');

var _isKeywordJs2 = _interopRequireDefault(_isKeywordJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var generateHashedScopedName = (name, filename) => {
  const hash = (0, _stringHash2.default)(filename).toString(36).substr(0, 5);

  return `_${ name }_${ hash }`;
};

function _asyncToGenerator(fn) {
  return function () {
    var gen = fn.apply(this, arguments);return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);var value = info.value;
        } catch (error) {
          reject(error);return;
        }if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(function (value) {
            return step("next", value);
          }, function (err) {
            return step("throw", err);
          });
        }
      }return step("next");
    });
  };
}

const isFile = (path, cb) => {
  if ((0, _fp.endsWith)('.css.js', path)) {
    cb(null, false);
    return;
  }

  (0, _fs.stat)(path, (err, s) => {
    if (err && err.code === 'ENOENT') cb(null, false);else if (err) cb(err);else cb(null, s.isFile());
  });
};

const defaultResolveOptions = {
  extensions: ['.css', '.js', '.json'],
  isFile: isFile
};

var getStyleImports = (() => {
  var ref = _asyncToGenerator(function* (_ref) {
    let files = _ref.jsFiles;
    let recurse = _ref.recurse;
    let parser = _ref.parser;
    let parserOptions = _ref.parserOptions;
    let resolveOptions = _ref.resolveOptions;

    var _ref2 = yield (0, _getEsImportsExports2.default)({
      files: files,
      recurse: recurse,
      parser: parser,
      parserOptions: parserOptions,
      exclude: '/**/*.css',
      resolveOptions: resolveOptions
    });

    const imports = _ref2.imports;


    const styleImports = (0, _fp.flow)(_fp.toPairs, (0, _fp.filter)((0, _fp.flow)(_fp.first, (0, _fp.endsWith)('.css'))), _fp.fromPairs)(imports);

    return styleImports;
  });

  return function (_x) {
    return ref.apply(this, arguments);
  };
})();

const UNUSED_EXPORT = 'UNUSED_EXPORT';

const jsValidIdent = /^[$A-Z_][0-9A-Z_$]*$/i;
const isValidJsIdent = value => jsValidIdent.test(value);

const isValidClassname = (0, _fp.overEvery)([isValidJsIdent, (0, _fp.overSome)([(0, _fp.equals)('default'), (0, _fp.negate)(_isKeywordJs2.default)])]);

const hasNamespaceImport = (0, _fp.includes)('*');

var patchGetScopedName = (Core, _ref3) => {
  let removeUnusedClasses = _ref3.removeUnusedClasses;
  let generateScopedName = _ref3.generateScopedName;
  let file = _ref3.file;
  return styleImports => {
    // We mutate these objects, and return an object that will later be mutated
    const scopedNames = {};
    const typesPerName = {};

    Core.scope.generateScopedName = (name, filename, css) => {
      // eslint-disable-line
      const styleImport = styleImports[filename];

      const notValidIdent = '(?:[^\\w\\d-_]|$)';
      const classRe = new RegExp(`\\.${ name }${ notValidIdent }`);
      const isClass = css.search(classRe) !== -1;
      const animationRe = new RegExp(`@(?:[\\w]+-)?keyframes[\\s\\t\\n]*${ name }${ notValidIdent }`);
      const isAnimation = css.search(animationRe) !== -1;

      if (isClass && isAnimation) {
        throw new Error(`You defined ${ name } as both a class and an animation. ` + 'See https://github.com/css-modules/postcss-modules-scope/issues/8');
      }

      if (isClass && !isValidClassname(name)) {
        // Throws within promise, goes to .catch(...)
        throw new Error(`Class name ${ name } is invalid`);
      }

      const type = isClass ? 'class' : 'animation';

      const currentValue = (0, _fp.get)([filename, name], scopedNames);

      if (currentValue) return currentValue;

      if (removeUnusedClasses && file === filename && !isAnimation && !(0, _fp.includes)(name, styleImport) && !hasNamespaceImport(styleImport)) {
        return UNUSED_EXPORT;
      }

      const value = generateScopedName(name, filename, css);

      (0, _lodash.set)(scopedNames, [filename, name], value);
      (0, _lodash.set)(typesPerName, [name], type);

      return value;
    };

    return { styleImports: styleImports, typesPerName: typesPerName };
  };
};

const defaultExport = _ref4 => {
  var _ref5 = _slicedToArray(_ref4, 2);

  let exportName = _ref5[1];
  return `export default '${ exportName }';\n`;
};
const constExport = _ref6 => {
  var _ref7 = _slicedToArray(_ref6, 2);

  let importName = _ref7[0];
  let exportName = _ref7[1];
  return `export const ${ importName } = '${ exportName }';\n`;
};

var getStyleExports = (0, _fp.flow)(_fp.toPairs, (0, _fp.map)((0, _fp.cond)([[(0, _fp.flow)(_fp.first, (0, _fp.equals)('default')), defaultExport], [(0, _fp.constant)(true), constExport]])), values => values.join(''));

var saveJsExports = (cssFile, js) => {
  (0, _fs.writeFileSync)(`${ cssFile }.js`, js);
};

const resolveCwd = (0, _fp.partial)(_path.resolve, [process.cwd()]);
const resolveCwds = (0, _fp.flow)(_fp.castArray, (0, _fp.map)(resolveCwd));

var index = _postcss2.default.plugin('postcss-modules', function () {
  var _ref8 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  let moduleExportDirectory = _ref8.moduleExportDirectory;
  let // removed
  jsFiles = _ref8.jsFiles;
  var _ref8$getJsExports = _ref8.getJsExports;
  let getJsExports = _ref8$getJsExports === undefined ? saveJsExports : _ref8$getJsExports;
  var _ref8$generateScopedN = _ref8.generateScopedName;
  let generateScopedName = _ref8$generateScopedN === undefined ? generateHashedScopedName : _ref8$generateScopedN;
  var _ref8$warnOnUnusedCla = _ref8.warnOnUnusedClasses;
  let warnOnUnusedClasses = _ref8$warnOnUnusedCla === undefined ? true : _ref8$warnOnUnusedCla;
  var _ref8$removeUnusedCla = _ref8.removeUnusedClasses;
  let removeUnusedClasses = _ref8$removeUnusedCla === undefined ? true : _ref8$removeUnusedCla;
  var _ref8$recurse = _ref8.recurse;
  let recurse = _ref8$recurse === undefined ? true : _ref8$recurse;
  var _ref8$parser = _ref8.parser;
  let parser = _ref8$parser === undefined ? _getEsImportsExports.defaultParser : _ref8$parser;
  var _ref8$parserOptions = _ref8.parserOptions;
  let parserOptions = _ref8$parserOptions === undefined ? _getEsImportsExports.defaultParserOptions : _ref8$parserOptions;
  var _ref8$resolveOptions = _ref8.resolveOptions;
  let resolveOptions = _ref8$resolveOptions === undefined ? defaultResolveOptions : _ref8$resolveOptions;
  let Loader = _ref8.Loader;

  let styleImportsPromise;

  if (moduleExportDirectory) {
    // FIXME: Remove in v2
    console.log('You no longer need to specify a module export directory. The API will work the same as before'); // eslint-disable-line
  }

  const lazyGetDependencies = () => {
    if (!styleImportsPromise) {
      styleImportsPromise = getStyleImports({
        jsFiles: resolveCwds(jsFiles),
        recurse: recurse,
        parser: parser,
        parserOptions: parserOptions,
        resolveOptions: resolveOptions
      });
    }

    return styleImportsPromise;
  };

  return (css, result) => {
    const resultPlugins = (0, _fp.flow)((0, _fp.reject)({ postcssPlugin: 'postcss-modules' }), (0, _fp.reject)({ postcssPlugin: 'postcss-modules-es' }))(result.processor.plugins);

    const plugins = [].concat(_toConsumableArray(_cssModulesLoaderCore2.default.defaultPlugins), _toConsumableArray(resultPlugins));

    const loader = typeof Loader === 'function' ? new Loader('/', plugins) : new _fileSystemLoader2.default('/', plugins);

    const cssParser = new _parser2.default(loader.fetch.bind(loader));

    const file = css.source.input.file;

    return lazyGetDependencies().then(patchGetScopedName(_cssModulesLoaderCore2.default, {
      removeUnusedClasses: removeUnusedClasses,
      generateScopedName: generateScopedName,
      file: file
    })).then(_ref9 => {
      let styleImports = _ref9.styleImports;
      let typesPerName = _ref9.typesPerName;
      return new Promise((res, rej) => {
        const jsExports = styleImports[file];

        (0, _postcss2.default)([].concat(_toConsumableArray(plugins), [cssParser.plugin, (0, _postcssRemoveClasses2.default)([UNUSED_EXPORT])])).process(css, { from: file }).then(() => {
          (0, _fp.forEach)(source => {
            css.prepend(source);
          }, loader.sources);
        }).then(() => {
          const exportTokens = cssParser.exportTokens;


          if (!jsExports && !(0, _fp.isEmpty)(exportTokens)) {
            result.warn('Defined local styles, but the css file was never imported');
          }

          const jsExportsWithoutNs = (0, _fp.without)(jsExports, '*');

          if ((0, _fp.isEmpty)(jsExportsWithoutNs)) {
            return { cssExports: {} };
          }

          const cssExports = (0, _fp.flow)(_fp.keys, (0, _fp.filter)(name => typesPerName[name] !== 'animation'))(exportTokens);
          const invalidImports = (0, _fp.difference)(jsExportsWithoutNs, cssExports);

          if (!(0, _fp.isEmpty)(invalidImports)) {
            // TODO: We could be more helpful by saying what file tried to import it, but we don't
            // have that information currently.
            throw new Error(`Cannot import style(s) ${ invalidImports.join(', ') } from ${ file }`);
          }

          if (warnOnUnusedClasses) {
            const unusedImports = (0, _fp.difference)(cssExports, jsExportsWithoutNs);

            (0, _fp.forEach)(unusedImport => {
              result.warn(`Defined unused style "${ unusedImport }"`);
            }, unusedImports);
          }

          const tokensToExport = (0, _fp.pick)(cssExports, exportTokens);

          return { tokensToExport: tokensToExport };
        }).then(_ref10 => {
          let tokensToExport = _ref10.tokensToExport;

          const styleExports = getStyleExports(tokensToExport);

          getJsExports(css.source.input.file, styleExports, tokensToExport);
        }).then(() => res()).catch(e => rej(e));
      });
    });
  };
});

exports.defaultParser = _getEsImportsExports.defaultParser;
exports.defaultParserOptions = _getEsImportsExports.defaultParserOptions;
exports.defaultResolveOptions = defaultResolveOptions;
exports.UNUSED_EXPORT = UNUSED_EXPORT;
exports.default = index;
