import { useState, useCallback, useEffect } from 'react';
import { Client, Service, Task, FinancialKPI } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de metas e KPIs do cliente
 */
export function useClientGoalsKPIs() {
  const { agency, user } = useSession();
  const [goals, setGoals] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carrega metas do cliente
   */
  const loadGoals = useCallback(async (clientId) => {
    setLoading(true);
    setError(null);

    try {
      // Simular busca de metas (Goal não existe na API)
      const goalsData = [];
      // const goalsData = await Goal.filter({
      //   agencyId: agency.id,
      //   clientId: clientId,
      //   status: { $in: ['active', 'completed', 'paused'] }
      // }, '-created_date');

      setGoals(goalsData || []);
      return goalsData || [];
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar metas:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Carrega KPIs do cliente
   */
  const loadKPIs = useCallback(async (clientId, serviceId = null) => {
    setLoading(true);
    setError(null);

    try {
      const filters = {
        agencyId: agency.id,
        clientId: clientId
      };

      if (serviceId) {
        filters.serviceId = serviceId;
      }

      const kpisData = await FinancialKPI.filter(filters, '-updated_date');
      setKpis(kpisData || []);
      return kpisData || [];
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar KPIs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Cria nova meta
   */
  const createGoal = useCallback(async (goalData) => {
    try {
      // Simular criação de meta (Goal não existe na API)
      const newGoal = { 
        id: Date.now(), 
        ...goalData, 
        agencyId: agency.id,
        status: 'active',
        progress: 0,
        created_date: new Date().toISOString()
      };
      // const newGoal = await Goal.create({
      //   ...goalData,
      //   agencyId: agency.id,
      //   status: 'active',
      //   progress: 0,
      //   createdAt: new Date().toISOString()
      // });

      setGoals(prev => [newGoal, ...prev]);
      toast.success('Meta criada com sucesso!');
      return newGoal;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao criar meta';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [agency]);

  /**
   * Atualiza meta
   */
  const updateGoal = useCallback(async (goalId, updates) => {
    try {
      // Simular atualização de meta (Goal não existe na API)
      const updatedGoal = { ...updates, id: goalId, updated_date: new Date().toISOString() };
      // const updatedGoal = await Goal.update(goalId, {
      //   ...updates,
      //   updatedAt: new Date().toISOString()
      // });

      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? updatedGoal : goal
      ));

      toast.success('Meta atualizada com sucesso!');
      return updatedGoal;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao atualizar meta';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Registra progresso da meta
   */
  const updateGoalProgress = useCallback(async (goalId, progress, notes = '') => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) throw new Error('Meta não encontrada');

      // Simular atualização de progresso da meta (Goal não existe na API)
      const updatedGoal = { 
        ...goal, 
        progress: Math.min(Math.max(progress, 0), 100),
        lastProgressUpdate: new Date().toISOString(),
        progressNotes: notes,
        status: progress >= 100 ? 'completed' : goal.status,
        updated_date: new Date().toISOString() 
      };
      // const updatedGoal = await Goal.update(goalId, {
      //   progress: Math.min(Math.max(progress, 0), 100),
      //   lastProgressUpdate: new Date().toISOString(),
      //   progressNotes: notes,
      //   status: progress >= 100 ? 'completed' : goal.status
      // });

      setGoals(prev => prev.map(g => 
        g.id === goalId ? updatedGoal : g
      ));

      toast.success('Progresso atualizado com sucesso!');
      return updatedGoal;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao atualizar progresso';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [goals]);

  /**
   * Registra valor de KPI
   */
  const recordKPIValue = useCallback(async (kpiId, value, period, notes = '') => {
    try {
      const kpi = kpis.find(k => k.id === kpiId);
      if (!kpi) throw new Error('KPI não encontrado');

      const newRecord = {
        value,
        period,
        recordedAt: new Date().toISOString(),
        recordedBy: user.email,
        notes
      };

      const updatedKPI = await FinancialKPI.update(kpiId, {
        currentValue: value,
        lastRecordedAt: new Date().toISOString(),
        records: [...(kpi.records || []), newRecord]
      });

      setKpis(prev => prev.map(k => 
        k.id === kpiId ? updatedKPI : k
      ));

      toast.success('Valor de KPI registrado com sucesso!');
      return updatedKPI;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao registrar KPI';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [kpis, user]);

  /**
   * Calcula estatísticas de metas
   */
  const getGoalsStats = useCallback(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const active = goals.filter(g => g.status === 'active').length;
    const paused = goals.filter(g => g.status === 'paused').length;
    const overdue = goals.filter(g => {
      if (g.status === 'completed') return false;
      return g.targetDate && new Date(g.targetDate) < new Date();
    }).length;

    const avgProgress = total > 0 
      ? goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / total 
      : 0;

    return {
      total,
      completed,
      active,
      paused,
      overdue,
      avgProgress: Math.round(avgProgress)
    };
  }, [goals]);

  /**
   * Calcula estatísticas de KPIs
   */
  const getKPIsStats = useCallback(() => {
    const total = kpis.length;
    const improving = kpis.filter(kpi => {
      const records = kpi.records || [];
      if (records.length < 2) return false;
      
      const latest = records[records.length - 1];
      const previous = records[records.length - 2];
      
      return latest.value > previous.value;
    }).length;

    const declining = kpis.filter(kpi => {
      const records = kpi.records || [];
      if (records.length < 2) return false;
      
      const latest = records[records.length - 1];
      const previous = records[records.length - 2];
      
      return latest.value < previous.value;
    }).length;

    const stable = total - improving - declining;

    return {
      total,
      improving,
      declining,
      stable
    };
  }, [kpis]);

  /**
   * Obtém alertas de performance
   */
  const getPerformanceAlerts = useCallback(() => {
    const alerts = [];

    // Alertas de metas
    goals.forEach(goal => {
      if (goal.status === 'active') {
        // Meta próxima do prazo
        if (goal.targetDate) {
          const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft > 0) {
            alerts.push({
              type: 'goal_deadline',
              severity: daysLeft <= 3 ? 'high' : 'medium',
              title: `Meta "${goal.title}" próxima do prazo`,
              message: `Faltam ${daysLeft} dias para o prazo`,
              goalId: goal.id,
              goalTitle: goal.title
            });
          }
        }

        // Meta com baixo progresso
        if (goal.progress < 30 && goal.targetDate && new Date(goal.targetDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          alerts.push({
            type: 'goal_progress',
            severity: 'medium',
            title: `Meta "${goal.title}" com baixo progresso`,
            message: `Apenas ${goal.progress}% concluído`,
            goalId: goal.id,
            goalTitle: goal.title
          });
        }
      }
    });

    // Alertas de KPIs
    kpis.forEach(kpi => {
      const records = kpi.records || [];
      if (records.length >= 2) {
        const latest = records[records.length - 1];
        const previous = records[records.length - 2];
        
        // KPI em declínio
        if (latest.value < previous.value * 0.9) { // 10% de queda
          alerts.push({
            type: 'kpi_decline',
            severity: 'high',
            title: `KPI "${kpi.name}" em declínio`,
            message: `Queda de ${Math.round(((previous.value - latest.value) / previous.value) * 100)}%`,
            kpiId: kpi.id,
            kpiName: kpi.name
          });
        }
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [goals, kpis]);

  return {
    goals,
    kpis,
    loading,
    error,
    loadGoals,
    loadKPIs,
    createGoal,
    updateGoal,
    updateGoalProgress,
    recordKPIValue,
    getGoalsStats,
    getKPIsStats,
    getPerformanceAlerts
  };
}

