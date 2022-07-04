import { Route, Routes } from '@solidjs/router';
import { lazy } from 'solid-js';

import StudyRoutes from './study/routes';

const Outlet = lazy(() => import('@/pages/outlet'));
const Default = lazy(() => import('@/pages/default/default-tab'));
const Profile = lazy(() => import('@/pages/profile'));
const NotFound = lazy(() => import('@/errors/404'));

export default () => {
  return (
    <Routes>
      <Route path='/' component={Outlet}>
        <Route path='/' component={Default} />
        <Route path='/profile' component={Profile} />
        <Route path='**' component={NotFound} />
        <StudyRoutes />
      </Route>
    </Routes>
  );
};
