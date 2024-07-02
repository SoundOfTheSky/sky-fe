import { ParentComponent } from 'solid-js';

import Auth from '@/components/auth';

const Layout: ParentComponent = (properties) => {
  return <Auth>{properties.children}</Auth>;
};
export default Layout;
