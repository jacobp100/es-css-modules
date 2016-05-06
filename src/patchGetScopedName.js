import { overEvery, overSome, equals, negate, includes, get } from 'lodash/fp';
import { set as mutateSet } from 'lodash';
import isJsKeyword from 'is-keyword-js';

export const UNUSED_EXPORT = 'UNUSED_EXPORT';

const jsValidIdent = /^[$A-Z_][0-9A-Z_$]*$/i;
const isValidJsIdent = value => jsValidIdent.test(value);

const isValidClassname = overEvery([
  isValidJsIdent,
  overSome([
    equals('default'),
    negate(isJsKeyword),
  ]),
]);

const hasNamespaceImport = includes('*');


export default (Core, { removeUnusedClasses, generateScopedName, file }) => (styleImports) => {
  // We mutate these objects, and return an object that will later be mutated
  const scopedNames = {};
  const typesPerName = {};

  Core.scope.generateScopedName = (name, filename, css) => { // eslint-disable-line
    if (!isValidClassname(name)) {
      // Throws within promise, goes to .catch(...)
      throw new Error(`Class name ${name} is invalid`);
    }

    const exportFile = `${filename}.js`;
    const styleImport = styleImports[exportFile];

    const isClass = css.indexOf(`.${name}`) !== -1;
    const animationRe = new RegExp(`@(?:[\\w]+-)?keyframes[\\s\\t\\n]*${name}`);
    const isAnimation = css.search(animationRe) !== -1;

    if (isClass && isAnimation) {
      throw new Error(
        `You defined ${name} as both a class and an animation. ` +
        'See https://github.com/css-modules/postcss-modules-scope/issues/8'
      );
    }

    const type = isClass ? 'class' : 'animation';

    const currentValue = get([exportFile, name], scopedNames);

    if (currentValue) return currentValue;

    if (removeUnusedClasses &&
      file === filename &&
      !isAnimation &&
      !includes(name, styleImport) &&
      !hasNamespaceImport(styleImport)) {
      return UNUSED_EXPORT;
    }

    const value = generateScopedName(name, filename, css);

    mutateSet(scopedNames, [exportFile, name], value);
    mutateSet(typesPerName, [name], type);

    return value;
  };

  return { styleImports, typesPerName };
};
