import { mdiSortAscending, mdiSortDescending } from '@mdi/js'
import { batch, ParentComponent, Show } from 'solid-js'

import Icon from '@/components/icon'
import { Atom } from '@/services/reactive'

import s from './table-sorting-column.module.scss'

const TableSortingColumn: ParentComponent<{
  sortingField: Atom<string>
  sortingAsc: Atom<boolean>
  name: string
}> = (properties) => {
  function clickSort() {
    batch(() => {
      if (properties.sortingField() === properties.name)
        properties.sortingAsc((x) => !x)
      else {
        properties.sortingAsc(true)
        properties.sortingField(properties.name)
      }
    })
  }
  return (
    <th class={s.tableSortingColumn} onClick={clickSort}>
      <button>
        {properties.children}
        <Show when={properties.sortingField() === properties.name}>
          <Icon
            path={
              properties.sortingAsc() ? mdiSortAscending : mdiSortDescending
            }
          />
        </Show>
      </button>
    </th>
  )
}
export default TableSortingColumn
