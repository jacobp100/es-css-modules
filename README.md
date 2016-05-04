# PostCSS Modules ES

# What and Why?

I’ll assume you are already sold on CSS Modules. If you haven’t used CSS Modules, you should definitely try it!

For most people, they’re using CSS Modules with webpack, so what actually happens is abstracted for them. CSS Modules at its core takes a bunch of CSS files and mangles each class name in every file to make every file have its own unique namespace. This is why class names do not conflict. It also exports a JSON file with the mapping of the original class name to the mangled class name. Simply put,

![CSS Modules demo](https://raw.githubusercontent.com/jacobp100/postcss-modules-es/master/assets/css-modules.png)

ES6 brought in import/export syntax, which now means that it is possible to statically determine which classes are actually used. ES CSS Modules takes advantage of this to produce CSS files without unused styles.

![ES CSS Modules demo](https://raw.githubusercontent.com/jacobp100/postcss-modules-es/master/assets/es-css-modules.png)

An additional advantage of this is that physical JavaScript files are created. This means that you are not tied to a specific module bundler for your JS files: using ES CSS Modules means you can now use Rollup.

# WIP

```js
postcss([
  modulesEs({
    jsFiles: [join(__dirname, 'src/App.js')],
    moduleExportDirectory: join(__dirname, 'styles'),
  }),
]);
```
