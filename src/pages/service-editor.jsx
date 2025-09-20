import React, { useEffect } from 'react';
import LoadingState from '@/components/shared/LoadingState';
import { Service } from '@/api/entities';
import { createPageUrl } from '@/utils';

/**
 * Página de redirecionamento para o editor correto baseado no tipo de serviço
 */
export default function ServiceEditorPage() {
  useEffect(() => {
    const redirectToCorrectEditor = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const serviceId = urlParams.get('serviceId');

      if (!serviceId) {
        // Sem serviceId, redirecionar para lista de serviços
        window.location.replace(createPageUrl('services-overview'));
        return;
      }

      try {
        // Buscar o serviço para determinar se é template ou instância
        const service = await Service.get(serviceId);

        if (!service) {
          // Serviço não encontrado
          window.location.replace(createPageUrl('services-overview'));
          return;
        }

        // Redirecionar para o editor correto
        if (service.is_template) {
          window.location.replace(
            createPageUrl('service-template-editor') + `?serviceId=${serviceId}`
          );
        } else {
          window.location.replace(
            createPageUrl('service-instance-editor') + `?serviceId=${serviceId}`
          );
        }

      } catch (error) {
        console.error('Erro ao determinar tipo de serviço:', error);
        // Em caso de erro, redirecionar para lista de serviços
        window.location.replace(createPageUrl('services-overview'));
      }
    };

    redirectToCorrectEditor();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingState message="Redirecionando para o editor correto..." />
        <p className="text-sm text-gray-600 mt-4">
          Determinando se é template ou instância de serviço...
        </p>
      </div>
    </div>
  );
}