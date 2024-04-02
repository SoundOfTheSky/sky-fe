import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

const Layout = lazy(() => import('./layout'));
const Reviews = lazy(() => import('./reviews'));

export default () => {
  return (
    <Route path='/session' component={Layout}>
      <Route path='/reviews' component={Reviews} />
      <Route path='/lessons' component={Reviews} />
    </Route>
  );
};
