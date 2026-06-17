import { faCompass } from '@fortawesome/free-solid-svg-icons';
import { ErrorScreen } from '@kuraykaraaslan/common/ui/error-screen.component';

// 404 — same shared design as the error boundaries (no retry; just go home).
export default function NotFound() {
  return (
    <ErrorScreen
      title="Page not found"
      message="The page you’re looking for doesn’t exist or may have moved."
      icon={faCompass}
    />
  );
}
