import React from 'lodash'; // Don't have React installed in this project
import { base as button, primary as buttonPrimary } from './styles/button.m.css';

export default () => (
  <button className={`${button} ${buttonPrimary}`}>
    Button
  </button>
);
