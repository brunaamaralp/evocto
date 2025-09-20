import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Badge para indicar status de auditoria de desenvolvimento
 */
export default function DevAuditBadge({ 
  status = 'info', 
  message = '', 
  className = '' 
}) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          className: 'bg-green-100 text-green-700 border-green-200',
          iconClassName: 'text-green-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          iconClassName: 'text-yellow-600'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          className: 'bg-red-100 text-red-700 border-red-200',
          iconClassName: 'text-red-600'
        };
      case 'info':
      default:
        return {
          icon: Info,
          className: 'bg-blue-100 text-blue-700 border-blue-200',
          iconClassName: 'text-blue-600'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1 ${config.className} ${className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClassName}`} />
      {message && <span className="text-xs">{message}</span>}
    </Badge>
  );
}



