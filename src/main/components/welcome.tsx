import { Component } from 'solid-js'

import s from './welcome.module.scss'

export default (() => {
  return (
    <div class={`card ${s.welcome}`}>{location.hostname.toUpperCase()}</div>
  )
}) as Component
