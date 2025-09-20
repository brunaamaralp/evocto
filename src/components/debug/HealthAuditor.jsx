import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Bug, 
  Activity,
  Download,
  RefreshCw,
  Eye,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Safe development detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

class HealthMonitor {
  constructor() {
    this.issues = [];
    this.performanceData = [];
    this.errorCounts = new Map();
    this.slowComponents = new Map();
    this.networkErrors = [];
    this.renderCycles = new Map();
    this.startTime = Date.now();
    
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
      this.setupPerformanceMonitoring();
      this.setupNetworkMonitoring();
    }
  }

  setupGlobalErrorHandlers() {
    // Capturar erros JavaScript globais
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        severity: 'high'
      });
    });

    // Capturar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        severity: 'medium'
      });
    });

    // Capturar erros de recursos (imagens, scripts, etc)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError({
          type: 'resource_error',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          timestamp: Date.now(),
          severity: 'low'
        });
      }
    }, true);
  }

  setupPerformanceMonitoring() {
    // Monitorar carregamentos lentos
    if ('PerformanceObserver' in window) {
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Detectar navegações lentas
          if (entry.entryType === 'navigation' && entry.loadEventEnd > 5000) {
            this.reportIssue({
              type: 'slow_page_load',
              message: `Page loaded in ${Math.round(entry.loadEventEnd)}ms (>5s)`,
              duration: entry.loadEventEnd,
              severity: 'medium'
            });
          }

          // Detectar recursos lentos
          if (entry.entryType === 'resource' && entry.duration > 3000) {
            this.reportIssue({
              type: 'slow_resource',
              message: `Resource loaded slowly: ${entry.name}`,
              duration: entry.duration,
              resource: entry.name,
              severity: 'low'
            });
          }
        }
      });

      try {
        perfObserver.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (e) {
        console.warn('Performance monitoring not supported');
      }
    }
  }

  setupNetworkMonitoring() {
    // Interceptar fetch para monitorar erros de rede
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        // Monitorar chamadas lentas
        if (duration > 10000) {
          this.reportIssue({
            type: 'slow_network',
            message: `Network request took ${duration}ms`,
            url: args[0],
            duration,
            severity: 'medium'
          });
        }

        // Monitorar erros HTTP
        if (!response.ok) {
          this.networkErrors.push({
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            timestamp: Date.now(),
            duration
          });

          if (response.status >= 500) {
            this.reportIssue({
              type: 'server_error',
              message: `Server error: ${response.status} ${response.statusText}`,
              url: args[0],
              status: response.status,
              severity: 'high'
            });
          }
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.reportError({
          type: 'network_error',
          message: `Network request failed: ${error.message}`,
          url: args[0],
          duration,
          severity: 'high'
        });
        throw error;
      }
    };
  }

  reportError(error) {
    // Contar ocorrências do mesmo erro
    const errorKey = `${error.type}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    this.issues.push({
      ...error,
      id: Date.now() + Math.random(),
      count: count + 1
    });

    // Log apenas em desenvolvimento
    if (isDevelopment) {
      console.error('[HealthMonitor] Error detected:', error);
    }
  }

  reportIssue(issue) {
    this.issues.push({
      ...issue,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    });

    if (isDevelopment) {
      console.warn('[HealthMonitor] Issue detected:', issue);
    }
  }

  reportSlowComponent(componentName, renderTime) {
    const existing = this.slowComponents.get(componentName) || { count: 0, totalTime: 0 };
    this.slowComponents.set(componentName, {
      count: existing.count + 1,
      totalTime: existing.totalTime + renderTime,
      avgTime: (existing.totalTime + renderTime) / (existing.count + 1),
      lastRenderTime: renderTime
    });

    if (renderTime > 100) { // Render > 100ms
      this.reportIssue({
        type: 'slow_component',
        message: `Component ${componentName} rendered slowly (${renderTime}ms)`,
        component: componentName,
        renderTime,
        severity: renderTime > 500 ? 'high' : 'medium'
      });
    }
  }

  reportInfiniteLoop(componentName, renderCount) {
    if (renderCount > 50) { // Mais de 50 renders em pouco tempo
      this.reportIssue({
        type: 'infinite_loop',
        message: `Possible infinite re-render detected in ${componentName}`,
        component: componentName,
        renderCount,
        severity: 'high'
      });
    }
  }

  getHealthReport() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    const criticalIssues = this.issues.filter(i => i.severity === 'high');
    const warningIssues = this.issues.filter(i => i.severity === 'medium');
    const infoIssues = this.issues.filter(i => i.severity === 'low');

    const recentNetworkErrors = this.networkErrors.filter(e => 
      now - e.timestamp < 300000 // Últimos 5 minutos
    );

    return {
      uptime,
      totalIssues: this.issues.length,
      criticalIssues: criticalIssues.length,
      warningIssues: warningIssues.length,
      infoIssues: infoIssues.length,
      networkErrors: recentNetworkErrors.length,
      slowComponents: Array.from(this.slowComponents.entries()),
      recentIssues: this.issues.slice(-20).reverse(),
      errorFrequency: Array.from(this.errorCounts.entries()),
      performance: {
        avgPageLoad: this.calculateAvgPageLoad(),
        slowestComponents: this.getSlowComponents(),
        networkHealth: this.getNetworkHealth()
      }
    };
  }

  calculateAvgPageLoad() {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        return Math.round(navEntries[0].loadEventEnd);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  getSlowComponents() {
    return Array.from(this.slowComponents.entries())
      .filter(([_, data]) => data.avgTime > 50)
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 10);
  }

  getNetworkHealth() {
    const recent = this.networkErrors.filter(e => 
      Date.now() - e.timestamp < 300000 // Últimos 5 minutos
    );
    
    const errorRate = recent.length / Math.max(1, recent.length + 10); // Assumindo ~10 requests ok
    
    return {
      recentErrors: recent.length,
      errorRate: Math.round(errorRate * 100),
      status: errorRate > 0.5 ? 'critical' : errorRate > 0.2 ? 'warning' : 'healthy'
    };
  }

  exportReport() {
    const report = this.getHealthReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearIssues() {
    this.issues = [];
    this.errorCounts.clear();
    this.networkErrors = [];
  }
}

// Instância global do monitor
const healthMonitor = new HealthMonitor();

// Hook para usar em componentes
export const useHealthMonitor = () => {
  const reportRender = useCallback((componentName, renderTime) => {
    healthMonitor.reportSlowComponent(componentName, renderTime);
  }, []);

  const reportLoop = useCallback((componentName, renderCount) => {
    healthMonitor.reportInfiniteLoop(componentName, renderCount);
  }, []);

  return { reportRender, reportLoop };
};

// Componente de auditoria
export default function HealthAuditor() {
  const [report, setReport] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refreshReport = useCallback(() => {
    setReport(healthMonitor.getHealthReport());
  }, []);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshReport, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshReport]);

  // Só mostrar em desenvolvimento ou para admins
  if (!isDevelopment && typeof window !== 'undefined') {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <Activity className="w-4 h-4 mr-2" />
          Health Monitor
          {report && report.criticalIssues > 0 && (
            <Badge variant="destructive" className="ml-2 px-1">
              {report.criticalIssues}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const getHealthStatus = () => {
    if (report.criticalIssues > 0) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (report.warningIssues > 3) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Application Health Monitor</h2>
            <Badge className={`${healthStatus.bg} ${healthStatus.color} border-current`}>
              {healthStatus.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-blue-600' : ''}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => healthMonitor.exportReport()}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">Uptime</div>
                    <div className="text-lg font-bold">
                      {Math.round(report.uptime / 1000 / 60)}m
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <div>
                    <div className="text-sm font-medium">Critical</div>
                    <div className="text-lg font-bold text-red-600">
                      {report.criticalIssues}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-yellow-600" />
                  <div>
                    <div className="text-sm font-medium">Warnings</div>
                    <div className="text-lg font-bold text-yellow-600">
                      {report.warningIssues}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Network</div>
                    <div className={`text-lg font-bold ${
                      report.performance.networkHealth.status === 'critical' ? 'text-red-600' :
                      report.performance.networkHealth.status === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {report.performance.networkHealth.status}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="issues" className="space-y-4">
            <TabsList>
              <TabsTrigger value="issues">Recent Issues</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-4">
              {report.recentIssues.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <h3 className="text-lg font-semibold mb-2">No Recent Issues</h3>
                    <p className="text-slate-600">Application is running smoothly</p>
                  </CardContent>
                </Card>
              ) : (
                report.recentIssues.map((issue) => (
                  <Alert key={issue.id} variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div>
                          <strong>{issue.type.replace('_', ' ').toUpperCase()}</strong>
                          <p className="mt-1">{issue.message}</p>
                          {issue.count > 1 && (
                            <Badge variant="secondary" className="mt-2">
                              Occurred {issue.count} times
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(issue.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Page Load Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {report.performance.avgPageLoad ? `${report.performance.avgPageLoad}ms` : 'N/A'}
                    </div>
                    <div className="text-sm text-slate-600">Average page load time</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Component Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.performance.slowestComponents.slice(0, 5).map(([name, data]) => (
                        <div key={name} className="flex justify-between items-center">
                          <span className="text-sm font-mono">{name}</span>
                          <Badge variant={data.avgTime > 100 ? 'destructive' : 'secondary'}>
                            {Math.round(data.avgTime)}ms
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Network Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">
                        {report.performance.networkHealth.recentErrors}
                      </div>
                      <div className="text-xs text-slate-600">Recent Errors</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">
                        {report.performance.networkHealth.errorRate}%
                      </div>
                      <div className="text-xs text-slate-600">Error Rate</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${
                        report.performance.networkHealth.status === 'critical' ? 'text-red-600' :
                        report.performance.networkHealth.status === 'warning' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {report.performance.networkHealth.status}
                      </div>
                      <div className="text-xs text-slate-600">Status</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="components" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Component Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.slowComponents.map(([name, data]) => (
                      <div key={name} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <div>
                          <div className="font-mono text-sm">{name}</div>
                          <div className="text-xs text-slate-600">
                            {data.count} renders
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(data.avgTime)}ms avg
                          </div>
                          <div className="text-xs text-slate-600">
                            Last: {Math.round(data.lastRenderTime)}ms
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                healthMonitor.clearIssues();
                refreshReport();
              }}
            >
              Clear Issues
            </Button>
            <div className="text-xs text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
              {autoRefresh && ' (Auto-refresh ON)'}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export { healthMonitor };