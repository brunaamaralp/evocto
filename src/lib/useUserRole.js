import { useSession } from '@/components/auth/SessionManager';

/** Resolve papel a partir da sessão Evocto. */
export function resolveFinanceNavRole(session) {
  if (!session?.user) return 'guest';
  if (session.isOwner?.() || session.user?.role === 'owner') return 'owner';
  if (session.isAdmin?.() || ['owner', 'admin'].includes(session.user?.role)) return 'admin';
  if (session.user?.role === 'client') return 'guest';
  return 'member';
}

/**
 * Papéis no hub financeiro — mapeia roles Evocto (owner/admin/team/client).
 * @returns {'owner'|'admin'|'member'|'guest'}
 */
export function useUserRole(_academy, _membership = null) {
  const session = useSession();
  return resolveFinanceNavRole(session);
}

export default useUserRole;
