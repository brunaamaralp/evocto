import React from 'react';
import ClientFileManager from '@/components/client_portal/ClientFileManager';

export default function DeliveryWorkspaceFiles({ clientId, serviceId }) {
  if (!clientId) {
    return (
      <p className="text-sm text-slate-500">
        Serviço sem cliente vinculado — não é possível listar arquivos.
      </p>
    );
  }

  return (
    <div className="delivery-workspace-files">
      <ClientFileManager clientId={clientId} serviceId={serviceId} />
    </div>
  );
}
