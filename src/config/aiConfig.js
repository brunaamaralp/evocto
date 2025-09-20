/**
 * 🤖 Configuração de IA Funcional
 * 
 * Arquivo para configurar APIs reais de IA
 */

// Configuração para desenvolvimento com IA real
export const aiConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'sk-your-key-here',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 30000
  },

  // Anthropic Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-your-key-here',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.7,
    timeout: 30000
  },

  // Ollama Configuration (Local)
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama2',
    timeout: 60000
  },

  // Fallback Configuration
  fallback: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000
  }
};

// Função para inicializar IA baseada na configuração
export async function initializeAI() {
  const config = aiConfig;
  
  // Verificar qual provedor está disponível
  if (config.openai.apiKey && config.openai.apiKey !== 'sk-your-key-here') {
    return await initializeOpenAI(config.openai);
  }
  
  if (config.anthropic.apiKey && config.anthropic.apiKey !== 'sk-ant-your-key-here') {
    return await initializeAnthropic(config.anthropic);
  }
  
  if (config.ollama.baseUrl) {
    return await initializeOllama(config.ollama);
  }
  
  // Fallback para MockLLM
  console.warn('⚠️ Nenhuma API de IA configurada, usando MockLLM');
  return new MockLLM();
}

// Inicializar OpenAI
async function initializeOpenAI(config) {
  try {
    const { OpenAILLM } = await import('@/api/integrations/LocalLLM');
    const llm = new OpenAILLM(config);
    
    // Testar conexão
    await llm.invokeLLM('Teste de conexão', { max_tokens: 10 });
    console.log('✅ OpenAI inicializado com sucesso');
    
    return llm;
  } catch (error) {
    console.error('❌ Erro ao inicializar OpenAI:', error);
    throw error;
  }
}

// Inicializar Anthropic
async function initializeAnthropic(config) {
  try {
    const { AnthropicLLM } = await import('@/api/integrations/LocalLLM');
    const llm = new AnthropicLLM(config);
    
    // Testar conexão
    await llm.invokeLLM('Teste de conexão', { max_tokens: 10 });
    console.log('✅ Anthropic inicializado com sucesso');
    
    return llm;
  } catch (error) {
    console.error('❌ Erro ao inicializar Anthropic:', error);
    throw error;
  }
}

// Inicializar Ollama
async function initializeOllama(config) {
  try {
    const { OllamaLLM } = await import('@/api/integrations/LocalLLM');
    const llm = new OllamaLLM(config);
    
    // Testar conexão
    await llm.invokeLLM('Teste de conexão', { max_tokens: 10 });
    console.log('✅ Ollama inicializado com sucesso');
    
    return llm;
  } catch (error) {
    console.error('❌ Erro ao inicializar Ollama:', error);
    throw error;
  }
}

// Função para testar todas as APIs
export async function testAIProviders() {
  const results = {
    openai: { available: false, error: null },
    anthropic: { available: false, error: null },
    ollama: { available: false, error: null }
  };

  // Testar OpenAI
  if (aiConfig.openai.apiKey && aiConfig.openai.apiKey !== 'sk-your-key-here') {
    try {
      const llm = await initializeOpenAI(aiConfig.openai);
      results.openai.available = true;
    } catch (error) {
      results.openai.error = error.message;
    }
  }

  // Testar Anthropic
  if (aiConfig.anthropic.apiKey && aiConfig.anthropic.apiKey !== 'sk-ant-your-key-here') {
    try {
      const llm = await initializeAnthropic(aiConfig.anthropic);
      results.anthropic.available = true;
    } catch (error) {
      results.anthropic.error = error.message;
    }
  }

  // Testar Ollama
  if (aiConfig.ollama.baseUrl) {
    try {
      const llm = await initializeOllama(aiConfig.ollama);
      results.ollama.available = true;
    } catch (error) {
      results.ollama.error = error.message;
    }
  }

  return results;
}

// Função para obter o melhor provedor disponível
export async function getBestAIProvider() {
  const results = await testAIProviders();
  
  // Prioridade: OpenAI > Anthropic > Ollama > Mock
  if (results.openai.available) {
    return await initializeOpenAI(aiConfig.openai);
  }
  
  if (results.anthropic.available) {
    return await initializeAnthropic(aiConfig.anthropic);
  }
  
  if (results.ollama.available) {
    return await initializeOllama(aiConfig.ollama);
  }
  
  // Fallback para Mock
  const { MockLLM } = await import('@/api/integrations/LocalLLM');
  return new MockLLM();
}

export default aiConfig;
