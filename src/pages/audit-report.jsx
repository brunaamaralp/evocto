import React from 'react';
import EvoctoAuditReport from '@/components/debug/EvoctoAuditReport';

/**
 * Página dedicada ao relatório de auditoria
 * Acessível via /audit-report para revisão do time
 */
export default function AuditReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EvoctoAuditReport />
    </div>
  );
}