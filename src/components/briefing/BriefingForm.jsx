/**
 * 🧾 Formulário de Briefing por Tipo de Serviço
 * 
 * Componente para preenchimento do briefing pelo consultor
 * Formulário dinâmico baseado no tipo de serviço
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { useBriefing } from '@/hooks/useBriefing';
import { toast } from 'sonner';

export default function BriefingForm({ 
  servicoInstanciaId, 
  clienteId, 
  servicoTipo, 
  onBriefingSubmitted,
  onCancel 
}) {
  const { 
    briefing, 
    isLoading, 
    isSubmitting, 
    error,
    createBriefing,
    updateBriefing,
    submitBriefing,
    hasDraftBriefing,
    canSubmit
  } = useBriefing(servicoInstanciaId);

  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Inicializar dados do formulário
  useEffect(() => {
    if (briefing && briefing.itens) {
      setFormData(briefing.itens);
    } else {
      setFormData(getDefaultFormData(servicoTipo));
    }
  }, [briefing, servicoTipo]);

  // Obter dados padrão do formulário por tipo de serviço
  const getDefaultFormData = (tipo) => {
    const defaults = {
      diagnostico_avulso: {
        empresa_setor: '',
        principal_dor: '',
        faturamento_mensal_medio: 0,
        ticket_medio: 0,
        mix_receita: [],
        endividamento_total: 0,
        atrasos_frequentes: false,
        controles_existentes: [],
        disponibilidade_dados: '',
        prioridades_do_cliente: [],
        restricoes_tempo: '',
        observacoes: ''
      },
      mentoria_margem: {
        produto_foco: '',
        margem_atual_percent: 0,
        volume_mensal: 0,
        elasticidade_preco_percebida: '',
        custos_variaveis_chave: [],
        capacidade_negociacao_fornecedores: '',
        concorrentes_principais: [],
        diferenciadores_produto: [],
        risco_perda_clientes_com_reajuste: '',
        canal_venda_predominante: '',
        politica_descontos_atual: '',
        metrica_sucesso: '',
        meta_margem_percent: 0,
        observacoes: ''
      },
      gestao_360: {
        estrutura_operacional: [],
        rotina_financeira_atual: [],
        responsavel_financeiro: '',
        ERP_ou_ferramentas: [],
        ciclo_caixa_dias: 0,
        estoque_valor: 0,
        ruptura_estoque_frequente: false,
        inadimplencia_percent: 0,
        politica_credito: '',
        relatorios_necessarios: [],
        metas_anuais: [],
        maturidade_processos: '',
        observacoes: ''
      }
    };
    return defaults[tipo] || {};
  };

  // Obter campos do formulário por tipo de serviço
  const getFormFields = (tipo) => {
    const fields = {
      diagnostico_avulso: [
        {
          id: 'empresa_setor',
          label: 'Setor da Empresa',
          type: 'text',
          required: true,
          placeholder: 'Ex: Comércio, Indústria, Serviços...'
        },
        {
          id: 'principal_dor',
          label: 'Principal Dor de Comunicação',
          type: 'select',
          required: true,
          options: [
            { value: 'posicionamento_fraco', label: 'Posicionamento Fraco' },
            { value: 'mensagem_inconsistente', label: 'Mensagem Inconsistente' },
            { value: 'baixa_autoridade', label: 'Baixa Autoridade' },
            { value: 'canais_desalinhados', label: 'Canais Desalinhados' },
            { value: 'crise_reputacao', label: 'Crise de Reputação' },
            { value: 'outro', label: 'Outro' },
            // legado
            { value: 'fluxo_caixa', label: 'Fluxo de Caixa (legado)' },
            { value: 'margem_baixa', label: 'Margem Baixa (legado)' },
            { value: 'endividamento', label: 'Endividamento (legado)' },
            { value: 'controles', label: 'Controles (legado)' },
            { value: 'precificacao', label: 'Precificação (legado)' }
          ]
        },
        {
          id: 'faturamento_mensal_medio',
          label: 'Faturamento Mensal Médio (R$)',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'ticket_medio',
          label: 'Ticket Médio (R$)',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'endividamento_total',
          label: 'Endividamento Total (R$)',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'atrasos_frequentes',
          label: 'Atrasos Frequentes',
          type: 'checkbox',
          required: true
        },
        {
          id: 'controles_existentes',
          label: 'Controles Existentes',
          type: 'multiselect',
          required: true,
          options: [
            { value: 'planilha_basica', label: 'Planilha Básica' },
            { value: 'erp', label: 'ERP' },
            { value: 'nenhum', label: 'Nenhum' },
            { value: 'contabilidade_terceiros', label: 'Contabilidade Terceiros' }
          ]
        },
        {
          id: 'disponibilidade_dados',
          label: 'Disponibilidade de Dados e Acessos',
          type: 'select',
          required: true,
          options: [
            { value: 'completa', label: 'Completa' },
            { value: 'parcial', label: 'Parcial' },
            { value: 'baixa', label: 'Baixa' }
          ]
        },
        {
          id: 'restricoes_tempo',
          label: 'Restrições de Tempo',
          type: 'select',
          required: true,
          options: [
            { value: 'urgente_7d', label: 'Urgente (7 dias)' },
            { value: 'curto_30d', label: 'Curto (30 dias)' },
            { value: 'normal', label: 'Normal' }
          ]
        },
        {
          id: 'observacoes',
          label: 'Observações',
          type: 'textarea',
          required: false,
          placeholder: 'Informações adicionais relevantes...'
        }
      ],
      mentoria_margem: [
        {
          id: 'produto_foco',
          label: 'Produto/Serviço Foco',
          type: 'text',
          required: true,
          placeholder: 'Produto principal para análise de margem'
        },
        {
          id: 'margem_atual_percent',
          label: 'Margem Atual (%)',
          type: 'number',
          required: true,
          min: 0,
          max: 100
        },
        {
          id: 'volume_mensal',
          label: 'Volume Mensal',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'elasticidade_preco_percebida',
          label: 'Elasticidade de Preço Percebida',
          type: 'select',
          required: true,
          options: [
            { value: 'baixa', label: 'Baixa' },
            { value: 'media', label: 'Média' },
            { value: 'alta', label: 'Alta' }
          ]
        },
        {
          id: 'capacidade_negociacao_fornecedores',
          label: 'Capacidade de Negociação com Fornecedores',
          type: 'select',
          required: true,
          options: [
            { value: 'alta', label: 'Alta' },
            { value: 'media', label: 'Média' },
            { value: 'baixa', label: 'Baixa' }
          ]
        },
        {
          id: 'risco_perda_clientes_com_reajuste',
          label: 'Risco de Perda de Clientes com Reajuste',
          type: 'select',
          required: true,
          options: [
            { value: 'baixo', label: 'Baixo' },
            { value: 'medio', label: 'Médio' },
            { value: 'alto', label: 'Alto' }
          ]
        },
        {
          id: 'canal_venda_predominante',
          label: 'Canal de Venda Predominante',
          type: 'select',
          required: true,
          options: [
            { value: 'loja_fisica', label: 'Loja Física' },
            { value: 'online', label: 'Online' },
            { value: 'distribuicao', label: 'Distribuição' },
            { value: 'misto', label: 'Misto' }
          ]
        },
        {
          id: 'politica_descontos_atual',
          label: 'Política de Descontos Atual',
          type: 'select',
          required: true,
          options: [
            { value: 'agressiva', label: 'Agressiva' },
            { value: 'moderada', label: 'Moderada' },
            { value: 'controlada', label: 'Controlada' },
            { value: 'inexistente', label: 'Inexistente' }
          ]
        },
        {
          id: 'metrica_sucesso',
          label: 'Métrica de Sucesso',
          type: 'select',
          required: true,
          options: [
            { value: 'margem_percent', label: 'Margem %' },
            { value: 'lucro_bruto', label: 'Lucro Bruto' },
            { value: 'EBITDA', label: 'EBITDA' },
            { value: 'mix_margem', label: 'Mix de Margem' }
          ]
        },
        {
          id: 'meta_margem_percent',
          label: 'Meta de Margem (%)',
          type: 'number',
          required: true,
          min: 0,
          max: 100
        },
        {
          id: 'observacoes',
          label: 'Observações',
          type: 'textarea',
          required: false,
          placeholder: 'Informações adicionais relevantes...'
        }
      ],
      gestao_360: [
        {
          id: 'estrutura_operacional',
          label: 'Estrutura Operacional',
          type: 'multiselect',
          required: true,
          options: [
            { value: 'vendas', label: 'Vendas' },
            { value: 'operacao', label: 'Operação' },
            { value: 'estoque', label: 'Estoque' },
            { value: 'servicos_campo', label: 'Serviços de Campo' },
            { value: 'ecommerce', label: 'E-commerce' }
          ]
        },
        {
          id: 'rotina_financeira_atual',
          label: 'Rotina Financeira Atual',
          type: 'multiselect',
          required: true,
          options: [
            { value: 'conciliacao_bancaria', label: 'Conciliação Bancária' },
            { value: 'contas_a_pagar', label: 'Contas a Pagar' },
            { value: 'contas_a_receber', label: 'Contas a Receber' },
            { value: 'fluxo_caixa', label: 'Fluxo de Caixa' },
            { value: 'centro_custos', label: 'Centro de Custos' }
          ]
        },
        {
          id: 'responsavel_financeiro',
          label: 'Responsável Financeiro',
          type: 'text',
          required: true,
          placeholder: 'Nome do responsável pela área financeira'
        },
        {
          id: 'ciclo_caixa_dias',
          label: 'Ciclo de Caixa (dias)',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'estoque_valor',
          label: 'Valor do Estoque (R$)',
          type: 'number',
          required: true,
          min: 0
        },
        {
          id: 'ruptura_estoque_frequente',
          label: 'Ruptura de Estoque Frequente',
          type: 'checkbox',
          required: true
        },
        {
          id: 'inadimplencia_percent',
          label: 'Inadimplência (%)',
          type: 'number',
          required: true,
          min: 0,
          max: 100
        },
        {
          id: 'politica_credito',
          label: 'Política de Crédito',
          type: 'select',
          required: true,
          options: [
            { value: 'rigida', label: 'Rígida' },
            { value: 'moderada', label: 'Moderada' },
            { value: 'flexivel', label: 'Flexível' },
            { value: 'inexistente', label: 'Inexistente' }
          ]
        },
        {
          id: 'relatorios_necessarios',
          label: 'Relatórios Necessários',
          type: 'multiselect',
          required: true,
          options: [
            { value: 'DRE_mensal', label: 'DRE Mensal' },
            { value: 'fluxo_caixa_semanal', label: 'Fluxo de Caixa Semanal' },
            { value: 'projecoes', label: 'Projeções' },
            { value: 'custos_setor', label: 'Custos por Setor' },
            { value: 'estoque', label: 'Estoque' }
          ]
        },
        {
          id: 'maturidade_processos',
          label: 'Maturidade dos Processos',
          type: 'select',
          required: true,
          options: [
            { value: 'baixa', label: 'Baixa' },
            { value: 'media', label: 'Média' },
            { value: 'alta', label: 'Alta' }
          ]
        },
        {
          id: 'observacoes',
          label: 'Observações',
          type: 'textarea',
          required: false,
          placeholder: 'Informações adicionais relevantes...'
        }
      ]
    };
    return fields[tipo] || [];
  };

  // Atualizar campo do formulário
  const updateField = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setIsDirty(true);
    
    // Limpar erro de validação
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  // Validar formulário
  const validateForm = () => {
    const errors = {};
    const fields = getFormFields(servicoTipo);

    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          errors[field.id] = `${field.label} é obrigatório`;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salvar rascunho
  const handleSaveDraft = async () => {
    try {
      if (briefing) {
        await updateBriefing(briefing.id, { itens: formData });
      } else {
        await createBriefing({
          cliente_id: clienteId,
          servico_tipo: servicoTipo,
          itens: formData
        });
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    }
  };

  // Enviar briefing
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      let currentBriefing = briefing;
      
      if (!currentBriefing) {
        currentBriefing = await createBriefing({
          cliente_id: clienteId,
          servico_tipo: servicoTipo,
          itens: formData
        });
      } else {
        currentBriefing = await updateBriefing(currentBriefing.id, { itens: formData });
      }

      const result = await submitBriefing(currentBriefing.id);
      
      setIsDirty(false);
      onBriefingSubmitted && onBriefingSubmitted(result);
      
    } catch (error) {
      console.error('Erro ao enviar briefing:', error);
    }
  };

  const fields = getFormFields(servicoTipo);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="w-6 h-6 animate-spin mr-2" />
            <span>Carregando briefing...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Briefing de {getServiceTypeLabel(servicoTipo)}
          {briefing && (
            <Badge variant="outline">
              Versão {briefing.versao}
            </Badge>
          )}
        </CardTitle>
        {briefing && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>Preenchido por: {briefing.preenchido_por_user_id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(briefing.preenchido_em).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map(field => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="flex items-center gap-2">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              
              {renderField(field, formData[field.id], updateField)}
              
              {validationErrors[field.id] && (
                <p className="text-sm text-red-500">{validationErrors[field.id]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="text-orange-600">
                Não salvo
              </Badge>
            )}
            {briefing?.status === 'ativo' && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={!isDirty}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={hasErrors || isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar e Personalizar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Renderizar campo baseado no tipo
function renderField(field, value, onChange) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          id={field.id}
          value={value || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
        />
      );

    case 'number':
      return (
        <Input
          id={field.id}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(field.id, parseFloat(e.target.value) || 0)}
          min={field.min}
          max={field.max}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={field.id}
          value={value || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      );

    case 'select':
      return (
        <Select value={value || ''} onValueChange={(val) => onChange(field.id, val)}>
          <SelectTrigger>
            <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multiselect':
      return (
        <div className="space-y-2">
          {field.options.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${option.value}`}
                checked={(value || []).includes(option.value)}
                onCheckedChange={(checked) => {
                  const currentValues = value || [];
                  if (checked) {
                    onChange(field.id, [...currentValues, option.value]);
                  } else {
                    onChange(field.id, currentValues.filter(v => v !== option.value));
                  }
                }}
              />
              <Label htmlFor={`${field.id}-${option.value}`} className="text-sm">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.id}
            checked={value || false}
            onCheckedChange={(checked) => onChange(field.id, checked)}
          />
          <Label htmlFor={field.id} className="text-sm">
            {field.label}
          </Label>
        </div>
      );

    default:
      return null;
  }
}

// Obter label do tipo de serviço
function getServiceTypeLabel(tipo) {
  const labels = {
    diagnostico_avulso: 'Diagnóstico de Comunicação e Marca',
    diagnostico_comunicacao: 'Diagnóstico de Comunicação e Marca',
    mentoria_margem: 'Estratégia de Conteúdo e Posicionamento',
    estrategia_conteudo: 'Estratégia de Conteúdo e Posicionamento',
    gestao_360: 'Marketing Operacional 360',
    marketing_360: 'Marketing Operacional 360'
  };
  return labels[tipo] || tipo;
}

