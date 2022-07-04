import Auth from '@/components/auth';
import { Outlet } from '@solidjs/router';
import { StudyProvider } from './services/study.context';

export default function StudyPage() {
  return (
    <Auth>
      <StudyProvider>
        <Outlet />
      </StudyProvider>
    </Auth>
  );
}
