import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, CheckCircle, Info, XCircle,
  Database, GitBranch, Shield, Users, Clock
} from 'lucide-react';

/**
 * Component que valida e exibe regras de negócio para serviços
 */
export default function ServiceBusinessRules({ service, mode = 'validation' }) {
  const rules = validateServiceBusinessRules(service);
  
  if (mode === 'silent' && rules.every(r => r.status === 'passed')) {
    return null;
  }

  const criticalIssues = rules.filter(r => r.status === 'failed' && r.severity === 'error');
  const warnings = rules.filter(r => r.status === 'failed' && r.severity === 'warning');
  
  return (
    <div className="space-y-3">
      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problemas Críticos Detectados:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {criticalIssues.map((rule, idx) => (
                <li key={idx} className="text-sm">{rule.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Avisos:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {warnings.map((rule, idx) => (
                <li key={idx} className="text-sm">{rule.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* All Good */}
      {criticalIssues.length === 0 && warnings.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Todas as regras de negócio estão sendo respeitadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Rules (for debug/admin mode) */}
      {mode === 'detailed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded-lg ${
                rule.status === 'passed' 
                  ? 'border-green-200 bg-green-50' 
                  : rule.severity === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {rule.status === 'passed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : rule.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium">{rule.name}</span>
                <Badge variant="outline" className="text-xs">
                  {rule.category}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">{rule.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Valida todas as regras de negócio de um serviço
 */
function validateServiceBusinessRules(service) {
  if (!service) return [];

  const rules = [];

  // 1. ESTRUTURA DE DADOS
  
  // Rule: Templates não devem ter clientId
  rules.push({
    category: 'DATA_STRUCTURE',
    name: 'Template sem clientId',
    severity: 'error',
    status: service.is_template && service.clientId ? 'failed' : 'passed',
    message: service.is_template && service.clientId 
      ? 'Template não deve ter clientId definido'
      : 'OK: Template sem clientId'
  });

  // Rule: Instâncias devem ter clientId
  rules.push({
    category: 'DATA_STRUCTURE', 
    name: 'Instância com clientId',
    severity: 'error',
    status: !service.is_template && !service.clientId ? 'failed' : 'passed',
    message: !service.is_template && !service.clientId
      ? 'Instância deve ter clientId obrigatório'
      : 'OK: Instância tem clientId'
  });

  // Rule: Instâncias devem ter base_service_id
  rules.push({
    category: 'DATA_STRUCTURE',
    name: 'Instância com template base',
    severity: 'error', 
    status: !service.is_template && !service.base_service_id ? 'failed' : 'passed',
    message: !service.is_template && !service.base_service_id
      ? 'Instância deve ter base_service_id (template de origem)'
      : 'OK: Instância referencia template base'
  });

  // Rule: Instâncias devem ter template_version_used
  rules.push({
    category: 'VERSIONING',
    name: 'Versão do template registrada',
    severity: 'warning',
    status: !service.is_template && !service.template_version_used ? 'failed' : 'passed',
    message: !service.is_template && !service.template_version_used
      ? 'template_version_used deveria estar preenchido'
      : 'OK: Versão do template registrada'
  });

  // 2. VERSIONAMENTO

  // Rule: Templates devem ter versão
  rules.push({
    category: 'VERSIONING',
    name: 'Template versionado',
    severity: 'warning',
    status: service.is_template && !service.version ? 'failed' : 'passed',
    message: service.is_template && !service.version
      ? 'Template deve ter versão definida (ex: v1.0)'
      : 'OK: Template tem versão'
  });

  // 3. DELIVERABLES E CRITÉRIOS

  // Rule: Deliverables devem ter completion_criteria
  if (service.deliverables && service.deliverables.length > 0) {
    const deliverablesWithoutCriteria = service.deliverables.filter(
      d => !d.completion_criteria || d.completion_criteria.length === 0
    );
    
    rules.push({
      category: 'APPROVAL_CRITERIA',
      name: 'Critérios de conclusão',
      severity: 'warning',
      status: deliverablesWithoutCriteria.length > 0 ? 'failed' : 'passed',
      message: deliverablesWithoutCriteria.length > 0
        ? `${deliverablesWithoutCriteria.length} deliverable(s) sem completion_criteria`
        : 'OK: Todos os deliverables têm critérios definidos'
    });
  }

  // Rule: Aprovações devem ter approval_role definido
  if (service.deliverables && service.deliverables.length > 0) {
    const approvalsWithoutRole = service.deliverables.filter(
      d => d.requires_approval && !d.approval_role
    );
    
    rules.push({
      category: 'APPROVAL_CRITERIA',
      name: 'Papel de aprovação definido',
      severity: 'warning',
      status: approvalsWithoutRole.length > 0 ? 'failed' : 'passed',
      message: approvalsWithoutRole.length > 0
        ? `${approvalsWithoutRole.length} deliverable(s) com aprovação sem approval_role`
        : 'OK: Aprovações têm papel definido'
    });
  }

  // 4. CONTRATO E EXECUÇÃO

  // Rule: Templates devem ter pricing padrão
  rules.push({
    category: 'CONTRACT_EXECUTION',
    name: 'Pricing padrão em template',
    severity: 'info',
    status: service.is_template && !service.pricing?.base_price ? 'failed' : 'passed',
    message: service.is_template && !service.pricing?.base_price
      ? 'Template poderia ter pricing padrão definido'
      : 'OK: Pricing definido'
  });

  // Rule: Instâncias ativas devem ter start_date
  rules.push({
    category: 'CONTRACT_EXECUTION',
    name: 'Data de início em instância ativa',
    severity: 'warning',
    status: !service.is_template && service.service_status === 'active' && !service.start_date ? 'failed' : 'passed',
    message: !service.is_template && service.service_status === 'active' && !service.start_date
      ? 'Instância ativa deveria ter start_date definida'
      : 'OK: Data de início definida'
  });

  // 5. METADADOS

  // Rule: Templates devem ter template_metadata
  rules.push({
    category: 'DATA_STRUCTURE',
    name: 'Metadados de template',
    severity: 'info',
    status: service.is_template && !service.template_metadata ? 'failed' : 'passed',
    message: service.is_template && !service.template_metadata
      ? 'Template poderia ter template_metadata para rastreamento'
      : 'OK: Metadados presentes'
  });

  // Rule: Instâncias devem ter instance_metadata
  rules.push({
    category: 'DATA_STRUCTURE',
    name: 'Metadados de instância',
    severity: 'info',
    status: !service.is_template && !service.instance_metadata ? 'failed' : 'passed',
    message: !service.is_template && !service.instance_metadata
      ? 'Instância poderia ter instance_metadata para rastreamento'
      : 'OK: Metadados presentes'
  });

  return rules;
}