![ES CSS Modules](https://raw.githubusercontent.com/jacobp100/es-css-modules/master/assets/logo-full.png)

```
npm install --save-dev es-css-modules
```

### [Skip to Usage Docs](#user-content-api)

### [Demo Using Gulp](https://github.com/jacobp100/es-css-modules-demo)

# What and Why?

I’ll assume you are already sold on CSS Modules. If you haven’t used CSS Modules, you should definitely try it!

For most people, they’re using CSS Modules with webpack, so what actually happens is abstracted for them. CSS Modules at its core takes a bunch of CSS files and mangles each class name in every file to make every file have its own unique namespace. This is why class names do not conflict. It also exports a JSON file with the mapping of the original class name to the mangled class name. Simply put,

![CSS Modules demo](https://raw.githubusercontent.com/jacobp100/es-css-modules/master/assets/css-modules.png)

ES6 brought in import/export syntax, which now means that it is possible to statically determine which classes are actually used. ES CSS Modules takes advantage of this to produce CSS files without unused styles.

![ES CSS Modules demo](https://raw.githubusercontent.com/jacobp100/es-css-modules/master/assets/es-css-modules.png)

An additional advantage of this is that physical JavaScript files are created. This means that you are not tied to a specific module bundler for your JS files: using ES CSS Modules means you can now use Rollup.

# API

```js
import esCssModules from 'es-css-modules';

postcss([
  esCssModules({
    jsFiles: 'src/App.js',
    moduleExportDirectory: 'styles',
  }),
])
  .process(...)
  .then(...);
```

As a minimum, you must define the parameters `jsFiles` and `moduleExportDirectory`.

`jsFiles` is a path or an array of paths for the files you wish to check CSS imports. By default, the imports within files will be recursively checked.

`moduleExportDirectory` is the directory in which to expect CSS files. Only CSS files within this directory are marked as CSS dependencies.

Both these parameters can be absolute paths, or a path relative to `process.cwd()`.

**By default, all your css files will generate a css.js file with the export names**. I.e. `export const button = "x3f6u";`. This behaviour can be customised via `getJsExports`, which is a function that is called with `(cssFilename, styleExports, styleExportsObject)`, where styleExports is JavaScript file string that specifies the exports, and styleExportsObject is an object whose keys is the export name, and values the corresponding export value.

As in default CSS modules, we generate a random-ish name for each class you define. To configure how classes are generated, you can specify the `generateScopedName` parameter, which is a function called with `(className, filename)`. This function is only called for classes that will actually be used, so it's perfectly safe to use something like [CSS Class Generator](https://github.com/jacobp100/css-class-generator) to generate names.

By default, we'll warn you when you don't use a class you've defined. This can be turned off via `warnOnUnusedClasses`.

We’ll also remove unused classes in the CSS files, which can be turned off via `removeUnusedClasses`.

As stated before, jsFiles will recursively look for imports. This can be disabled via the `recurse` parameter.

We use the parser used for ESLint and a default configuration that works for React. If you need to override the parser options, you can specify `parserOptions` using the [ESLint format](http://eslint.org/docs/user-guide/configuring#specifying-parser-options). You can also specify the entire parser via the `parser` property: to use babel-eslint, set the `parser` to `'babel-eslint'`.

The complete options are as follows,

```js
esCssModules({
  moduleExportDirectory,
  jsFiles,
  getJsExports,
  generateScopedName,
  warnOnUnusedClasses,
  removeUnusedClasses,
  recurse,
  parser,
  parserOptions,
})
```

# Notes

Unlike regular CSS Modules, we only export class names.

At present, a class and keyframes definition cannot have the same name until [this is fixed](https://github.com/css-modules/postcss-modules-scope/issues/82)
