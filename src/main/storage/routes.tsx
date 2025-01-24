import { Route } from '@solidjs/router'
import { lazy } from 'solid-js'

import SessionRoutes from './session/routes'

const Layout = lazy(() => import('./layout'))

export default function Routes() {
  return (
    <Route path="/study" component={Layout}>
      <Route path="/" component={Main} />
      <SessionRoutes />
    </Route>
  )
}
