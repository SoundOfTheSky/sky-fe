import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

const Outlet = lazy(() => import('./outlet'));
const Reviews = lazy(() => import('./reviews.page'));

export default () => {
  return (
    <Route path='/session' component={Outlet}>
      <Route path='/reviews' component={Reviews} />
      <Route path='/lessons' component={Reviews} />
    </Route>
  );
};
