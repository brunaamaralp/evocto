import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Target,
  Lightbulb,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  BarChart3
} from 'lucide-react';

const TYPE_META = {
  briefing: { icon: Target, label: 'Briefing' },
  briefing_major_update: { icon: FileText, label: 'Briefing' },
  meeting: { icon: FileText, label: 'Reunião' },
  execution: { icon: TrendingUp, label: 'Execução' },
  feedback: { icon: Lightbulb, label: 'Feedback' },
  learning_applied: { icon: Lightbulb, label: 'Aprendizado aplicado' },
  milestone_achieved: { icon: CheckCircle, label: 'Marco' },
  plan_approved: { icon: CheckCircle, label: 'Plano aprovado' },
  metrics_recorded: { icon: BarChart3, label: 'Métricas' },
  other: { icon: Clock, label: 'Outro' },
};

const IMPACT_LABELS = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

function getItemDate(item) {
  const raw = item.date || item.created_date || item.createdAt;
  if (!raw) return null;
  try {
    return typeof raw === 'string' && raw.includes('T') ? parseISO(raw) : new Date(raw);
  } catch {
    return new Date(raw);
  }
}

export default function TimelineView({ events, learnings }) {
  const items = (events?.length ? events : learnings) || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Nenhum evento registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item, index) => {
        const typeKey = item.type || item.sourceType || 'other';
        const meta = TYPE_META[typeKey] || TYPE_META.other;
        const Icon = meta.icon;
        const date = getItemDate(item);
        const metrics = item.metrics || item.businessMetricJSON;
        
        return (
          <div key={item.id || index} className="relative flex items-start gap-4">
            {index < items.length - 1 && (
              <div className="absolute left-6 top-12 w-px h-16 bg-gradient-to-b from-[#D4CBF5] to-slate-200" />
            )}
            
            <div className="w-12 h-12 rounded-full bg-white border-4 border-[#D4CBF5] flex items-center justify-center flex-shrink-0 z-10">
              <Icon className="w-5 h-5 text-[#6C47D8]" />
            </div>
            
            <Card className="flex-1 shadow-sm border-0 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h4 className="font-semibold text-[#18162A]">{item.title}</h4>
                  {date && (
                    <span className="text-xs text-[#7A7595] shrink-0">
                      {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-sm text-[#7A7595] mb-3">{item.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {meta.label}
                  </Badge>
                  {item.impact && (
                    <Badge variant="outline" className="text-xs">
                      Impacto {IMPACT_LABELS[item.impact] || item.impact}
                    </Badge>
                  )}
                  {item.niche && (
                    <Badge variant="secondary" className="text-xs">
                      {item.niche}
                    </Badge>
                  )}
                  {item.format && (
                    <Badge variant="outline" className="text-xs">
                      {item.format}
                    </Badge>
                  )}
                </div>

                {metrics && (metrics.revenue != null || metrics.leads != null || metrics.cpl != null) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#7A7595]">
                    {metrics.month && <span>Mês: {metrics.month}</span>}
                    {metrics.revenue != null && <span>Receita: {Number(metrics.revenue).toLocaleString('pt-BR')}</span>}
                    {metrics.leads != null && <span>Leads: {metrics.leads}</span>}
                    {metrics.cpl != null && <span>CPL: {Number(metrics.cpl).toLocaleString('pt-BR')}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
