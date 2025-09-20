import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, GitBranch } from 'lucide-react';

const iconMap = {
  result_outlier: TrendingUp,
  strategy_pivot: GitBranch,
};

export default function EvolutionPreview({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>5. Pré-visualização da Evolução</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map((event, i) => {
          const Icon = iconMap[event.type] || History;
          return (
            <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
              <Icon className="w-4 h-4 text-purple-600" />
              <span className="flex-1 text-sm">{event.title}</span>
              <Badge variant="outline" className="capitalize">{event.impact}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}