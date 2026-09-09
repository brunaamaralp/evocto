import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '../i18n/I18nProvider';
import EvoctoMascot from '@/components/brand/EvoctoMascot';

const OnboardingMascot = ({
  message,
  step,
  totalSteps,
  variant = 'default',
  showProgress = true,
  // API usada em welcome.jsx / marketing
  expression,
  size = 'md',
  showSpeechBubble = false,
  speechText,
}) => {
  const { t } = useTranslation();
  const isHero = Boolean(expression || showSpeechBubble || speechText || !message);

  if (isHero && !message) {
    const heroSize = size === 'large' ? 'large' : size === 'small' ? 'small' : size;
    return (
      <div className="relative inline-flex flex-col items-center">
        <EvoctoMascot size={heroSize} className="drop-shadow-sm" />
        {showSpeechBubble && speechText ? (
          <div className="mt-4 max-w-xs rounded-2xl border border-violet-100 bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm">
            {speechText}
          </div>
        ) : null}
      </div>
    );
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'celebration':
        return 'border-green-200 bg-green-50';
      case 'guidance':
        return 'border-violet-200 bg-violet-50';
      case 'encouragement':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'celebration':
        return 'text-green-800';
      case 'guidance':
        return 'text-violet-800';
      case 'encouragement':
        return 'text-purple-800';
      default:
        return 'text-slate-800';
    }
  };

  const getStepText = () => {
    if (t('common.language') === 'pt') {
      return `Passo ${step} de ${totalSteps}`;
    }
    return `Step ${step} of ${totalSteps}`;
  };

  return (
    <Card className={`${getVariantStyles()} border-2 transition-all duration-300 hover:shadow-md`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <EvoctoMascot size={56} mark className="shrink-0" />
          <div className="flex-1">
            {showProgress && step && totalSteps && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getStepText()}
                </Badge>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className={`${getTextColor()} leading-relaxed`}>
              {typeof message === 'string' && message.startsWith('onboarding.')
                ? t(message)
                : message}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const ONBOARDING_MESSAGES = {
  welcome: {
    message: "onboarding.welcome",
    variant: 'guidance'
  },
  addClient: {
    message: "onboarding.addClient",
    variant: 'guidance'
  },
  fillBriefing: {
    message: "onboarding.fillBriefing",
    variant: 'guidance'
  },
  generatePlan: {
    message: "onboarding.generatePlan",
    variant: 'encouragement'
  },
  sendApproval: {
    message: "onboarding.sendApproval",
    variant: 'guidance'
  },
  showLearnings: {
    message: "onboarding.showLearnings",
    variant: 'celebration'
  },
  completed: {
    message: "onboarding.completed",
    variant: 'celebration'
  },
  firstUse: {
    clients: "onboarding.firstUse.clients",
    briefing: "onboarding.firstUse.briefing",
    planning: "onboarding.firstUse.planning",
    learnings: "onboarding.firstUse.learnings"
  }
};

export default OnboardingMascot;
