import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CyclePlan, Client, Service, LearningEntry } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Upload, FileText, TrendingUp, BookOpen, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const MetricInput = ({ label, value, onChange, placeholder, suffix = "" }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-slate-700">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        step="0.01"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || null)}
        placeholder={placeholder}
        className="pr-12"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const FileUploadCard = ({ title, description, files, onFilesChange }) => {
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    onFilesChange([...files, ...newFiles]);
  };

  return (
    <Card className="border-dashed border-2 border-slate-300 hover:border-blue-400 transition-colors">
      <CardContent className="pt-6">
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-slate-400 mb-4" />
          <h3 className="font-medium text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-4">{description}</p>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`).click()}
          >
            Selecionar Arquivos
          </Button>
          {files.length > 0 && (
            <div className="mt-3 text-left">
              <p className="text-xs text-slate-500 mb-2">{files.length} arquivo(s) selecionado(s):</p>
              {files.slice(0, 3).map((file, idx) => (
                <p key={idx} className="text-xs text-slate-600 truncate">
                  {file.name}
                </p>
              ))}
              {files.length > 3 && (
                <p className="text-xs text-slate-500">... e mais {files.length - 3}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function CycleClosing() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { agency, user } = useSession();
  
  const [cycle, setCycle] = useState(null);
  const [client, setClient] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do formulário de fechamento
  const [closingData, setClosingData] = useState({
    results: {
      impressions: null,
      clicks: null,
      ctr: null,
      conversions: null,
      conversion_rate: null,
      cost: null,
      cpl: null,
      roas: null
    },
    achievements: '',
    challenges: '',
    client_feedback: '',
    next_cycle_recommendations: '',
    satisfaction_score: null,
    attachments: []
  });

  const [learnings, setLearnings] = useState([]);
  const [newLearning, setNewLearning] = useState({
    title: '',
    description: '',
    impact: 'medium',
    tags: []
  });

  useEffect(() => {
    if (cycleId && agency?.id) {
      loadCycleData();
    }
  }, [cycleId, agency?.id]);

  const loadCycleData = async () => {
    setLoading(true);
    try {
      const cycleData = await CyclePlan.get(cycleId);
      if (!cycleData || cycleData.agencyId !== agency.id) {
        toast.error("Ciclo não encontrado ou sem permissão");
        navigate('/cycles');
        return;
      }

      const [clientData, serviceData] = await Promise.all([
        Client.get(cycleData.clientId),
        Service.get(cycleData.serviceId)
      ]);

      setCycle(cycleData);
      setClient(clientData);
      setService(serviceData);

      // Carregar dados existentes de fechamento se houver
      if (cycleData.closing_data) {
        setClosingData({
          ...closingData,
          ...cycleData.closing_data
        });
      }

      // Carregar aprendizados existentes relacionados ao ciclo
      const existingLearnings = await LearningEntry.filter({
        agencyId: agency.id,
        sourceRef: cycleId,
        sourceType: 'execution'
      });
      setLearnings(existingLearnings);

    } catch (error) {
      console.error("Erro ao carregar dados do ciclo:", error);
      toast.error("Falha ao carregar dados do ciclo");
      navigate('/cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      await CyclePlan.update(cycleId, {
        closing_data: closingData,
        closing_notes: closingData.achievements + ' | ' + closingData.challenges
      });
      toast.success("Progresso salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Falha ao salvar progresso");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLearning = async () => {
    if (!newLearning.title || !newLearning.description) {
      toast.error("Preencha título e descrição do aprendizado");
      return;
    }

    try {
      const learning = await LearningEntry.create({
        agencyId: agency.id,
        projectId: client.id,
        title: newLearning.title,
        description: newLearning.description,
        sourceType: 'execution',
        sourceRef: cycleId,
        tags: newLearning.tags,
        reviewed: false,
        confidence_score: newLearning.impact === 'high' ? 90 : newLearning.impact === 'medium' ? 70 : 50
      });

      setLearnings([...learnings, learning]);
      setNewLearning({ title: '', description: '', impact: 'medium', tags: [] });
      toast.success("Aprendizado adicionado!");
    } catch (error) {
      console.error("Erro ao salvar aprendizado:", error);
      toast.error("Falha ao salvar aprendizado");
    }
  };

  const handleFinalizeCycle = async () => {
    if (!closingData.achievements || !closingData.client_feedback) {
      toast.error("Preencha pelo menos os resultados principais e feedback do cliente");
      return;
    }

    setSaving(true);
    try {
      await CyclePlan.update(cycleId, {
        status: 'completed',
        closing_data: closingData,
        closing_notes: `Finalizado em ${new Date().toLocaleDateString('pt-BR')}`,
        learning_extracted: learnings.length > 0
      });

      toast.success("Ciclo finalizado com sucesso!");
      navigate(createPageUrl(`cycle-report/${cycleId}`));
    } catch (error) {
      console.error("Erro ao finalizar ciclo:", error);
      toast.error("Falha ao finalizar ciclo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fechamento de Ciclo</h1>
          <p className="text-slate-600 mt-1">
            Colete resultados e aprendizados para {client?.name} - {service?.name}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Badge className="bg-orange-100 text-orange-800">
              {cycle?.cyclePeriod}
            </Badge>
            <Badge variant="outline">
              Status: Fechamento
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Salvar Progresso
          </Button>
          <Button
            onClick={handleFinalizeCycle}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Finalizar Ciclo
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Métricas e Resultados */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Métricas de Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricInput
                  label="Impressões"
                  value={closingData.results.impressions}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, impressions: value }
                  })}
                  placeholder="0"
                />
                <MetricInput
                  label="Cliques"
                  value={closingData.results.clicks}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, clicks: value }
                  })}
                  placeholder="0"
                />
                <MetricInput
                  label="CTR"
                  value={closingData.results.ctr}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, ctr: value }
                  })}
                  placeholder="0.00"
                  suffix="%"
                />
                <MetricInput
                  label="Conversões"
                  value={closingData.results.conversions}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, conversions: value }
                  })}
                  placeholder="0"
                />
                <MetricInput
                  label="Taxa de Conversão"
                  value={closingData.results.conversion_rate}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, conversion_rate: value }
                  })}
                  placeholder="0.00"
                  suffix="%"
                />
                <MetricInput
                  label="Custo Total"
                  value={closingData.results.cost}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, cost: value }
                  })}
                  placeholder="0.00"
                  suffix="R$"
                />
                <MetricInput
                  label="CPL (Custo por Lead)"
                  value={closingData.results.cpl}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, cpl: value }
                  })}
                  placeholder="0.00"
                  suffix="R$"
                />
                <MetricInput
                  label="ROAS"
                  value={closingData.results.roas}
                  onChange={(value) => setClosingData({
                    ...closingData,
                    results: { ...closingData.results, roas: value }
                  })}
                  placeholder="0.00"
                  suffix="x"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avaliação Qualitativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Principais Conquistas</Label>
                <Textarea
                  value={closingData.achievements}
                  onChange={(e) => setClosingData({
                    ...closingData,
                    achievements: e.target.value
                  })}
                  placeholder="Liste os principais resultados e conquistas deste ciclo..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Desafios Enfrentados</Label>
                <Textarea
                  value={closingData.challenges}
                  onChange={(e) => setClosingData({
                    ...closingData,
                    challenges: e.target.value
                  })}
                  placeholder="Descreva os principais desafios e como foram superados..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Feedback do Cliente</Label>
                <Textarea
                  value={closingData.client_feedback}
                  onChange={(e) => setClosingData({
                    ...closingData,
                    client_feedback: e.target.value
                  })}
                  placeholder="Feedback recebido do cliente sobre os resultados..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Nota de Satisfação do Cliente (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={closingData.satisfaction_score || ''}
                  onChange={(e) => setClosingData({
                    ...closingData,
                    satisfaction_score: parseInt(e.target.value) || null
                  })}
                  placeholder="Nota de 1 a 5"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Aprendizados e Anexos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Aprendizados do Ciclo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {learnings.length > 0 && (
                <div className="space-y-3">
                  {learnings.map((learning) => (
                    <div key={learning.id} className="p-3 bg-slate-50 rounded-lg">
                      <h4 className="font-medium text-sm text-slate-900">{learning.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">{learning.description}</p>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Adicionar Novo Aprendizado</h4>
                <Input
                  placeholder="Título do aprendizado..."
                  value={newLearning.title}
                  onChange={(e) => setNewLearning({
                    ...newLearning,
                    title: e.target.value
                  })}
                />
                <Textarea
                  placeholder="Descrição detalhada do que foi aprendido..."
                  value={newLearning.description}
                  onChange={(e) => setNewLearning({
                    ...newLearning,
                    description: e.target.value
                  })}
                  rows={3}
                />
                <Button
                  onClick={handleAddLearning}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Adicionar Aprendizado
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recomendações para Próximo Ciclo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={closingData.next_cycle_recommendations}
                onChange={(e) => setClosingData({
                  ...closingData,
                  next_cycle_recommendations: e.target.value
                })}
                placeholder="Sugestões e recomendações para o próximo ciclo baseadas nos resultados obtidos..."
                rows={5}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <FileUploadCard
              title="Relatórios"
              description="PDFs de métricas e análises"
              files={closingData.attachments.filter(f => f.type === 'report') || []}
              onFilesChange={(files) => setClosingData({
                ...closingData,
                attachments: [
                  ...closingData.attachments.filter(f => f.type !== 'report'),
                  ...files.map(f => ({ ...f, type: 'report' }))
                ]
              })}
            />
            <FileUploadCard
              title="Criativos"
              description="Imagens e vídeos produzidos"
              files={closingData.attachments.filter(f => f.type === 'creative') || []}
              onFilesChange={(files) => setClosingData({
                ...closingData,
                attachments: [
                  ...closingData.attachments.filter(f => f.type !== 'creative'),
                  ...files.map(f => ({ ...f, type: 'creative' }))
                ]
              })}
            />
          </div>
        </div>
      </div>

      {/* Alert de Status */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Complete as informações principais e clique em "Finalizar Ciclo" para gerar o relatório final.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/cycles')}
          >
            Voltar aos Ciclos
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}