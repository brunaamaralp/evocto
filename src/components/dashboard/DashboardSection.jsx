
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ActionableItemCard from './ActionableItemCard';

export default function DashboardSection({ 
  title, 
  description, 
  icon: Icon, 
  iconColor, 
  children,
  items = [],
  emptyState 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const safeItems = Array.isArray(items) ? items : [];
  const hasItems = safeItems.length > 0;

  // Usa a nova classe .card como base
  return (
    <div className="card p-0"> 
      <div className="flex flex-row items-center justify-between p-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColor.includes('red') ? 'bg-red-500/20' : iconColor.includes('yellow') ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-sm text-white/70 mt-1">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
