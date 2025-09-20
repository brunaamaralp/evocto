/**
 * 🔄 Adaptador Universal para Substituir Base44
 * 
 * Este arquivo implementa um adaptador que simula a API Base44
 * usando serviços locais ou provedores substitutos
 */

// Configuração do ambiente
const config = {
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'evocto',
    user: process.env.DB_USER || 'evocto',
    password: process.env.DB_PASSWORD || 'password'
  },
  auth: {
    type: process.env.AUTH_TYPE || 'mock',
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID
  },
  llm: {
    type: process.env.LLM_TYPE || 'mock',
    apiKey: process.env.OPENAI_API_KEY
  },
  email: {
    type: process.env.EMAIL_TYPE || 'mock',
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@evocto.com'
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    bucket: process.env.S3_BUCKET || 'evocto-storage',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  cache: {
    type: process.env.CACHE_TYPE || 'memory',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};

// Classe base para gerenciamento de entidades
class EntityManager {
  constructor(database) {
    this.db = database;
    this.cache = new Map(); // Cache em memória simples
  }

  async create(entityType, data) {
    try {
      const id = crypto.randomUUID();
      const entity = {
        id,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Salvar no banco
      await this.db.createEntity(entityType, entity);
      
      // Atualizar cache
      this.cache.set(`${entityType}:${id}`, entity);

      return entity;
    } catch (error) {
      console.error(`[EntityManager] Erro ao criar ${entityType}:`, error);
      throw error;
    }
  }

  async get(entityType, id) {
    try {
      // Verificar cache primeiro
      const cached = this.cache.get(`${entityType}:${id}`);
      if (cached) {
        return cached;
      }

      // Buscar do banco
      const entity = await this.db.getEntity(entityType, id);
      
      // Atualizar cache
      if (entity) {
        this.cache.set(`${entityType}:${id}`, entity);
      }

      return entity;
    } catch (error) {
      console.error(`[EntityManager] Erro ao buscar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  async update(entityType, id, data) {
    try {
      // Buscar entidade existente
      const existing = await this.get(entityType, id);
      if (!existing) {
        throw new Error(`${entityType} com ID ${id} não encontrado`);
      }

      // Atualizar dados
      const updated = {
        ...existing,
        ...data,
        updated_at: new Date().toISOString()
      };

      // Salvar no banco
      await this.db.updateEntity(entityType, id, updated);
      
      // Atualizar cache
      this.cache.set(`${entityType}:${id}`, updated);

      return updated;
    } catch (error) {
      console.error(`[EntityManager] Erro ao atualizar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  async delete(entityType, id) {
    try {
      // Remover do banco
      await this.db.deleteEntity(entityType, id);
      
      // Remover do cache
      this.cache.delete(`${entityType}:${id}`);

      return { success: true };
    } catch (error) {
      console.error(`[EntityManager] Erro ao deletar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  async list(entityType, filters = {}) {
    try {
      return await this.db.listEntities(entityType, filters);
    } catch (error) {
      console.error(`[EntityManager] Erro ao listar ${entityType}:`, error);
      throw error;
    }
  }

  async filter(entityType, filters) {
    try {
      return await this.db.filterEntities(entityType, filters);
    } catch (error) {
      console.error(`[EntityManager] Erro ao filtrar ${entityType}:`, error);
      throw error;
    }
  }
}

// Classe para gerenciamento de funções
class FunctionManager {
  constructor(adapter) {
    this.adapter = adapter;
  }

  // Implementar funções críticas localmente
  async generateTasksFromService(params) {
    try {
      const { serviceId, autoAssign = false, startDate } = params;
      
      // Buscar serviço
      const service = await this.adapter.entities.get('services', serviceId);
      if (!service) {
        throw new Error(`Serviço ${serviceId} não encontrado`);
      }

      // Gerar tarefas baseadas no template
      const tasks = [];
      if (service.deliverables) {
        for (const deliverable of service.deliverables) {
          if (deliverable.task_templates) {
            for (const template of deliverable.task_templates) {
              const task = await this.adapter.entities.create('tasks', {
                serviceId,
                deliverableId: deliverable.id,
                title: template.title,
                description: template.description,
                type: template.type || 'deliverable',
                priority: template.priority || 'medium',
                estimatedHours: template.estimated_hours || 4,
                status: 'todo',
                startDate: startDate || new Date().toISOString(),
                checklist: template.checklist || []
              });
              tasks.push(task);
            }
          }
        }
      }

      return {
        success: true,
        tasksCreated: tasks.length,
        tasksSkipped: 0,
        errors: [],
        warnings: []
      };
    } catch (error) {
      console.error('[FunctionManager] Erro ao gerar tarefas:', error);
      return {
        success: false,
        tasksCreated: 0,
        tasksSkipped: 0,
        errors: [error.message],
        warnings: []
      };
    }
  }

  async createServiceInstance(params) {
    try {
      const { templateId, clientId, name, description, contractValue } = params;
      
      // Buscar template
      const template = await this.adapter.entities.get('services', templateId);
      if (!template) {
        throw new Error(`Template ${templateId} não encontrado`);
      }

      // Criar instância
      const service = await this.adapter.entities.create('services', {
        name,
        description,
        clientId,
        templateId,
        contractValue,
        is_template: false,
        is_active: false,
        deliverables: template.deliverables,
        kpis: template.kpis,
        agencyId: template.agencyId
      });

      return service;
    } catch (error) {
      console.error('[FunctionManager] Erro ao criar instância:', error);
      throw error;
    }
  }

  async generateClientReport(params) {
    try {
      const { clientId } = params;
      
      // Buscar dados do cliente
      const client = await this.adapter.entities.get('clients', clientId);
      if (!client) {
        throw new Error(`Cliente ${clientId} não encontrado`);
      }

      // Buscar serviços do cliente
      const services = await this.adapter.entities.filter('services', { clientId });
      
      // Buscar tarefas dos serviços
      const tasks = [];
      for (const service of services) {
        const serviceTasks = await this.adapter.entities.filter('tasks', { serviceId: service.id });
        tasks.push(...serviceTasks);
      }

      // Gerar relatório
      const report = {
        client: client,
        services: services,
        tasks: tasks,
        summary: {
          totalServices: services.length,
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          activeServices: services.filter(s => s.is_active).length
        },
        generatedAt: new Date().toISOString()
      };

      return report;
    } catch (error) {
      console.error('[FunctionManager] Erro ao gerar relatório:', error);
      throw error;
    }
  }
}

// Classe principal do adaptador
export class UniversalAdapter {
  constructor(customConfig = {}) {
    this.config = { ...config, ...customConfig };
    this.initializeServices();
  }

  initializeServices() {
    // Inicializar banco de dados
    this.database = this.createDatabase();
    
    // Inicializar autenticação
    this.auth = this.createAuth();
    
    // Inicializar integrações
    this.integrations = this.createIntegrations();
    
    // Inicializar entidades
    this.entities = new EntityManager(this.database);
    
    // Inicializar funções
    this.functions = new FunctionManager(this);
  }

  createDatabase() {
    switch (this.config.database.type) {
      case 'postgresql':
        return new PostgreSQLDatabase(this.config.database);
      case 'sqlite':
        return new SQLiteDatabase(this.config.database);
      default:
        return new MemoryDatabase();
    }
  }

  createAuth() {
    switch (this.config.auth.type) {
      case 'auth0':
        return new Auth0Auth(this.config.auth);
      case 'keycloak':
        return new KeycloakAuth(this.config.auth);
      default:
        return new MockAuth();
    }
  }

  createIntegrations() {
    return {
      Core: {
        InvokeLLM: this.createLLM(),
        SendEmail: this.createEmail()
      }
    };
  }

  createLLM() {
    switch (this.config.llm.type) {
      case 'openai':
        return new OpenAILLM(this.config.llm);
      case 'anthropic':
        return new AnthropicLLM(this.config.llm);
      default:
        return new MockLLM();
    }
  }

  createEmail() {
    switch (this.config.email.type) {
      case 'sendgrid':
        return new SendGridEmail(this.config.email);
      case 'nodemailer':
        return new NodemailerEmail(this.config.email);
      default:
        return new MockEmail();
    }
  }
}

// Implementações básicas para desenvolvimento
class MemoryDatabase {
  constructor() {
    this.data = new Map();
  }

  async createEntity(entityType, data) {
    if (!this.data.has(entityType)) {
      this.data.set(entityType, new Map());
    }
    this.data.get(entityType).set(data.id, data);
    return data;
  }

  async getEntity(entityType, id) {
    return this.data.get(entityType)?.get(id) || null;
  }

  async updateEntity(entityType, id, data) {
    if (!this.data.has(entityType)) {
      this.data.set(entityType, new Map());
    }
    this.data.get(entityType).set(id, data);
    return data;
  }

  async deleteEntity(entityType, id) {
    this.data.get(entityType)?.delete(id);
    return { success: true };
  }

  async listEntities(entityType, filters = {}) {
    const entities = Array.from(this.data.get(entityType)?.values() || []);
    return this.applyFilters(entities, filters);
  }

  async filterEntities(entityType, filters) {
    const entities = Array.from(this.data.get(entityType)?.values() || []);
    return this.applyFilters(entities, filters);
  }

  applyFilters(entities, filters) {
    return entities.filter(entity => {
      return Object.entries(filters).every(([key, value]) => {
        if (typeof value === 'object' && value.$ne) {
          return entity[key] !== value.$ne;
        }
        return entity[key] === value;
      });
    });
  }
}

class MockAuth {
  constructor() {
    this.currentUser = null;
  }

  async login() {
    this.currentUser = {
      id: 'mock-user-1',
      email: 'dev@evocto.com',
      name: 'Developer',
      agencyId: 'mock-agency-1',
      permissions: ['admin']
    };
    return this.currentUser;
  }

  async me() {
    return this.currentUser;
  }

  async logout() {
    this.currentUser = null;
  }
}

class MockLLM {
  async invokeLLM(prompt, options = {}) {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Mock response for: ${prompt.substring(0, 50)}...`;
  }
}

class MockEmail {
  async sendEmail(to, subject, body, options = {}) {
    console.log(`[MockEmail] Enviando email para ${to}: ${subject}`);
    return { success: true };
  }
}

// Exportar instância padrão
export const localClient = new UniversalAdapter();

// Exportar para compatibilidade com código existente
export const base44 = localClient;

