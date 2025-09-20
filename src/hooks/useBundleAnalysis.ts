/**
 * 📦 Hook para Análise de Bundle
 * 
 * Monitora tamanho do bundle e performance de carregamento
 */

import { useState, useEffect, useCallback } from 'react';

interface BundleInfo {
  name: string;
  size: number;
  gzippedSize: number;
  type: 'js' | 'css' | 'image' | 'other';
  url: string;
}

interface BundleAnalysis {
  totalSize: number;
  totalGzippedSize: number;
  largestChunks: BundleInfo[];
  duplicateModules: string[];
  unusedModules: string[];
  recommendations: string[];
}

export function useBundleAnalysis() {
  const [bundleInfo, setBundleInfo] = useState<BundleInfo[]>([]);
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analisar bundle atual
  const analyzeBundle = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      const bundles = await getBundleInfo();
      setBundleInfo(bundles);
      
      const analysisResult = performAnalysis(bundles);
      setAnalysis(analysisResult);
      
    } catch (error) {
      console.error('Erro na análise do bundle:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Obter informações do bundle
  const getBundleInfo = async (): Promise<BundleInfo[]> => {
    const bundles: BundleInfo[] = [];
    
    // Analisar scripts
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.getAttribute('src');
      if (src) {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const size = blob.size;
          const gzippedSize = await getGzippedSize(blob);
          
          bundles.push({
            name: src.split('/').pop() || 'unknown',
            size,
            gzippedSize,
            type: 'js',
            url: src
          });
        } catch (error) {
          console.warn('Erro ao analisar script:', src, error);
        }
      }
    }
    
    // Analisar CSS
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    for (const stylesheet of stylesheets) {
      const href = stylesheet.getAttribute('href');
      if (href) {
        try {
          const response = await fetch(href);
          const blob = await response.blob();
          const size = blob.size;
          const gzippedSize = await getGzippedSize(blob);
          
          bundles.push({
            name: href.split('/').pop() || 'unknown',
            size,
            gzippedSize,
            type: 'css',
            url: href
          });
        } catch (error) {
          console.warn('Erro ao analisar stylesheet:', href, error);
        }
      }
    }
    
    return bundles;
  };

  // Calcular tamanho gzipped
  const getGzippedSize = async (blob: Blob): Promise<number> => {
    try {
      const stream = blob.stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const compressedBlob = await new Response(compressedStream).blob();
      return compressedBlob.size;
    } catch (error) {
      // Fallback: estimativa de 70% do tamanho original
      return Math.round(blob.size * 0.7);
    }
  };

  // Realizar análise
  const performAnalysis = (bundles: BundleInfo[]): BundleAnalysis => {
    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    const totalGzippedSize = bundles.reduce((sum, bundle) => sum + bundle.gzippedSize, 0);
    
    // Maiores chunks
    const largestChunks = [...bundles]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
    
    // Módulos duplicados (simulação)
    const duplicateModules = findDuplicateModules(bundles);
    
    // Módulos não utilizados (simulação)
    const unusedModules = findUnusedModules(bundles);
    
    // Recomendações
    const recommendations = generateRecommendations(bundles, totalSize, totalGzippedSize);
    
    return {
      totalSize,
      totalGzippedSize,
      largestChunks,
      duplicateModules,
      unusedModules,
      recommendations
    };
  };

  // Encontrar módulos duplicados
  const findDuplicateModules = (bundles: BundleInfo[]): string[] => {
    const duplicates: string[] = [];
    const seen = new Set<string>();
    
    bundles.forEach(bundle => {
      if (seen.has(bundle.name)) {
        duplicates.push(bundle.name);
      } else {
        seen.add(bundle.name);
      }
    });
    
    return duplicates;
  };

  // Encontrar módulos não utilizados
  const findUnusedModules = (bundles: BundleInfo[]): string[] => {
    // Simulação - em um ambiente real, isso seria mais complexo
    const unused: string[] = [];
    
    bundles.forEach(bundle => {
      if (bundle.name.includes('unused') || bundle.name.includes('deprecated')) {
        unused.push(bundle.name);
      }
    });
    
    return unused;
  };

  // Gerar recomendações
  const generateRecommendations = (
    bundles: BundleInfo[], 
    totalSize: number, 
    totalGzippedSize: number
  ): string[] => {
    const recommendations: string[] = [];
    
    // Verificar tamanho total
    if (totalSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push('Bundle muito grande (>2MB). Considere code splitting.');
    }
    
    // Verificar chunks grandes
    const largeChunks = bundles.filter(b => b.size > 500 * 1024); // 500KB
    if (largeChunks.length > 0) {
      recommendations.push(`${largeChunks.length} chunks muito grandes (>500KB). Considere dividir em chunks menores.`);
    }
    
    // Verificar eficiência de compressão
    const compressionRatio = totalGzippedSize / totalSize;
    if (compressionRatio > 0.8) {
      recommendations.push('Baixa eficiência de compressão. Considere otimizar o código.');
    }
    
    // Verificar duplicatas
    const duplicates = findDuplicateModules(bundles);
    if (duplicates.length > 0) {
      recommendations.push(`${duplicates.length} módulos duplicados encontrados.`);
    }
    
    // Verificar módulos não utilizados
    const unused = findUnusedModules(bundles);
    if (unused.length > 0) {
      recommendations.push(`${unused.length} módulos não utilizados encontrados.`);
    }
    
    return recommendations;
  };

  // Formatar tamanho
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Obter estatísticas
  const getStats = useCallback(() => {
    if (!analysis) return null;
    
    return {
      totalSize: formatSize(analysis.totalSize),
      totalGzippedSize: formatSize(analysis.totalGzippedSize),
      compressionRatio: Math.round((analysis.totalGzippedSize / analysis.totalSize) * 100),
      chunkCount: bundleInfo.length,
      largestChunk: bundleInfo.length > 0 ? formatSize(Math.max(...bundleInfo.map(b => b.size))) : '0 B'
    };
  }, [analysis, bundleInfo]);

  // Analisar automaticamente
  useEffect(() => {
    analyzeBundle();
  }, [analyzeBundle]);

  return {
    bundleInfo,
    analysis,
    isAnalyzing,
    analyzeBundle,
    formatSize,
    getStats
  };
}

// Hook para otimizações de performance
export function usePerformanceOptimizations() {
  const [optimizations, setOptimizations] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const applyOptimizations = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      const appliedOptimizations: string[] = [];
      
      // 1. Lazy loading de componentes
      if (typeof window !== 'undefined') {
        const lazyComponents = document.querySelectorAll('[data-lazy]');
        lazyComponents.forEach(component => {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const src = entry.target.getAttribute('data-src');
                if (src) {
                  entry.target.setAttribute('src', src);
                  observer.unobserve(entry.target);
                }
              }
            });
          });
          observer.observe(component);
        });
        appliedOptimizations.push('Lazy loading de componentes aplicado');
      }
      
      // 2. Preload de recursos críticos
      const criticalResources = [
        '/src/main.jsx',
        '/src/pages/Layout.jsx'
      ];
      
      criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = 'script';
        document.head.appendChild(link);
      });
      appliedOptimizations.push('Preload de recursos críticos aplicado');
      
      // 3. Otimização de imagens
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.loading) {
          img.loading = 'lazy';
        }
      });
      appliedOptimizations.push('Lazy loading de imagens aplicado');
      
      setOptimizations(appliedOptimizations);
      
    } catch (error) {
      console.error('Erro ao aplicar otimizações:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    optimizations,
    isOptimizing,
    applyOptimizations
  };
}

