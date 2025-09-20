/**
 * 🔄 Substituição das Entidades Base44
 * 
 * Arquivo que substitui as entidades Base44 pelas implementações locais
 * mantendo a mesma interface para compatibilidade
 */

import { migrationManager } from './migration/GradualMigration.js';

// Wrapper para entidades que mantém compatibilidade com Base44
class EntityWrapper {
  constructor(entityType) {
    this.entityType = entityType;
  }

  async create(data) {
    return await migrationManager.createEntity(this.entityType, data);
  }

  async get(id) {
    return await migrationManager.getEntity(this.entityType, id);
  }

  async update(id, data) {
    return await migrationManager.updateEntity(this.entityType, id, data);
  }

  async delete(id) {
    return await migrationManager.deleteEntity(this.entityType, id);
  }

  async list(filters = {}) {
    return await migrationManager.filterEntities(this.entityType, filters);
  }

  async filter(filters) {
    return await migrationManager.filterEntities(this.entityType, filters);
  }
}

// Wrapper para funções
class FunctionWrapper {
  constructor(functionName) {
    this.functionName = functionName;
  }

  async call(params) {
    return await migrationManager.callFunction(this.functionName, params);
  }
}

// Wrapper para integrações
class IntegrationWrapper {
  constructor() {
    this.Core = {
      InvokeLLM: async (prompt, options = {}) => {
        return await migrationManager.callFunction('invokeLLM', { prompt, ...options });
      },
      SendEmail: async (to, subject, body, options = {}) => {
        return await migrationManager.callFunction('sendEmail', { to, subject, body, ...options });
      }
    };
  }
}

// Wrapper para autenticação
class AuthWrapper {
  async login() {
    return await migrationManager.localClient.auth.login();
  }

  async me() {
    return await migrationManager.localClient.auth.me();
  }

  async logout() {
    return await migrationManager.localClient.auth.logout();
  }
}

// Cliente substituto que simula a API Base44
class Base44Replacement {
  constructor() {
    // Entidades
    this.entities = {
      Client: new EntityWrapper('clients'),
      Project: new EntityWrapper('projects'),
      Brief: new EntityWrapper('briefs'),
      Insights: new EntityWrapper('insights'),
      LearningEntry: new EntityWrapper('learning_entries'),
      Scope: new EntityWrapper('scopes'),
      BriefingVersion: new EntityWrapper('briefing_versions'),
      AuditLog: new EntityWrapper('audit_logs'),
      ProjectMember: new EntityWrapper('project_members'),
      Agency: new EntityWrapper('agencies'),
      Invite: new EntityWrapper('invites'),
      Service: new EntityWrapper('services'),
      ScopeItem: new EntityWrapper('scope_items'),
      CyclePlan: new EntityWrapper('cycle_plans'),
      WorkOrder: new EntityWrapper('work_orders'),
      EvolutionEvent: new EntityWrapper('evolution_events'),
      PlaybookItem: new EntityWrapper('playbook_items'),
      Notification: new EntityWrapper('notifications'),
      NotificationPreference: new EntityWrapper('notification_preferences'),
      ServiceRiskState: new EntityWrapper('service_risk_states'),
      Job: new EntityWrapper('jobs'),
      AgentExecution: new EntityWrapper('agent_executions'),
      PublicBriefingToken: new EntityWrapper('public_briefing_tokens'),
      PublicBriefingResponse: new EntityWrapper('public_briefing_responses'),
      BriefingTemplate: new EntityWrapper('briefing_templates'),
      SentimentAnalysis: new EntityWrapper('sentiment_analyses'),
      SmartRecommendation: new EntityWrapper('smart_recommendations'),
      ApprovalRequest: new EntityWrapper('approval_requests'),
      Task: new EntityWrapper('tasks'),
      UserStory: new EntityWrapper('user_stories'),
      UserFeedback: new EntityWrapper('user_feedbacks'),
      SurveyResponse: new EntityWrapper('survey_responses'),
      UserExperienceMetric: new EntityWrapper('user_experience_metrics'),
      ClientDocument: new EntityWrapper('client_documents'),
      FinancialKPI: new EntityWrapper('financial_kpis'),
      SupportLibrary: new EntityWrapper('support_libraries'),
      ProjectTeam: new EntityWrapper('project_teams'),
      NotificationTemplate: new EntityWrapper('notification_templates'),
      NotificationDelivery: new EntityWrapper('notification_deliveries'),
      KPIFormulaDefinition: new EntityWrapper('kpi_formula_definitions'),
      ReportGenerationManifest: new EntityWrapper('report_generation_manifests'),
      IngestEnvelope: new EntityWrapper('ingest_envelopes'),
      ImportJob: new EntityWrapper('import_jobs'),
      ExternalRef: new EntityWrapper('external_refs'),
      DataReview: new EntityWrapper('data_reviews'),
      MappingProfile: new EntityWrapper('mapping_profiles'),
      DocumentExtraction: new EntityWrapper('document_extractions')
    };

    // Funções
    this.functions = {
      simulateHealthAgent: new FunctionWrapper('simulateHealthAgent'),
      generateCyclePlan: new FunctionWrapper('generateCyclePlan'),
      proposeBriefingUpdates: new FunctionWrapper('proposeBriefingUpdates'),
      fixClientAgencyIds: new FunctionWrapper('fixClientAgencyIds'),
      exportLearningsToCSV: new FunctionWrapper('exportLearningsToCSV'),
      validateBriefingResponse: new FunctionWrapper('validateBriefingResponse'),
      generatePublicBriefingToken: new FunctionWrapper('generatePublicBriefingToken'),
      validatePublicBriefingToken: new FunctionWrapper('validatePublicBriefingToken'),
      savePublicBriefingResponse: new FunctionWrapper('savePublicBriefingResponse'),
      sendInvite: new FunctionWrapper('sendInvite'),
      acceptInvite: new FunctionWrapper('acceptInvite'),
      createAgency: new FunctionWrapper('createAgency'),
      analyzeSentiment: new FunctionWrapper('analyzeSentiment'),
      generateSmartRecommendations: new FunctionWrapper('generateSmartRecommendations'),
      executeAgent: new FunctionWrapper('executeAgent'),
      getAgentStatus: new FunctionWrapper('getAgentStatus'),
      approvalWorkflow: new FunctionWrapper('approvalWorkflow'),
      taskNotificationScheduler: new FunctionWrapper('taskNotificationScheduler'),
      extractLearningsFromTasks: new FunctionWrapper('extractLearningsFromTasks'),
      processClientApproval: new FunctionWrapper('processClientApproval'),
      inviteClient: new FunctionWrapper('inviteClient'),
      getClientDashboardData: new FunctionWrapper('getClientDashboardData'),
      generateClientReport: new FunctionWrapper('generateClientReport'),
      testClientApprovalFlow: new FunctionWrapper('testClientApprovalFlow'),
      generateClientReportPDF: new FunctionWrapper('generateClientReportPDF'),
      optimizeClientQueries: new FunctionWrapper('optimizeClientQueries'),
      manageInvites: new FunctionWrapper('manageInvites'),
      fixDashboardStats: new FunctionWrapper('fixDashboardStats'),
      scheduleAgents: new FunctionWrapper('scheduleAgents'),
      manageTeamMembers: new FunctionWrapper('manageTeamMembers'),
      approvedPlanPdf: new FunctionWrapper('approvedPlanPdf'),
      notificationsDigest: new FunctionWrapper('notificationsDigest'),
      e2eSmokeTest: new FunctionWrapper('e2eSmokeTest'),
      prepareE2EDemo: new FunctionWrapper('prepareE2EDemo'),
      runE2EScenario: new FunctionWrapper('runE2EScenario'),
      runApprovalE2E: new FunctionWrapper('runApprovalE2E'),
      runLearningExtractionE2E: new FunctionWrapper('runLearningExtractionE2E'),
      collectUxMetrics: new FunctionWrapper('collectUxMetrics'),
      generateFinancialReportPDF: new FunctionWrapper('generateFinancialReportPDF'),
      generateDiagnosticPDF: new FunctionWrapper('generateDiagnosticPDF'),
      workflowAutomation: new FunctionWrapper('workflowAutomation'),
      onboardUserAutomatically: new FunctionWrapper('onboardUserAutomatically'),
      createFinancialDiagnosisTemplate: new FunctionWrapper('createFinancialDiagnosisTemplate'),
      generateTasksFromService: new FunctionWrapper('generateTasksFromService'),
      createMarginMentoringTemplate: new FunctionWrapper('createMarginMentoringTemplate'),
      createFinancial360Template: new FunctionWrapper('createFinancial360Template'),
      saveDocumentAutomatically: new FunctionWrapper('saveDocumentAutomatically'),
      processDeliverableApproval: new FunctionWrapper('processDeliverableApproval'),
      notificationDispatcher: new FunctionWrapper('notificationDispatcher'),
      secureExport: new FunctionWrapper('secureExport'),
      generateCustomReports: new FunctionWrapper('generateCustomReports'),
      createServiceInstance: new FunctionWrapper('createServiceInstance'),
      validateServiceConsistency: new FunctionWrapper('validateServiceConsistency'),
      markServicesOverdue: new FunctionWrapper('markServicesOverdue'),
      processApprovalEvents: new FunctionWrapper('processApprovalEvents'),
      checkExpiredApprovals: new FunctionWrapper('checkExpiredApprovals'),
      createFinancialBriefingTemplates: new FunctionWrapper('createFinancialBriefingTemplates'),
      createIngestEnvelope: new FunctionWrapper('createIngestEnvelope'),
      processIngestEnvelope: new FunctionWrapper('processIngestEnvelope'),
      createImportJob: new FunctionWrapper('createImportJob'),
      processImportJob: new FunctionWrapper('processImportJob'),
      getImportJobStatus: new FunctionWrapper('getImportJobStatus'),
      extractDataFromUploadedFile: new FunctionWrapper('extractDataFromUploadedFile'),
      processDocumentOCR: new FunctionWrapper('processDocumentOCR'),
      createServiceTemplates: new FunctionWrapper('createServiceTemplates'),
      createDefaultServiceTemplates: new FunctionWrapper('createDefaultServiceTemplates'),
      workflowEngine: new FunctionWrapper('workflowEngine'),
      workflowOrchestrator: new FunctionWrapper('workflowOrchestrator'),
      workflowTriggers: new FunctionWrapper('workflowTriggers'),
      revokePublicBriefingToken: new FunctionWrapper('revokePublicBriefingToken'),
      testBriefingFlow: new FunctionWrapper('testBriefingFlow'),
      calculateKPIs: new FunctionWrapper('calculateKPIs'),
      validateKPIFormula: new FunctionWrapper('validateKPIFormula'),
      updateKPIWithHistory: new FunctionWrapper('updateKPIWithHistory'),
      syncTemplateKPIs: new FunctionWrapper('syncTemplateKPIs'),
      createFinancialKPIFormulas: new FunctionWrapper('createFinancialKPIFormulas'),
      updateServiceTemplatesWithKPIs: new FunctionWrapper('updateServiceTemplatesWithKPIs'),
      kpiAutomationEngine: new FunctionWrapper('kpiAutomationEngine'),
      createFinancialServiceTemplates: new FunctionWrapper('createFinancialServiceTemplates'),
      setClientPassword: new FunctionWrapper('setClientPassword'),
      testBriefingPublicAccess: new FunctionWrapper('testBriefingPublicAccess'),
      goldenPathE2E: new FunctionWrapper('goldenPathE2E'),
      fixServiceAgencyId: new FunctionWrapper('fixServiceAgencyId'),
      fixTemplateAgencyIds: new FunctionWrapper('fixTemplateAgencyIds'),
      fixServiceTemplates: new FunctionWrapper('fixServiceTemplates'),
      debugGetClient: new FunctionWrapper('debugGetClient'),
      generateQATestData: new FunctionWrapper('generateQATestData'),
      runQAStressTest: new FunctionWrapper('runQAStressTest'),
      validateQAConsistency: new FunctionWrapper('validateQAConsistency'),
      getAgencyCategories: new FunctionWrapper('getAgencyCategories'),
      importServiceTemplates: new FunctionWrapper('importServiceTemplates')
    };

    // Integrações
    this.integrations = new IntegrationWrapper();

    // Autenticação
    this.auth = new AuthWrapper();
  }

  // Método para obter estatísticas de migração
  getMigrationStats() {
    return migrationManager.getMigrationStats();
  }

  // Método para alterar modo de migração
  setMigrationMode(mode) {
    migrationManager.setMigrationMode(mode);
  }

  // Método para migrar entidade específica
  async migrateEntity(entityType, id) {
    return await migrationManager.migrateEntity(entityType, id);
  }

  // Método para migrar todas as entidades
  async migrateAll() {
    return await migrationManager.migrateAll();
  }
}

// Exportar instância substituta
export const base44 = new Base44Replacement();

// Exportar entidades individuais para compatibilidade
export const Client = base44.entities.Client;
export const Project = base44.entities.Project;
export const Brief = base44.entities.Brief;
export const Insights = base44.entities.Insights;
export const LearningEntry = base44.entities.LearningEntry;
export const Scope = base44.entities.Scope;
export const BriefingVersion = base44.entities.BriefingVersion;
export const AuditLog = base44.entities.AuditLog;
export const ProjectMember = base44.entities.ProjectMember;
export const Agency = base44.entities.Agency;
export const Invite = base44.entities.Invite;
export const Service = base44.entities.Service;
export const ScopeItem = base44.entities.ScopeItem;
export const CyclePlan = base44.entities.CyclePlan;
export const WorkOrder = base44.entities.WorkOrder;
export const EvolutionEvent = base44.entities.EvolutionEvent;
export const PlaybookItem = base44.entities.PlaybookItem;
export const Notification = base44.entities.Notification;
export const NotificationPreference = base44.entities.NotificationPreference;
export const ServiceRiskState = base44.entities.ServiceRiskState;
export const Job = base44.entities.Job;
export const AgentExecution = base44.entities.AgentExecution;
export const PublicBriefingToken = base44.entities.PublicBriefingToken;
export const PublicBriefingResponse = base44.entities.PublicBriefingResponse;
export const BriefingTemplate = base44.entities.BriefingTemplate;
export const SentimentAnalysis = base44.entities.SentimentAnalysis;
export const SmartRecommendation = base44.entities.SmartRecommendation;
export const ApprovalRequest = base44.entities.ApprovalRequest;
export const Task = base44.entities.Task;
export const UserStory = base44.entities.UserStory;
export const UserFeedback = base44.entities.UserFeedback;
export const SurveyResponse = base44.entities.SurveyResponse;
export const UserExperienceMetric = base44.entities.UserExperienceMetric;
export const ClientDocument = base44.entities.ClientDocument;
export const FinancialKPI = base44.entities.FinancialKPI;
export const SupportLibrary = base44.entities.SupportLibrary;
export const ProjectTeam = base44.entities.ProjectTeam;
export const NotificationTemplate = base44.entities.NotificationTemplate;
export const NotificationDelivery = base44.entities.NotificationDelivery;
export const KPIFormulaDefinition = base44.entities.KPIFormulaDefinition;
export const ReportGenerationManifest = base44.entities.ReportGenerationManifest;
export const IngestEnvelope = base44.entities.IngestEnvelope;
export const ImportJob = base44.entities.ImportJob;
export const ExternalRef = base44.entities.ExternalRef;
export const DataReview = base44.entities.DataReview;
export const MappingProfile = base44.entities.MappingProfile;
export const DocumentExtraction = base44.entities.DocumentExtraction;

// Exportar autenticação
export const User = base44.auth;

// Exportar integrações
export const Core = base44.integrations.Core;
export const InvokeLLM = base44.integrations.Core.InvokeLLM;
export const SendEmail = base44.integrations.Core.SendEmail;

// Exportar funções
export const simulateHealthAgent = base44.functions.simulateHealthAgent;
export const generateCyclePlan = base44.functions.generateCyclePlan;
export const proposeBriefingUpdates = base44.functions.proposeBriefingUpdates;
export const fixClientAgencyIds = base44.functions.fixClientAgencyIds;
export const exportLearningsToCSV = base44.functions.exportLearningsToCSV;
export const validateBriefingResponse = base44.functions.validateBriefingResponse;
export const generatePublicBriefingToken = base44.functions.generatePublicBriefingToken;
export const validatePublicBriefingToken = base44.functions.validatePublicBriefingToken;
export const savePublicBriefingResponse = base44.functions.savePublicBriefingResponse;
export const sendInvite = base44.functions.sendInvite;
export const acceptInvite = base44.functions.acceptInvite;
export const createAgency = base44.functions.createAgency;
export const analyzeSentiment = base44.functions.analyzeSentiment;
export const generateSmartRecommendations = base44.functions.generateSmartRecommendations;
export const executeAgent = base44.functions.executeAgent;
export const getAgentStatus = base44.functions.getAgentStatus;
export const approvalWorkflow = base44.functions.approvalWorkflow;
export const taskNotificationScheduler = base44.functions.taskNotificationScheduler;
export const extractLearningsFromTasks = base44.functions.extractLearningsFromTasks;
export const processClientApproval = base44.functions.processClientApproval;
export const inviteClient = base44.functions.inviteClient;
export const getClientDashboardData = base44.functions.getClientDashboardData;
export const generateClientReport = base44.functions.generateClientReport;
export const testClientApprovalFlow = base44.functions.testClientApprovalFlow;
export const generateClientReportPDF = base44.functions.generateClientReportPDF;
export const optimizeClientQueries = base44.functions.optimizeClientQueries;
export const manageInvites = base44.functions.manageInvites;
export const fixDashboardStats = base44.functions.fixDashboardStats;
export const scheduleAgents = base44.functions.scheduleAgents;
export const manageTeamMembers = base44.functions.manageTeamMembers;
export const approvedPlanPdf = base44.functions.approvedPlanPdf;
export const notificationsDigest = base44.functions.notificationsDigest;
export const e2eSmokeTest = base44.functions.e2eSmokeTest;
export const prepareE2EDemo = base44.functions.prepareE2EDemo;
export const runE2EScenario = base44.functions.runE2EScenario;
export const runApprovalE2E = base44.functions.runApprovalE2E;
export const runLearningExtractionE2E = base44.functions.runLearningExtractionE2E;
export const collectUxMetrics = base44.functions.collectUxMetrics;
export const generateFinancialReportPDF = base44.functions.generateFinancialReportPDF;
export const generateDiagnosticPDF = base44.functions.generateDiagnosticPDF;
export const workflowAutomation = base44.functions.workflowAutomation;
export const onboardUserAutomatically = base44.functions.onboardUserAutomatically;
export const createFinancialDiagnosisTemplate = base44.functions.createFinancialDiagnosisTemplate;
export const generateTasksFromService = base44.functions.generateTasksFromService;
export const createMarginMentoringTemplate = base44.functions.createMarginMentoringTemplate;
export const createFinancial360Template = base44.functions.createFinancial360Template;
export const saveDocumentAutomatically = base44.functions.saveDocumentAutomatically;
export const processDeliverableApproval = base44.functions.processDeliverableApproval;
export const notificationDispatcher = base44.functions.notificationDispatcher;
export const secureExport = base44.functions.secureExport;
export const generateCustomReports = base44.functions.generateCustomReports;
export const createServiceInstance = base44.functions.createServiceInstance;
export const validateServiceConsistency = base44.functions.validateServiceConsistency;
export const markServicesOverdue = base44.functions.markServicesOverdue;
export const processApprovalEvents = base44.functions.processApprovalEvents;
export const checkExpiredApprovals = base44.functions.checkExpiredApprovals;
export const createFinancialBriefingTemplates = base44.functions.createFinancialBriefingTemplates;
export const createIngestEnvelope = base44.functions.createIngestEnvelope;
export const processIngestEnvelope = base44.functions.processIngestEnvelope;
export const createImportJob = base44.functions.createImportJob;
export const processImportJob = base44.functions.processImportJob;
export const getImportJobStatus = base44.functions.getImportJobStatus;
export const extractDataFromUploadedFile = base44.functions.extractDataFromUploadedFile;
export const processDocumentOCR = base44.functions.processDocumentOCR;
export const createServiceTemplates = base44.functions.createServiceTemplates;
export const createDefaultServiceTemplates = base44.functions.createDefaultServiceTemplates;
export const workflowEngine = base44.functions.workflowEngine;
export const workflowOrchestrator = base44.functions.workflowOrchestrator;
export const workflowTriggers = base44.functions.workflowTriggers;
export const revokePublicBriefingToken = base44.functions.revokePublicBriefingToken;
export const testBriefingFlow = base44.functions.testBriefingFlow;
export const calculateKPIs = base44.functions.calculateKPIs;
export const validateKPIFormula = base44.functions.validateKPIFormula;
export const updateKPIWithHistory = base44.functions.updateKPIWithHistory;
export const syncTemplateKPIs = base44.functions.syncTemplateKPIs;
export const createFinancialKPIFormulas = base44.functions.createFinancialKPIFormulas;
export const updateServiceTemplatesWithKPIs = base44.functions.updateServiceTemplatesWithKPIs;
export const kpiAutomationEngine = base44.functions.kpiAutomationEngine;
export const createFinancialServiceTemplates = base44.functions.createFinancialServiceTemplates;
export const setClientPassword = base44.functions.setClientPassword;
export const testBriefingPublicAccess = base44.functions.testBriefingPublicAccess;
export const goldenPathE2E = base44.functions.goldenPathE2E;
export const fixServiceAgencyId = base44.functions.fixServiceAgencyId;
export const fixTemplateAgencyIds = base44.functions.fixTemplateAgencyIds;
export const fixServiceTemplates = base44.functions.fixServiceTemplates;
export const debugGetClient = base44.functions.debugGetClient;
export const generateQATestData = base44.functions.generateQATestData;
export const runQAStressTest = base44.functions.runQAStressTest;
export const validateQAConsistency = base44.functions.validateQAConsistency;
export const getAgencyCategories = base44.functions.getAgencyCategories;
export const importServiceTemplates = base44.functions.importServiceTemplates;

