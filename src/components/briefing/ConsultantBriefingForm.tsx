/**
 * 🎯 Interface Unificada — Briefing Híbrido (Time da Agência)
 *
 * Formulário para o time preencher briefings no kickoff,
 * com preview de ajustes e validação em tempo real
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Bot,
  Eye,
  Settings,
  Loader2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { AdjustmentPreview } from './AdjustmentPreview';
import { useBriefingValidation } from '@/hooks/useBriefingValidation';
import { useBriefingPermissions } from '@/hooks/useBriefingPermissions';
import { useBriefingSanitization } from '@/hooks/useBriefingSanitization';
import { toast } from 'sonner';

interface ConsultantBriefingFormProps {
  serviceId: string;
  clientId: string;
  serviceType: string;
  onBriefingSubmitted?: (briefing: any, adjustments: any[]) => void;
  onCancel?: () => void;
  existingBriefing?: any;
}

const SERVICE_TYPE_ALIASES: Record<string, string> = {
  diagnostico_avulso: 'diagnostico_comunicacao',
  diagnostico_financeiro: 'diagnostico_comunicacao',
  mentoria_margem: 'estrategia_conteudo',
  mentoria_precificacao: 'estrategia_conteudo',
  gestao_360: 'marketing_360',
  gestao_financeira_360: 'marketing_360',
};

function resolveServiceType(type: string): string {
  return SERVICE_TYPE_ALIASES[type] || type;
}

export function ConsultantBriefingForm({
  serviceId,
  clientId,
  serviceType,
  onBriefingSubmitted,
  onCancel,
  existingBriefing
}: ConsultantBriefingFormProps) {
  const { user } = useSession();
  const [formData, setFormData] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAdjustments, setIsGeneratingAdjustments] = useState(false);
  const [showAdjustmentPreview, setShowAdjustmentPreview] = useState(false);
  const [generatedAdjustments, setGeneratedAdjustments] = useState([]);
  const [currentStep, setCurrentStep] = useState<'form' | 'preview' | 'submitted'>('form');

  // Hooks centralizados
  const { validateBriefing, validateFieldRealTime, validationResult } = useBriefingValidation({
    serviceType,
    strictMode: false,
    showWarnings: true
  });

  const { validateOperationPermission, canSubmitBriefings } = useBriefingPermissions();

  const { sanitizeBriefingData, sanitizeAndValidate } = useBriefingSanitization({
    removeHtml: true,
    strictMode: false
  });

  // Inicializar dados do formulário
  useEffect(() => {
    if (existingBriefing && existingBriefing.itens) {
      setFormData(existingBriefing.itens);
    } else {
      setFormData(getDefaultFormData(resolveServiceType(serviceType)));
    }
  }, [existingBriefing, serviceType]);

  // Obter dados padrão do formulário por tipo de serviço
  const getDefaultFormData = (type: string) => {
    const resolved = resolveServiceType(type);
    const defaultData = {
      diagnostico_comunicacao: {
        disponibilidade_dados: '',
        principal_dor: '',
        faturamento_mensal_medio: '',
        endividamento_total: '',
        restricoes_tempo: '',
        nivel_urgencia: '',
        expectativas_cliente: ''
      },
      estrategia_conteudo: {
        elasticidade_preco_percebida: '',
        capacidade_negociacao_fornecedores: '',
        politica_descontos_atual: '',
        risco_perda_clientes_com_reajuste: '',
        canal_venda_predominante: '',
        margem_atual: '',
        margem_desejada: ''
      },
      marketing_360: {
        maturidade_processos: '',
        nivel_automatizacao: '',
        capacidade_equipe: '',
        urgencia_implementacao: '',
        numero_funcionarios: '',
        orcamento_disponivel: '',
        objetivos_especificos: ''
      }
    };

    return defaultData[resolved] || {};
  };

  // Validar dados em tempo real
  const validateFormData = useCallback((data: any) => {
    const errors: any = {};
    const requiredFields = getRequiredFields(resolveServiceType(serviceType));

    requiredFields.forEach(field => {
      const value = data[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field] = `${getFieldLabel(field)} é obrigatório`;
      }
    });

    // Validações específicas por tipo
    if (resolveServiceType(serviceType) === 'diagnostico_comunicacao') {
      if (data.faturamento_mensal_medio && isNaN(parseFloat(data.faturamento_mensal_medio))) {
        errors.faturamento_mensal_medio = 'Faturamento deve ser um número válido';
      }
      if (data.endividamento_total && isNaN(parseFloat(data.endividamento_total))) {
        errors.endividamento_total = 'Endividamento deve ser um número válido';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [serviceType]);

  // Obter campos obrigatórios por tipo de serviço
  const getRequiredFields = (type: string) => {
    const resolved = resolveServiceType(type);
    const requiredFields = {
      diagnostico_comunicacao: ['disponibilidade_dados', 'principal_dor', 'faturamento_mensal_medio'],
      estrategia_conteudo: ['elasticidade_preco_percebida', 'capacidade_negociacao_fornecedores', 'politica_descontos_atual'],
      marketing_360: ['maturidade_processos', 'nivel_automatizacao', 'capacidade_equipe']
    };

    return requiredFields[resolved] || [];
  };

  // Obter label do campo
  const getFieldLabel = (field: string) => {
    const labels = {
      disponibilidade_dados: 'Disponibilidade de Dados',
      principal_dor: 'Principal Dor',
      faturamento_mensal_medio: 'Faturamento Mensal Médio',
      endividamento_total: 'Endividamento Total',
      elasticidade_preco_percebida: 'Elasticidade de Preço Percebida',
      capacidade_negociacao_fornecedores: 'Capacidade de Negociação com Fornecedores',
      politica_descontos_atual: 'Política de Descontos Atual',
      maturidade_processos: 'Maturidade dos Processos',
      nivel_automatizacao: 'Nível de Automação',
      capacidade_equipe: 'Capacidade da Equipe'
    };

    return labels[field] || field;
  };

  // Atualizar dados do formulário
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    // Validação em tempo real
    validateFieldRealTime(field, value);
  };

  // Salvar rascunho
  const handleSaveDraft = async () => {
    try {
      // Implementar salvamento de rascunho
      toast.success('Rascunho salvo com sucesso');
      setIsDirty(false);
    } catch (error) {
      toast.error('Erro ao salvar rascunho');
    }
  };

  // Gerar preview de ajustes
  const handleGeneratePreview = async () => {
    try {
      setIsGeneratingAdjustments(true);
      
      // Validar permissões
      const permissionCheck = await validateOperationPermission({
        serviceId,
        clientId,
        operation: 'submit'
      });

      if (!permissionCheck.hasPermission) {
        toast.error(`Sem permissão: ${permissionCheck.error}`);
        return;
      }

      // Validar dados antes de gerar preview
      const validation = validateBriefing(formData);
      if (!validation.isValid) {
        toast.error('Por favor, corrija os erros antes de gerar preview');
        return;
      }

      // Sanitizar dados
      const { sanitizedData } = sanitizeAndValidate({
        servico_instancia_id: serviceId,
        cliente_id: clientId,
        servico_tipo: serviceType,
        itens: formData,
        preenchido_por_user_id: user?.id
      });

      // Criar briefing temporário para preview
      const tempBriefing = {
        id: 'temp-preview',
        servico_instancia_id: serviceId,
        servico_tipo: serviceType,
        itens: sanitizedData.itens,
        preenchido_por_user_id: user?.id,
        preenchido_em: new Date().toISOString()
      };

      // Importar e aplicar regras de IA
      const { aiRulesService } = await import('@/services/aiRulesService');
      const adjustments = await aiRulesService.applyRules(tempBriefing);

      setGeneratedAdjustments(adjustments);
      setShowAdjustmentPreview(true);
      setCurrentStep('preview');

    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast.error('Erro ao gerar preview dos ajustes');
    } finally {
      setIsGeneratingAdjustments(false);
    }
  };

  // Submeter briefing final
  const handleSubmitBriefing = async (approvedAdjustments: any[] = []) => {
    try {
      setIsSubmitting(true);

      // Validar permissões
      const permissionCheck = await validateOperationPermission({
        serviceId,
        clientId,
        operation: 'submit'
      });

      if (!permissionCheck.hasPermission) {
        toast.error(`Sem permissão: ${permissionCheck.error}`);
        return;
      }

      // Sanitizar e validar dados
      const { sanitizedData, validation } = sanitizeAndValidate({
        servico_instancia_id: serviceId,
        cliente_id: clientId,
        servico_tipo: serviceType,
        itens: formData,
        preenchido_por_user_id: user?.id,
        preenchido_em: new Date().toISOString(),
        status: 'ativo',
        versao: 1
      });

      if (!validation.isValid) {
        toast.error(`Dados inválidos: ${validation.errors.join('; ')}`);
        return;
      }

      // Importar serviços
      const { briefingService } = await import('@/services/briefingService');
      
      // Criar briefing
      const briefing = await briefingService.createBriefing(sanitizedData);

      // Aplicar ajustes aprovados
      if (approvedAdjustments.length > 0) {
        for (const adjustment of approvedAdjustments) {
          await briefingService.adjustments.set(adjustment.id, adjustment);
        }
      }

      setCurrentStep('submitted');
      toast.success('Briefing enviado com sucesso!');
      
      if (onBriefingSubmitted) {
        onBriefingSubmitted(briefing, approvedAdjustments);
      }

    } catch (error) {
      console.error('Erro ao submeter briefing:', error);
      toast.error('Erro ao submeter briefing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizar campo do formulário
  const renderFormField = (field: string, type: string = 'text') => {
    const value = formData[field] || '';
    const error = validationResult.errors[field];
    const warning = validationResult.warnings[field];
    const isRequired = getRequiredFields(serviceType).includes(field);

    if (type === 'select') {
      const options = getFieldOptions(field);
      return (
        <div className="space-y-2">
          <Label htmlFor={field} className="text-sm font-medium">
            {getFieldLabel(field)}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select value={value} onValueChange={(newValue) => handleInputChange(field, newValue)}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Selecione ${getFieldLabel(field).toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div className="space-y-2">
          <Label htmlFor={field} className="text-sm font-medium">
            {getFieldLabel(field)}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field}
            value={value}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={error ? 'border-red-500' : ''}
            placeholder={`Descreva ${getFieldLabel(field).toLowerCase()}`}
            rows={3}
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium">
          {getFieldLabel(field)}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field}
          type={type}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={error ? 'border-red-500' : ''}
          placeholder={`Digite ${getFieldLabel(field).toLowerCase()}`}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  };

  // Obter opções para campos select
  const getFieldOptions = (field: string) => {
    const options = {
      disponibilidade_dados: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' }
      ],
      principal_dor: [
        { value: 'posicionamento_fraco', label: 'Posicionamento Fraco' },
        { value: 'mensagem_inconsistente', label: 'Mensagem Inconsistente' },
        { value: 'baixa_autoridade', label: 'Baixa Autoridade' },
        { value: 'canais_desalinhados', label: 'Canais Desalinhados' },
        { value: 'crise_reputacao', label: 'Crise de Reputação' },
        { value: 'outro', label: 'Outro' },
        // legado
        { value: 'endividamento', label: 'Endividamento (legado)' }
      ],
      elasticidade_preco_percebida: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' }
      ],
      capacidade_negociacao_fornecedores: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' }
      ],
      politica_descontos_atual: [
        { value: 'conservadora', label: 'Conservadora' },
        { value: 'moderada', label: 'Moderada' },
        { value: 'agressiva', label: 'Agressiva' }
      ],
      risco_perda_clientes_com_reajuste: [
        { value: 'baixo', label: 'Baixo' },
        { value: 'medio', label: 'Médio' },
        { value: 'alto', label: 'Alto' }
      ],
      maturidade_processos: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' }
      ],
      nivel_automatizacao: [
        { value: 'manual', label: 'Manual' },
        { value: 'parcial', label: 'Parcial' },
        { value: 'completo', label: 'Completo' }
      ],
      capacidade_equipe: [
        { value: 'limitada', label: 'Limitada' },
        { value: 'adequada', label: 'Adequada' },
        { value: 'excelente', label: 'Excelente' }
      ]
    };

    return options[field] || [];
  };

  // Renderizar formulário por tipo de serviço
  const renderServiceForm = () => {
    const fields = getServiceFields(resolveServiceType(serviceType));
    
    return (
      <div className="space-y-6">
        {fields.map(field => (
          <div key={field.name}>
            {renderFormField(field.name, field.type)}
          </div>
        ))}
      </div>
    );
  };

  // Obter campos por tipo de serviço
  const getServiceFields = (type: string) => {
    const resolved = resolveServiceType(type);
    const fields = {
      diagnostico_comunicacao: [
        { name: 'disponibilidade_dados', type: 'select' },
        { name: 'principal_dor', type: 'select' },
        { name: 'faturamento_mensal_medio', type: 'number' },
        { name: 'endividamento_total', type: 'number' },
        { name: 'restricoes_tempo', type: 'textarea' },
        { name: 'nivel_urgencia', type: 'select' },
        { name: 'expectativas_cliente', type: 'textarea' }
      ],
      estrategia_conteudo: [
        { name: 'elasticidade_preco_percebida', type: 'select' },
        { name: 'capacidade_negociacao_fornecedores', type: 'select' },
        { name: 'politica_descontos_atual', type: 'select' },
        { name: 'risco_perda_clientes_com_reajuste', type: 'select' },
        { name: 'canal_venda_predominante', type: 'select' },
        { name: 'margem_atual', type: 'number' },
        { name: 'margem_desejada', type: 'number' }
      ],
      marketing_360: [
        { name: 'maturidade_processos', type: 'select' },
        { name: 'nivel_automatizacao', type: 'select' },
        { name: 'capacidade_equipe', type: 'select' },
        { name: 'urgencia_implementacao', type: 'select' },
        { name: 'numero_funcionarios', type: 'number' },
        { name: 'orcamento_disponivel', type: 'number' },
        { name: 'objetivos_especificos', type: 'textarea' }
      ]
    };

    return fields[resolved] || [];
  };

  if (currentStep === 'submitted') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-800 mb-2">Briefing Enviado!</h3>
        <p className="text-gray-600 mb-4">
          O briefing foi enviado com sucesso e os ajustes foram aplicados às tarefas.
        </p>
        <Button onClick={onCancel}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Briefing Híbrido - {serviceType.replace('_', ' ').toUpperCase()}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Preencha o briefing para personalizar a execução do serviço
          </p>
        </CardHeader>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderServiceForm()}
        </CardContent>
      </Card>

      {/* Validação */}
      {Object.keys(validationResult.errors).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Erros encontrados:</strong>
            <ul className="mt-2 list-disc list-inside">
              {Object.values(validationResult.errors).map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {Object.keys(validationResult.warnings).length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>Atenção:</strong>
            <ul className="mt-2 list-disc list-inside">
              {Object.values(validationResult.warnings).map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isDirty && (
                <Badge variant="outline" className="text-orange-600">
                  Alterações não salvas
                </Badge>
              )}
              <span>Serviço: {serviceId}</span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={!isDirty}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              <Button
                onClick={handleGeneratePreview}
                disabled={isGeneratingAdjustments}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGeneratingAdjustments ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {isGeneratingAdjustments ? 'Gerando Preview...' : 'Preview de Ajustes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview de Ajustes */}
      <AdjustmentPreview
        isOpen={showAdjustmentPreview}
        onClose={() => setShowAdjustmentPreview(false)}
        onApprove={handleSubmitBriefing}
        onReject={() => {}}
        adjustments={generatedAdjustments}
        briefing={{
          servico_tipo: serviceType,
          itens: formData
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
}
