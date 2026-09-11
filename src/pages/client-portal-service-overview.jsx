import { Navigate } from 'react-router-dom';

export default function ClientPortalServiceOverviewRedirect() {
  return <Navigate to="/client-portal?tab=progress" replace />;
}
