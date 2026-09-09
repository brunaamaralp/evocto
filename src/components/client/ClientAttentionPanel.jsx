import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';

const TYPE_STYLES = {
  task_overdue: { icon: AlertTriangle, badge: 'Atrasada', className: 'text-red-600' },
  task_urgent: { icon: AlertTriangle, badge: 'Urgente', className: 'text-orange-600' },
  approval_pending: { icon: Clock, badge: 'Aprovação', className: 'text-amber-600' },
  cycle_pending: { icon: Clock, badge: 'Ciclo', className: 'text-blue-600' },
  brief_incomplete: { icon: FileText, badge: 'Briefing', className: 'text-purple-600' },
};

export default function ClientAttentionPanel({ items = [] }) {
  return (
    <Card className="h-full border-amber-200/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Merece atenção
          </span>
          {items.length > 0 && (
            <Badge variant="secondary">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-100 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-emerald-900">Nada pendente</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Sem tarefas atrasadas, aprovações ou briefings travados neste cliente.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const style = TYPE_STYLES[item.type] || TYPE_STYLES.task_urgent;
              const Icon = style.icon;
              return (
                <li key={item.id}>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-auto justify-between px-3 py-3"
                  >
                    <Link to={item.href}>
                      <div className="flex items-start gap-3 text-left min-w-0">
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.className}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {style.badge}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
