import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Agency } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Lock, Zap, AlertTriangle, Eye } from 'lucide-react';

export default function AgencyFeaturesSettingsPage() {
  const { user, agency, isOwner, isAdmin } = useSession();
  const [featureFlags, setFeatureFlags] = useState({
    contentHelper: false,
    advancedAnalytics: true,
    betaFeatures: false,
    automationEngine: false,
    clientPortalAdvanced: false,
    ...agency?.feature_flags
  });
  const [saving, setSaving] = useState(false);

  // Verificar permissões
  if (!isOwner() && !isAdmin()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionalidades</h1>
          <p className="text-red-600">Você não tem permissão para editar essas configurações.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);

    try {
      await Agency.update(agency.id, {
        feature_flags: featureFlags
      });

      toast.success('Funcionalidades atualizadas com sucesso!');
      
      // Recarregar para aplicar mudanças
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error('Error updating feature flags:', error);
      toast.error('Erro ao atualizar funcionalidades');
    } finally {
      setSaving(false);
    }
  };

  const updateFlag = (flag, enabled) => {
    setFeatureFlags(prev => ({
      ...prev,
      [flag]: enabled
    }));
  };

  const features = [
    {
      key: 'contentHelper',
      name: 'Assistente de Conteúdo IA',
      description: 'Geração automática de textos para relatórios e comunicações',
      icon: Sparkles,
      tier: 'premium',
      enabled: featureFlags.contentHelper
    },
    {
      key: 'advancedAnalytics',
      name: 'Analytics Avançado',
      description: 'Dashboards detalhados e métricas de performance',
      icon: Zap,
      tier: 'standard',
      enabled: featureFlags.advancedAnalytics
    },
    {
      key: 'betaFeatures',
      name: 'Funcionalidades Beta',
      description: 'Acesso antecipado a novas funcionalidades em desenvolvimento',
      icon: AlertTriangle,
      tier: 'beta',
      enabled: featureFlags.betaFeatures
    },
    {
      key: 'automationEngine',
      name: 'Motor de Automação',
      description: 'Automatização de workflows e processos repetitivos',
      icon: Zap,
      tier: 'premium',
      enabled: featureFlags.automationEngine
    },
    {
      key: 'clientPortalAdvanced',
      name: 'Portal do Cliente Avançado',
      description: 'Portal personalizado com marca própria e recursos avançados',
      icon: Eye,
      tier: 'premium',
      enabled: featureFlags.clientPortalAdvanced
    }
  ];

  const getTierBadge = (tier) => {
    const badges = {
      standard: <Badge className="bg-blue-100 text-blue-800">Padrão</Badge>,
      premium: <Badge className="bg-purple-100 text-purple-800">Premium</Badge>,
      beta: <Badge className="bg-orange-100 text-orange-800">Beta</Badge>
    };
    return badges[tier] || null;
  };

  const getTierColor = (tier) => {
    const colors = {
      standard: 'border-l-blue-500',
      premium: 'border-l-purple-500',
      beta: 'border-l-orange-500'
    };
    return colors[tier] || 'border-l-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Funcionalidades</h1>
        <p className="text-gray-600">Ative ou desative funcionalidades disponíveis para sua agência</p>
      </div>

      <div className="space-y-4">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          
          return (
            <Card key={feature.key} className={`border-l-4 ${getTierColor(feature.tier)}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-gray-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {feature.name}
                        </h3>
                        {getTierBadge(feature.tier)}
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        {feature.description}
                      </p>

                      {/* Mostrar impacto da funcionalidade */}
                      {feature.key === 'betaFeatures' && feature.enabled && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm text-orange-800">
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            Funcionalidades beta podem ser instáveis e mudar sem aviso.
                          </p>
                        </div>
                      )}

                      {feature.key === 'automationEngine' && feature.enabled && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <Zap className="w-4 h-4 inline mr-1" />
                            Automações estarão disponíveis em todas as páginas após salvar.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={(checked) => updateFlag(feature.key, checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumo das mudanças */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Resumo das Alterações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-blue-800 text-sm">
              Funcionalidades ativadas: {Object.values(featureFlags).filter(Boolean).length}
            </p>
            <p className="text-blue-700 text-sm">
              As mudanças serão aplicadas para todos os usuários da agência após salvar.
            </p>
            {featureFlags.betaFeatures && (
              <p className="text-orange-700 text-sm font-medium">
                ⚠️ Funcionalidades beta ativadas - use com cuidado em produção.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setFeatureFlags({ ...agency?.feature_flags })}
        >
          Resetar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Funcionalidades'}
        </Button>
      </div>
    </div>
  );
}