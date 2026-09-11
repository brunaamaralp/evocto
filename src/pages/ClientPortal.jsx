import { Navigate } from 'react-router-dom';

/** Legacy portal — consolidado em /client-portal */
export default function ClientPortalLegacyRedirect() {
  return <Navigate to="/client-portal" replace />;
}
