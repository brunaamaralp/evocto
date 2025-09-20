/**
 * ⚙️ Configuração de Ambiente para Migração
 * 
 * Arquivo de configuração para diferentes ambientes
 */

// Configurações por ambiente
export const environments = {
  development: {
    database: {
      type: 'memory',
      // Para usar SQLite: type: 'sqlite', path: './dev.db'
      // Para usar PostgreSQL: type: 'postgresql', host: 'localhost', port: 5432, database: 'evocto_dev', user: 'evocto', password: 'password'
    },
    auth: {
      type: 'mock',
      // Para usar Auth0: type: 'auth0', domain: 'your-domain.auth0.com', clientId: 'your-client-id'
      // Para usar Keycloak: type: 'keycloak', url: 'http://localhost:8080', realm: 'evocto', clientId: 'evocto-client'
    },
    llm: {
      type: 'mock',
      // Para usar OpenAI: type: 'openai', apiKey: 'sk-...'
      // Para usar Anthropic: type: 'anthropic', apiKey: 'sk-ant-...'
      // Para usar Ollama: type: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama2'
    },
    email: {
      type: 'mock',
      // Para usar SendGrid: type: 'sendgrid', apiKey: 'SG...', from: 'noreply@evocto.com'
      // Para usar SMTP: type: 'smtp', host: 'smtp.gmail.com', port: 587, user: 'your-email@gmail.com', pass: 'your-password'
    },
    storage: {
      type: 'local',
      // Para usar S3: type: 's3', bucket: 'evocto-storage', accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin', region: 'us-east-1'
    },
    cache: {
      type: 'memory',
      // Para usar Redis: type: 'redis', host: 'localhost', port: 6379, password: ''
    }
  },

  staging: {
    database: {
      type: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'evocto_staging',
      user: process.env.DB_USER || 'evocto',
      password: process.env.DB_PASSWORD || 'password'
    },
    auth: {
      type: 'auth0',
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID
    },
    llm: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY
    },
    email: {
      type: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.EMAIL_FROM || 'noreply@evocto.com'
    },
    storage: {
      type: 's3',
      bucket: process.env.S3_BUCKET || 'evocto-staging',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    },
    cache: {
      type: 'redis',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    }
  },

  production: {
    database: {
      type: 'postgresql',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    auth: {
      type: 'auth0',
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID
    },
    llm: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    },
    email: {
      type: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.EMAIL_FROM
    },
    storage: {
      type: 's3',
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    },
    cache: {
      type: 'redis',
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    }
  }
};

// Função para obter configuração do ambiente atual
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return environments[env] || environments.development;
}

// Função para validar configuração
export function validateConfig(config) {
  const errors = [];

  // Validar banco de dados
  if (config.database.type === 'postgresql') {
    if (!config.database.host) errors.push('DB_HOST é obrigatório para PostgreSQL');
    if (!config.database.database) errors.push('DB_NAME é obrigatório para PostgreSQL');
    if (!config.database.user) errors.push('DB_USER é obrigatório para PostgreSQL');
    if (!config.database.password) errors.push('DB_PASSWORD é obrigatório para PostgreSQL');
  }

  // Validar autenticação
  if (config.auth.type === 'auth0') {
    if (!config.auth.domain) errors.push('AUTH0_DOMAIN é obrigatório');
    if (!config.auth.clientId) errors.push('AUTH0_CLIENT_ID é obrigatório');
  }

  if (config.auth.type === 'keycloak') {
    if (!config.auth.url) errors.push('KEYCLOAK_URL é obrigatório');
    if (!config.auth.realm) errors.push('KEYCLOAK_REALM é obrigatório');
    if (!config.auth.clientId) errors.push('KEYCLOAK_CLIENT_ID é obrigatório');
  }

  // Validar LLM
  if (config.llm.type === 'openai') {
    if (!config.llm.apiKey) errors.push('OPENAI_API_KEY é obrigatório');
  }

  if (config.llm.type === 'anthropic') {
    if (!config.llm.apiKey) errors.push('ANTHROPIC_API_KEY é obrigatório');
  }

  // Validar email
  if (config.email.type === 'sendgrid') {
    if (!config.email.apiKey) errors.push('SENDGRID_API_KEY é obrigatório');
    if (!config.email.from) errors.push('EMAIL_FROM é obrigatório');
  }

  // Validar storage
  if (config.storage.type === 's3') {
    if (!config.storage.bucket) errors.push('S3_BUCKET é obrigatório');
    if (!config.storage.accessKeyId) errors.push('AWS_ACCESS_KEY_ID é obrigatório');
    if (!config.storage.secretAccessKey) errors.push('AWS_SECRET_ACCESS_KEY é obrigatório');
  }

  // Validar cache
  if (config.cache.type === 'redis') {
    if (!config.cache.host) errors.push('REDIS_HOST é obrigatório');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função para criar arquivo .env de exemplo
export function generateEnvExample() {
  return `
# Configuração do Banco de Dados
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=evocto
DB_USER=evocto
DB_PASSWORD=password

# Configuração de Autenticação
AUTH_TYPE=auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id

# Configuração de LLM
LLM_TYPE=openai
OPENAI_API_KEY=sk-your-openai-key

# Configuração de Email
EMAIL_TYPE=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-key
EMAIL_FROM=noreply@evocto.com

# Configuração de Storage
STORAGE_TYPE=s3
S3_BUCKET=evocto-storage
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1

# Configuração de Cache
CACHE_TYPE=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configuração do Ambiente
NODE_ENV=development
`.trim();
}

// Função para migrar configuração do Base44
export function migrateFromBase44(base44Config) {
  return {
    database: {
      type: 'postgresql',
      host: base44Config.database?.host || 'localhost',
      port: base44Config.database?.port || 5432,
      database: base44Config.database?.name || 'evocto',
      user: base44Config.database?.user || 'evocto',
      password: base44Config.database?.password || 'password'
    },
    auth: {
      type: 'auth0',
      domain: base44Config.auth?.domain,
      clientId: base44Config.auth?.clientId
    },
    llm: {
      type: 'openai',
      apiKey: base44Config.llm?.apiKey
    },
    email: {
      type: 'sendgrid',
      apiKey: base44Config.email?.apiKey,
      from: base44Config.email?.from || 'noreply@evocto.com'
    },
    storage: {
      type: 's3',
      bucket: base44Config.storage?.bucket || 'evocto-storage',
      accessKeyId: base44Config.storage?.accessKeyId,
      secretAccessKey: base44Config.storage?.secretAccessKey,
      region: base44Config.storage?.region || 'us-east-1'
    },
    cache: {
      type: 'redis',
      host: base44Config.cache?.host || 'localhost',
      port: base44Config.cache?.port || 6379,
      password: base44Config.cache?.password
    }
  };
}

// Exportar configuração padrão
export const defaultConfig = getEnvironmentConfig();

