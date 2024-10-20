import { ParentComponent } from 'solid-js';

import Auth from '@/components/auth';

import { StudyProvider } from './services/study.context';

const Layout: ParentComponent = (properties) => {
  return (
    <Auth>
      <StudyProvider>{properties.children}</StudyProvider>
    </Auth>
  );
};
export default Layout;
