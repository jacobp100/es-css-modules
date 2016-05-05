import { overEvery, overSome, equals, negate, includes, get, set } from 'lodash/fp';
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


export default (Core, { removeUnusedClasses, generateScopedName }) => (styleImports) => {
  let scopedNames = {};

  Core.scope.generateScopedName = (name, filename) => { // eslint-disable-line
    if (!isValidClassname(name)) {
      // Throws within promise, goes to .catch(...)
      throw new Error(`Class name ${name} is invalid`);
    }

    const exportFile = `${filename}.js`;
    const styleImport = styleImports[exportFile];

    const currentValue = get([exportFile, name], scopedNames);

    if (currentValue) return currentValue;

    if (removeUnusedClasses &&
      !includes(name, styleImport) &&
      !hasNamespaceImport(styleImport)) {
      return UNUSED_EXPORT;
    }

    const value = generateScopedName(name, filename);

    scopedNames = set([exportFile, name], value, scopedNames);

    return value;
  };

  return styleImports;
};
