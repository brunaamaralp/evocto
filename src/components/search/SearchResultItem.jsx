
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Users, Briefcase, RotateCcw, FileText, Library, GitBranch, File, Package
} from 'lucide-react';

const typeConfig = {
  client: { icon: Users, color: 'text-sky-500' },
  service: { icon: Package, color: 'text-indigo-500' },
  cycle: { icon: RotateCcw, color: 'text-amber-500' },
  workorder: { icon: Briefcase, color: 'text-rose-500' },
  masterBrief: { icon: FileText, color: 'text-slate-500' },
  cyclePlan: { icon: File, color: 'text-slate-500' },
  learningEntry: { icon: Library, color: 'text-emerald-500' },
  evolutionEvent: { icon: GitBranch, color: 'text-purple-500' },
};

// Helper function to create base page URLs
// Assumes that pathSegment directly corresponds to the route part (e.g., 'client' -> '/client')
const createPageUrl = (pathSegment) => `/${pathSegment}`;

/**
 * Determines the navigation URL for a given search result item.
 * This function consolidates the logic for generating dynamic URLs based on item type.
 *
 * @param {object} item - The search result item containing type, id, and optional metadata.
 * @returns {string} The constructed URL for the item.
 */
const getResultUrl = (item) => {
  switch (item.type) {
    case 'client':
      return createPageUrl('client') + `?clientId=${item.id}`;
    case 'service':
      return createPageUrl('service-detail') + `?serviceId=${item.id}`;
    case 'task':
      return createPageUrl('client-tasks') + `?taskId=${item.id}`;
    case 'briefing':
      // Assumes item.metadata will contain clientId for briefings
      return createPageUrl('client-briefing') + `?clientId=${item.metadata?.clientId}`;
    case 'document':
      return createPageUrl('client-documents') + `?documentId=${item.id}`;
    default:
      // Fallback for types not explicitly handled, or for client-cycles
      // as per the request to remove references to client-cycles and clean navigation.
      return createPageUrl('dashboard');
  }
};

export default function SearchResultItem({ item, isActive, onClick }) {
  const config = typeConfig[item.type] || { icon: FileText, color: 'text-slate-500' };
  const Icon = config.icon;

  // Generate the href dynamically using the getResultUrl function
  const itemHref = getResultUrl(item);

  return (
    <Link to={itemHref} onClick={onClick} className="block">
      <div
        className={`flex items-center justify-between p-3 rounded-md transition-colors ${
          isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <Icon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
            <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
          </div>
        </div>
        <div className="ml-4">
          <Badge variant="outline" className="text-xs font-mono">{item.meta}</Badge>
        </div>
      </div>
    </Link>
  );
}
