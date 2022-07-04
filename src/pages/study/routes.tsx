import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

import SessionRoutes from './session/routes';

const Outlet = lazy(() => import('./outlet'));
const Main = lazy(() => import('./study.page'));
const Subjects = lazy(() => import('./subjects.page'));
const Subject = lazy(() => import('./subject.page'));

export default () => {
  return (
    <Route path='/study' component={Outlet}>
      <Route path='/' component={Main} />
      <Route path='/subjects' component={Subjects} />
      <Route path='/subjects/:id' component={Subject} />
      <SessionRoutes />
    </Route>
  );
};
