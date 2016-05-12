import React from 'lodash'; // Don't have React installed in this project
import button, { primary } from './styles/button.css';

export default () => (
  <button className={`${button} ${primary}`}>
    Button
  </button>
);
