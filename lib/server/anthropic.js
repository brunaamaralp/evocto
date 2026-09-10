/**
 * Cliente Anthropic server-side (API Messages).
 * Compatível com anthropic.messages.create({ model, max_tokens, system, messages }).
 */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_VERSION = '2023-06-01';

async function createMessage(params = {}) {
  if (!ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY não configurada');
    err.code = 'anthropic_not_configured';
    throw err;
  }

  const {
    model = process.env.ANTHROPIC_AGENT_MODEL ||
      process.env.ANTHROPIC_CAMPANHA_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      'claude-opus-4-5',
    max_tokens = 3000,
    system,
    messages,
    temperature,
  } = params;

  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('messages obrigatório');
  }

  const body = {
    model,
    max_tokens,
    system,
    messages,
  };
  if (temperature != null) body.temperature = temperature;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.error || `anthropic_http_${response.status}`;
    const err = new Error(typeof msg === 'string' ? msg : 'anthropic_error');
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

export const anthropic = {
  messages: {
    create: createMessage,
  },
};

export default anthropic;
