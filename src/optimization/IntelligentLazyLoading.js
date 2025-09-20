import { EventEmitter } from 'events';

/**
 * Sistema de Lazy Loading Inteligente
 * Implementa carregamento sob demanda com previsão e otimização
 */
export class IntelligentLazyLoading extends EventEmitter {
  constructor(options = {}) {
    super();
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.preloadQueue = new Set();
    this.intersectionObserver = null;
    this.preloadThreshold = options.preloadThreshold || 0.1;
    this.maxConcurrentLoads = options.maxConcurrentLoads || 3;
    this.preloadDelay = options.preloadDelay || 100;
    this.cacheEnabled = options.cacheEnabled || true;
    this.analyticsEnabled = options.analyticsEnabled || true;
    
    this.loadingStats = {
      totalLoads: 0,
      successfulLoads: 0,
      failedLoads: 0,
      preloads: 0,
      cacheHits: 0,
      averageLoadTime: 0
    };
    
    this.initializeIntersectionObserver();
  }

  /**
   * Inicializa Intersection Observer
   */
  initializeIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('[IntelligentLazyLoading] IntersectionObserver não suportado');
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: '50px',
        threshold: this.preloadThreshold
      }
    );
  }

  /**
   * Registra elemento para lazy loading
   */
  registerElement(element, modulePath, options = {}) {
    if (!element || !modulePath) {
      throw new Error('Elemento e caminho do módulo são obrigatórios');
    }

    const config = {
      modulePath,
      priority: options.priority || 'normal',
      preload: options.preload || false,
      fallback: options.fallback || null,
      retryCount: options.retryCount || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    // Adicionar atributos de dados
    element.setAttribute('data-lazy-module', modulePath);
    element.setAttribute('data-lazy-priority', config.priority);
    element.setAttribute('data-lazy-preload', config.preload);

    // Observar elemento
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }

    // Adicionar listener de clique para carregamento imediato
    element.addEventListener('click', () => {
      this.loadModule(modulePath, config);
    });

    this.emit('element_registered', { element, config });
  }

  /**
   * Carrega módulo
   */
  async loadModule(modulePath, options = {}) {
    const startTime = Date.now();
    
    // Verificar se já está carregado
    if (this.loadedModules.has(modulePath)) {
      this.loadingStats.cacheHits++;
      this.emit('module_loaded_from_cache', { modulePath });
      return this.loadedModules.get(modulePath);
    }

    // Verificar se já está carregando
    if (this.loadingPromises.has(modulePath)) {
      return this.loadingPromises.get(modulePath);
    }

    // Criar promise de carregamento
    const loadPromise = this.performLoad(modulePath, options);
    this.loadingPromises.set(modulePath, loadPromise);

    try {
      const result = await loadPromise;
      const loadTime = Date.now() - startTime;
      
      // Atualizar estatísticas
      this.loadingStats.totalLoads++;
      this.loadingStats.successfulLoads++;
      this.updateAverageLoadTime(loadTime);
      
      // Armazenar resultado
      if (this.cacheEnabled) {
        this.loadedModules.set(modulePath, result);
      }
      
      this.loadingPromises.delete(modulePath);
      
      this.emit('module_loaded', { modulePath, loadTime, result });
      return result;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      
      // Atualizar estatísticas
      this.loadingStats.totalLoads++;
      this.loadingStats.failedLoads++;
      
      this.loadingPromises.delete(modulePath);
      
      this.emit('module_load_failed', { modulePath, loadTime, error });
      
      // Tentar fallback se disponível
      if (options.fallback) {
        return this.loadFallback(options.fallback);
      }
      
      throw error;
    }
  }

  /**
   * Executa carregamento do módulo
   */
  async performLoad(modulePath, options) {
    const retryCount = options.retryCount || 3;
    let lastError;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Simular carregamento dinâmico
        const module = await this.dynamicImport(modulePath);
        
        // Validar módulo
        if (!module || typeof module !== 'object') {
          throw new Error('Módulo inválido retornado');
        }
        
        return module;
      } catch (error) {
        lastError = error;
        
        if (attempt < retryCount - 1) {
          // Aguardar antes de tentar novamente
          await this.delay(options.retryDelay || 1000);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Simula importação dinâmica
   */
  async dynamicImport(modulePath) {
    // Simular delay de carregamento
    await this.delay(Math.random() * 1000 + 500);
    
    // Simular diferentes tipos de módulos
    if (modulePath.includes('component')) {
      return {
        default: class MockComponent {
          render() {
            return 'Mock Component';
          }
        }
      };
    } else if (modulePath.includes('service')) {
      return {
        default: class MockService {
          async execute() {
            return 'Mock Service Result';
          }
        }
      };
    } else if (modulePath.includes('util')) {
      return {
        default: {
          format: (value) => `Formatted: ${value}`,
          validate: (value) => !!value
        }
      };
    }
    
    // Módulo genérico
    return {
      default: {
        name: modulePath,
        version: '1.0.0',
        loadTime: Date.now()
      }
    };
  }

  /**
   * Carrega fallback
   */
  async loadFallback(fallbackPath) {
    try {
      const fallback = await this.dynamicImport(fallbackPath);
      this.emit('fallback_loaded', { fallbackPath, fallback });
      return fallback;
    } catch (error) {
      this.emit('fallback_failed', { fallbackPath, error });
      throw error;
    }
  }

  /**
   * Precarrega módulo
   */
  async preloadModule(modulePath, priority = 'low') {
    if (this.loadedModules.has(modulePath) || this.loadingPromises.has(modulePath)) {
      return;
    }

    // Adicionar à fila de preload
    this.preloadQueue.add(modulePath);
    
    // Aguardar delay antes de precarregar
    await this.delay(this.preloadDelay);
    
    try {
      await this.loadModule(modulePath, { priority, preload: true });
      this.loadingStats.preloads++;
      this.emit('module_preloaded', { modulePath });
    } catch (error) {
      this.emit('preload_failed', { modulePath, error });
    } finally {
      this.preloadQueue.delete(modulePath);
    }
  }

  /**
   * Lida com interseção de elementos
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const modulePath = element.getAttribute('data-lazy-module');
        const priority = element.getAttribute('data-lazy-priority') || 'normal';
        const preload = element.getAttribute('data-lazy-preload') === 'true';
        
        if (modulePath) {
          if (preload) {
            this.preloadModule(modulePath, priority);
          } else {
            this.loadModule(modulePath, { priority });
          }
        }
        
        // Parar de observar após carregamento
        this.intersectionObserver.unobserve(element);
      }
    });
  }

  /**
   * Carrega módulos por prioridade
   */
  async loadByPriority(modulePaths, priority = 'normal') {
    const results = new Map();
    const errors = new Map();
    
    // Ordenar por prioridade
    const sortedPaths = this.sortByPriority(modulePaths);
    
    // Carregar em lotes para evitar sobrecarga
    const batchSize = this.maxConcurrentLoads;
    for (let i = 0; i < sortedPaths.length; i += batchSize) {
      const batch = sortedPaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (modulePath) => {
        try {
          const result = await this.loadModule(modulePath, { priority });
          results.set(modulePath, result);
        } catch (error) {
          errors.set(modulePath, error);
        }
      });
      
      await Promise.allSettled(batchPromises);
    }
    
    this.emit('batch_loaded', { results, errors, priority });
    return { results, errors };
  }

  /**
   * Ordena módulos por prioridade
   */
  sortByPriority(modulePaths) {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    
    return modulePaths.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 2;
      const priorityB = priorityOrder[b.priority] || 2;
      return priorityA - priorityB;
    });
  }

  /**
   * Atualiza tempo médio de carregamento
   */
  updateAverageLoadTime(loadTime) {
    const totalLoads = this.loadingStats.successfulLoads;
    const currentAverage = this.loadingStats.averageLoadTime;
    this.loadingStats.averageLoadTime = 
      (currentAverage * (totalLoads - 1) + loadTime) / totalLoads;
  }

  /**
   * Obtém estatísticas de carregamento
   */
  getLoadingStats() {
    return {
      ...this.loadingStats,
      successRate: this.loadingStats.totalLoads > 0 ? 
        this.loadingStats.successfulLoads / this.loadingStats.totalLoads : 0,
      cacheHitRate: this.loadingStats.totalLoads > 0 ? 
        this.loadingStats.cacheHits / this.loadingStats.totalLoads : 0,
      preloadRate: this.loadingStats.totalLoads > 0 ? 
        this.loadingStats.preloads / this.loadingStats.totalLoads : 0
    };
  }

  /**
   * Limpa cache de módulos
   */
  clearCache() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
    this.preloadQueue.clear();
    
    this.emit('cache_cleared');
  }

  /**
   * Destrói o sistema
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.clearCache();
    this.removeAllListeners();
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instância singleton
export const intelligentLazyLoading = new IntelligentLazyLoading({
  preloadThreshold: 0.1,
  maxConcurrentLoads: 3,
  preloadDelay: 100,
  cacheEnabled: true,
  analyticsEnabled: true
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.intelligentLazyLoading = intelligentLazyLoading;
}

