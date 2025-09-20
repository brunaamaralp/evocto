/**
 * 🤖 Serviço de Regras de IA Determinísticas
 * 
 * Aplica regras baseadas no briefing para personalizar tarefas
 * Sistema determinístico que gera ajustes específicos
 */

import { TaskAdjustment } from '@/models/TaskAdjustment';

export class AIRulesService {
  constructor() {
    this.rules = this.initializeRules();
  }

  // Inicializar regras por tipo de serviço
  initializeRules() {
    return {
      diagnostico_avulso: [
        // Regra: Dados limitados requerem coleta adicional
        {
          condition: (briefing) => briefing.itens.disponibilidade_dados === 'baixa',
          actions: [
            {
              action: 'ADD_SUBTASK',
              task_template_key: 'solicitar_documentos_basicos',
              payload: {
                subtask: {
                  title: 'Coleta Mínima de Dados',
                  description: 'Coletar apenas documentos essenciais devido à disponibilidade limitada',
                  priority: 'high',
                  estimated_hours: 1
                }
              },
              reason: 'Disponibilidade de dados baixa - coleta mínima necessária'
            },
            {
              action: 'DEFER',
              task_template_key: 'analise_profunda',
              payload: {
                defer_until: 'após_coleta_dados'
              },
              reason: 'Análise profunda adiada até coleta de dados completos'
            }
          ]
        },

        // Regra: Foco em fluxo de caixa
        {
          condition: (briefing) => briefing.itens.principal_dor === 'fluxo_caixa',
          actions: [
            {
              action: 'PRIORITIZE',
              task_template_key: 'avaliar_fluxo_caixa',
              payload: {
                priority: 'P0'
              },
              reason: 'Principal dor = fluxo de caixa - prioridade máxima'
            },
            {
              action: 'ADD_NOTE',
              task_template_key: 'avaliar_fluxo_caixa',
              payload: {
                note: 'Focar em recebíveis e negociação de prazos com fornecedores'
              },
              reason: 'Cliente identificou fluxo de caixa como principal problema'
            }
          ]
        },

        // Regra: Endividamento crítico
        {
          condition: (briefing) => {
            const endividamento = briefing.itens.endividamento_total || 0;
            const faturamento = briefing.itens.faturamento_mensal_medio || 0;
            return endividamento > (faturamento * 3);
          },
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Mapear Dívidas e Priorizar Renegociação',
                  description: 'Análise detalhada do endividamento e estratégia de renegociação',
                  type: 'analise_financeira',
                  priority: 'high',
                  estimated_hours: 4,
                  checklist: [
                    { text: 'Listar todos os credores', required: true },
                    { text: 'Classificar dívidas por urgência', required: true },
                    { text: 'Calcular capacidade de pagamento', required: true },
                    { text: 'Preparar proposta de acordo', required: true }
                  ]
                }
              },
              reason: 'Endividamento crítico (>3x faturamento) - ação imediata necessária'
            }
          ]
        },

        // Regra: Restrições de tempo
        {
          condition: (briefing) => briefing.itens.restricoes_tempo === 'urgente_7d',
          actions: [
            {
              action: 'PRIORITIZE',
              task_template_key: 'criar_relatorio_pdf',
              payload: {
                priority: 'P0'
              },
              reason: 'Prazo urgente - relatório prioritário'
            },
            {
              action: 'DEFER',
              task_template_key: 'analise_detalhada',
              payload: {
                defer_until: 'após_relatorio_inicial'
              },
              reason: 'Análise detalhada adiada devido ao prazo urgente'
            }
          ]
        }
      ],

      mentoria_margem: [
        // Regra: Elasticidade de preço alta
        {
          condition: (briefing) => briefing.itens.elasticidade_preco_percebida === 'alta',
          actions: [
            {
              action: 'PRIORITIZE',
              task_template_key: 'identificar_custos_fixos_variaveis',
              payload: {
                priority: 'P0'
              },
              reason: 'Elasticidade alta - foco em redução de custos antes de ajuste de preço'
            },
            {
              action: 'ADD_SUBTASK',
              task_template_key: 'identificar_custos_fixos_variaveis',
              payload: {
                subtask: {
                  title: 'Mapear Oportunidades de Redução de Custo',
                  description: 'Identificar custos que podem ser reduzidos sem impacto na qualidade',
                  priority: 'high',
                  estimated_hours: 2
                }
              },
              reason: 'Elasticidade alta - oportunidades de redução de custo são prioritárias'
            }
          ]
        },

        // Regra: Capacidade de negociação com fornecedores
        {
          condition: (briefing) => briefing.itens.capacidade_negociacao_fornecedores === 'alta',
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Sprint de Renegociação com Fornecedores',
                  description: 'Negociação estratégica com fornecedores para redução de custos',
                  type: 'planejamento_estrategico',
                  priority: 'high',
                  estimated_hours: 6,
                  checklist: [
                    { text: 'Identificar fornecedores principais', required: true },
                    { text: 'Analisar volume de compras', required: true },
                    { text: 'Preparar proposta de desconto por volume', required: true },
                    { text: 'Negociar prazos de pagamento', required: true },
                    { text: 'Avaliar substitutos de produtos', required: true }
                  ]
                }
              },
              reason: 'Alta capacidade de negociação - sprint de renegociação estratégica'
            }
          ]
        },

        // Regra: Política de descontos agressiva
        {
          condition: (briefing) => briefing.itens.politica_descontos_atual === 'agressiva',
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Auditoria de Política de Descontos',
                  description: 'Revisar e controlar política de descontos atual',
                  type: 'analise_financeira',
                  priority: 'high',
                  estimated_hours: 3,
                  checklist: [
                    { text: 'Mapear descontos concedidos', required: true },
                    { text: 'Calcular impacto na margem', required: true },
                    { text: 'Definir regras de desconto', required: true },
                    { text: 'Implementar controles', required: true }
                  ]
                }
              },
              reason: 'Política de descontos agressiva - auditoria e controle necessários'
            }
          ]
        },

        // Regra: Risco de perda de clientes
        {
          condition: (briefing) => briefing.itens.risco_perda_clientes_com_reajuste === 'alto',
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Teste A/B de Preço',
                  description: 'Implementar teste controlado de novos preços',
                  type: 'implementacao',
                  priority: 'high',
                  estimated_hours: 4,
                  checklist: [
                    { text: 'Definir grupo de teste', required: true },
                    { text: 'Implementar novos preços', required: true },
                    { text: 'Monitorar reação dos clientes', required: true },
                    { text: 'Ajustar estratégia conforme resultado', required: true }
                  ]
                }
              },
              reason: 'Alto risco de perda de clientes - teste A/B para validação'
            },
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Plano de Comunicação de Reajuste',
                  description: 'Estratégia de comunicação para clientes sobre reajuste de preços',
                  type: 'planejamento_estrategico',
                  priority: 'medium',
                  estimated_hours: 2,
                  checklist: [
                    { text: 'Preparar argumentos de valor', required: true },
                    { text: 'Definir cronograma de comunicação', required: true },
                    { text: 'Treinar equipe de vendas', required: true }
                  ]
                }
              },
              reason: 'Alto risco de perda - plano de comunicação essencial'
            }
          ]
        },

        // Regra: Canal de venda online
        {
          condition: (briefing) => briefing.itens.canal_venda_predominante === 'online',
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Revisar Frete e Taxas Online',
                  description: 'Analisar e otimizar custos de frete e taxas de plataforma',
                  type: 'analise_financeira',
                  priority: 'medium',
                  estimated_hours: 2,
                  checklist: [
                    { text: 'Mapear custos de frete', required: true },
                    { text: 'Analisar taxas de plataforma', required: true },
                    { text: 'Identificar oportunidades de otimização', required: true }
                  ]
                }
              },
              reason: 'Canal online - otimização de frete e taxas necessária'
            },
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Estratégia de Bundles e Cross-sell',
                  description: 'Desenvolver estratégia de vendas cruzadas para aumentar ticket médio',
                  type: 'planejamento_estrategico',
                  priority: 'medium',
                  estimated_hours: 3,
                  checklist: [
                    { text: 'Identificar produtos complementares', required: true },
                    { text: 'Criar bundles atrativos', required: true },
                    { text: 'Implementar sistema de recomendação', required: true }
                  ]
                }
              },
              reason: 'Canal online - estratégia de bundles para aumentar margem'
            }
          ]
        }
      ],

      gestao_360: [
        // Regra: Maturidade de processos baixa
        {
          condition: (briefing) => briefing.itens.maturidade_processos === 'baixa',
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Implantação Básica de Governança',
                  description: 'Implementar governança mínima e calendário financeiro',
                  type: 'implementacao',
                  priority: 'high',
                  estimated_hours: 8,
                  checklist: [
                    { text: 'Definir calendário financeiro', required: true },
                    { text: 'Estabelecer RACI financeiro', required: true },
                    { text: 'Criar processos básicos', required: true },
                    { text: 'Treinar responsáveis', required: true }
                  ]
                }
              },
              reason: 'Maturidade baixa - implantação básica de governança necessária'
            }
          ]
        },

        // Regra: Inadimplência alta e política de crédito flexível
        {
          condition: (briefing) => {
            const inadimplencia = briefing.itens.inadimplencia_percent || 0;
            const politica = briefing.itens.politica_credito;
            return inadimplencia > 10 && politica !== 'rigida';
          },
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Definir Política de Crédito Rigorosa',
                  description: 'Implementar política de crédito para reduzir inadimplência',
                  type: 'planejamento_estrategico',
                  priority: 'high',
                  estimated_hours: 4,
                  checklist: [
                    { text: 'Definir critérios de crédito', required: true },
                    { text: 'Estabelecer limites por cliente', required: true },
                    { text: 'Criar processo de aprovação', required: true },
                    { text: 'Implementar cadência de cobrança', required: true }
                  ]
                }
              },
              reason: 'Inadimplência alta (>10%) - política de crédito rigorosa necessária'
            }
          ]
        },

        // Regra: Estoque alto com rupturas frequentes
        {
          condition: (briefing) => {
            const estoqueValor = briefing.itens.estoque_valor || 0;
            const rupturaFrequente = briefing.itens.ruptura_estoque_frequente;
            return estoqueValor > 100000 && rupturaFrequente;
          },
          actions: [
            {
              action: 'PRIORITIZE',
              task_template_key: 'controle_estoque',
              payload: {
                priority: 'P0'
              },
              reason: 'Estoque alto com rupturas - controle prioritário'
            },
            {
              action: 'ADD_SUBTASK',
              task_template_key: 'controle_estoque',
              payload: {
                subtask: {
                  title: 'Implementar Curva ABC e Ponto de Pedido',
                  description: 'Otimizar gestão de estoque com análise ABC e ponto de pedido',
                  priority: 'high',
                  estimated_hours: 6
                }
              },
              reason: 'Estoque alto com rupturas - análise ABC e ponto de pedido essenciais'
            },
            {
              action: 'ADD_SUBTASK',
              task_template_key: 'controle_estoque',
              payload: {
                subtask: {
                  title: 'Limpeza de SKUs Obsoletos',
                  description: 'Identificar e liquidar produtos obsoletos',
                  priority: 'medium',
                  estimated_hours: 3
                }
              },
              reason: 'Estoque alto - limpeza de SKUs obsoletos necessária'
            }
          ]
        },

        // Regra: Necessidade de DRE mensal
        {
          condition: (briefing) => {
            const relatorios = briefing.itens.relatorios_necessarios || [];
            return relatorios.includes('DRE_mensal');
          },
          actions: [
            {
              action: 'ADD_TASK',
              payload: {
                task: {
                  title: 'Implementar Fechamento Mensal',
                  description: 'Processo estruturado de fechamento mensal com DRE',
                  type: 'administrativo',
                  priority: 'high',
                  estimated_hours: 4,
                  checklist: [
                    { text: 'Definir cutoff mensal', required: true },
                    { text: 'Estabelecer competência', required: true },
                    { text: 'Configurar provisões', required: true },
                    { text: 'Treinar equipe', required: true }
                  ]
                }
              },
              reason: 'DRE mensal solicitada - fechamento mensal estruturado necessário'
            }
          ]
        }
      ]
    };
  }

  // Aplicar regras de IA ao briefing
  async applyRules(briefing) {
    try {
      console.log('[AIRulesService] Aplicando regras para briefing:', briefing.id);
      
      // 1. Validar briefing antes de aplicar regras
      const validation = this.validateBriefingForRules(briefing);
      if (!validation.isValid) {
        console.error('[AIRulesService] Briefing inválido para aplicação de regras:', validation.errors);
        throw new Error(`Briefing inválido: ${validation.errors.join('; ')}`);
      }

      // 2. Log warnings se houver
      if (validation.warnings.length > 0) {
        console.warn('[AIRulesService] Warnings na validação:', validation.warnings);
      }

      const servicoTipo = briefing.servico_tipo;
      const rules = this.rules[servicoTipo];

      if (!rules) {
        console.warn('[AIRulesService] Nenhuma regra encontrada para tipo:', servicoTipo);
        return [];
      }

      const adjustments = [];
      const ruleResults = [];

      // 3. Aplicar cada regra com validação
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        try {
          console.log(`[AIRulesService] Aplicando regra ${i + 1}/${rules.length}`);
          
          // Validar condição da regra
          if (typeof rule.condition !== 'function') {
            console.error(`[AIRulesService] Condição da regra ${i + 1} não é uma função`);
            continue;
          }

          const conditionResult = rule.condition(briefing);
          
          if (conditionResult) {
            console.log(`[AIRulesService] Regra ${i + 1} aplicada:`, rule.condition.toString());
            
            // Validar ações da regra
            if (!Array.isArray(rule.actions)) {
              console.error(`[AIRulesService] Ações da regra ${i + 1} não são um array`);
              continue;
            }

            // Criar ajustes para cada ação da regra
            for (let j = 0; j < rule.actions.length; j++) {
              const actionData = rule.actions[j];
              try {
                // Validar ação antes de criar ajuste
                const actionValidation = this.validateAction(actionData, briefing);
                if (!actionValidation.isValid) {
                  console.error(`[AIRulesService] Ação ${j + 1} da regra ${i + 1} inválida:`, actionValidation.errors);
                  continue;
                }

                const adjustment = await TaskAdjustment.create({
                  servico_instancia_id: briefing.servico_instancia_id,
                  briefing_id: briefing.id,
                  action: actionData.action,
                  task_id: actionData.task_id || null,
                  task_template_key: actionData.task_template_key || null,
                  payload: actionData.payload || {},
                  reason: actionData.reason || 'Aplicado por regra de IA',
                  created_by: 'ai_system',
                  metadata: {
                    rule_index: i,
                    action_index: j,
                    applied_at: new Date().toISOString(),
                    validation_warnings: validation.warnings
                  }
                });

                adjustments.push(adjustment);
                console.log(`[AIRulesService] Ajuste ${j + 1} da regra ${i + 1} criado:`, adjustment.id);

              } catch (actionError) {
                console.error(`[AIRulesService] Erro ao criar ajuste ${j + 1} da regra ${i + 1}:`, actionError);
                // Continuar com outras ações mesmo se uma falhar
              }
            }

            ruleResults.push({
              ruleIndex: i,
              applied: true,
              adjustmentsCreated: rule.actions.length
            });

          } else {
            ruleResults.push({
              ruleIndex: i,
              applied: false,
              reason: 'Condição não atendida'
            });
          }

        } catch (ruleError) {
          console.error(`[AIRulesService] Erro ao aplicar regra ${i + 1}:`, ruleError);
          ruleResults.push({
            ruleIndex: i,
            applied: false,
            error: ruleError.message
          });
        }
      }

      console.log('[AIRulesService] Resumo da aplicação de regras:', {
        totalRules: rules.length,
        appliedRules: ruleResults.filter(r => r.applied).length,
        totalAdjustments: adjustments.length,
        ruleResults
      });

      return adjustments;

    } catch (error) {
      console.error('[AIRulesService] Erro ao aplicar regras:', error);
      throw error;
    }
  }

  // Validar ação antes de criar ajuste
  validateAction(actionData, briefing) {
    const errors = [];

    if (!actionData.action) {
      errors.push('Ação não especificada');
    } else {
      const validActions = ['PRIORITIZE', 'DEFER', 'HIDE', 'ADD_SUBTASK', 'ADD_TASK', 'ADD_NOTE', 'SET_MILESTONE'];
      if (!validActions.includes(actionData.action)) {
        errors.push(`Ação inválida: ${actionData.action}. Ações válidas: ${validActions.join(', ')}`);
      }
    }

    if (!actionData.task_template_key && !actionData.task_id) {
      errors.push('task_template_key ou task_id deve ser especificado');
    }

    if (actionData.payload && typeof actionData.payload !== 'object') {
      errors.push('Payload deve ser um objeto');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar briefing antes de aplicar regras
  validateBriefing(briefing) {
    const validation = briefing.validate();
    
    if (!validation.isValid) {
      throw new Error(`Briefing inválido: ${validation.errors.join(', ')}`);
    }

    return true;
  }

  // Validar briefing para aplicação de regras
  validateBriefingForRules(briefing) {
    const errors = [];
    const warnings = [];

    // 1. Validações básicas
    if (!briefing) {
      errors.push('Briefing não fornecido');
      return { isValid: false, errors, warnings };
    }

    if (!briefing.id) {
      errors.push('ID do briefing ausente');
    }

    if (!briefing.servico_instancia_id) {
      errors.push('ID da instância de serviço ausente');
    }

    if (!briefing.servico_tipo) {
      errors.push('Tipo de serviço ausente');
    }

    // 2. Validar estrutura de dados
    if (!briefing.itens || typeof briefing.itens !== 'object') {
      errors.push('Dados do briefing (itens) ausentes ou inválidos');
      return { isValid: false, errors, warnings };
    }

    // 3. Validar campos obrigatórios por tipo de serviço
    const requiredFields = this.getRequiredFieldsForServiceType(briefing.servico_tipo);
    const missingFields = requiredFields.filter(field => {
      const value = briefing.itens[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      errors.push(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
    }

    // 4. Validar tipos de dados específicos
    this.validateDataTypes(briefing.itens, briefing.servico_tipo, errors, warnings);

    // 5. Validar valores numéricos
    this.validateNumericValues(briefing.itens, briefing.servico_tipo, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Obter campos obrigatórios por tipo de serviço
  getRequiredFieldsForServiceType(serviceType) {
    const requiredFields = {
      diagnostico_avulso: [
        'disponibilidade_dados',
        'principal_dor',
        'faturamento_mensal_medio',
        'endividamento_total'
      ],
      mentoria_margem: [
        'elasticidade_preco_percebida',
        'capacidade_negociacao_fornecedores',
        'politica_descontos_atual',
        'risco_perda_clientes_com_reajuste'
      ],
      gestao_360: [
        'maturidade_processos',
        'nivel_automatizacao',
        'capacidade_equipe',
        'urgencia_implementacao'
      ]
    };

    return requiredFields[serviceType] || [];
  }

  // Validar tipos de dados
  validateDataTypes(itens, serviceType, errors, warnings) {
    const typeValidations = {
      diagnostico_avulso: {
        disponibilidade_dados: ['baixa', 'media', 'alta'],
        principal_dor: ['fluxo_caixa', 'endividamento', 'lucratividade', 'crescimento']
      },
      mentoria_margem: {
        elasticidade_preco_percebida: ['baixa', 'media', 'alta'],
        capacidade_negociacao_fornecedores: ['baixa', 'media', 'alta'],
        politica_descontos_atual: ['conservadora', 'moderada', 'agressiva'],
        risco_perda_clientes_com_reajuste: ['baixo', 'medio', 'alto']
      },
      gestao_360: {
        maturidade_processos: ['baixa', 'media', 'alta'],
        nivel_automatizacao: ['manual', 'parcial', 'completo'],
        capacidade_equipe: ['limitada', 'adequada', 'excelente'],
        urgencia_implementacao: ['baixa', 'media', 'alta']
      }
    };

    const validations = typeValidations[serviceType] || {};
    
    Object.keys(validations).forEach(field => {
      const value = itens[field];
      const allowedValues = validations[field];
      
      if (value && !allowedValues.includes(value)) {
        errors.push(`Valor inválido para ${field}: ${value}. Valores permitidos: ${allowedValues.join(', ')}`);
      }
    });
  }

  // Validar valores numéricos
  validateNumericValues(itens, serviceType, errors, warnings) {
    const numericFields = {
      diagnostico_avulso: ['faturamento_mensal_medio', 'endividamento_total'],
      mentoria_margem: ['margem_atual', 'margem_desejada'],
      gestao_360: ['numero_funcionarios', 'orcamento_disponivel']
    };

    const fields = numericFields[serviceType] || [];
    
    fields.forEach(field => {
      const value = itens[field];
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push(`${field} deve ser um número válido`);
        } else if (numValue < 0) {
          warnings.push(`${field} tem valor negativo: ${numValue}`);
        }
      }
    });
  }

  // Obter estatísticas de regras aplicadas
  getRuleStats(adjustments) {
    const stats = {
      total_adjustments: adjustments.length,
      by_action: {},
      by_reason: {},
      by_service_type: {}
    };

    adjustments.forEach(adjustment => {
      // Contar por ação
      stats.by_action[adjustment.action] = (stats.by_action[adjustment.action] || 0) + 1;
      
      // Contar por motivo
      stats.by_reason[adjustment.reason] = (stats.by_reason[adjustment.reason] || 0) + 1;
    });

    return stats;
  }

  // Adicionar nova regra (para extensibilidade)
  addRule(servicoTipo, rule) {
    if (!this.rules[servicoTipo]) {
      this.rules[servicoTipo] = [];
    }

    this.rules[servicoTipo].push(rule);
    console.log('[AIRulesService] Nova regra adicionada para:', servicoTipo);
  }

  // Remover regra
  removeRule(servicoTipo, ruleIndex) {
    if (this.rules[servicoTipo] && this.rules[servicoTipo][ruleIndex]) {
      this.rules[servicoTipo].splice(ruleIndex, 1);
      console.log('[AIRulesService] Regra removida de:', servicoTipo);
    }
  }

  // Listar regras por tipo de serviço
  getRules(servicoTipo) {
    return this.rules[servicoTipo] || [];
  }

  // Listar todos os tipos de serviço com regras
  getServiceTypes() {
    return Object.keys(this.rules);
  }
}

// Instância singleton
export const aiRulesService = new AIRulesService();

export default aiRulesService;
