import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, AlertTriangle, XCircle, Info, 
  Database, GitBranch, Shield, Clock 
} from 'lucide-react';
import { validateServiceConsistency } from '@/api/functions';

const VALIDATION_CATEGORIES = {
  DATA_STRUCTURE: 'Estrutura de Dados',
  CREATION_FLOW: 'Fluxo de Criação',
  VERSIONING: 'Versionamento',
  APPROVAL_CRITERIA: 'Critérios e Aprovação',
  CONTRACT_EXECUTION: 'Contrato e Execução',
  UX_USABILITY: 'Usabilidade (UX)',
  SECURITY_AUDIT: 'Segurança e Auditoria'
};

const VALIDATION_RULES = [
  // 1. Estrutura de Dados
  {
    category: 'DATA_STRUCTURE',
    id: 'template_no_client',
    name: 'Templates não devem ter clientId',
    description: 'Service.is_template=true deve ter clientId=null',
    severity: 'error'
  },
  {
    category: 'DATA_STRUCTURE',
    id: 'instance_requires_client',
    name: 'Instâncias devem ter clientId',
    description: 'Service.is_template=false deve ter clientId obrigatório',
    severity: 'error'
  },
  {
    category: 'DATA_STRUCTURE',
    id: 'instance_has_base_service',
    name: 'Instâncias devem referenciar template',
    description: 'Service.base_service_id sempre presente em instâncias',
    severity: 'error'
  },
  {
    category: 'DATA_STRUCTURE',
    id: 'template_version_recorded',
    name: 'Versão do template registrada',
    description: 'Service.template_version_used preenchido em instâncias',
    severity: 'warning'
  },
  {
    category: 'DATA_STRUCTURE',
    id: 'deliverable_execution_fields',
    name: 'Campos de execução em deliverables',
    description: 'status, actual_start_date, assigned_team separados dos descritivos',
    severity: 'info'
  },

  // 2. Fluxo de Criação
  {
    category: 'CREATION_FLOW',
    id: 'template_creation_location',
    name: 'Templates criados no catálogo',
    description: 'Criação de template só na página /services',
    severity: 'info'
  },
  {
    category: 'CREATION_FLOW',
    id: 'instance_creation_location',
    name: 'Instâncias criadas no cliente',
    description: 'Criação de instância só na página /client/:id',
    severity: 'info'
  },
  {
    category: 'CREATION_FLOW',
    id: 'wizard_completeness',
    name: 'Wizard completo implementado',
    description: 'Seleção + Configuração + Preview funcionais',
    severity: 'info'
  },
  {
    category: 'CREATION_FLOW',
    id: 'deliverables_copied',
    name: 'Fases/tarefas copiadas na instanciação',
    description: 'Todas as fases do template copiadas para instância',
    severity: 'error'
  },

  // 3. Versionamento
  {
    category: 'VERSIONING',
    id: 'version_increment_required',
    name: 'Incremento de versão obrigatório',
    description: 'Mudanças em template exigem incremento de version',
    severity: 'warning'
  },
  {
    category: 'VERSIONING',
    id: 'template_version_immutable',
    name: 'Versão imutável em instâncias',
    description: 'template_version_used não alterável em instâncias',
    severity: 'error'
  },
  {
    category: 'VERSIONING',
    id: 'independence_warning',
    name: 'Aviso de independência',
    description: 'Alert: mudanças no template não afetam instância',
    severity: 'info'
  },

  // 4. Critérios e Aprovação
  {
    category: 'APPROVAL_CRITERIA',
    id: 'completion_criteria_defined',
    name: 'Critérios de conclusão definidos',
    description: 'completion_criteria em cada deliverable',
    severity: 'warning'
  },
  {
    category: 'APPROVAL_CRITERIA',
    id: 'approval_flow_integrated',
    name: 'Fluxo de aprovação integrado',
    description: 'requires_approval dispara ApprovalRequest',
    severity: 'error'
  },
  {
    category: 'APPROVAL_CRITERIA',
    id: 'approval_audit_logged',
    name: 'Aprovações auditadas',
    description: 'Aprovação/Reprovação registrada em AuditLog',
    severity: 'error'
  },

  // 5. Contrato e Execução
  {
    category: 'CONTRACT_EXECUTION',
    id: 'template_defaults_defined',
    name: 'Valores padrão em templates',
    description: 'pricing, cycle_frequency definidos em templates',
    severity: 'info'
  },
  {
    category: 'CONTRACT_EXECUTION',
    id: 'instance_values_copied',
    name: 'Valores copiados para instâncias',
    description: 'contract_value, billing_cycle copiados do template',
    severity: 'info'
  },
  {
    category: 'CONTRACT_EXECUTION',
    id: 'customizations_tracked',
    name: 'Customizações rastreadas',
    description: 'customizations field registra mudanças manuais',
    severity: 'warning'
  },

  // 6. Usabilidade
  {
    category: 'UX_USABILITY',
    id: 'catalog_template_only',
    name: 'Catálogo mostra só templates',
    description: '/services exibe somente templates',
    severity: 'info'
  },
  {
    category: 'UX_USABILITY',
    id: 'client_instance_only',
    name: 'Cliente mostra só instâncias',
    description: 'Página do cliente exibe somente instâncias',
    severity: 'info'
  },
  {
    category: 'UX_USABILITY',
    id: 'clear_buttons',
    name: 'Botões específicos por contexto',
    description: 'Novo Template vs Adicionar Serviço ao Cliente',
    severity: 'info'
  },

  // 7. Segurança e Auditoria
  {
    category: 'SECURITY_AUDIT',
    id: 'rls_implemented',
    name: 'RLS implementado',
    description: 'Row Level Security garante acesso correto',
    severity: 'error'
  },
  {
    category: 'SECURITY_AUDIT',
    id: 'audit_coverage',
    name: 'Cobertura de auditoria',
    description: 'AuditLog cobre todas as operações críticas',
    severity: 'error'
  },
  {
    category: 'SECURITY_AUDIT',
    id: 'document_versioning',
    name: 'Versionamento de documentos',
    description: 'ClientDocument com controle de versão',
    severity: 'warning'
  }
];

export default function ServiceValidator({ onValidate }) {
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const runValidation = async () => {
    setIsValidating(true);
    
    try {
      // Call validation function
      const results = await validateServiceConsistency({ fix: false });
      
      // Process results into our validation format
      const processedResults = VALIDATION_RULES.map(rule => ({
        ...rule,
        status: determineRuleStatus(rule, results),
        details: getRuleDetails(rule, results)
      }));

      setValidationResults({
        rules: processedResults,
        summary: generateSummary(processedResults),
        systemData: results
      });

      onValidate?.(processedResults);
    } catch (error) {
      console.error('Erro na validação:', error);
      setValidationResults({
        error: error.message,
        rules: [],
        summary: { passed: 0, failed: 0, warnings: 0, total: VALIDATION_RULES.length }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const determineRuleStatus = (rule, systemResults) => {
    // Logic to determine if each rule passes based on system results
    switch (rule.id) {
      case 'template_no_client':
        return systemResults.issues?.some(i => 
          i.issues?.some(issue => issue.rule === 'template_no_client')
        ) ? 'failed' : 'passed';
        
      case 'instance_requires_client':
        return systemResults.issues?.some(i => 
          i.issues?.some(issue => issue.rule === 'instance_requires_client')
        ) ? 'failed' : 'passed';
        
      case 'instance_has_base_service':
        return systemResults.orphaned_instances?.length > 0 ? 'failed' : 'passed';
        
      // Add more specific validations as needed
      default:
        return 'info'; // Default to info for rules not yet implemented
    }
  };

  const getRuleDetails = (rule, systemResults) => {
    switch (rule.id) {
      case 'template_no_client':
        const templateClientIssues = systemResults.issues?.filter(i => 
          i.type === 'template' && i.issues?.some(issue => issue.rule === 'template_no_client')
        );
        return templateClientIssues?.length ? 
          `${templateClientIssues.length} template(s) com clientId indevido` : 
          'Todos os templates estão corretos';
          
      case 'instance_requires_client':
        const instanceClientIssues = systemResults.issues?.filter(i => 
          i.type === 'instance' && i.issues?.some(issue => issue.rule === 'instance_requires_client')
        );
        return instanceClientIssues?.length ? 
          `${instanceClientIssues.length} instância(s) sem clientId` : 
          'Todas as instâncias têm clientId';
          
      case 'instance_has_base_service':
        return systemResults.orphaned_instances?.length ? 
          `${systemResults.orphaned_instances.length} instância(s) órfã(s)` : 
          'Todas as instâncias referenciam templates válidos';
          
      default:
        return 'Validação não implementada ainda';
    }
  };

  const generateSummary = (results) => {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const info = results.filter(r => r.status === 'info').length;
    
    return { passed, failed, warnings, info, total: results.length };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Info className="w-4 h-4 text-blue-600" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'border-green-200 bg-green-50';
      case 'failed': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const filteredResults = validationResults?.rules?.filter(rule => 
    selectedCategory === 'ALL' || rule.category === selectedCategory
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Validador de Serviços & Templates
          </CardTitle>
          <p className="text-sm text-gray-600">
            Verificação abrangente da conformidade com as regras de negócio
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">Todas as Categorias</option>
                {Object.entries(VALIDATION_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <Button onClick={runValidation} disabled={isValidating}>
              {isValidating ? 'Validando...' : 'Executar Validação'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo da Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.summary.passed}
                </div>
                <div className="text-sm text-gray-600">Aprovados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationResults.summary.failed}
                </div>
                <div className="text-sm text-gray-600">Falhas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResults.summary.warnings}
                </div>
                <div className="text-sm text-gray-600">Avisos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.summary.info}
                </div>
                <div className="text-sm text-gray-600">Info</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {validationResults.summary.total}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResults && (
        <div className="space-y-4">
          {Object.entries(VALIDATION_CATEGORIES).map(([categoryKey, categoryLabel]) => {
            const categoryRules = filteredResults.filter(r => 
              selectedCategory === 'ALL' ? r.category === categoryKey : true
            );
            
            if (categoryRules.length === 0 && selectedCategory !== categoryKey && selectedCategory !== 'ALL') {
              return null;
            }

            return (
              <Card key={categoryKey}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {categoryKey === 'DATA_STRUCTURE' && <Database className="w-5 h-5" />}
                    {categoryKey === 'VERSIONING' && <GitBranch className="w-5 h-5" />}
                    {categoryKey === 'SECURITY_AUDIT' && <Shield className="w-5 h-5" />}
                    {!['DATA_STRUCTURE', 'VERSIONING', 'SECURITY_AUDIT'].includes(categoryKey) && <Info className="w-5 h-5" />}
                    {categoryLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-lg border ${getStatusColor(rule.status)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(rule.status)}
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.severity === 'error' ? 'destructive' : 'outline'}>
                            {rule.severity}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      {rule.details && (
                        <div className="text-xs text-gray-500 bg-white bg-opacity-50 p-2 rounded">
                          {rule.details}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Error State */}
      {validationResults?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro durante a validação: {validationResults.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}