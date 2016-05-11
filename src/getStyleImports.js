import { flow, endsWith, filter, first, toPairs, fromPairs } from 'lodash/fp';
import getEsImportsExports from 'get-es-imports-exports';
import { stat } from 'fs';


const isFile = (path, cb) => {
  if (endsWith('.css.js', path)) {
    cb(null, false);
    return;
  }

  stat(path, (err, s) => {
    if (err && err.code === 'ENOENT') cb(null, false);
    else if (err) cb(err);
    else cb(null, s.isFile());
  });
};

export const defaultResolveOptions = {
  extensions: ['.css', '.js', '.json'],
  isFile,
};


export default async ({
  jsFiles: files,
  recurse,
  parser,
  parserOptions,
  resolveOptions,
}) => {
  const { imports } = await getEsImportsExports({
    files,
    recurse,
    parser,
    parserOptions,
    exclude: '/**/*.css',
    resolveOptions,
  });

  const styleImports = flow(
    toPairs,
    filter(flow(
      first,
      endsWith('.css')
    )),
    fromPairs
  )(imports);

  return styleImports;
};
