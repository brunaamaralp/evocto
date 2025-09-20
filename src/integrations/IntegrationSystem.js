import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Integrações Externas
 * Implementa integração com CRM, ERP e outras ferramentas
 */
export class IntegrationSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.integrations = new Map();
    this.connections = new Map();
    this.webhooks = new Map();
    this.syncJobs = new Map();
    this.mappings = new Map();
    this.credentials = new Map();
    this.syncInterval = options.syncInterval || 300000; // 5 minutos
    
    this.initializeIntegrations();
    this.startSyncJobs();
  }

  /**
   * Inicializa integrações disponíveis
   */
  initializeIntegrations() {
    // Integração com Salesforce CRM
    this.integrations.set('salesforce', {
      id: 'salesforce',
      name: 'Salesforce CRM',
      type: 'crm',
      description: 'Integração com Salesforce para sincronização de clientes e oportunidades',
      icon: 'salesforce',
      color: '#00a1e0',
      status: 'available',
      features: [
        'Sincronização de clientes',
        'Sincronização de oportunidades',
        'Sincronização de contatos',
        'Webhooks de eventos'
      ],
      auth: {
        type: 'oauth2',
        endpoints: {
          authorize: 'https://login.salesforce.com/services/oauth2/authorize',
          token: 'https://login.salesforce.com/services/oauth2/token',
          revoke: 'https://login.salesforce.com/services/oauth2/revoke'
        },
        scopes: ['api', 'refresh_token']
      },
      api: {
        baseUrl: 'https://api.salesforce.com',
        version: 'v58.0',
        rateLimit: 15000 // requests per hour
      },
      mappings: {
        client: {
          name: 'Name',
          email: 'Email',
          phone: 'Phone',
          company: 'Company',
          industry: 'Industry',
          revenue: 'AnnualRevenue',
          employees: 'NumberOfEmployees'
        },
        opportunity: {
          name: 'Name',
          amount: 'Amount',
          stage: 'StageName',
          probability: 'Probability',
          closeDate: 'CloseDate',
          clientId: 'AccountId'
        }
      }
    });

    // Integração com HubSpot CRM
    this.integrations.set('hubspot', {
      id: 'hubspot',
      name: 'HubSpot CRM',
      type: 'crm',
      description: 'Integração com HubSpot para sincronização de clientes e pipelines',
      icon: 'hubspot',
      color: '#ff7a59',
      status: 'available',
      features: [
        'Sincronização de clientes',
        'Sincronização de pipelines',
        'Sincronização de contatos',
        'Sincronização de empresas'
      ],
      auth: {
        type: 'api_key',
        endpoints: {
          base: 'https://api.hubapi.com'
        }
      },
      api: {
        baseUrl: 'https://api.hubapi.com',
        version: 'v3',
        rateLimit: 10000
      },
      mappings: {
        client: {
          name: 'firstname',
          email: 'email',
          phone: 'phone',
          company: 'company',
          industry: 'industry',
          revenue: 'annualrevenue',
          employees: 'numberofemployees'
        },
        deal: {
          name: 'dealname',
          amount: 'amount',
          stage: 'dealstage',
          probability: 'probability',
          closeDate: 'closedate',
          clientId: 'associatedcompany'
        }
      }
    });

    // Integração com SAP ERP
    this.integrations.set('sap', {
      id: 'sap',
      name: 'SAP ERP',
      type: 'erp',
      description: 'Integração com SAP para sincronização de dados financeiros e operacionais',
      icon: 'sap',
      color: '#0070f3',
      status: 'available',
      features: [
        'Sincronização de dados financeiros',
        'Sincronização de produtos',
        'Sincronização de fornecedores',
        'Sincronização de ordens'
      ],
      auth: {
        type: 'basic',
        endpoints: {
          base: 'https://api.sap.com'
        }
      },
      api: {
        baseUrl: 'https://api.sap.com',
        version: 'v1',
        rateLimit: 5000
      },
      mappings: {
        financial: {
          revenue: 'revenue',
          expenses: 'expenses',
          profit: 'profit',
          margin: 'margin'
        },
        product: {
          name: 'product_name',
          sku: 'product_sku',
          price: 'price',
          cost: 'cost',
          category: 'category'
        }
      }
    });

    // Integração com Microsoft Dynamics
    this.integrations.set('dynamics', {
      id: 'dynamics',
      name: 'Microsoft Dynamics',
      type: 'erp',
      description: 'Integração com Microsoft Dynamics para sincronização de dados empresariais',
      icon: 'dynamics',
      color: '#0078d4',
      status: 'available',
      features: [
        'Sincronização de clientes',
        'Sincronização de produtos',
        'Sincronização de vendas',
        'Sincronização de inventário'
      ],
      auth: {
        type: 'oauth2',
        endpoints: {
          authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
        },
        scopes: ['https://graph.microsoft.com/.default']
      },
      api: {
        baseUrl: 'https://graph.microsoft.com',
        version: 'v1.0',
        rateLimit: 10000
      },
      mappings: {
        client: {
          name: 'displayName',
          email: 'mail',
          phone: 'businessPhones',
          company: 'companyName',
          industry: 'industry'
        },
        product: {
          name: 'displayName',
          sku: 'sku',
          price: 'price',
          cost: 'cost'
        }
      }
    });

    // Integração com Slack
    this.integrations.set('slack', {
      id: 'slack',
      name: 'Slack',
      type: 'communication',
      description: 'Integração com Slack para notificações e comunicação',
      icon: 'slack',
      color: '#4a154b',
      status: 'available',
      features: [
        'Notificações de eventos',
        'Relatórios automáticos',
        'Comandos de bot',
        'Webhooks de eventos'
      ],
      auth: {
        type: 'oauth2',
        endpoints: {
          authorize: 'https://slack.com/oauth/v2/authorize',
          token: 'https://slack.com/api/oauth.v2.access'
        },
        scopes: ['chat:write', 'channels:read', 'groups:read']
      },
      api: {
        baseUrl: 'https://slack.com/api',
        version: 'v2',
        rateLimit: 1000
      }
    });

    // Integração com Zapier
    this.integrations.set('zapier', {
      id: 'zapier',
      name: 'Zapier',
      type: 'automation',
      description: 'Integração com Zapier para automação de workflows',
      icon: 'zapier',
      color: '#ff4a00',
      status: 'available',
      features: [
        'Automação de workflows',
        'Triggers personalizados',
        'Ações automáticas',
        'Integração com 5000+ apps'
      ],
      auth: {
        type: 'api_key',
        endpoints: {
          base: 'https://hooks.zapier.com'
        }
      },
      api: {
        baseUrl: 'https://hooks.zapier.com',
        version: 'v1',
        rateLimit: 1000
      }
    });
  }

  /**
   * Conecta integração
   */
  async connectIntegration(integrationId, credentials) {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integração não encontrada: ${integrationId}`);
    }

    try {
      // Validar credenciais
      const validation = await this.validateCredentials(integration, credentials);
      if (!validation.valid) {
        throw new Error(`Credenciais inválidas: ${validation.error}`);
      }

      // Armazenar credenciais
      const connectionId = uuidv4();
      const connection = {
        id: connectionId,
        integrationId,
        integrationName: integration.name,
        credentials: this.encryptCredentials(credentials),
        status: 'connected',
        connectedAt: Date.now(),
        lastSync: null,
        syncCount: 0,
        errorCount: 0
      };

      this.connections.set(connectionId, connection);
      this.credentials.set(connectionId, credentials);

      // Testar conexão
      await this.testConnection(connectionId);

      this.emit('integration_connected', { connection });
      
      return connectionId;
    } catch (error) {
      console.error(`[IntegrationSystem] Erro ao conectar integração ${integrationId}:`, error);
      throw error;
    }
  }

  /**
   * Valida credenciais
   */
  async validateCredentials(integration, credentials) {
    try {
      switch (integration.auth.type) {
        case 'oauth2':
          return await this.validateOAuth2Credentials(integration, credentials);
        case 'api_key':
          return await this.validateAPIKeyCredentials(integration, credentials);
        case 'basic':
          return await this.validateBasicCredentials(integration, credentials);
        default:
          return { valid: false, error: 'Tipo de autenticação não suportado' };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Valida credenciais OAuth2
   */
  async validateOAuth2Credentials(integration, credentials) {
    // Simular validação OAuth2
    if (!credentials.access_token) {
      return { valid: false, error: 'Access token não fornecido' };
    }

    // Simular chamada para validar token
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { valid: true };
  }

  /**
   * Valida credenciais API Key
   */
  async validateAPIKeyCredentials(integration, credentials) {
    if (!credentials.api_key) {
      return { valid: false, error: 'API key não fornecida' };
    }

    // Simular validação de API key
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { valid: true };
  }

  /**
   * Valida credenciais Basic
   */
  async validateBasicCredentials(integration, credentials) {
    if (!credentials.username || !credentials.password) {
      return { valid: false, error: 'Username e password são obrigatórios' };
    }

    // Simular validação básica
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { valid: true };
  }

  /**
   * Testa conexão
   */
  async testConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Conexão não encontrada: ${connectionId}`);
    }

    const integration = this.integrations.get(connection.integrationId);
    const credentials = this.credentials.get(connectionId);

    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      connection.status = 'connected';
      connection.lastTest = Date.now();
      
      this.connections.set(connectionId, connection);
      
      this.emit('connection_tested', { connectionId, status: 'success' });
    } catch (error) {
      connection.status = 'error';
      connection.errorCount++;
      connection.lastError = error.message;
      
      this.connections.set(connectionId, connection);
      
      this.emit('connection_tested', { connectionId, status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Sincroniza dados
   */
  async syncData(connectionId, syncType, options = {}) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Conexão não encontrada: ${connectionId}`);
    }

    const integration = this.integrations.get(connection.integrationId);
    const credentials = this.credentials.get(connectionId);

    const syncJob = {
      id: uuidv4(),
      connectionId,
      syncType,
      status: 'running',
      startedAt: Date.now(),
      endedAt: null,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: []
    };

    this.syncJobs.set(syncJob.id, syncJob);

    try {
      // Simular sincronização
      const result = await this.performSync(integration, credentials, syncType, options);
      
      syncJob.status = 'completed';
      syncJob.endedAt = Date.now();
      syncJob.recordsProcessed = result.recordsProcessed;
      syncJob.recordsCreated = result.recordsCreated;
      syncJob.recordsUpdated = result.recordsUpdated;
      syncJob.recordsFailed = result.recordsFailed;
      
      connection.lastSync = Date.now();
      connection.syncCount++;
      
      this.syncJobs.set(syncJob.id, syncJob);
      this.connections.set(connectionId, connection);
      
      this.emit('sync_completed', { syncJob, result });
      
      return syncJob;
    } catch (error) {
      syncJob.status = 'failed';
      syncJob.endedAt = Date.now();
      syncJob.errors.push(error.message);
      
      connection.errorCount++;
      connection.lastError = error.message;
      
      this.syncJobs.set(syncJob.id, syncJob);
      this.connections.set(connectionId, connection);
      
      this.emit('sync_failed', { syncJob, error: error.message });
      throw error;
    }
  }

  /**
   * Executa sincronização
   */
  async performSync(integration, credentials, syncType, options) {
    // Simular sincronização baseada no tipo
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = {
      recordsProcessed: Math.floor(Math.random() * 100) + 50,
      recordsCreated: Math.floor(Math.random() * 20) + 10,
      recordsUpdated: Math.floor(Math.random() * 30) + 15,
      recordsFailed: Math.floor(Math.random() * 5)
    };
    
    return result;
  }

  /**
   * Configura webhook
   */
  async configureWebhook(connectionId, webhookData) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Conexão não encontrada: ${connectionId}`);
    }

    const webhook = {
      id: uuidv4(),
      connectionId,
      url: webhookData.url,
      events: webhookData.events || ['all'],
      secret: webhookData.secret,
      status: 'active',
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0
    };

    this.webhooks.set(webhook.id, webhook);
    
    this.emit('webhook_configured', { webhook });
    
    return webhook.id;
  }

  /**
   * Dispara webhook
   */
  async triggerWebhook(webhookId, eventData) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook não encontrado: ${webhookId}`);
    }

    if (webhook.status !== 'active') {
      throw new Error('Webhook não está ativo');
    }

    try {
      // Simular envio de webhook
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      webhook.lastTriggered = Date.now();
      webhook.triggerCount++;
      
      this.webhooks.set(webhookId, webhook);
      
      this.emit('webhook_triggered', { webhookId, eventData });
    } catch (error) {
      console.error(`[IntegrationSystem] Erro ao disparar webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Inicia jobs de sincronização
   */
  startSyncJobs() {
    setInterval(() => {
      this.runScheduledSyncs();
    }, this.syncInterval);
  }

  /**
   * Executa sincronizações agendadas
   */
  async runScheduledSyncs() {
    for (const [connectionId, connection] of this.connections) {
      if (connection.status === 'connected') {
        try {
          await this.syncData(connectionId, 'scheduled');
        } catch (error) {
          console.error(`[IntegrationSystem] Erro na sincronização agendada ${connectionId}:`, error);
        }
      }
    }
  }

  /**
   * Criptografa credenciais
   */
  encryptCredentials(credentials) {
    // Simular criptografia
    return btoa(JSON.stringify(credentials));
  }

  /**
   * Descriptografa credenciais
   */
  decryptCredentials(encryptedCredentials) {
    // Simular descriptografia
    return JSON.parse(atob(encryptedCredentials));
  }

  /**
   * Obtém integrações disponíveis
   */
  getAvailableIntegrations() {
    return Array.from(this.integrations.values());
  }

  /**
   * Obtém conexões ativas
   */
  getActiveConnections() {
    return Array.from(this.connections.values()).filter(c => c.status === 'connected');
  }

  /**
   * Obtém webhooks ativos
   */
  getActiveWebhooks() {
    return Array.from(this.webhooks.values()).filter(w => w.status === 'active');
  }

  /**
   * Obtém jobs de sincronização
   */
  getSyncJobs(status = null) {
    const jobs = Array.from(this.syncJobs.values());
    if (status) {
      return jobs.filter(job => job.status === status);
    }
    return jobs;
  }

  /**
   * Obtém estatísticas do sistema
   */
  getIntegrationStats() {
    const connections = Array.from(this.connections.values());
    const webhooks = Array.from(this.webhooks.values());
    const syncJobs = Array.from(this.syncJobs.values());

    return {
      totalIntegrations: this.integrations.size,
      activeConnections: connections.filter(c => c.status === 'connected').length,
      totalConnections: connections.length,
      activeWebhooks: webhooks.filter(w => w.status === 'active').length,
      totalWebhooks: webhooks.length,
      totalSyncJobs: syncJobs.length,
      successfulSyncs: syncJobs.filter(j => j.status === 'completed').length,
      failedSyncs: syncJobs.filter(j => j.status === 'failed').length
    };
  }
}

// Instância singleton
export const integrationSystem = new IntegrationSystem();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.integrationSystem = integrationSystem;
}

