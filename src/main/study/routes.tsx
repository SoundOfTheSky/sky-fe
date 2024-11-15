import { Route } from '@solidjs/router'
import { lazy } from 'solid-js'

import SessionRoutes from './session/routes'

const Layout = lazy(() => import('./layout'))
const Main = lazy(() => import('./pages/study'))
const Subjects = lazy(() => import('./pages/subjects'))

export default function Routes() {
  return (
    <Route path="/study" component={Layout}>
      <Route path="/" component={Main} />
      <Route path="/subjects" component={Subjects} />
      <SessionRoutes />
    </Route>
  )
}
