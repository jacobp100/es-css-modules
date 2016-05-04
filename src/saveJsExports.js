import { writeFileSync } from 'fs';

export default (cssFile, js) => {
  writeFileSync(`${cssFile}.js`, js);
};
