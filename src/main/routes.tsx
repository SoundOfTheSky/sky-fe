import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

import StudyRoutes from './study/routes';
import JPConjugationRoutes from './jp-conjugation/routes';

export default () => {
  return (
    <Route path='/' component={lazy(() => import('./layout'))}>
      <Route path='/' component={lazy(() => import('./pages/default-tab'))} />
      <Route path='/profile' component={lazy(() => import('./pages/profile'))} />
      <StudyRoutes />
      <JPConjugationRoutes />
    </Route>
  );
};