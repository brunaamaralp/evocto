
import React, { useState, useEffect, useCallback } from 'react';
import { Brief, BriefingVersion } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Eye, Download, Calendar, User,
  Target, Users, MessageSquare, Lightbulb,
  CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function BriefingView({ clientId }) {
  const [briefing, setBriefing] = useState(null);
  const [briefingVersions, setBriefingVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const loadBriefingData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar o briefing mestre do cliente
      const briefs = await Brief.filter({ 
        projectId: clientId 
      });

      if (briefs.length > 0) {
        const brief = briefs[0];
        setBriefing(brief);

        // Buscar versões aprovadas do briefing
        const versions = await BriefingVersion.filter({ 
          briefId: brief.id,
          status: 'APPROVED'
        }, '-approved_at');

        setBriefingVersions(versions);
        
        // Selecionar a versão mais recente por padrão
        if (versions.length > 0) {
          setSelectedVersion(versions[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar briefing:', error);
      toast.error('Erro ao carregar briefing');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      loadBriefingData();
    }
  }, [clientId, loadBriefingData]);

  const handleDownloadPDF = async (version) => {
    if (version?.pdf_url) {
      try {
        const link = document.createElement('a');
        link.href = version.pdf_url;
        link.download = `briefing-${version.version_name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado');
      } catch (error) {
        toast.error('Erro ao fazer download');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum Briefing Encontrado
          </h3>
          <p className="text-gray-600">
            Ainda não há um briefing aprovado disponível para visualização.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayData = selectedVersion?.snapshot_data || briefing;

  return (
    <div className="space-y-6">
      {/* Header com Versões */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Briefing do Projeto</h2>
          <p className="text-gray-600 mt-1">
            Última atualização: {format(new Date(briefing.updated_date), 'dd MMM yyyy', { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {briefingVersions.length > 0 && (
            <select
              value={selectedVersion?.id || ''}
              onChange={(e) => {
                const version = briefingVersions.find(v => v.id === e.target.value);
                setSelectedVersion(version);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {briefingVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.version_name} - {format(new Date(version.approved_at), 'dd/MM/yyyy')}
                </option>
              ))}
            </select>
          )}

          {selectedVersion?.pdf_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPDF(selectedVersion)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Status da Versão */}
      {selectedVersion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                Versão {selectedVersion.version_name} - Aprovada
              </p>
              <p className="text-sm text-green-700">
                Aprovada em {format(new Date(selectedVersion.approved_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conteúdo do Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Contexto do Negócio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Contexto do Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayData.business_context && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Sobre a Empresa</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {displayData.business_context}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Público-Alvo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Público-Alvo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData.target_audience ? (
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayData.target_audience}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Não especificado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Objetivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData.objectives ? (
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayData.objectives}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Não especificado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Desafios Atuais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Desafios Atuais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData.current_challenges ? (
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayData.current_challenges}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Não especificado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tom de Voz */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-600" />
              Tom de Voz
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData.brand_tone ? (
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayData.brand_tone}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Não especificado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Métricas de Sucesso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Métricas de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayData.success_metrics ? (
              <p className="text-gray-700 text-sm leading-relaxed">
                {displayData.success_metrics}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Não especificado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Informações Adicionais */}
      {displayData.additional_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-600" />
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm leading-relaxed">
              {displayData.additional_info}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
