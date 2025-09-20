
import React, { useState, useEffect } from 'react';
import { useClient } from '../../layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  const getChangeIcon = () => {
    if (changeType === 'up') return <ArrowUp className="w-3 h-3" />;
    if (changeType === 'down') return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getChangeColor = () => {
    if (changeType === 'up') return 'text-green-600 bg-green-100';
    if (changeType === 'down') return 'text-red-600 bg-red-100';
    return 'text-slate-600 bg-slate-100';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{title}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
          {change && (
            <Badge variant="outline" className={`${getChangeColor()} border-0 text-xs`}>
              {getChangeIcon()}
              <span className="ml-1">{change}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyReports = () => (
  <div className="text-center py-16">
    <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
    <h3 className="text-xl font-semibold text-slate-900 mb-2">
      Relatórios em desenvolvimento
    </h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      Os relatórios detalhados de performance e métricas estarão disponíveis em breve. 
      Por enquanto, você pode ver as métricas básicas acima.
    </p>
    <div className="flex gap-3 justify-center">
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Exportar Dados Básicos
      </Button>
      <Button>
        <Eye className="w-4 h-4 mr-2" />
        Ver Métricas Simples
      </Button>
    </div>
  </div>
);

export default function ReportsTab({ customerId }) {
  const { client } = useClient();
  const [selectedPeriod, setSelectedPeriod] = useState('last_30_days');
  const [loading, setLoading] = useState(true);

  // Simulated data - replace with real metrics when available
  const metrics = {
    plans_created: { value: 8, change: '+2', changeType: 'up' },
    approval_rate: { value: '92%', change: '+5%', changeType: 'up' },
    avg_approval_time: { value: '2.3 dias', change: '-0.5', changeType: 'up' },
    learnings_captured: { value: 15, change: '+8', changeType: 'up' },
    completion_score: { value: '85%', change: '+12%', changeType: 'up' },
    cycle_efficiency: { value: '78%', change: '-2%', changeType: 'down' }
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-6 bg-slate-200 rounded animate-pulse w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-600 mt-1">
            Performance e métricas de {client?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
              <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
              <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
              <SelectItem value="last_year">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Planejamentos Criados"
          value={metrics.plans_created.value}
          change={metrics.plans_created.change}
          changeType={metrics.plans_created.changeType}
          icon={Calendar}
          color="blue"
        />
        <MetricCard
          title="Taxa de Aprovação"
          value={metrics.approval_rate.value}
          change={metrics.approval_rate.change}
          changeType={metrics.approval_rate.changeType}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Tempo Médio de Aprovação"
          value={metrics.avg_approval_time.value}
          change={metrics.avg_approval_time.change}
          changeType={metrics.avg_approval_time.changeType}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Aprendizados Capturados"
          value={metrics.learnings_captured.value}
          change={metrics.learnings_captured.change}
          changeType={metrics.learnings_captured.changeType}
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          title="Score de Completude"
          value={metrics.completion_score.value}
          change={metrics.completion_score.change}
          changeType={metrics.completion_score.changeType}
          icon={BarChart3}
          color="green"
        />
        <MetricCard
          title="Eficiência de Ciclo"
          value={metrics.cycle_efficiency.value}
          change={metrics.cycle_efficiency.change}
          changeType={metrics.cycle_efficiency.changeType}
          icon={TrendingUp}
          color="red"
        />
      </div>

      {/* Detailed Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Relatórios Detalhados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyReports />
        </CardContent>
      </Card>
    </motion.div>
  );
}
