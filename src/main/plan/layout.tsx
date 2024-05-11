import { ParentComponent } from 'solid-js';

import Auth from '@/components/auth';

import { PlanProvider } from './plan.context';

const Layout: ParentComponent = (properties) => {
  return (
    <Auth>
      <PlanProvider>{properties.children}</PlanProvider>
    </Auth>
  );
};
export default Layout;
