import { ParentComponent } from 'solid-js';

import { ReviewProvider } from './review.context';

const Layout: ParentComponent = (properties) => {
  return <ReviewProvider>{properties.children}</ReviewProvider>;
};

export default Layout;
