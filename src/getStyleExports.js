import { flow, toPairs, map, cond, equals, first, constant } from 'lodash/fp';

const defaultExport = ([, exportName]) =>
  `export default '${exportName}';\n`;
const constExport = ([importName, exportName]) =>
  `export const ${importName} = '${exportName}';\n`;

export default flow(
  toPairs,
  map(cond([
    [flow(first, equals('default')), defaultExport],
    [constant(true), constExport],
  ])),
  values => values.join('')
);
