
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useSession } from '@/components/auth/SessionManager';
import { PublicBriefingToken, PublicBriefingResponse, BriefingTemplate } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link2,
  Send,
  RefreshCw,
  Eye,
  Copy,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { generatePublicBriefingToken } from '@/api/functions';

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    <Icon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 mb-6">{description}</p>
    {action}
  </div>
);

const LoadingState = ({ t }) => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const STATUS_CONFIG = {
  draft: {
    icon: FileText,
    color: 'bg-slate-100 text-slate-700',
    label: 'briefing.status.draft'
  },
  link_sent: {
    icon: Send,
    color: 'bg-blue-100 text-blue-700',
    label: 'briefing.status.linkSent'
  },
  in_progress: {
    icon: Clock,
    color: 'bg-orange-100 text-orange-700',
    label: 'briefing.status.inProgress'
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700',
    label: 'briefing.status.completed'
  },
  expired: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700',
    label: 'briefing.status.expired'
  }
};

export default function BriefingTab({ customer, services = [] }) {
  const { t } = useTranslation();
  const { agency } = useSession();
  const [activeTokens, setActiveTokens] = useState([]);
  const [responses, setResponses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  const loadBriefingData = useCallback(async () => {
    if (!customer?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [tokensData, responsesData, templatesData] = await Promise.all([
        PublicBriefingToken.filter({ 
          clientId: customer.id,
          status: 'active'
        }).catch(() => []),
        PublicBriefingResponse.filter({ 
          clientId: customer.id
        }, '-updated_date', 50).catch(() => []),
        BriefingTemplate.filter({ 
          agencyId: customer.agencyId,
          isActive: true
        }).catch(() => [])
      ]);

      setActiveTokens(tokensData || []);
      setResponses(responsesData || []);
      setTemplates(templatesData || []);
    } catch (err) {
      console.error('Error loading briefing data:', err);
      setError(t('briefing.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [customer?.id, customer?.agencyId, t]);

  useEffect(() => {
    loadBriefingData();
  }, [loadBriefingData]);

  const handleGenerateLink = async (serviceId = null) => {
    try {
      setGeneratingToken(true);
      const response = await generatePublicBriefingToken({
        clientId: customer.id,
        serviceId,
        expiryDays: 30,
        language: 'pt'
      });

      if (response.data?.success) {
        toast.success(t('briefing.success.linkGenerated'));
        loadBriefingData();
      } else {
        throw new Error(response.data?.error || 'Failed to generate link');
      }
    } catch (err) {
      console.error('Error generating link:', err);
      toast.error(t('briefing.errors.linkGenerationFailed'));
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyLink = async (token) => {
    try {
      await navigator.clipboard.writeText(token.publicUrl);
      toast.success(t('briefing.success.linkCopied'));
    } catch (err) {
      toast.error(t('briefing.errors.copyFailed'));
    }
  };

  const handleRevokeToken = async (tokenId) => {
    if (!confirm(t('briefing.confirmRevoke'))) return;

    try {
      await PublicBriefingToken.update(tokenId, {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: agency.contactEmail
      });

      toast.success(t('briefing.success.linkRevoked'));
      loadBriefingData();
    } catch (err) {
      console.error('Error revoking token:', err);
      toast.error(t('briefing.errors.revokeFailed'));
    }
  };

  const getBriefingStatus = () => {
    if (responses.some(r => r.status === 'submitted')) {
      return 'completed';
    }
    
    if (responses.some(r => r.status === 'in_progress')) {
      return 'in_progress';
    }
    
    if (activeTokens.length > 0) {
      const hasExpired = activeTokens.some(t => new Date(t.expiresAt) < new Date());
      return hasExpired ? 'expired' : 'link_sent';
    }
    
    return 'draft';
  };

  if (loading) {
    return <LoadingState t={t} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex justify-between items-center">
          {error}
          <Button variant="outline" size="sm" onClick={loadBriefingData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('cta.tryAgain')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const currentStatus = getBriefingStatus();
  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || FileText;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <StatusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>{t('briefing.title')}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {t('briefing.subtitle')}
                </p>
              </div>
            </div>
            
            <Badge className={STATUS_CONFIG[currentStatus]?.color}>
              {t(STATUS_CONFIG[currentStatus]?.label)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {currentStatus === 'draft' && (
            <div className="space-y-4">
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  {t('briefing.emptyState.subtitle')}
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => handleGenerateLink()} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={generatingToken}
                >
                  {generatingToken ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  {t('briefing.actions.generateLink')}
                </Button>
                
                {services.length > 0 && (
                  <div className="flex gap-2">
                    {services.map(service => (
                      <Button
                        key={service.id}
                        variant="outline"
                        onClick={() => handleGenerateLink(service.id)}
                        size="sm"
                        disabled={generatingToken}
                      >
                        {generatingToken ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          service.name
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTokens.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">{t('briefing.activeLinks.title')}</h4>
              {activeTokens.map(token => (
                <div key={token.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {token.serviceId ? 
                          services.find(s => s.id === token.serviceId)?.name || t('briefing.unknownService') :
                          t('briefing.generalBriefing')
                        }
                      </p>
                      <Badge variant="outline" size="sm">
                        {token.metadata?.language?.toUpperCase() || 'PT'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {t('briefing.expires')}: {isValid(new Date(token.expiresAt)) ? format(new Date(token.expiresAt), 'PPp') : t('briefing.expires.invalid')}
                    </p>
                    {token.accessCount > 0 && (
                      <p className="text-xs text-slate-500">
                        {t('briefing.accessCount', { count: token.accessCount })}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(token)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(token.publicUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeToken(token.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            {t('briefing.templates.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t('briefing.templates.emptyTitle')}
              description={t('briefing.templates.emptyDescription')}
              action={
                <Button variant="outline" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('briefing.templates.createTemplate')}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-slate-600">{template.description}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    {t('cta.manage')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('briefing.responses.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {responses.map(response => (
                <div key={response.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_CONFIG[response.status]?.color || STATUS_CONFIG.completed.color}>
                        {t(`briefing.responseStatus.${response.status}`)}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {t('briefing.submittedAt')}: {isValid(new Date(response.submittedAt)) ? format(new Date(response.submittedAt), 'PPp') : t('briefing.submittedAt.invalid')}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Eye className="w-3 h-3 mr-1" />
                      {t('cta.view')}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">{t('briefing.responses.questionsAnswered')}:</span>
                      <span className="ml-2 font-medium">
                        {Object.keys(response.responses || {}).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('briefing.responses.aiSuggestions')}:</span>
                      <span className="ml-2 font-medium">
                        {response.aiSuggestions?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('briefing.responses.language')}:</span>
                      <span className="ml-2 font-medium">
                        {response.metadata?.language?.toUpperCase() || 'PT'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
