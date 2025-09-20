import { base44 } from './base44Client';

/**
 * Função para criar cliente com usuário em uma única operação
 */
export async function createClientWithUser(clientData, userData) {
  try {
    // Criar cliente primeiro
    const client = await base44.entities.Client.create(clientData);
    
    // Criar usuário cliente
    const user = await base44.auth.create({
      ...userData,
      clientId: client.id,
      role: 'client'
    });
    
    return {
      client,
      user,
      success: true
    };
  } catch (error) {
    console.error('Erro ao criar cliente com usuário:', error);
    throw error;
  }
}

/**
 * Função para verificar disponibilidade de email
 */
export async function checkEmailAvailability(email, agencyId) {
  try {
    const users = await base44.auth.filter({
      email: email.toLowerCase().trim(),
      agencyId: agencyId
    });
    
    return users.length === 0;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do email:', error);
    return false;
  }
}

/**
 * Função para gerar senha temporária segura
 */
export function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Garantir pelo menos um de cada tipo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Maiúscula
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Número
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Símbolo
  
  // Adicionar caracteres aleatórios para completar 12 caracteres
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Embaralhar a senha
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Função para enviar email de boas-vindas
 */
export async function sendWelcomeEmail(userData, clientData, temporaryPassword = null) {
  try {
    const { sendEmail } = await import('@/api/functions');
    
    const emailData = {
      to: userData.email,
      subject: `Bem-vindo ao portal da ${clientData.name}`,
      template: 'client_welcome',
      data: {
        clientName: clientData.name,
        userName: userData.name,
        loginEmail: userData.email,
        temporaryPassword: temporaryPassword,
        hasTemporaryPassword: !!temporaryPassword,
        portalUrl: `${window.location.origin}/client-login`,
        supportEmail: 'suporte@agencia.com'
      }
    };
    
    await sendEmail(emailData);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return false;
  }
}

/**
 * Função para criar usuário cliente com validações
 */
export async function createClientUser(userData, clientId, agencyId) {
  try {
    // Validar dados
    if (!userData.email || !userData.name) {
      throw new Error('Email e nome são obrigatórios');
    }
    
    // Verificar disponibilidade do email
    const emailAvailable = await checkEmailAvailability(userData.email, agencyId);
    if (!emailAvailable) {
      throw new Error('Este email já está em uso');
    }
    
    // Gerar senha temporária se não fornecida
    const password = userData.password || generateTemporaryPassword();
    
    // Criar usuário
    const user = await base44.auth.create({
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      password: password,
      role: 'client',
      agencyId: agencyId,
      clientId: clientId,
      status: 'active',
      isTemporaryPassword: !userData.password,
      createdBy: userData.createdBy,
      createdAt: new Date().toISOString()
    });
    
    return {
      user,
      temporaryPassword: !userData.password ? password : null,
      hasTemporaryPassword: !userData.password
    };
  } catch (error) {
    console.error('Erro ao criar usuário cliente:', error);
    throw error;
  }
}

// Exportar entidades existentes
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

// auth sdk:
export const User = base44.auth;

