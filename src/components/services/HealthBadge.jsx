import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export default function HealthBadge({ status, size = 'default' }) {
  const config = {
    ok: {
      icon: CheckCircle,
      label: 'OK',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    attention: {
      icon: AlertTriangle,
      label: 'Atenção',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    critical: {
      icon: AlertCircle,
      label: 'Crítico',
      className: 'bg-red-100 text-red-800 border-red-200'
    }
  };

  const { icon: Icon, label, className } = config[status] || config.ok;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge className={`${className} border flex items-center gap-1`}>
      <Icon className={iconSize} />
      {size !== 'sm' && label}
    </Badge>
  );
}