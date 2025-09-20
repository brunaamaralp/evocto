import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Target,
  Lightbulb,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';

const getEventIcon = (sourceType) => {
  switch (sourceType) {
    case 'briefing': return Target;
    case 'meeting': return FileText;
    case 'execution': return TrendingUp;
    case 'feedback': return Lightbulb;
    default: return Clock;
  }
};

export default function TimelineView({ learnings }) {
  if (!learnings || learnings.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Nenhum aprendizado registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {learnings.map((learning, index) => {
        const Icon = getEventIcon(learning.sourceType);
        
        return (
          <div key={learning.id} className="relative flex items-start gap-4">
            {/* Timeline line */}
            {index < learnings.length - 1 && (
              <div className="absolute left-6 top-12 w-px h-16 bg-gradient-to-b from-purple-200 to-slate-200" />
            )}
            
            {/* Timeline dot */}
            <div className="w-12 h-12 rounded-full bg-white border-4 border-purple-200 flex items-center justify-center flex-shrink-0 z-10">
              <Icon className="w-5 h-5 text-purple-600" />
            </div>
            
            {/* Content */}
            <Card className="flex-1 shadow-md border-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-900">{learning.title}</h4>
                  <span className="text-xs text-slate-500">
                    {format(new Date(learning.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 mb-3">{learning.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {learning.niche && (
                    <Badge variant="secondary" className="text-xs">
                      {learning.niche}
                    </Badge>
                  )}
                  {learning.format && (
                    <Badge variant="outline" className="text-xs">
                      {learning.format}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {learning.sourceType}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}