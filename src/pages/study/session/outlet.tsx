import { Outlet } from '@solidjs/router';
import { ReviewProvider } from './review.context';

export default function StudyPage() {
  document.title = 'Sky | Study';

  return (
    <ReviewProvider>
      <Outlet />
    </ReviewProvider>
  );
}
