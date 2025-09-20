/**
 * 📦 Dashboard de Análise de Bundle
 * 
 * Interface para visualizar e otimizar o bundle da aplicação
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Download, 
  Upload, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingDown,
  FileText,
  Image,
  Code
} from 'lucide-react';
import { useBundleAnalysis, usePerformanceOptimizations } from '@/hooks/useBundleAnalysis';
import { toast } from 'sonner';

export default function BundleAnalysisDashboard() {
  const {
    bundleInfo,
    analysis,
    isAnalyzing,
    analyzeBundle,
    formatSize,
    getStats
  } = useBundleAnalysis();

  const {
    optimizations,
    isOptimizing,
    applyOptimizations
  } = usePerformanceOptimizations();

  const [selectedTab, setSelectedTab] = useState<'overview' | 'chunks' | 'recommendations'>('overview');

  const stats = getStats();

  const handleAnalyze = async () => {
    await analyzeBundle();
    toast.success('📦 Análise do bundle concluída!');
  };

  const handleOptimize = async () => {
    await applyOptimizations();
    toast.success('⚡ Otimizações aplicadas!');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'js': return <Code className="w-4 h-4" />;
      case 'css': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'js': return 'bg-blue-100 text-blue-800';
      case 'css': return 'bg-green-100 text-green-800';
      case 'image': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📦 Análise de Bundle</h1>
          <p className="text-gray-600">Otimização e monitoramento do bundle da aplicação</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="outline"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Analisar Bundle
          </Button>
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isOptimizing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Otimizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Tamanho Total</p>
                  <p className="text-2xl font-bold">{stats.totalSize}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Download className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Tamanho Gzipped</p>
                  <p className="text-2xl font-bold">{stats.totalGzippedSize}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingDown className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Compressão</p>
                  <p className="text-2xl font-bold">{stats.compressionRatio}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Chunks</p>
                  <p className="text-2xl font-bold">{stats.chunkCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'overview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setSelectedTab('chunks')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'chunks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chunks
        </button>
        <button
          onClick={() => setSelectedTab('recommendations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'recommendations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Recomendações
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Maiores Chunks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Maiores Chunks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis?.largestChunks.map((chunk, index) => (
                  <div key={chunk.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getTypeColor(chunk.type)}>
                        {getTypeIcon(chunk.type)}
                        <span className="ml-1">{chunk.type.toUpperCase()}</span>
                      </Badge>
                      <div>
                        <p className="font-medium">{chunk.name}</p>
                        <p className="text-sm text-gray-600">{chunk.url}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatSize(chunk.size)}</p>
                      <p className="text-sm text-gray-600">Gzipped: {formatSize(chunk.gzippedSize)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Otimizações Aplicadas */}
          {optimizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Otimizações Aplicadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimizations.map((optimization, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{optimization}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedTab === 'chunks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Todos os Chunks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bundleInfo.map((bundle, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getTypeColor(bundle.type)}>
                      {getTypeIcon(bundle.type)}
                      <span className="ml-1">{bundle.type.toUpperCase()}</span>
                    </Badge>
                    <div>
                      <p className="font-medium">{bundle.name}</p>
                      <p className="text-sm text-gray-600">{bundle.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatSize(bundle.size)}</p>
                    <p className="text-sm text-gray-600">Gzipped: {formatSize(bundle.gzippedSize)}</p>
                    <div className="w-32 mt-1">
                      <Progress 
                        value={(bundle.size / Math.max(...bundleInfo.map(b => b.size))) * 100} 
                        className="h-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Recomendações de Otimização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis?.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
                {analysis?.recommendations.length === 0 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm">Nenhuma recomendação de otimização encontrada!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Módulos Duplicados */}
          {analysis?.duplicateModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Módulos Duplicados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.duplicateModules.map((module, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded text-sm">
                      {module}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Módulos Não Utilizados */}
          {analysis?.unusedModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Módulos Não Utilizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.unusedModules.map((module, index) => (
                    <div key={index} className="p-2 bg-orange-50 rounded text-sm">
                      {module}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

