import { ParentComponent } from 'solid-js';

import s from './fatal-error.module.scss';

const FatalError: ParentComponent = (properties) => {
  return <div class={s.fatalError}>{properties.children}</div>;
};
export default FatalError;
