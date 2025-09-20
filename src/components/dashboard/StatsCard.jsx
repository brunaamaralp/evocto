import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Users, 
  Briefcase, Calendar, CheckCircle, Clock,
  AlertTriangle, FileText, Target
} from 'lucide-react';

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  trend = 'neutral',
  subtitle,
  badge,
  onClick 
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600 bg-emerald-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <Card 
      className={`hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        {Icon && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            {subtitle && (
              <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
            
            {change !== undefined && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
        </div>
        
        {changeType && (
          <p className="text-xs text-slate-500 mt-2">
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {change}% {changeType}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;