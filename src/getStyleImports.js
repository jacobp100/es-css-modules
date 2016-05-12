import {
  flow, endsWith, filter, first, toPairs, fromPairs, map, keys,
} from 'lodash/fp';
import getEsImportsExports from 'get-es-imports-exports';
import { stat } from 'fs';


const getPathWithoutModule = path => path.replace(/\.m.css$/, '.css');

const isFile = (path, cb) => {
  stat(path, (err, s) => {
    if (err && err.code === 'ENOENT') cb(null, false);
    else if (err) cb(err);
    else cb(null, s.isFile());
  });
};

const resolneMCssWithoutModule = (path, cb) => {
  const pathWithoutModule = getPathWithoutModule(path);
  isFile(pathWithoutModule, (err, cssFileExists) => {
    if (err) cb(err);
    else if (cssFileExists) cb(null, pathWithoutModule);
    else cb(null, null);
  });
};

const resolveMCss = (path, cb) => {
  isFile(path, (err, moduleCssFileExists) => {
    if (err) cb(err);
    else if (moduleCssFileExists) cb(null, path);
    else resolneMCssWithoutModule(path, cb);
  });
};

const resolveIsFile = (path, cb) => {
  if (endsWith('.css.js', path)) {
    // Don't allow this, as it may be an artifact from a previous build, but no longer relevant
    cb(null, false);
  } else if (endsWith('.m.css', path)) {
    // Check file.m.css, if that doesn't exist, fallback to file.css
    resolveMCss(path, (err, resolvedPath) => {
      cb(err, resolvedPath !== null);
    });
  } else {
    isFile(path, cb);
  }
};

export const defaultResolveOptions = {
  extensions: ['.css', '.js', '.json'],
  isFile: resolveIsFile,
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

  const cssToCssModuleMapPairsPromises = flow(
    keys,
    map(path => new Promise((res, rej) => {
      resolveMCss(path, (err, resolvedPath) => {
        if (err) rej(err);
        else res([resolvedPath, path]);
      });
    }))
  )(styleImports);

  const cssToCssModuleMap = fromPairs(await Promise.all(cssToCssModuleMapPairsPromises));

  return { styleImports, cssToCssModuleMap };
};
