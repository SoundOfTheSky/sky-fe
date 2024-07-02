import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

import JPConjugationRoutes from './jp-conjugation/routes';
import PlannerRoutes from './planner/routes';
import StudyRoutes from './study/routes';

export default () => {
  return (
    <Route path='/' component={lazy(() => import('./layout'))}>
      <Route path='/' component={lazy(() => import('./pages/default-tab'))} />
      <Route path='/profile' component={lazy(() => import('./pages/profile'))} />
      <StudyRoutes />
      <JPConjugationRoutes />
      <PlannerRoutes />
    </Route>
  );
};
