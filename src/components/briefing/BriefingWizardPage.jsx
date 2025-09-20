import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Client, Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import BriefingWizard from './BriefingWizard';
import { DEFAULT_TEMPLATES } from './BriefingTemplateManager';

export default function BriefingWizardPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { agency } = useSession();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [template, setTemplate] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceType = urlParams.get('serviceType') || 'social_media';

  useEffect(() => {
    const loadData = async () => {
      if (!agency?.id || !clientId) return;

      try {
        // Load client
        const clientData = await Client.get(clientId);
        setClient(clientData);

        // Get template for service type
        const serviceTemplate = DEFAULT_TEMPLATES[serviceType];
        setTemplate(serviceTemplate);
      } catch (error) {
        console.error('Error loading briefing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [agency?.id, clientId, serviceType]);

  const handleComplete = async (responses, action) => {
    if (action === 'generate') {
      // Navigate to insights/planning generation
      window.location.href = createPageUrl(`insights-editor?clientId=${clientId}&briefingCompleted=true`);
    } else if (action === 'review') {
      // Navigate to review/edit briefing
      window.location.href = createPageUrl(`briefing-editor?clientId=${clientId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {t('errors.clientNotFound')}
            </h3>
            <p className="text-slate-600 mb-6">
              {t('errors.clientIdRequired')}
            </p>
            <Button asChild>
              <a href={createPageUrl('clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('cta.backToClients')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('cta.goBack')}
            </Button>
            <div className="border-l border-slate-300 pl-4">
              <h1 className="text-lg font-semibold text-slate-900">
                Briefing - {client.name}
              </h1>
              <p className="text-sm text-slate-600">
                {template?.service || serviceType}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-6">
        <BriefingWizard
          clientId={clientId}
          template={template}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}