/**
 * Resolve nomes de ícone do mapa canônico → componentes Lucide.
 * Mantido fora de taskStatusCanonical.js para o lib permanecer testável sem React.
 */

import {
  Circle,
  Play,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Pause,
} from 'lucide-react';

const ICONS = {
  Circle,
  Play,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Pause,
};

/**
 * @param {string|null|undefined} iconName
 * @returns {import('lucide-react').LucideIcon}
 */
export function resolveTaskStatusIcon(iconName) {
  return ICONS[iconName] || Circle;
}
