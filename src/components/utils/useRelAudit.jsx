
import { useState, useEffect } from 'react';
import { 
  Client, Service, CyclePlan, Brief, BriefingVersion, 
  LearningEntry, PlaybookItem, WorkOrder, AuditLog, User 
} from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

// Relationship audit hook for DEV environment
export function useRelAudit(entityType, entityId, options = {}) {
  const [auditResults, setAuditResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { agency } = useSession();

  useEffect(() => {
    if (options.autoRun !== false && entityType && agency?.id) {
      runAudit();
    }
  }, [entityType, entityId, agency?.id]);

  const runAudit = async () => {
    setLoading(true);
    try {
      const results = await performRelationalAudit(entityType, entityId, agency.id);
      setAuditResults(results);
      
      // Log to console for dev visibility, using console.log for compatibility
      console.log(`--- 🔍 Rel Audit Start: ${entityType}${entityId ? `:${entityId}` : ''} ---`);
      results.forEach(result => {
        const emoji = result.status === 'fail' ? '❌' : result.status === 'warn' ? '⚠️' : '✅';
        console.log(`${emoji} ${result.check}`, result);
      });
      console.log(`--- 🔍 Rel Audit End: ${entityType}${entityId ? `:${entityId}` : ''} ---`);
      
    } catch (error) {
      console.error('Audit error:', error);
      setAuditResults([{
        check: 'audit_system',
        status: 'fail',
        message: `Audit system error: ${error.message}`,
        fixHint: 'Check console for full error details'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getFailCount = () => auditResults.filter(r => r.status === 'fail').length;
  const getWarnCount = () => auditResults.filter(r => r.status === 'warn').length;

  return {
    auditResults,
    loading,
    runAudit,
    failCount: getFailCount(),
    warnCount: getWarnCount(),
    hasIssues: getFailCount() > 0 || getWarnCount() > 0
  };
}

// Core auditing logic
async function performRelationalAudit(entityType, entityId, agencyId) {
  const results = [];
  
  try {
    // 1. Orphan checks
    results.push(...await checkOrphans(agencyId));
    
    // 2. Cardinality checks  
    results.push(...await checkCardinalities(agencyId));
    
    // 3. State transition checks
    if (entityId) {
      results.push(...await checkStateTransitions(entityType, entityId));
    }
    
    // 4. Token expiration checks
    results.push(...await checkTokens(agencyId));
    
    // 5. RLS boundary checks
    results.push(...await checkRLSBoundaries(agencyId));
    
  } catch (error) {
    results.push({
      check: 'audit_execution',
      status: 'fail',
      message: `Audit execution failed: ${error.message}`,
      fixHint: 'Check entity permissions and data access'
    });
  }
  
  return results;
}

// 1. Orphan Detection
async function checkOrphans(agencyId) {
  const results = [];
  
  try {
    // Services without clients
    const services = await Service.filter({ agencyId });
    const clients = await Client.filter({ agencyId });
    const clientIds = new Set(clients.map(c => c.id));
    
    const orphanServices = services.filter(s => s.clientId && !clientIds.has(s.clientId));
    if (orphanServices.length > 0) {
      results.push({
        check: 'orphan_services',
        status: 'fail',
        message: `${orphanServices.length} services without valid client`,
        sampleIds: orphanServices.slice(0, 3).map(s => s.id),
        fixHint: 'Delete orphan services or fix clientId references',
        deepLink: '/services'
      });
    } else {
      results.push({
        check: 'orphan_services',
        status: 'ok',
        message: 'All services have valid clients'
      });
    }

    // Cycles without services
    const cycles = await CyclePlan.filter({ agencyId });
    const serviceIds = new Set(services.map(s => s.id));
    
    const orphanCycles = cycles.filter(c => c.serviceId && !serviceIds.has(c.serviceId));
    if (orphanCycles.length > 0) {
      results.push({
        check: 'orphan_cycles',
        status: 'fail',
        message: `${orphanCycles.length} cycles without valid service`,
        sampleIds: orphanCycles.slice(0, 3).map(c => c.id),
        fixHint: 'Delete orphan cycles or fix serviceId references'
      });
    } else {
      results.push({
        check: 'orphan_cycles',
        status: 'ok',
        message: 'All cycles have valid services'
      });
    }

    // Briefing versions without briefs
    const versions = await BriefingVersion.filter({ agencyId });
    const briefs = await Brief.filter({ agencyId });
    const briefIds = new Set(briefs.map(b => b.id));
    
    const orphanVersions = versions.filter(v => v.briefId && !briefIds.has(v.briefId));
    if (orphanVersions.length > 0) {
      results.push({
        check: 'orphan_versions',
        status: 'fail',
        message: `${orphanVersions.length} versions without valid brief`,
        sampleIds: orphanVersions.slice(0, 3).map(v => v.id),
        fixHint: 'Delete orphan versions or fix briefId references'
      });
    } else {
      results.push({
        check: 'orphan_versions',
        status: 'ok',
        message: 'All versions have valid briefs'
      });
    }

  } catch (error) {
    results.push({
      check: 'orphan_detection',
      status: 'fail',
      message: `Orphan detection failed: ${error.message}`,
      fixHint: 'Check data access permissions'
    });
  }
  
  return results;
}

// 2. Cardinality Checks
async function checkCardinalities(agencyId) {
  const results = [];
  
  try {
    // One active cycle per service
    const services = await Service.filter({ agencyId });
    
    for (const service of services.slice(0, 10)) { // Limit for performance
      const activeCycles = await CyclePlan.filter({ 
        serviceId: service.id, 
        status: { $in: ['approved', 'in_execution'] }
      });
      
      if (activeCycles.length > 1) {
        results.push({
          check: 'multiple_active_cycles',
          status: 'fail',
          message: `Service ${service.name} has ${activeCycles.length} active cycles`,
          sampleIds: [service.id],
          fixHint: 'Close old cycles or fix cycle status',
          deepLink: `/services/${service.id}`
        });
      }
    }
    
    // One active RC per brief/plan
    const activeVersions = await BriefingVersion.filter({ 
      agencyId, 
      status: 'IN_REVIEW' 
    });
    
    // Group by briefId
    const versionsByBrief = {};
    activeVersions.forEach(v => {
      if (!versionsByBrief[v.briefId]) {
        versionsByBrief[v.briefId] = [];
      }
      versionsByBrief[v.briefId].push(v);
    });
    
    const duplicateRCs = Object.entries(versionsByBrief)
      .filter(([_, versions]) => versions.length > 1);
    
    if (duplicateRCs.length > 0) {
      results.push({
        check: 'multiple_active_rcs',
        status: 'fail',
        message: `${duplicateRCs.length} briefs with multiple active RCs`,
        sampleIds: duplicateRCs.map(([briefId]) => briefId),
        fixHint: 'Revoke old RCs or fix RC status'
      });
    } else {
      results.push({
        check: 'multiple_active_rcs',
        status: 'ok',
        message: 'No duplicate active RCs found'
      });
    }

  } catch (error) {
    results.push({
      check: 'cardinality_checks',
      status: 'fail',
      message: `Cardinality check failed: ${error.message}`,
      fixHint: 'Check query permissions and data structure'
    });
  }
  
  return results;
}

// 3. State Transition Validation
async function checkStateTransitions(entityType, entityId) {
  const results = [];
  
  try {
    if (entityType === 'cycle') {
      const cycle = await CyclePlan.get(entityId);
      if (!cycle) {
        results.push({
          check: 'cycle_exists',
          status: 'fail',
          message: 'Cycle not found',
          fixHint: 'Check cycle ID and permissions'
        });
        return results;
      }

      const validStates = ['draft', 'pending_approval', 'approved', 'in_execution', 'closing', 'completed'];
      if (!validStates.includes(cycle.status)) {
        results.push({
          check: 'cycle_valid_state',
          status: 'fail',
          message: `Invalid cycle status: ${cycle.status}`,
          fixHint: `Valid states: ${validStates.join(', ')}`
        });
      } else {
        results.push({
          check: 'cycle_valid_state',
          status: 'ok',
          message: `Cycle status '${cycle.status}' is valid`
        });
      }

      // Check transition logic
      if (cycle.status === 'approved' && !cycle.approvalData?.approved_at) {
        results.push({
          check: 'cycle_approval_data',
          status: 'warn',
          message: 'Cycle marked approved but missing approval timestamp',
          fixHint: 'Add approvalData.approved_at to cycle'
        });
      }
    }

    if (entityType === 'brief') {
      const brief = await Brief.get(entityId);
      if (!brief) {
        results.push({
          check: 'brief_exists',
          status: 'fail',
          message: 'Brief not found',
          fixHint: 'Check brief ID and permissions'
        });
        return results;
      }

      const validStates = ['DRAFT', 'IN_REVIEW', 'READY'];
      if (!validStates.includes(brief.status)) {
        results.push({
          check: 'brief_valid_state',
          status: 'fail',
          message: `Invalid brief status: ${brief.status}`,
          fixHint: `Valid states: ${validStates.join(', ')}`
        });
      } else {
        results.push({
          check: 'brief_valid_state',
          status: 'ok',
          message: `Brief status '${brief.status}' is valid`
        });
      }
    }

  } catch (error) {
    results.push({
      check: 'state_transitions',
      status: 'fail',
      message: `State validation failed: ${error.message}`,
      fixHint: 'Check entity access and data structure'
    });
  }
  
  return results;
}

// 4. Token Expiration Checks  
async function checkTokens(agencyId) {
  const results = [];
  
  try {
    const now = new Date();
    
    // Check RC tokens
    const activeVersions = await BriefingVersion.filter({ 
      agencyId, 
      status: 'IN_REVIEW' 
    });
    
    const expiredRCs = activeVersions.filter(v => 
      v.token_expires_at && new Date(v.token_expires_at) < now
    );
    
    if (expiredRCs.length > 0) {
      results.push({
        check: 'expired_rc_tokens',
        status: 'warn',
        message: `${expiredRCs.length} RCs with expired tokens`,
        sampleIds: expiredRCs.slice(0, 3).map(v => v.id),
        fixHint: 'Revoke or regenerate expired RC tokens'
      });
    } else {
      results.push({
        check: 'expired_rc_tokens',
        status: 'ok',
        message: 'No expired RC tokens found'
      });
    }
    
    // Check magic link tokens (if accessible)
    try {
      const users = await User.filter({ agencyId });
      const expiredMagicLinks = users.filter(u => 
        u.magic_token_expires_at && new Date(u.magic_token_expires_at) < now
      );
      
      if (expiredMagicLinks.length > 0) {
        results.push({
          check: 'expired_magic_links',
          status: 'warn',
          message: `${expiredMagicLinks.length} expired magic link tokens`,
          fixHint: 'Clean up expired magic link tokens'
        });
      }
    } catch (error) {
      // User access might be restricted
      results.push({
        check: 'magic_link_tokens',
        status: 'warn',
        message: 'Could not check magic link tokens (access restricted)',
        fixHint: 'Check user access permissions'
      });
    }
    
  } catch (error) {
    results.push({
      check: 'token_expiration',
      status: 'fail',
      message: `Token check failed: ${error.message}`,
      fixHint: 'Check token data access'
    });
  }
  
  return results;
}

// 5. RLS Boundary Checks
async function checkRLSBoundaries(agencyId) {
  const results = [];
  
  try {
    // Check that all entities belong to the agency
    const entities = [
      { name: 'clients', data: await Client.filter({ agencyId }) },
      { name: 'services', data: await Service.filter({ agencyId }) },
      { name: 'cycles', data: await CyclePlan.filter({ agencyId }) },
      { name: 'briefs', data: await Brief.filter({ agencyId }) },
      { name: 'learnings', data: await LearningEntry.filter({ agencyId }) }
    ];
    
    for (const entity of entities) {
      const wrongAgency = entity.data.filter(item => item.agencyId !== agencyId);
      
      if (wrongAgency.length > 0) {
        results.push({
          check: `rls_${entity.name}`,
          status: 'fail',
          message: `${wrongAgency.length} ${entity.name} with wrong agencyId`,
          sampleIds: wrongAgency.slice(0, 3).map(i => i.id),
          fixHint: 'Fix agencyId references or check RLS configuration'
        });
      } else {
        results.push({
          check: `rls_${entity.name}`,
          status: 'ok',
          message: `All ${entity.name} have correct agencyId`
        });
      }
    }
    
  } catch (error) {
    results.push({
      check: 'rls_boundaries',
      status: 'fail',
      message: `RLS check failed: ${error.message}`,
      fixHint: 'Check RLS configuration and permissions'
    });
  }
  
  return results;
}
