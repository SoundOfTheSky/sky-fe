import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

const Layout = lazy(() => import('./layout'));
const Main = lazy(() => import('./plan.page'));

export default () => {
  return (
    <Route path='/study' component={Layout}>
      <Route path='/' component={Main} />
    </Route>
  );
};
