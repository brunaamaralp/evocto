import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import countBy from 'lodash/countBy';
import orderBy from 'lodash/orderBy';

function getItemDate(item) {
  const raw = item.date || item.created_date || item.createdAt;
  if (!raw) return null;
  try {
    return typeof raw === 'string' && raw.includes('T') ? parseISO(raw) : new Date(raw);
  } catch {
    return new Date(raw);
  }
}

function getMetrics(item) {
  return item.businessMetricJSON || item.metrics || null;
}

export default function MetricsView({ events, learnings }) {
  const items = (events?.length ? events : learnings) || [];

  const eventsByMonth = useMemo(() => {
    const withDates = items.filter((item) => getItemDate(item));
    const counts = countBy(withDates, (item) => format(getItemDate(item), 'yyyy-MM'));
    const data = Object.entries(counts).map(([month, count]) => ({
      month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
      sortKey: month,
      eventos: count
    }));
    return orderBy(data, (d) => d.sortKey, 'asc');
  }, [items]);

  const typeFrequency = useMemo(() => {
    const types = items.map((item) => item.type || item.sourceType || item.trigger).filter(Boolean);
    const counts = countBy(types);
    return orderBy(Object.entries(counts), ([, count]) => count, 'desc').slice(0, 10);
  }, [items]);

  const businessMetrics = useMemo(() => {
    const metrics = items
      .map((item) => getMetrics(item))
      .filter((m) => m && m.month)
      .map((m) => ({
        ...m,
        monthLabel: format(parseISO(`${m.month}-01`), 'MMM/yy', { locale: ptBR })
      }));
    return orderBy(metrics, (m) => m.month, 'asc');
  }, [items]);

  const hasRevenue = businessMetrics.some((m) => m.revenue != null);
  const hasLeads = businessMetrics.some((m) => m.leads != null);
  const hasCpl = businessMetrics.some((m) => m.cpl != null);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="md:col-span-2 rounded-2xl border-transparent shadow-sm">
        <CardHeader>
          <CardTitle>Eventos por Mês</CardTitle>
          <CardDescription>Volume de registros de evolução ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsByMonth.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum evento com data para graficar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="eventos" fill="#6C47D8" name="Nº de Eventos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2 rounded-2xl border-transparent shadow-sm">
        <CardHeader>
          <CardTitle>Métricas de Negócio</CardTitle>
          <CardDescription>Receita, leads e CPL registrados nos eventos de evolução.</CardDescription>
        </CardHeader>
        <CardContent>
          {businessMetrics.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma métrica registrada ainda. Use &quot;Registrar&quot; e preencha receita, leads ou CPL.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={businessMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis />
                <Tooltip />
                <Legend />
                {hasRevenue && <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Receita" />}
                {hasLeads && <Line type="monotone" dataKey="leads" stroke="#8b5cf6" name="Leads" />}
                {hasCpl && <Line type="monotone" dataKey="cpl" stroke="#f97316" name="CPL" />}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 rounded-2xl border-transparent shadow-sm">
        <CardHeader>
          <CardTitle>Tipos mais frequentes</CardTitle>
          <CardDescription>Quais registros aparecem com mais frequência na evolução.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {typeFrequency.map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-sm px-4 py-2">
                {type} <span className="ml-2 bg-[#D4CBF5] text-[#6C47D8] text-xs font-bold px-2 rounded-full">{count}</span>
              </Badge>
            ))}
            {typeFrequency.length === 0 && <p className="text-sm text-slate-500">Nenhum tipo registrado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
