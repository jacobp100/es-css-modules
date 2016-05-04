import {
  flow, startsWith, endsWith, partial, negate, filter, first, toPairs, fromPairs,
} from 'lodash/fp';
import getEsImports from 'get-es-imports';
import { join, isAbsolute, relative } from 'path';
import { stat } from 'fs';


export default async ({
  moduleExportDirectory,
  jsFiles: files,
  recurse,
  parser,
  parserOptions,
}) => {
  if (!isAbsolute(moduleExportDirectory)) {
    throw new Error('Expected moduleExportsDirectory to be an absolute path');
  }

  const isInModuleExportsDirectory = flow(
    partial(relative, [moduleExportDirectory]),
    negate(startsWith('..'))
  );

  const isFile = (path, cb) => {
    if (isInModuleExportsDirectory(path)) {
      cb(null, endsWith('.css.js', path));
      return;
    }

    stat(path, (err, s) => {
      if (err && err.code === 'ENOENT') cb(null, false);
      else if (err) cb(err);
      else cb(null, s.isFile());
    });
  };

  const { dependencies } = await getEsImports({
    files,
    recurse,
    parser,
    parserOptions,
    exclude: join(moduleExportDirectory, '/**/*'),
    resolveOptions: {
      extensions: ['.js', '.json'],
      isFile,
    },
  });

  const styleImports = flow(
    toPairs,
    filter(flow(
      first,
      isInModuleExportsDirectory
    )),
    fromPairs
  )(dependencies);

  return styleImports;
};
