/**
 * 📝 Hook Centralizado para Geração de Tarefas
 * 
 * Centraliza toda a lógica de geração de tarefas a partir de templates e serviços
 */

import { useState, useCallback } from 'react';
import { Task, Service, Brief } from '@/api/entities';
import { generateTasksFromService } from '@/api/functions';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';
import { useMandatoryBriefing } from './useMandatoryBriefing';
import { useTriggerSystem } from './useTriggerSystem';
import { useTaskSanitization } from './useTaskSanitization';

// Tipos para geração de tarefas
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  estimated_hours: number;
  checklist?: TaskChecklistItem[];
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  required: boolean;
  order: number;
  assignedRole?: string;
  relativeDueDays?: number;
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  task_templates?: TaskTemplate[];
  estimated_hours?: number;
  duration_days?: number;
}

export interface TaskGenerationOptions {
  serviceId: string;
  autoAssign?: boolean;
  startDate: string;
  customAssignments?: Record<string, string>;
  skipExisting?: boolean;
}

export interface TaskGenerationResult {
  success: boolean;
  tasksCreated: number;
  tasksSkipped: number;
  errors: string[];
  warnings: string[];
  generatedTasks?: any[];
}

export interface TaskGenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  lastResult: TaskGenerationResult | null;
}

export function useTaskGeneration() {
  const { user } = useSession();
  const { canActivateService } = useMandatoryBriefing();
  const { registerEvent } = useTriggerSystem();
  const { sanitizeTaskData, validateSanitizedData } = useTaskSanitization();
  const [state, setState] = useState<TaskGenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
    error: null,
    lastResult: null
  });

  // Gerar hash único para tarefa baseado no template
  const generateTaskHash = useCallback((taskTemplate: TaskTemplate, deliverableId: string): string => {
    const content = JSON.stringify({
      title: taskTemplate.title,
      description: taskTemplate.description,
      type: taskTemplate.type,
      priority: taskTemplate.priority,
      estimated_hours: taskTemplate.estimated_hours,
      deliverableId,
      checklist: taskTemplate.checklist?.map(item => ({
        text: item.text,
        required: item.required,
        order: item.order
      }))
    });
    
    // Usar Web Crypto API para hash seguro
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      return window.crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });
    }
    
    // Fallback para hash simples
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }, []);

  // Verificar se tarefa já existe de forma robusta
  const checkTaskExists = useCallback(async (
    taskTemplate: TaskTemplate, 
    deliverableId: string, 
    serviceId: string
  ): Promise<{ exists: boolean; existingTask?: any; reason?: string }> => {
    try {
      // 1. Verificação por ID do template (mais confiável)
      if (taskTemplate.id) {
        const existingByTemplateId = await Task.filter({
          agencyId: user?.data?.agencyId,
          serviceId,
          deliverableId,
          template_id: taskTemplate.id
        });
        
        if (existingByTemplateId.length > 0) {
          return { 
            exists: true, 
            existingTask: existingByTemplateId[0], 
            reason: 'template_id' 
          };
        }
      }

      // 2. Verificação por hash de conteúdo
      const taskHash = await generateTaskHash(taskTemplate, deliverableId);
      const existingByHash = await Task.filter({
        agencyId: user?.data?.agencyId,
        serviceId,
        deliverableId,
        template_hash: taskHash
      });
      
      if (existingByHash.length > 0) {
        return { 
          exists: true, 
          existingTask: existingByHash[0], 
          reason: 'content_hash' 
        };
      }

      // 3. Verificação por título + tipo + prioridade (fallback)
      const existingByContent = await Task.filter({
        agencyId: user?.data?.agencyId,
        serviceId,
        deliverableId,
        title: taskTemplate.title,
        type: taskTemplate.type,
        priority: taskTemplate.priority
      });
      
      if (existingByContent.length > 0) {
        return { 
          exists: true, 
          existingTask: existingByContent[0], 
          reason: 'content_match' 
        };
      }

      return { exists: false };
    } catch (error) {
      console.warn('[TaskGeneration] Erro ao verificar duplicatas:', error);
      return { exists: false }; // Em caso de erro, permitir criação
    }
  // Validar se serviço pode ser ativado
  const validateServiceActivation = useCallback(async (serviceId: string): Promise<{ 
    canActivate: boolean; 
    errors: string[]; 
    warnings: string[]; 
    service?: any 
  }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Buscar serviço
      const service = await Service.get(serviceId);
      if (!service) {
        errors.push('Serviço não encontrado');
        return { canActivate: false, errors, warnings };
      }

      // 2. Verificar se já está ativo
      if (service.is_active) {
        warnings.push('Serviço já está ativo');
      }

      // 3. Verificar se é uma instância (não template)
      if (service.is_template) {
        errors.push('Não é possível ativar um template - use uma instância de serviço');
        return { canActivate: false, errors, warnings };
      }

      // 4. Verificar briefing obrigatório
      if (!canActivateService(serviceId)) {
        errors.push('Briefing obrigatório não foi completado');
        return { canActivate: false, errors, warnings };
      }

      // 5. Verificar deliverables
      if (!service.deliverables || service.deliverables.length === 0) {
        errors.push('Serviço não possui deliverables para gerar tarefas');
        return { canActivate: false, errors, warnings };
      }

      // 6. Verificar se deliverables têm task templates
      const deliverablesWithTasks = service.deliverables.filter(d => 
        d.task_templates && d.task_templates.length > 0
      );

      if (deliverablesWithTasks.length === 0) {
        errors.push('Nenhum deliverable possui templates de tarefa');
        return { canActivate: false, errors, warnings };
      }

      // 7. Verificar se há tarefas já existentes
      const existingTasks = await Task.filter({
        agencyId: user?.data?.agencyId,
        serviceId,
        status: { $ne: 'cancelled' }
      });

      if (existingTasks.length > 0) {
        warnings.push(`${existingTasks.length} tarefas já existem para este serviço`);
      }

      // 8. Verificar data de início
      if (!service.start_date) {
        warnings.push('Data de início não foi definida - será definida como hoje');
      }

      // 9. Verificar permissões do usuário
      if (!user?.data?.agencyId) {
        errors.push('Usuário não tem agência associada');
        return { canActivate: false, errors, warnings };
      }

      if (service.agencyId !== user.data.agencyId) {
        errors.push('Serviço não pertence à sua agência');
        return { canActivate: false, errors, warnings };
      }

      return { 
        canActivate: errors.length === 0, 
        errors, 
        warnings, 
        service 
      };

    } catch (error) {
      console.error('[TaskGeneration] Erro na validação de ativação:', error);
      errors.push('Erro ao validar ativação do serviço');
      return { canActivate: false, errors, warnings };
    }
  }, [user?.data?.agencyId, canActivateService]);

  // Processar checklist de tarefa
  const processTaskChecklist = useCallback((checklist: TaskChecklistItem[], startDate: string): any[] => {
    if (!checklist || checklist.length === 0) return [];

    return checklist.map(item => ({
      id: item.id || `processed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: item.text,
      completed: false,
      required: item.required !== undefined ? item.required : true,
      order: item.order || 0,
      assignedTo: null, // Será resolvido por role em produção
      dueDate: item.relativeDueDays ?
        new Date(new Date(startDate).getTime() + item.relativeDueDays * 24 * 60 * 60 * 1000).toISOString() :
        null,
      templateData: {
        assignedRole: item.assignedRole,
        relativeDueDays: item.relativeDueDays
      }
    }));
  }, []);

  // Gerar tarefas a partir de serviço
  const generateTasksFromServiceInstance = useCallback(async (options: TaskGenerationOptions): Promise<TaskGenerationResult> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      currentStep: 'Validando serviço...',
      error: null
    }));

    try {
      // 1. Validar serviço
      const validation = await validateServiceTemplate(options.serviceId);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      const service = validation.service!;
      setState(prev => ({ ...prev, progress: 10, currentStep: 'Processando deliverables...' }));

      // 2. Processar deliverables e gerar tarefas
      let tasksCreated = 0;
      let tasksSkipped = 0;
      const errors: string[] = [];
      const warnings: string[] = [];
      const generatedTasks: any[] = [];

      const deliverables = service.deliverables || [];
      const totalDeliverables = deliverables.length;

      for (let i = 0; i < deliverables.length; i++) {
        const deliverable = deliverables[i];
        const progressPercent = 10 + (i / totalDeliverables) * 70;
        
        setState(prev => ({
          ...prev,
          progress: progressPercent,
          currentStep: `Processando deliverable: ${deliverable.name}...`
        }));

        const taskTemplates = deliverable.task_templates || [];
        
        if (taskTemplates.length === 0) {
          warnings.push(`Deliverable "${deliverable.name}" não possui templates de tarefa`);
          continue;
        }

        for (const taskTemplate of taskTemplates) {
          try {
            // Verificar se tarefa já existe de forma robusta
            if (options.skipExisting) {
              const duplicateCheck = await checkTaskExists(taskTemplate, deliverable.id, options.serviceId);
              
              if (duplicateCheck.exists) {
                tasksSkipped++;
                console.log(`[TaskGeneration] Tarefa já existe (${duplicateCheck.reason}): ${taskTemplate.title}`);
                continue;
              }
            }

            // Processar checklist
            const processedChecklist = processTaskChecklist(
              taskTemplate.checklist || [],
              options.startDate
            );

            // Gerar hash da tarefa para rastreamento
            const taskHash = await generateTaskHash(taskTemplate, deliverable.id);

            // Criar dados da tarefa
            const rawTaskData = {
              agencyId: user?.data?.agencyId,
              clientId: service.clientId,
              serviceId: options.serviceId,
              deliverableId: deliverable.id,
              title: taskTemplate.title,
              description: taskTemplate.description || '',
              type: taskTemplate.type || 'deliverable',
              priority: taskTemplate.priority || 'medium',
              estimatedHours: taskTemplate.estimated_hours || 4,
              status: 'todo',
              checklist: processedChecklist,
              // Metadados para rastreamento
              template_id: taskTemplate.id,
              template_hash: taskHash,
              created_from_template: true,
              template_version: service.template_version_used || '1.0',
              template_metadata: {
                deliverable_name: deliverable.name,
                template_id: taskTemplate.id,
                generated_at: new Date().toISOString()
              }
            };

            // Sanitizar dados da tarefa
            const taskData = sanitizeTaskData(rawTaskData);

            // Validar dados sanitizados
            const validation = validateSanitizedData(taskData);
            if (!validation.isValid) {
              warnings.push(`Tarefa "${taskTemplate.title}" tem dados inválidos: ${validation.errors.join(', ')}`);
              continue;
            }

            // Criar tarefa
            const createdTask = await Task.create(taskData);
            tasksCreated++;
            generatedTasks.push(createdTask);

          } catch (taskError: any) {
            const errorMsg = `Erro ao criar tarefa "${taskTemplate.title}" no deliverable "${deliverable.name}": ${taskError.message}`;
            errors.push(errorMsg);
            console.error(errorMsg, taskError);
          }
        }
      }

      setState(prev => ({ ...prev, progress: 90, currentStep: 'Finalizando...' }));

      // 3. Resultado final
      const result: TaskGenerationResult = {
        success: errors.length === 0 || tasksCreated > 0,
        tasksCreated,
        tasksSkipped,
        errors,
        warnings,
        generatedTasks
      };

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: 'Concluído',
        lastResult: result
      }));

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido na geração de tarefas';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      return {
        success: false,
        tasksCreated: 0,
        tasksSkipped: 0,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, [user, validateServiceTemplate, processTaskChecklist]);

  // Ativar serviço e gerar tarefas com validação completa
  const activateServiceAndGenerateTasks = useCallback(async (serviceId: string, options: {
    autoAssign?: boolean;
    skipExisting?: boolean;
    customAssignments?: Record<string, string>;
  } = {}): Promise<TaskGenerationResult> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      currentStep: 'Validando ativação...',
      error: null
    }));

    try {
      // 1. Validar se serviço pode ser ativado
      const validation = await validateServiceActivation(serviceId);
      
      if (!validation.canActivate) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: validation.errors.join('; ')
        }));

        return {
          success: false,
          tasksCreated: 0,
          tasksSkipped: 0,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // 2. Ativar serviço
      setState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'Ativando serviço...'
      }));

      const today = new Date().toISOString().split('T')[0];
      const updatedService = await Service.update(serviceId, {
        is_active: true,
        service_status: 'in_execution',
        start_date: validation.service?.start_date || today
      });

      // 3. Gerar tarefas
      setState(prev => ({
        ...prev,
        progress: 20,
        currentStep: 'Gerando tarefas...'
      }));

      const taskResult = await generateTasksFromServiceInstance({
        serviceId,
        autoAssign: options.autoAssign || true,
        startDate: updatedService.start_date || today,
        skipExisting: options.skipExisting || true,
        customAssignments: options.customAssignments
      });

      // 4. Registrar evento de ativação
      try {
        await registerEvent(
          'service_activated',
          'Service',
          serviceId,
          serviceId,
          validation.service?.clientId,
          {
            tasksCreated: taskResult.tasksCreated,
            tasksSkipped: taskResult.tasksSkipped,
            warnings: taskResult.warnings,
            activatedAt: new Date().toISOString()
          }
        );
      } catch (triggerError) {
        console.warn('[TaskGeneration] Falha ao registrar evento de ativação:', triggerError);
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: 'Ativação concluída',
        lastResult: taskResult
      }));

      return taskResult;

    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao ativar serviço e gerar tarefas';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      return {
        success: false,
        tasksCreated: 0,
        tasksSkipped: 0,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, [validateServiceActivation, generateTasksFromServiceInstance, registerEvent]);
    const result = await generateTasksFromServiceInstance(options);

    if (result.success) {
      if (result.tasksCreated > 0) {
        toast.success(`${result.tasksCreated} tarefas geradas com sucesso!`);
      }
      
      if (result.tasksSkipped > 0) {
        toast.info(`${result.tasksSkipped} tarefas já existentes foram ignoradas`);
      }
      
      if (result.warnings.length > 0) {
        toast.warning('Atenção:', {
          description: result.warnings.join('; ')
        });
      }
    } else {
      toast.error('Erro na geração de tarefas:', {
        description: result.errors.join('; ')
      });
    }

    return result;
  }, [generateTasksFromServiceInstance]);

  // Gerar tarefas usando API Base44 (fallback)
  const generateTasksUsingAPI = useCallback(async (options: TaskGenerationOptions): Promise<TaskGenerationResult> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      currentStep: 'Gerando tarefas via API...',
      error: null
    }));

    try {
      const response = await generateTasksFromService({
        serviceId: options.serviceId,
        autoAssign: options.autoAssign || false,
        startDate: options.startDate
      });

      const result: TaskGenerationResult = {
        success: response.data?.success || false,
        tasksCreated: response.data?.tasksCreated || 0,
        tasksSkipped: 0,
        errors: response.data?.errors || [],
        warnings: response.data?.warnings || []
      };

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: 'Concluído',
        lastResult: result
      }));

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Erro na geração via API';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      return {
        success: false,
        tasksCreated: 0,
        tasksSkipped: 0,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, []);

  // Limpar estado
  const clearState = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      currentStep: '',
      error: null,
      lastResult: null
    });
  }, []);

  // Gerar tarefas baseadas no briefing
  const generateTasksFromBriefing = useCallback(async (
    serviceId: string,
    briefingId: string
  ): Promise<TaskGenerationResult> => {
    try {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        progress: 0,
        currentStep: 'Analisando briefing...',
        error: null
      }));

      // Verificar se briefing está completo
      const briefing = await Brief.get(briefingId);
      if (!briefing || briefing.status !== 'READY') {
        throw new Error('Briefing não está completo ou não foi encontrado');
      }

      // Verificar se serviço pode ser ativado
      if (!canActivateService(serviceId)) {
        throw new Error('Briefing obrigatório não foi completado');
      }

      // Analisar respostas do briefing
      const briefingAnalysis = await analyzeBriefingResponses(briefing);
      
      // Gerar tarefas customizadas baseadas no briefing
      const customTasks = await generateCustomTasksFromBriefing(
        serviceId, 
        briefingAnalysis
      );

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: 'Tarefas geradas com sucesso',
        lastResult: {
          success: true,
          tasksCreated: customTasks.length,
          tasksSkipped: 0,
          warnings: [],
          customTasks
        }
      }));

      return {
        success: true,
        tasksCreated: customTasks.length,
        tasksSkipped: 0,
        warnings: [],
        customTasks
      };

    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao gerar tarefas do briefing';
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));

      return {
        success: false,
        tasksCreated: 0,
        tasksSkipped: 0,
        warnings: [],
        error: errorMessage
      };
    }
  }, [canActivateService]);

  // Analisar respostas do briefing
  const analyzeBriefingResponses = async (briefing: any) => {
    const analysis = {
      businessType: briefing.business_context || '',
      objectives: briefing.objectives || '',
      challenges: briefing.current_challenges || '',
      metrics: briefing.success_metrics || '',
      customizations: []
    };

    // Identificar customizações baseadas nas respostas
    if (analysis.challenges.includes('financeiro') || analysis.challenges.includes('fluxo de caixa')) {
      analysis.customizations.push('financial_analysis');
    }

    if (analysis.challenges.includes('tributário') || analysis.challenges.includes('impostos')) {
      analysis.customizations.push('tax_consulting');
    }

    if (analysis.challenges.includes('crescimento') || analysis.challenges.includes('expansão')) {
      analysis.customizations.push('growth_strategy');
    }

    return analysis;
  };

  // Gerar tarefas customizadas baseadas no briefing
  const generateCustomTasksFromBriefing = async (
    serviceId: string,
    analysis: any
  ): Promise<any[]> => {
    const customTasks = [];

    // Tarefa de análise específica baseada no briefing
    if (analysis.customizations.includes('financial_analysis')) {
      customTasks.push({
        agencyId: user?.data?.agencyId,
        serviceId,
        title: 'Análise Financeira Personalizada',
        description: `Análise específica baseada no briefing: ${analysis.challenges}`,
        type: 'financial_analysis',
        priority: 'high',
        estimatedHours: 8,
        status: 'todo',
        checklist: [
          { text: 'Revisar briefing do cliente', required: true },
          { text: 'Analisar desafios financeiros identificados', required: true },
          { text: 'Preparar relatório personalizado', required: true }
        ]
      });
    }

    // Tarefa de estratégia baseada nos objetivos
    if (analysis.objectives) {
      customTasks.push({
        agencyId: user?.data?.agencyId,
        serviceId,
        title: 'Estratégia Personalizada',
        description: `Estratégia baseada nos objetivos: ${analysis.objectives}`,
        type: 'strategy_development',
        priority: 'high',
        estimatedHours: 6,
        status: 'todo',
        checklist: [
          { text: 'Mapear objetivos do briefing', required: true },
          { text: 'Desenvolver estratégia personalizada', required: true },
          { text: 'Apresentar proposta ao cliente', required: true }
        ]
      });
    }

    // Criar tarefas no banco de dados
    const createdTasks = [];
    for (const taskData of customTasks) {
      try {
        const createdTask = await Task.create(taskData);
        createdTasks.push(createdTask);
      } catch (error) {
        console.error('Erro ao criar tarefa customizada:', error);
      }
    }

    return createdTasks;
  };

  // Obter estatísticas
  const getStats = useCallback(() => {
    return {
      isGenerating: state.isGenerating,
      progress: state.progress,
      hasError: !!state.error,
      lastResult: state.lastResult
    };
  }, [state]);

  return {
    // Estado
    ...state,
    
    // Ações principais
    generateTasksFromServiceInstance,
    generateTasksWithFeedback,
    activateServiceAndGenerateTasks,
    generateTasksFromBriefing,
    generateTasksUsingAPI,
    
    // Validações
    validateServiceTemplate,
    validateServiceActivation,
    
    // Utilitários
    processTaskChecklist,
    checkTaskExists,
    generateTaskHash,
    getStats,
    
    // Limpeza
    clearState
  };
}
