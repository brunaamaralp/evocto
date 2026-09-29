import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Alias legado — board canônico é /tasks-manager.
 */
export default function TasksBoardRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const base = createPageUrl('tasks-manager');
    navigate(`${base}${location.search || ''}${location.hash || ''}`, { replace: true });
  }, [navigate, location.search, location.hash]);

  return null;
}
