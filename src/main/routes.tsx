import { Route } from '@solidjs/router'
import { lazy } from 'solid-js'

export default function routes() {
  return (
    <Route path="/" component={lazy(() => import('./layout'))}>
      <Route path="/" component={lazy(() => import('./pages/main'))} />
      <Route
        path="/profile"
        component={lazy(() => import('./pages/profile'))}
      />
    </Route>
  )
}
