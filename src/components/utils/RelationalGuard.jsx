import { useRelAudit } from './useRelAudit';
import DevAuditBadge from './DevAuditBadge';

// Wrapper component that adds relational auditing to pages
export default function RelationalGuard({ 
  entityType, 
  entityId, 
  children, 
  autoRun = true 
}) {
  const { auditResults, loading, runAudit, _hasIssues } = useRelAudit(
    entityType, 
    entityId, 
    { autoRun }
  );

  return (
    <>
      {children}
      <DevAuditBadge
        auditResults={auditResults}
        onRefresh={runAudit}
        loading={loading}
        entityType={entityType}
      />
    </>
  );
}