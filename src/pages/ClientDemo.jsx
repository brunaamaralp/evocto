import { Navigate } from 'react-router-dom';

/** Legacy demo — consolidado em /client-portal */
export default function ClientDemoRedirect() {
  return <Navigate to="/client-portal" replace />;
}
