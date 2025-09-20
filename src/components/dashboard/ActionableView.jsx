import { parseISO, isPast, isThisWeek, isToday, differenceInDays } from 'date-fns';
import { createPageUrl } from '@/utils';

// Simulação da View Actionable - na implementação real, seria uma view/query consolidada
export class ActionableView {
  static async getActionableItems(agencyId) {
    // Em produção, isso seria uma view materializada ou query que agrega:
    // ServiceCycle, ApprovalLink, WorkOrder, BriefingChange, LearningEntry, Meeting
    
    const mockData = [
      // Cycle Approval
      {
        id: "servicecycle:cycle_q3_2024",
        type: "cycle_approval",
        title: "Plano Q3 2024 - TechCorp",
        clientId: "client_techcorp",
        serviceId: "service_marketing_digital",
        cycleId: "cycle_q3_2024",
        due_at: "2024-07-28T17:00:00Z",
        status: "aguardando_aprovacao",
        risk: "medium",
        priority_score: 75,
        href: createPageUrl("cycle-approval?id=cycle_q3_2024")
      },
      
      // RC Expiry
      {
        id: "approvallink:rc_feb_2024",
        type: "rc_expiry",
        title: "RC Fevereiro expira em 2 dias",
        clientId: "client_inovatech",
        serviceId: "service_midia_paga",
        due_at: "2024-07-30T23:59:59Z",
        status: "ativo",
        risk: "high",
        priority_score: 85,
        href: createPageUrl("cycle-approval?token=rc_feb_2024")
      },
      
      // Cycle Close
      {
        id: "servicecycle:cycle_jan_2024",
        type: "cycle_close",
        title: "Fechar Ciclo Janeiro - CreativeCo",
        clientId: "client_creativeco", 
        serviceId: "service_branding",
        cycleId: "cycle_jan_2024",
        due_at: "2024-07-29T18:00:00Z",
        status: "executando",
        risk: "low",
        priority_score: 60,
        href: createPageUrl("active-cycles?id=cycle_jan_2024")
      },
      
      // WorkOrder Due
      {
        id: "workorder:wo_landing_bf",
        type: "workorder_due",
        title: "Landing Page Black Friday",
        clientId: "client_varejoonline",
        workOrderId: "wo_landing_bf",
        due_at: "2024-07-25T23:59:59Z",
        status: "em_execucao",
        risk: "high",
        priority_score: 95,
        href: createPageUrl("WorkOrders?id=wo_landing_bf")
      },
      
      // Approved Cycles (Ready to Execute)
      {
        id: "servicecycle:cycle_approved_august",
        type: "cycle_approved",
        title: "Ciclo Agosto Aprovado - TechCorp",
        clientId: "client_techcorp",
        serviceId: "service_marketing_digital", 
        cycleId: "cycle_approved_august",
        due_at: "2024-08-01T09:00:00Z",
        status: "aprovado",
        risk: "low",
        priority_score: 50,
        href: createPageUrl("active-cycles?id=cycle_approved_august&action=start")
      },
      
      // Briefing Review
      {
        id: "briefingchange:disruptive_persona_change",
        type: "briefing_review", 
        title: "Mudança Disruptiva: Nova Persona",
        clientId: "client_techcorp",
        due_at: "2024-07-29T12:00:00Z",
        status: "pendente_validacao",
        risk: "medium",
        priority_score: 70,
        href: createPageUrl("client?clientId=client_techcorp&tab=briefing&highlight=personas")
      },
      
      // Learning Triage
      {
        id: "learningentry:learning_video_posts",
        type: "learning_triage",
        title: "Posts em vídeo: 2x mais engajamento",
        clientId: "client_techcorp",
        due_at: "2024-07-28T23:59:59Z",
        status: "novo", 
        risk: "low",
        priority_score: 60,
        href: createPageUrl("library?learningId=learning_video_posts")
      },
      
      // Meeting
      {
        id: "meeting:kickoff_q3",
        type: "meeting",
        title: "Kick-off Q3 - InovaTech",
        clientId: "client_inovatech",
        due_at: "2024-07-28T10:00:00Z",
        status: "agendada",
        risk: "low", 
        priority_score: 75,
        href: createPageUrl("clients?clientId=client_inovatech")
      }
    ];

    // Calcular priority_score baseado em prazo + contexto
    return mockData.map(item => ({
      ...item,
      calculated_priority: this.calculatePriority(item)
    })).sort((a, b) => b.calculated_priority - a.calculated_priority);
  }

  static calculatePriority(item) {
    let score = item.priority_score || 0;
    
    if (item.due_at) {
      const dueDate = parseISO(item.due_at);
      const daysUntilDue = differenceInDays(dueDate, new Date());
      
      // Peso por prazo (até 40 pontos)
      if (isPast(dueDate)) score += 40; // Atrasado
      else if (isToday(dueDate)) score += 35; // Hoje
      else if (daysUntilDue <= 1) score += 30; // Amanhã
      else if (daysUntilDue <= 3) score += 20; // 3 dias
      else if (isThisWeek(dueDate)) score += 10; // Esta semana
    }
    
    // Peso por risco (até 20 pontos)
    const riskWeights = { high: 20, medium: 10, low: 5 };
    score += riskWeights[item.risk] || 0;
    
    // Peso por tipo (até 10 pontos) - alguns tipos são mais urgentes
    const typeWeights = {
      workorder_due: 10,
      rc_expiry: 8,
      cycle_approval: 6,
      briefing_review: 5,
      cycle_close: 4,
      learning_triage: 3,
      meeting: 2,
      cycle_approved: 1
    };
    score += typeWeights[item.type] || 0;
    
    return Math.min(score, 100); // Cap em 100
  }

  static categorizeItems(items) {
    const now = new Date();
    
    return {
      // 🔥 Críticos: priority >= 70 OU atrasado/hoje
      critical: items.filter(item => 
        item.calculated_priority >= 70 || 
        (item.due_at && (isPast(parseISO(item.due_at)) || isToday(parseISO(item.due_at))))
      ),
      
      // ⚡ Próximas Ações: esta semana, não críticos
      nextActions: items.filter(item => 
        item.due_at && 
        isThisWeek(parseISO(item.due_at)) && 
        item.calculated_priority < 70 &&
        !isPast(parseISO(item.due_at)) &&
        !isToday(parseISO(item.due_at))
      ),
      
      // 📋 Prontos para Executar: aprovados
      readyToExecute: items.filter(item => 
        item.type === 'cycle_approved' || 
        item.status === 'aprovado'
      ),
      
      // 🧠 Aprendizados Pendentes: triagem vencida por SLA  
      pendingLearnings: items.filter(item => 
        item.type === 'learning_triage' && 
        item.status === 'novo'
      ),
      
      // 🗓️ Agenda de Hoje: apenas meetings de hoje
      todayAgenda: items.filter(item => 
        item.type === 'meeting' && 
        item.due_at && 
        isToday(parseISO(item.due_at))
      )
    };
  }
}