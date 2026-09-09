import { useEffect } from 'react';
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
      const serviceId = urlParams.get('serviceId') || urlParams.get('id');
      const templateId = urlParams.get('templateId');
      const clientId = urlParams.get('clientId');

      // Criar instância a partir de um template
      if (!serviceId && templateId) {
        const qs = new URLSearchParams({ templateId });
        if (clientId) qs.set('clientId', clientId);
        window.location.replace(
          `${createPageUrl('service-instance-editor')}?${qs.toString()}`
        );
        return;
      }

      if (!serviceId) {
        window.location.replace(createPageUrl('services-overview'));
        return;
      }

      try {
        const service = await Service.get(serviceId);

        if (!service) {
          window.location.replace(createPageUrl('services-overview'));
          return;
        }

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
