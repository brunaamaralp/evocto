import { useState, useEffect, useCallback } from 'react';
import { User, AuditLog } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TUTORIAL_STORAGE_KEY = 'insightflow_tutorial_progress';
const SKIP_DURATION_DAYS = 7;

export function useTutorial() {
  const navigate = useNavigate();
  const { user, agency } = useSession();
  const [progress, setProgress] = useState({
    client_created: false,
    service_contract_created: false,
    briefing_rc_created: false,
    cycle_plan_opened: false
  });
  const [isHidden, setIsHidden] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadTutorialState();
  }, [user]);

  const loadTutorialState = async () => {
    if (!user) return;

    try {
      // Check if user has completed tutorial
      if (user.tutorial_completed) {
        setIsCompleted(true);
        return;
      }

      // Load progress from localStorage (for session persistence)
      const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setProgress(data.progress || progress);
        
        // Check if hidden temporarily
        if (data.skippedAt) {
          const skipDate = new Date(data.skippedAt);
          const daysSinceSkip = (Date.now() - skipDate.getTime()) / (1000 * 60 * 60 * 24);
          setIsHidden(daysSinceSkip < SKIP_DURATION_DAYS);
        }
      }

      // Load actual completion events from audit log
      const auditEvents = await AuditLog.filter(
        { 
          agencyId: agency?.id,
          action: { 
            '$in': ['client_created', 'service_contract_created', 'briefing_rc_created', 'cycle_plan_opened'] 
          }
        },
        '-created_date',
        20
      );

      const eventProgress = {
        client_created: auditEvents.some(e => e.action === 'client_created'),
        service_contract_created: auditEvents.some(e => e.action === 'service_contract_created'),
        briefing_rc_created: auditEvents.some(e => e.action === 'briefing_rc_created'),
        cycle_plan_opened: auditEvents.some(e => e.action === 'cycle_plan_opened')
      };

      setProgress(eventProgress);

      // Check if all missions completed
      const allCompleted = Object.values(eventProgress).every(Boolean);
      if (allCompleted && !user.tutorial_completed) {
        await completeTutorial();
      }

    } catch (error) {
      console.error('Error loading tutorial state:', error);
    }
  };

  const markMissionComplete = useCallback(async (missionId) => {
    const newProgress = { ...progress, [missionId]: true };
    setProgress(newProgress);
    
    // Save to localStorage
    const tutorialData = {
      progress: newProgress,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialData));

    // Log the event
    try {
      await AuditLog.create({
        agencyId: agency?.id,
        entity_type: 'User',
        entity_id: user?.id,
        action: missionId,
        actor_id: user?.email,
        meta_json: {
          tutorial_step: missionId,
          completed_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging tutorial event:', error);
    }

    // Check if all completed
    const allCompleted = Object.values(newProgress).every(Boolean);
    if (allCompleted) {
      await completeTutorial();
    }
  }, [progress, agency, user]);

  const completeTutorial = async () => {
    try {
      await User.updateMyUserData({ 
        tutorial_completed: true,
        tutorial_completed_at: new Date().toISOString()
      });
      
      setIsCompleted(true);
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);

      // Log completion
      await AuditLog.create({
        agencyId: agency?.id,
        entity_type: 'User',
        entity_id: user?.id,
        action: 'tutorial_completed',
        actor_id: user?.email,
        meta_json: {
          completed_at: new Date().toISOString(),
          duration: 'calculated_on_backend' // Could be enhanced
        }
      });

    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const skipTutorial = useCallback(() => {
    const tutorialData = {
      progress,
      skippedAt: new Date().toISOString()
    };
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialData));
    setIsHidden(true);

    // Log skip event
    AuditLog.create({
      agencyId: agency?.id,
      entity_type: 'User',
      entity_id: user?.id,
      action: 'tutorial_skipped',
      actor_id: user?.email,
      meta_json: {
        skipped_at: new Date().toISOString(),
        progress_at_skip: progress
      }
    }).catch(console.error);
  }, [progress, agency, user]);

  const openDemoClient = useCallback(() => {
    // Navigate to demo client
    navigate(createPageUrl('clients/demo'));
    
    // Log demo access
    AuditLog.create({
      agencyId: agency?.id,
      entity_type: 'User',
      entity_id: user?.id,
      action: 'demo_client_accessed',
      actor_id: user?.email,
      meta_json: {
        accessed_at: new Date().toISOString(),
        tutorial_progress: progress
      }
    }).catch(console.error);
  }, [navigate, agency, user, progress]);

  return {
    progress,
    isCompleted,
    isHidden,
    markMissionComplete,
    skipTutorial,
    openDemoClient
  };
}