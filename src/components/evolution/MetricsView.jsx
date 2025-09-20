import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import countBy from 'lodash/countBy';
import orderBy from 'lodash/orderBy';

export default function MetricsView({ learnings }) {

  const learningsByMonth = useMemo(() => {
    const counts = countBy(learnings, (l) => format(parseISO(l.created_date), 'yyyy-MM'));
    const data = Object.entries(counts).map(([month, count]) => ({
      month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
      aprendizados: count
    }));
    return orderBy(data, (d) => d.month, 'asc');
  }, [learnings]);

  const triggerFrequency = useMemo(() => {
    const triggers = learnings.map(l => l.trigger).filter(Boolean);
    const counts = countBy(triggers);
    return orderBy(Object.entries(counts), ([, count]) => count, 'desc').slice(0, 10);
  }, [learnings]);

  const businessMetrics = useMemo(() => {
    const metrics = learnings
      .filter(l => l.businessMetricJSON && l.businessMetricJSON.month)
      .map(l => ({
        ...l.businessMetricJSON,
        monthLabel: format(parseISO(`${l.businessMetricJSON.month}-01`), 'MMM/yy', { locale: ptBR })
      }));
    return orderBy(metrics, (m) => m.month, 'asc');
  }, [learnings]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Aprendizados por Mês</CardTitle>
          <CardDescription>Evolução da documentação de conhecimento ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={learningsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="aprendizados" fill="#3b82f6" name="Nº de Aprendizados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {businessMetrics.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Métricas de Negócio</CardTitle>
            <CardDescription>Correlação entre aprendizados e performance do negócio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={businessMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis />
                <Tooltip />
                <Legend />
                {businessMetrics[0]?.revenue !== undefined && <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Receita" />}
                {businessMetrics[0]?.leads !== undefined && <Line type="monotone" dataKey="leads" stroke="#8b5cf6" name="Leads" />}
                {businessMetrics[0]?.cpl !== undefined && <Line type="monotone" dataKey="cpl" stroke="#f97316" name="CPL" />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Gatilhos Psicológicos Mais Usados</CardTitle>
          <CardDescription>Identifique as abordagens mais recorrentes nas estratégias.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {triggerFrequency.map(([trigger, count]) => (
              <Badge key={trigger} variant="secondary" className="text-base px-4 py-2">
                {trigger} <span className="ml-2 bg-blue-200 text-blue-800 text-xs font-bold px-2 rounded-full">{count}</span>
              </Badge>
            ))}
            {triggerFrequency.length === 0 && <p className="text-sm text-slate-500">Nenhum gatilho registrado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}