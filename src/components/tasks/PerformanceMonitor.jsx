import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

// Hook para monitorar performance
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    taskCount: 0,
    memoryUsage: 0,
    fps: 0,
    loadTime: 0,
    cacheHitRate: 0,
    isVirtualized: false
  });

  const [isVisible, setIsVisible] = useState(false);
  const renderStartTime = React.useRef(Date.now());
  const frameCount = React.useRef(0);
  const lastFpsUpdate = React.useRef(Date.now());

  // Medir tempo de render
  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback((taskCount, isVirtualized = false) => {
    const renderTime = performance.now() - renderStartTime.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime),
      taskCount,
      isVirtualized
    }));
  }, []);

  // Monitorar FPS
  useEffect(() => {
    let animationId;
    
    const measureFPS = () => {
      frameCount.current++;
      const now = Date.now();
      
      if (now - lastFpsUpdate.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastFpsUpdate.current));
        
        setMetrics(prev => ({
          ...prev,
          fps
        }));
        
        frameCount.current = 0;
        lastFpsUpdate.current = now;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    if (isVisible) {
      measureFPS();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isVisible]);

  // Monitorar uso de memória
  useEffect(() => {
    const updateMemoryUsage = () => {
      if (performance.memory) {
        const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({
          ...prev,
          memoryUsage
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    isVisible,
    setIsVisible,
    startRender,
    endRender
  };
}

// Componente visual do monitor
export default function PerformanceMonitor({ 
  metrics, 
  isVisible, 
  onToggle 
}) {
  const getPerformanceStatus = (metrics) => {
    const { renderTime, fps, memoryUsage, taskCount } = metrics;
    
    if (renderTime > 500 || fps < 30 || memoryUsage > 100) {
      return { status: 'warning', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    }
    
    if (renderTime > 1000 || fps < 15 || memoryUsage > 200) {
      return { status: 'critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
    
    return { status: 'good', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const performanceStatus = getPerformanceStatus(metrics);
  const StatusIcon = performanceStatus.icon;

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-white shadow-lg"
      >
        <Activity className="w-4 h-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-xl bg-white/95 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Monitor
            <Badge className={`text-xs ${performanceStatus.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {performanceStatus.status}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" />
              Render
            </span>
            <span className={`font-mono ${metrics.renderTime > 500 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.renderTime}ms
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-600">
              <TrendingUp className="w-3 h-3" />
              FPS
            </span>
            <span className={`font-mono ${metrics.fps < 30 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.fps}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-600">
              <Database className="w-3 h-3" />
              Memória
            </span>
            <span className={`font-mono ${metrics.memoryUsage > 100 ? 'text-yellow-600' : 'text-green-600'}`}>
              {metrics.memoryUsage}MB
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-600">
              <Zap className="w-3 h-3" />
              Tarefas
            </span>
            <span className="font-mono text-blue-600">
              {metrics.taskCount}
            </span>
          </div>
        </div>

        {metrics.isVirtualized && (
          <div className="mt-3 pt-2 border-t">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              <Zap className="w-3 h-3 mr-1" />
              Virtualizado
            </Badge>
          </div>
        )}

        <div className="mt-3 pt-2 border-t text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>Status do Sistema</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                performanceStatus.status === 'good' ? 'bg-green-500' :
                performanceStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="capitalize">{performanceStatus.status}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}