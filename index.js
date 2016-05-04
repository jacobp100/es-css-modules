'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var lodash_fp = require('lodash/fp');
var postcss = _interopDefault(require('postcss'));
var removeClasses = _interopDefault(require('postcss-remove-classes'));
var Core = _interopDefault(require('css-modules-loader-core'));
var Parser = _interopDefault(require('css-modules-loader-core/lib/parser'));
var FileSystemLoader = _interopDefault(require('css-modules-loader-core/lib/file-system-loader'));
var stringHash = _interopDefault(require('string-hash'));
var getEsImports = require('get-es-imports');
var getEsImports__default = _interopDefault(getEsImports);
var path = require('path');
var fs = require('fs');
var isJsKeyword = _interopDefault(require('is-keyword-js'));

var babelHelpers = {};

babelHelpers.asyncToGenerator = function (fn) {
  return function () {
    var gen = fn.apply(this, arguments);
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }

        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(function (value) {
            return step("next", value);
          }, function (err) {
            return step("throw", err);
          });
        }
      }

      return step("next");
    });
  };
};

babelHelpers.slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

babelHelpers.toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

babelHelpers;

var generateHashedScopedName = ((name, filename) => {
  const hash = stringHash(filename).toString(36).substr(0, 5);

  return `_${ name }_${ hash }`;
})

var getStyleImports = (() => {
  var ref = babelHelpers.asyncToGenerator(function* (_ref) {
    let moduleExportDirectory = _ref.moduleExportDirectory;
    let files = _ref.jsFiles;
    let recurse = _ref.recurse;
    let parser = _ref.parser;
    let parserOptions = _ref.parserOptions;

    if (!path.isAbsolute(moduleExportDirectory)) {
      throw new Error('Expected moduleExportsDirectory to be an absolute path');
    }

    const isInModuleExportsDirectory = lodash_fp.flow(lodash_fp.partial(path.relative, [moduleExportDirectory]), lodash_fp.negate(lodash_fp.startsWith('..')));

    const isFile = function (path, cb) {
      if (isInModuleExportsDirectory(path)) {
        cb(null, lodash_fp.endsWith('.css.js', path));
        return;
      }

      fs.stat(path, function (err, s) {
        if (err && err.code === 'ENOENT') cb(null, false);else if (err) cb(err);else cb(null, s.isFile());
      });
    };

    var _ref2 = yield getEsImports__default({
      files: files,
      recurse: recurse,
      parser: parser,
      parserOptions: parserOptions,
      exclude: path.join(moduleExportDirectory, '/**/*'),
      resolveOptions: {
        extensions: ['.js', '.json'],
        isFile: isFile
      }
    });

    const dependencies = _ref2.dependencies;


    const styleImports = lodash_fp.flow(lodash_fp.toPairs, lodash_fp.filter(lodash_fp.flow(lodash_fp.first, isInModuleExportsDirectory)), lodash_fp.fromPairs)(dependencies);

    return styleImports;
  });
  return function (_x) {
    return ref.apply(this, arguments);
  };
})();

const UNUSED_EXPORT = 'UNUSED_EXPORT';

const jsValidIdent = /^[$A-Z_][0-9A-Z_$]*$/i;
const isValidJsIdent = value => jsValidIdent.test(value);

const isValidClassname = lodash_fp.overEvery([isValidJsIdent, lodash_fp.overSome([lodash_fp.equals('default'), lodash_fp.negate(isJsKeyword)])]);

const hasNamespaceImport = lodash_fp.includes('*');

var patchGetScopedName = ((Core, _ref) => {
  let removeUnusedClasses = _ref.removeUnusedClasses;
  let generateScopedName = _ref.generateScopedName;
  return styleImports => {
    let scopedNames = {};

    Core.scope.generateScopedName = (name, filename) => {
      // eslint-disable-line
      if (!isValidClassname(name)) {
        // Throws within promise, goes to .catch(...)
        throw new Error(`Class name ${ name } is invalid`);
      }

      const exportFile = `${ filename }.js`;
      const styleImport = styleImports[exportFile];

      const currentValue = lodash_fp.get([exportFile, name], scopedNames);

      if (currentValue) return currentValue;

      if (removeUnusedClasses && !lodash_fp.includes(name, styleImport) && !hasNamespaceImport(styleImport)) {
        return UNUSED_EXPORT;
      }

      const value = generateScopedName(name, filename);

      scopedNames = lodash_fp.set([exportFile, name], value, scopedNames);

      return value;
    };
  };
})

const defaultExport = _ref => {
  var _ref2 = babelHelpers.slicedToArray(_ref, 2);

  let exportName = _ref2[1];
  return `export default '${ exportName }';\n`;
};
const constExport = _ref3 => {
  var _ref4 = babelHelpers.slicedToArray(_ref3, 2);

  let importName = _ref4[0];
  let exportName = _ref4[1];
  return `export const ${ importName } = '${ exportName }';\n`;
};

var getStyleExports = lodash_fp.flow(lodash_fp.toPairs, lodash_fp.map(lodash_fp.cond([[lodash_fp.flow(lodash_fp.first, lodash_fp.equals('default')), defaultExport], [lodash_fp.constant(true), constExport]])), values => values.join(''));

var saveJsExports = ((cssFile, js) => {
  fs.writeFileSync(`${ cssFile }.js`, js);
})

var index = postcss.plugin('postcss-modules', function () {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  let moduleExportDirectory = _ref.moduleExportDirectory;
  let jsFiles = _ref.jsFiles;
  var _ref$recurse = _ref.recurse;
  let recurse = _ref$recurse === undefined ? true : _ref$recurse;
  var _ref$parser = _ref.parser;
  let parser = _ref$parser === undefined ? getEsImports.defaultParser : _ref$parser;
  var _ref$parserOptions = _ref.parserOptions;
  let parserOptions = _ref$parserOptions === undefined ? getEsImports.defaultParserOptions : _ref$parserOptions;
  var _ref$generateScopedNa = _ref.generateScopedName;
  let generateScopedName = _ref$generateScopedNa === undefined ? generateHashedScopedName : _ref$generateScopedNa;
  var _ref$getJsExports = _ref.getJsExports;
  let getJsExports = _ref$getJsExports === undefined ? saveJsExports : _ref$getJsExports;
  let removeUnusedClasses = _ref.removeUnusedClasses;
  let Loader = _ref.Loader;

  let styleImportsPromise;

  const lazyGetDependencies = () => {
    if (!styleImportsPromise) {
      styleImportsPromise = getStyleImports({
        moduleExportDirectory: moduleExportDirectory,
        jsFiles: jsFiles,
        recurse: recurse,
        parser: parser,
        parserOptions: parserOptions
      }).then(patchGetScopedName(Core, {
        removeUnusedClasses: removeUnusedClasses,
        generateScopedName: generateScopedName
      }));
    }

    return styleImportsPromise;
  };

  return (css, result) => {
    const resultPlugins = lodash_fp.flow(lodash_fp.reject({ postcssPlugin: 'postcss-modules' }), lodash_fp.reject({ postcssPlugin: 'postcss-modules-es' }))(result.processor.plugins);

    const plugins = [].concat(babelHelpers.toConsumableArray(Core.defaultPlugins), babelHelpers.toConsumableArray(resultPlugins));

    const loader = typeof Loader === 'function' ? new Loader('/', plugins) : new FileSystemLoader('/', plugins);

    const cssParser = new Parser(loader.fetch.bind(loader));

    return lazyGetDependencies().then(() => new Promise((res, rej) => {
      postcss([].concat(babelHelpers.toConsumableArray(plugins), [cssParser.plugin, removeClasses([UNUSED_EXPORT])])).process(css, { from: css.source.input.file }).then(() => {
        lodash_fp.forEach(source => {
          css.prepend(source);
        }, loader.sources);

        const styleExports = getStyleExports(cssParser.exportTokens);

        getJsExports(css.source.input.file, styleExports, cssParser.exportTokens);

        res();
      }, rej);
    }));
  };
});

module.exports = index;