
/**
 * Utilitários de verificação/completude de briefing
 * Considera Brief (interno) e PublicBriefingResponse (público)
 */

export const calculateInternalBriefingCompleteness = (briefing) => {
  if (!briefing) return 0;

  // 1) Se houver completion_score válido (0-100), usar como fonte primária
  if (typeof briefing.completion_score === 'number' && briefing.completion_score >= 0 && briefing.completion_score <= 100) {
    return briefing.completion_score;
  }

  // 2) Fallback heurístico pelos campos essenciais
  const essentialFields = [
    'business_context',
    'company_profile',
    'current_challenges',
    'objectives',
    'success_metrics',
    'stakeholders',
    'additional_context'
  ];
  let done = 0;
  for (const f of essentialFields) {
    const v = briefing[f];
    if (typeof v === 'string' && v.trim().length > 10) done++;
  }
  return (done / essentialFields.length) * 100;
};

export const calculatePublicBriefingCompleteness = (publicResp) => {
  if (!publicResp) return 0;
  const pg = publicResp.progressData || {};
  if (pg.totalSteps && pg.totalSteps > 0) {
    const completed = Array.isArray(pg.completedQuestions)
      ? pg.completedQuestions.length
      : (pg.completedCount || 0);
    return Math.min(100, (completed / pg.totalSteps) * 100);
  }
  const responsesCount = publicResp.responses ? Object.keys(publicResp.responses).length : 0;
  // Heurística leve: 10 respostas ~ 100%
  return Math.max(0, Math.min(100, (responsesCount / 10) * 100));
};

export const isBriefingCompleted = (briefings = [], publicResponses = []) => {
  const internalOk = Array.isArray(briefings) && briefings.some(b => {
    const perc = calculateInternalBriefingCompleteness(b);
    return b?.status === 'READY' || perc >= 50;
  });

  const publicOk = Array.isArray(publicResponses) && publicResponses.some(r => {
    const perc = calculatePublicBriefingCompleteness(r);
    return r?.status === 'submitted' || perc >= 50;
  });

  return internalOk || publicOk;
};

export const getBriefingCompletionDetails = (briefings = [], publicResponses = []) => {
  const internals = (briefings || []).map(b => ({
    id: b?.id,
    type: 'internal',
    status: b?.status,
    percentage: calculateInternalBriefingCompleteness(b)
  }));
  const publics = (publicResponses || []).map(r => ({
    id: r?.id,
    type: 'public',
    status: r?.status,
    percentage: calculatePublicBriefingCompleteness(r)
  }));
  const all = [...internals, ...publics];
  const best = all.length ? Math.max(...all.map(x => x.percentage || 0)) : 0;

  return {
    completed: isBriefingCompleted(briefings, publicResponses),
    bestPercentage: best,
    sources: all
  };
};
