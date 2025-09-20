import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { healthMonitor } from './HealthAuditor';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wifi, 
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Dashboard completo de saúde da aplicação
 */
export default function HealthDashboard() {
  const [healthData, setHealthData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const updateHealth = () => {
      const data = healthMonitor.getHealthReport();
      setHealthData(data);
      
      // Adicionar ao histórico
      setHistoricalData(prev => {
        const newData = [...prev, {
          timestamp: Date.now(),
          criticalIssues: data.criticalIssues,
          warningIssues: data.warningIssues,
          networkErrors: data.networkErrors,
          avgResponseTime: data.performance.avgPageLoad || 0
        }];
        
        // Manter apenas últimos 100 pontos
        return newData.slice(-100);
      });
    };

    updateHealth();

    if (isLive) {
      const interval = setInterval(updateHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  if (!healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p>Carregando dados de saúde...</p>
        </div>
      </div>
    );
  }

  const getOverallHealth = () => {
    if (healthData.criticalIssues > 0) return { status: 'Critical', color: 'text-red-600', score: 25 };
    if (healthData.warningIssues > 5) return { status: 'Warning', color: 'text-yellow-600', score: 60 };
    if (healthData.warningIssues > 0) return { status: 'Good', color: 'text-blue-600', score: 85 };
    return { status: 'Excellent', color: 'text-green-600', score: 100 };
  };

  const overallHealth = getOverallHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Health Dashboard</h1>
          <p className="text-slate-600">Monitor real-time application performance and issues</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
            size="sm"
          >
            <Activity className={`w-4 h-4 mr-2 ${isLive ? 'animate-pulse' : ''}`} />
            {isLive ? 'Live' : 'Static'}
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Overall Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${overallHealth.color}`}>
                  {overallHealth.status}
                </span>
                <span className="text-lg font-semibold">
                  {overallHealth.score}/100
                </span>
              </div>
              <Progress value={overallHealth.score} className="h-3" />
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600">Uptime</div>
              <div className="text-lg font-bold">
                {Math.round(healthData.uptime / 1000 / 60)}m
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {healthData.criticalIssues}
                </div>
                <div className="text-sm text-slate-600">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {healthData.warningIssues}
                </div>
                <div className="text-sm text-slate-600">Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthData.networkErrors}
                </div>
                <div className="text-sm text-slate-600">Network Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {healthData.performance.avgPageLoad || 'N/A'}
                  {healthData.performance.avgPageLoad && 'ms'}
                </div>
                <div className="text-sm text-slate-600">Avg Load Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Chart */}
      {historicalData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Historical Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="criticalIssues" 
                    stroke="#DC2626" 
                    name="Critical Issues"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="warningIssues" 
                    stroke="#D97706" 
                    name="Warning Issues"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="networkErrors" 
                    stroke="#2563EB" 
                    name="Network Errors"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Active Issues</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="network">Network Health</TabsTrigger>
          <TabsTrigger value="components">Component Health</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Recent Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {healthData.recentIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">No Active Issues</h3>
                  <p className="text-slate-600">All systems are running normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {healthData.recentIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle 
                          className={`w-5 h-5 mt-0.5 ${
                            issue.severity === 'high' ? 'text-red-600' :
                            issue.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} 
                        />
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {issue.type.replace('_', ' ').toUpperCase()}
                          </h4>
                          <p className="text-slate-600 mt-1">{issue.message}</p>
                          {issue.count > 1 && (
                            <Badge variant="secondary" className="mt-2">
                              Occurred {issue.count} times
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(issue.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Load Time</span>
                    <Badge variant={
                      !healthData.performance.avgPageLoad ? 'secondary' :
                      healthData.performance.avgPageLoad < 1000 ? 'default' :
                      healthData.performance.avgPageLoad < 3000 ? 'secondary' : 'destructive'
                    }>
                      {healthData.performance.avgPageLoad ? 
                        `${healthData.performance.avgPageLoad}ms` : 'N/A'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slowest Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthData.performance.slowestComponents.slice(0, 5).map(([name, data]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="font-mono text-sm">{name}</span>
                      <Badge variant={data.avgTime > 100 ? 'destructive' : 'secondary'}>
                        {Math.round(data.avgTime)}ms
                      </Badge>
                    </div>
                  ))}
                  {healthData.performance.slowestComponents.length === 0 && (
                    <p className="text-slate-500 text-center py-4">
                      No performance data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Network Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    {healthData.performance.networkHealth.recentErrors}
                  </div>
                  <div className="text-sm text-slate-600">Recent Errors</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    {healthData.performance.networkHealth.errorRate}%
                  </div>
                  <div className="text-sm text-slate-600">Error Rate</div>
                </div>
                <div>
                  <Badge 
                    className={`text-lg px-4 py-2 ${
                      healthData.performance.networkHealth.status === 'critical' 
                        ? 'bg-red-100 text-red-800' :
                      healthData.performance.networkHealth.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}
                  >
                    {healthData.performance.networkHealth.status}
                  </Badge>
                  <div className="text-sm text-slate-600 mt-2">Overall Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>Component Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthData.slowComponents.map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-mono text-sm font-semibold">{name}</div>
                      <div className="text-xs text-slate-600">
                        {data.count} renders total
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
                {healthData.slowComponents.length === 0 && (
                  <p className="text-slate-500 text-center py-8">
                    No component performance data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}