import { Route } from '@solidjs/router';
import { Component, lazy } from 'solid-js';

import SessionRoutes from './session/routes';

const Layout = lazy(() => import('./layout'));
const Main = lazy(() => import('./pages/study'));
const Subjects = lazy(() => import('./pages/subjects'));
const Subject = lazy(() => import('./pages/subject'));

export default () => {
  return (
    <Route path='/study' component={Layout}>
      <Route path='/' component={Main} />
      <Route path='/subjects' component={Subjects} />
      <Route path='/subjects/:id' component={Subject as Component} />
      <SessionRoutes />
    </Route>
  );
};
