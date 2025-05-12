import { Component, Show } from 'solid-js'

import Icon from '@/components/icon'
import Tooltip from '@/components/tooltip'

import { ACTIONS } from './browser'

const ActionButton: Component<{
  actions: Set<ACTIONS>
  action: ACTIONS
  tooltip: string
  onClick: () => unknown
  icon: string
}> = (properties) => {
  return (
    <Show when={properties.actions.has(properties.action)}>
      <Tooltip content={properties.tooltip}>
        <button class='button' onClick={() => properties.onClick()}>
          <Icon path={properties.icon} size='24' />
        </button>
      </Tooltip>
    </Show>
  )
}

export default ActionButton
