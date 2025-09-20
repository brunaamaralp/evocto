
import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Info, ExternalLink } from 'lucide-react';
import { useGlossary } from './Glossary';
import { glossaryData } from './glossaryData';

const I_TIP_SEEN_KEY = 'insightflow_itips_seen';

export default function ITip({ termSlug, placement = 'top' }) {
  const { openGlossary } = useGlossary();
  const [seenCount, setSeenCount] = useState(0);
  
  const termData = glossaryData.find(item => item.slug === termSlug);

  React.useEffect(() => {
    try {
      const seenData = JSON.parse(localStorage.getItem(I_TIP_SEEN_KEY) || '{}');
      setSeenCount(seenData[termSlug] || 0);
    } catch (e) { /* ignore */ }
  }, [termSlug]);

  const handleOpen = () => {
    try {
      const seenData = JSON.parse(localStorage.getItem(I_TIP_SEEN_KEY) || '{}');
      const newCount = (seenData[termSlug] || 0) + 1;
      seenData[termSlug] = newCount;
      localStorage.setItem(I_TIP_SEEN_KEY, JSON.stringify(seenData));
      setSeenCount(newCount);
    } catch (e) { /* ignore */ }
  };

  if (!termData || seenCount >= 3) {
    return null;
  }
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip onOpenChange={(isOpen) => isOpen && handleOpen()}>
        <TooltipTrigger asChild>
          <button className="ml-1.5 align-middle text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-full">
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={placement} className="max-w-xs p-3">
          <p className="text-sm font-medium mb-2">{termData.title}</p>
          <p className="text-xs text-slate-600 mb-3">{termData.short}</p>
          <Button 
            size="sm" 
            variant="secondary" 
            className="w-full h-8 text-xs"
            onClick={() => openGlossary(termSlug)}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            Saber mais no Glossário
          </Button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
