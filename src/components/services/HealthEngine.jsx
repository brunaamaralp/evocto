import { ServiceRiskState, CyclePlan, BriefingVersion, LearningEntry, Service, AuditLog } from '@/api/entities';
import { createPageUrl } from '@/utils';

export class HealthEngine {
  static VERSION = '1.0';

  static async computeServiceHealth(serviceId, cycleId, agencyId) {
    const signals = [];
    const now = new Date();
    const nowUTC = now.toISOString();
    let service = null;
    let cycle = null;
    
    try {
      // Load required data
      cycle = await CyclePlan.get(cycleId);
      service = await Service.get(serviceId);
      
      if (!cycle || !service) {
        throw new Error('Service or cycle not found');
      }

      // Signal 1: RC expiring <24h (critical)
      if (cycle.status === 'pending_approval' && cycle.approval_due_at) {
        const approvalDue = new Date(cycle.approval_due_at);
        const hoursUntilDue = (approvalDue - now) / (1000 * 60 * 60);
        
        if (hoursUntilDue < 24 && hoursUntilDue > 0) {
          signals.push({
            type: 'rc_expiring',
            severity: 'critical',
            title: `RC expira em ${Math.floor(hoursUntilDue)}h`,
            href: createPageUrl(`services/${serviceId}/cycles/${cycleId}/plan`)
          });
        }
      }

      // Signal 2: Cycle closing due today/overdue (critical)
      if (cycle.status === 'in_execution' && cycle.close_due_at) {
        const closeDue = new Date(cycle.close_due_at);
        const hoursUntilClose = (closeDue - now) / (1000 * 60 * 60);
        
        if (hoursUntilClose <= 24) {
          const title = hoursUntilClose < 0 
            ? `Fechamento atrasado há ${Math.abs(Math.floor(hoursUntilClose))}h`
            : `Fechamento vence hoje`;
          
          signals.push({
            type: 'cycle_closing_due',
            severity: 'critical',
            title,
            href: createPageUrl(`services/${serviceId}/cycles/${cycleId}/close`)
          });
        }
      }

      // Signal 3: KPI off target (if monitoring enabled)
      if (service.health_monitoring?.kpi_targets?.length > 0) {
        // Simulate KPI check - in real implementation, would check against latest cycle report
        const offTargetKPIs = await this.checkKPITargets(cycle, service.health_monitoring.kpi_targets);
        
        if (offTargetKPIs.length > 0) {
          const kpi = offTargetKPIs[0]; // Take first off-target KPI
          signals.push({
            type: 'kpi_off_target',
            severity: 'warn',
            title: `${kpi.metric.toUpperCase()} ${kpi.deviation > 0 ? 'acima' : 'abaixo'} do alvo`,
            href: createPageUrl(`services/${serviceId}/cycles/${cycleId}/plan`)
          });
        }
      }

      // Signal 4: Disruptive briefing change pending >72h
      const pendingChanges = await BriefingVersion.filter({ 
        projectId: cycle.projectId,
        status: 'IN_REVIEW',
        requires_validation: true
      });
      
      for (const change of pendingChanges) {
        const hoursWaiting = (now - new Date(change.created_date)) / (1000 * 60 * 60);
        if (hoursWaiting > 72) {
          signals.push({
            type: 'briefing_change_pending',
            severity: 'warn',
            title: `Mudança disruptiva pendente há ${Math.floor(hoursWaiting)}h`,
            href: createPageUrl(`briefing-editor?id=${change.briefId}`)
          });
          break; // Only show one
        }
      }

      // Signal 5: Learning untriaged > SLA
      const slaHours = service.health_monitoring?.sla_hours?.learning_triage || 48;
      const untriagedLearnings = await LearningEntry.filter({
        agencyId,
        projectId: cycle.projectId,
        reviewed: false
      });

      for (const learning of untriagedLearnings) {
        const hoursUntriaged = (now - new Date(learning.created_date)) / (1000 * 60 * 60);
        if (hoursUntriaged > slaHours) {
          signals.push({
            type: 'learning_untriaged',
            severity: 'warn',
            title: `${untriagedLearnings.length} aprendizado(s) sem triagem`,
            href: createPageUrl(`library?filter=untriaged`)
          });
          break; // Only show one
        }
      }

      // Limit to 5 signals max
      const limitedSignals = signals.slice(0, 5);

      // Determine status based on signals
      const status = this.determineStatus(limitedSignals);

      // Create or update ServiceRiskState
      const riskState = {
        agencyId,
        clientId: service.clientId,
        serviceId,
        cycleId,
        status,
        signals: limitedSignals,
        computedAt: nowUTC
      };

      // Find existing or create new
      const existing = await ServiceRiskState.filter({ cycleId });
      if (existing.length > 0) {
        await ServiceRiskState.update(existing[0].id, riskState);
        riskState.id = existing[0].id;
      } else {
        const created = await ServiceRiskState.create(riskState);
        riskState.id = created.id;
      }

      // Log computation
      await AuditLog.create({
        agencyId,
        entity_type: 'ServiceRiskState',
        entity_id: riskState.id,
        action: 'HEALTH_COMPUTED',
        actor_id: 'health_engine',
        meta_json: {
          engine_version: this.VERSION,
          signals_count: limitedSignals.length,
          status,
          inputs: {
            cycle_status: cycle.status,
            has_kpi_monitoring: !!service.health_monitoring?.kpi_targets?.length
          }
        }
      });

      return riskState;

    } catch (error) {
      console.error('Error computing service health:', error);
      
      // Return safe fallback
      return {
        agencyId,
        clientId: service?.clientId || 'unknown',
        serviceId,
        cycleId,
        status: 'ok',
        signals: [],
        computedAt: nowUTC,
        error: error.message
      };
    }
  }

  static determineStatus(signals) {
    if (signals.length === 0) return 'ok';
    
    const criticalSignals = signals.filter(s => s.severity === 'critical');
    
    if (criticalSignals.length > 0 || signals.length >= 2) {
      return 'critical';
    }
    
    if (signals.length === 1) {
      return 'attention';
    }
    
    return 'ok';
  }

  static async checkKPITargets(cycle, kpiTargets) {
    // Simulate KPI checking - in real implementation would check against cycle performance data
    const offTarget = [];
    
    // Mock data - in real implementation, get from cycle performance reports
    const mockMetrics = {
      cpl: { current: 25.50, target: 20.00 },
      ctr: { current: 1.2, target: 2.0 },
      cpc: { current: 3.50, target: 4.00 }
    };
    
    for (const kpiTarget of kpiTargets) {
      const current = mockMetrics[kpiTarget.metric];
      if (!current) continue;
      
      const deviationPercent = Math.abs(current.current - current.target) / current.target * 100;
      
      if (deviationPercent > kpiTarget.deviation_threshold_percent) {
        offTarget.push({
          metric: kpiTarget.metric,
          current: current.current,
          target: current.target,
          deviation: deviationPercent
        });
      }
    }
    
    return offTarget;
  }

  // Batch computation for all active cycles
  static async computeAllServicesHealth(agencyId) {
    const activeCycles = await CyclePlan.filter({ 
      agencyId, 
      status: { $in: ['pending_approval', 'in_execution'] }
    });
    
    const results = [];
    
    for (const cycle of activeCycles) {
      try {
        const healthState = await this.computeServiceHealth(
          cycle.serviceId, 
          cycle.id, 
          agencyId
        );
        results.push(healthState);
      } catch (error) {
        console.error(`Failed to compute health for cycle ${cycle.id}:`, error);
      }
    }
    
    return results;
  }
}