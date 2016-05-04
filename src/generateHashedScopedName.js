import stringHash from 'string-hash';

export default (name, filename) => {
  const hash = stringHash(filename).toString(36).substr(0, 5);

  return `_${name}_${hash}`;
};
