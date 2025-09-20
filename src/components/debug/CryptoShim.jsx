// Browser-safe crypto utilities (substitutos para crypto do Node.js)
export const createHash = (algorithm) => {
  console.warn('createHash chamado - use Web Crypto API ao invés de Node crypto');
  
  // Implementação simplificada usando Web Crypto API
  return {
    update: (data) => {
      console.warn('hash.update chamado - implemente com crypto.subtle.digest');
      return this;
    },
    digest: (encoding) => {
      console.warn('hash.digest chamado - implemente com crypto.subtle.digest');
      return 'browser-safe-hash-placeholder';
    }
  };
};

export const randomBytes = (size) => {
  console.warn('randomBytes chamado - use crypto.getRandomValues ao invés');
  
  // Browser-safe implementation
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const randomUUID = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback para browsers antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Shim para detectar uso incorreto de APIs do Node
if (typeof window !== 'undefined') {
  // Detectar se APIs do Node vazaram para o browser
  const nodeAPIs = ['require', 'process', 'Buffer', 'global', 'exports', 'module'];
  
  nodeAPIs.forEach(api => {
    if (window[api]) {
      console.error(`❌ API do Node detectada no browser: ${api}. Isso pode causar erros de runtime.`);
    }
  });
  
  // Implementar substitutos seguros se necessário
  if (!window.crypto) {
    console.error('❌ Web Crypto API não disponível. Browser muito antigo?');
  }
}