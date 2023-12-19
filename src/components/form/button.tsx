import { JSX, ParentComponent, splitProps } from 'solid-js';

import s from './button.module.scss';

const Button: ParentComponent<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (properties) => {
  const [props, attributes] = splitProps(properties, ['children']);
  return (
    <button {...attributes} class={`${s.button} ${attributes.class ?? ''}`}>
      {props.children}
    </button>
  );
};
export default Button;
