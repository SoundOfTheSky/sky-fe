import { JSX, ParentComponent, splitProps } from 'solid-js'

import s from './button.module.scss'

const Button: ParentComponent<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (
  properties,
) => {
  const [properties_, attributes] = splitProps(properties, ['children'])
  return (
    <button {...attributes} class={`${s.button} ${attributes.class ?? ''}`}>
      {properties_.children}
    </button>
  )
}
export default Button
