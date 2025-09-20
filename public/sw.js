/**
 * 🔧 Service Worker para PWA
 * 
 * Implementa cache estratégico e funcionalidades offline
 */

const CACHE_NAME = 'evocto-v1';
const STATIC_CACHE = 'evocto-static-v1';
const DYNAMIC_CACHE = 'evocto-dynamic-v1';

// Recursos para cache estático
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// URLs da API que devem ser cacheadas
const API_CACHE_PATTERNS = [
  /\/api\/clients/,
  /\/api\/tasks/,
  /\/api\/users\/me/,
  /\/api\/services/
];

// Instalar Service Worker
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado com sucesso');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Erro na instalação do Service Worker:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('🔧 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativado');
        return self.clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia de cache baseada no tipo de recurso
  if (request.method === 'GET') {
    if (isStaticAsset(request)) {
      // Cache First para recursos estáticos
      event.respondWith(cacheFirst(request));
    } else if (isApiRequest(request)) {
      // Network First para APIs
      event.respondWith(networkFirst(request));
    } else if (isPageRequest(request)) {
      // Stale While Revalidate para páginas
      event.respondWith(staleWhileRevalidate(request));
    } else {
      // Network First para outros recursos
      event.respondWith(networkFirst(request));
    }
  }
});

// Verificar se é recurso estático
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

// Verificar se é requisição da API
function isApiRequest(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Verificar se é requisição de página
function isPageRequest(request: Request): boolean {
  const url = new URL(request.url);
  return request.headers.get('accept')?.includes('text/html') || url.pathname === '/';
}

// Estratégia Cache First
async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Erro em cacheFirst:', error);
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Estratégia Network First
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Rede indisponível, tentando cache...');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar página offline para requisições de página
    if (isPageRequest(request)) {
      return caches.match('/offline.html') || new Response('Página não disponível offline', { status: 503 });
    }
    
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Interceptar mensagens do cliente
self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(payload.cacheName);
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
  }
});

// Cachear URLs específicas
async function cacheUrls(urls: string[]): Promise<void> {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.error(`❌ Erro ao cachear ${url}:`, error);
    }
  }
}

// Limpar cache específico
async function clearCache(cacheName: string): Promise<void> {
  const deleted = await caches.delete(cacheName);
  console.log(`🗑️ Cache ${cacheName} ${deleted ? 'removido' : 'não encontrado'}`);
}

// Obter tamanho do cache
async function getCacheSize(): Promise<number> {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// Sincronização em background
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('🔄 Background sync:', event.tag);
  
  switch (event.tag) {
    case 'background-sync':
      event.waitUntil(doBackgroundSync());
      break;
  }
});

// Executar sincronização em background
async function doBackgroundSync(): Promise<void> {
  try {
    // Implementar lógica de sincronização offline
    console.log('🔄 Executando sincronização em background...');
    
    // Exemplo: sincronizar dados offline
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      await syncOfflineData(offlineData);
    }
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Obter dados offline (placeholder)
async function getOfflineData(): Promise<any[]> {
  // Implementar lógica para obter dados salvos offline
  return [];
}

// Sincronizar dados offline (placeholder)
async function syncOfflineData(data: any[]): Promise<void> {
  // Implementar lógica para sincronizar dados com o servidor
  console.log('📤 Sincronizando dados offline:', data.length, 'itens');
}

console.log('🔧 Service Worker carregado');

