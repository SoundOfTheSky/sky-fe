import { Route } from '@solidjs/router'
import { lazy } from 'solid-js'

import StorageRoutes from './storage/routes'

export default function routes() {
  return (
    <Route path='/' component={lazy(() => import('./layout'))}>
      <Route path='/' component={lazy(() => import('./pages/main'))} />
      <Route
        path='/profile'
        component={lazy(() => import('./pages/profile'))}
      />
      <Route path='/timer' component={lazy(() => import('./tools/timer'))} />
      <StorageRoutes />
    </Route>
  )
}
