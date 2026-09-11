import { getAccount, getTablesDB, getTeams, DATABASE_ID, ID, Permission, Role } from '@/api/appwriteClient';
import { createEntityAdapter } from './entityAdapter';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';

function notMigrated(name) {
  const fn = async () => {
    throw new Error(`Function ${name} not migrated yet`);
  };
  return fn;
}

export async function createAgency({
  agencyName,
  ownerName,
  ownerEmail,
  contactPhone,
  password,
} = {}) {
  if (!agencyName || !ownerEmail || !password) {
    throw new Error('Nome da agência, email e senha são obrigatórios');
  }

  const account = getAccount();
  const teams = getTeams();
  const tables = getTablesDB();
  const agencyId = ID.unique();
  const userId = ID.unique();

  await account.create({
    userId,
    email: ownerEmail,
    password,
    name: ownerName || agencyName,
  });

  await account.createEmailPasswordSession({
    email: ownerEmail,
    password,
  });

  await teams.create({
    teamId: agencyId,
    name: agencyName,
  });

  const teamPerms = [
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];

  await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: 'agencies',
    rowId: agencyId,
    data: {
      agencyName,
      name: agencyName,
      contactPhone: contactPhone || '',
      ownerEmail,
      status: 'active',
    },
    permissions: teamPerms,
  });

  await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: 'profiles',
    rowId: userId,
    data: {
      agencyId,
      role: 'owner',
      clientId: '',
      name: ownerName || ownerEmail,
      email: ownerEmail,
      full_name: ownerName || ownerEmail,
      status: 'active',
    },
    permissions: [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      ...teamPerms,
    ],
  });

  return {
    success: true,
    agencyId,
    userId,
    data: { agencyId, userId, agencyName },
  };
}

export async function createServiceInstance({
  templateId,
  clientId,
  customizations = {},
  startDate,
  contractValue,
  templateName,
} = {}) {
  if (!templateId) throw new Error('templateId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');

  const Service = createEntityAdapter('services');
  const Client = createEntityAdapter('clients');

  const template = await Service.get(templateId);
  if (!template?.id) throw new Error('Template não encontrado');

  const client = await Client.get(clientId);
  if (!client?.id) throw new Error('Cliente não encontrado');

  const {
    id: _id,
    created_date: _created,
    updated_date: _updated,
    is_template: _isTemplate,
    clientId: _templateClientId,
    ...templateData
  } = template;

  const mergedCustom = {
    ...customizations,
    ...(startDate ? { start_date: String(startDate).slice(0, 10) } : {}),
    ...(contractValue != null && contractValue !== ''
      ? { contract_value: Number(contractValue) }
      : {}),
    ...(templateName ? { name: templateName } : {}),
  };

  const deliverables = normalizeDeliverableTaskShapes(
    mergedCustom.deliverables || templateData.deliverables || []
  );

  const instance = await Service.create({
    ...templateData,
    ...mergedCustom,
    deliverables,
    is_template: false,
    is_active: true,
    clientId,
    agencyId: template.agencyId || client.agencyId,
    base_service_id: templateId,
    templateId,
    template_version_used: template.template_version || template.version || '1.0',
    name: mergedCustom.name || template.name,
    status: mergedCustom.status || 'active',
    service_status: mergedCustom.service_status || 'setup',
  });

  if (!instance?.id) {
    throw new Error('Falha ao criar a instância do serviço');
  }

  // Shape compatível com callers legados (Base44: { data: { success, serviceInstance } })
  // e com callers novos (serviceInstance / success no topo).
  return {
    success: true,
    serviceInstance: instance,
    data: {
      success: true,
      serviceInstance: instance,
      id: instance.id,
    },
  };
}

export const simulateHealthAgent = notMigrated('simulateHealthAgent');
export const generateCyclePlan = notMigrated('generateCyclePlan');
export const proposeBriefingUpdates = notMigrated('proposeBriefingUpdates');
export const fixClientAgencyIds = notMigrated('fixClientAgencyIds');
export const exportLearningsToCSV = notMigrated('exportLearningsToCSV');
export const validateBriefingResponse = notMigrated('validateBriefingResponse');

export {
  generatePublicBriefingToken,
  validatePublicBriefingToken,
  savePublicBriefingResponse,
  revokePublicBriefingToken,
  syncClientFromPublicBriefing,
} from '../functions/publicBriefing.js';

export {
  sendInvite,
  acceptInvite,
  manageInvites,
} from '../functions/teamInvites.js';
export const analyzeSentiment = notMigrated('analyzeSentiment');
export const generateSmartRecommendations = notMigrated('generateSmartRecommendations');
export const executeAgent = notMigrated('executeAgent');
export const getAgentStatus = notMigrated('getAgentStatus');
export {
  approvalWorkflow,
  processClientApproval,
} from '../functions/approvalWorkflow.js';
export const taskNotificationScheduler = notMigrated('taskNotificationScheduler');
export const extractLearningsFromTasks = notMigrated('extractLearningsFromTasks');
export const inviteClient = notMigrated('inviteClient');

/** Compat: dashboard antigo → overview do portal seguro */
export async function getClientDashboardData() {
  const { getClientPortalOverview } = await import('@/lib/clientPortalApi');
  const data = await getClientPortalOverview();
  return {
    data: {
      success: true,
      ...data,
      approvals: { pending: data.pendingApprovals || [] },
      documents: data.documents || [],
      services: data.services || [],
      stats: data.stats || {},
      client: data.client || null,
    },
  };
}
export const generateClientReport = notMigrated('generateClientReport');
export const testClientApprovalFlow = notMigrated('testClientApprovalFlow');
export const generateClientReportPDF = notMigrated('generateClientReportPDF');
export const optimizeClientQueries = notMigrated('optimizeClientQueries');
export const fixDashboardStats = notMigrated('fixDashboardStats');
export const scheduleAgents = notMigrated('scheduleAgents');
export const manageTeamMembers = notMigrated('manageTeamMembers');
export const approvedPlanPdf = notMigrated('approvedPlanPdf');
export const notificationsDigest = notMigrated('notificationsDigest');
export const e2eSmokeTest = notMigrated('e2eSmokeTest');
export const prepareE2EDemo = notMigrated('prepareE2EDemo');
export const runE2EScenario = notMigrated('runE2EScenario');
export const runApprovalE2E = notMigrated('runApprovalE2E');
export const runLearningExtractionE2E = notMigrated('runLearningExtractionE2E');
export const collectUxMetrics = notMigrated('collectUxMetrics');
export const generateFinancialReportPDF = notMigrated('generateFinancialReportPDF');
export const generateDiagnosticPDF = notMigrated('generateDiagnosticPDF');
export const workflowAutomation = notMigrated('workflowAutomation');
export const onboardUserAutomatically = notMigrated('onboardUserAutomatically');
export const createFinancialDiagnosisTemplate = notMigrated('createFinancialDiagnosisTemplate');
export const generateTasksFromService = notMigrated('generateTasksFromService');
export const createMarginMentoringTemplate = notMigrated('createMarginMentoringTemplate');
export const createFinancial360Template = notMigrated('createFinancial360Template');
export const saveDocumentAutomatically = notMigrated('saveDocumentAutomatically');
export const processDeliverableApproval = notMigrated('processDeliverableApproval');
export const notificationDispatcher = notMigrated('notificationDispatcher');
export const secureExport = notMigrated('secureExport');
export const generateCustomReports = notMigrated('generateCustomReports');
export const validateServiceConsistency = notMigrated('validateServiceConsistency');
export const markServicesOverdue = notMigrated('markServicesOverdue');
export const processApprovalEvents = notMigrated('processApprovalEvents');
export const checkExpiredApprovals = notMigrated('checkExpiredApprovals');
export const createFinancialBriefingTemplates = notMigrated('createFinancialBriefingTemplates');
export const createIngestEnvelope = notMigrated('createIngestEnvelope');
export const processIngestEnvelope = notMigrated('processIngestEnvelope');
export const createImportJob = notMigrated('createImportJob');
export const processImportJob = notMigrated('processImportJob');
export const getImportJobStatus = notMigrated('getImportJobStatus');
export const extractDataFromUploadedFile = notMigrated('extractDataFromUploadedFile');
export const processDocumentOCR = notMigrated('processDocumentOCR');
export const createServiceTemplates = notMigrated('createServiceTemplates');
export const createDefaultServiceTemplates = notMigrated('createDefaultServiceTemplates');
export const workflowEngine = notMigrated('workflowEngine');
export const workflowOrchestrator = notMigrated('workflowOrchestrator');
export const workflowTriggers = notMigrated('workflowTriggers');
export const testBriefingFlow = notMigrated('testBriefingFlow');
export const calculateKPIs = notMigrated('calculateKPIs');
export const validateKPIFormula = notMigrated('validateKPIFormula');
export const updateKPIWithHistory = notMigrated('updateKPIWithHistory');
export const syncTemplateKPIs = notMigrated('syncTemplateKPIs');
export const createFinancialKPIFormulas = notMigrated('createFinancialKPIFormulas');
export const updateServiceTemplatesWithKPIs = notMigrated('updateServiceTemplatesWithKPIs');
export const kpiAutomationEngine = notMigrated('kpiAutomationEngine');
export const createFinancialServiceTemplates = notMigrated('createFinancialServiceTemplates');
export const setClientPassword = notMigrated('setClientPassword');
export const testBriefingPublicAccess = notMigrated('testBriefingPublicAccess');
export const goldenPathE2E = notMigrated('goldenPathE2E');
export const fixServiceAgencyId = notMigrated('fixServiceAgencyId');
export const fixTemplateAgencyIds = notMigrated('fixTemplateAgencyIds');
export const fixServiceTemplates = notMigrated('fixServiceTemplates');
export const debugGetClient = notMigrated('debugGetClient');
export const generateQATestData = notMigrated('generateQATestData');
export const runQAStressTest = notMigrated('runQAStressTest');
export const validateQAConsistency = notMigrated('validateQAConsistency');
export const getAgencyCategories = notMigrated('getAgencyCategories');
export const importServiceTemplates = notMigrated('importServiceTemplates');
