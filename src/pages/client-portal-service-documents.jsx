import { Navigate } from 'react-router-dom';

export default function ClientPortalServiceDocumentsRedirect() {
  return <Navigate to="/client-portal?tab=files" replace />;
}
