import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

const Layout = lazy(() => import('./layout'));
const Main = lazy(() => import('./planner.page'));

export default () => {
  return (
    <Route path='/planner' component={Layout}>
      <Route path='/' component={Main} />
    </Route>
  );
};
