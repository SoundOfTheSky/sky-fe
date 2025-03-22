import { Route } from '@solidjs/router'
import { lazy } from 'solid-js'

const Layout = lazy(() => import('./layout'))

export default function Routes() {
  return (
    <Route path='/storage' component={Layout}>
      <Route path='/*' component={lazy(() => import('./pages/main.page'))} />
    </Route>
  )
}
