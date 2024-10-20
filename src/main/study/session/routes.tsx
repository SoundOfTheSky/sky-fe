import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

const Layout = lazy(() => import('./layout'));
const Session = lazy(() => import('./session'));

export default () => {
  return (
    <Route path='/session' component={Layout}>
      <Route path='/reviews' component={Session} />
      <Route path='/lessons' component={Session} />
    </Route>
  );
};
