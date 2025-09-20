import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Plus } from 'lucide-react';
import { useSession } from '../auth/SessionManager';
import { useAuthorization } from '../auth/useAuthorization';
import QuickCreateModal from './QuickCreateModal';

export default function LearningButton({ 
  variant = 'default',
  size = 'default',
  projectId = null,
  preselectedSource = null,
  contextData = null,
  className = ''
}) {
  const { user } = useSession();
  const { can } = useAuthorization();
  const [showModal, setShowModal] = useState(false);

  // Only show for team members and above
  if (!user || !can('learning:create')) {
    return null;
  }

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`gap-2 ${className}`}
      >
        <Lightbulb className="w-4 h-4" />
        <Plus className="w-3 h-3" />
        Aprendizado
      </Button>

      <QuickCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projectId={projectId}
        preselectedSource={preselectedSource}
        contextData={contextData}
      />
    </>
  );
}