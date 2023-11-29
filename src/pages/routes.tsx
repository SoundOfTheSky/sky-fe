import { Route, Routes } from '@solidjs/router';
import { lazy } from 'solid-js';

import StudyRoutes from './study/routes';

export default () => {
  return (
    <Routes>
      <Route path='/' component={lazy(() => import('@/pages/outlet'))}>
        <Route path='/' component={lazy(() => import('@/pages/default/default-tab'))} />
        <Route path='/profile' component={lazy(() => import('@/pages/profile'))} />
        <StudyRoutes />
      </Route>
    </Routes>
  );
};
