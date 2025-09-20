import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lightbulb, Plus } from 'lucide-react';
import LearningButton from '../learnings/LearningButton';

export default function RecentLearnings({ learnings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Últimos Aprendizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {learnings && learnings.length > 0 ? (
          learnings.map(learning => (
            <div key={learning.id} className="space-y-1">
              <h4 className="text-sm font-semibold">{learning.title}</h4>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(learning.created_date), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Nenhum aprendizado recente.</p>
        )}
        <div className="pt-4 border-t">
          <LearningButton 
            variant="default"
            size="sm"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}