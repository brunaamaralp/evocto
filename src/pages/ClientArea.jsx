import { Navigate } from 'react-router-dom';

/** Legacy Área do Cliente — consolidado em /client-portal */
export default function ClientAreaRedirect() {
  return <Navigate to="/client-portal" replace />;
}
