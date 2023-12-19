import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

export default () => {
  return (
    <Route path='/jp-conjugation'>
      <Route path='/' component={lazy(() => import('./pages/conjugation'))} />
    </Route>
  );
};
