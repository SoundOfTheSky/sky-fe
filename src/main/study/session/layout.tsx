import { ParentComponent } from 'solid-js';

import { SessionProvider } from './session.context';

const Layout: ParentComponent = (properties) => {
  return <SessionProvider>{properties.children}</SessionProvider>;
};

export default Layout;
