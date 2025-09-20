import React from 'react';
import { useSession } from '@/components/auth/SessionManager';

/**
 * Sistema de Feature Gates - controla acesso a funcionalidades
 */

// Feature flags disponíveis no sistema
export const FEATURES = {
  // Core features
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CONTENT_HELPER: 'content_helper',
  BETA_FEATURES: 'beta_features',
  AI_INSIGHTS: 'ai_insights',
  
  // Business features
  MULTI_CLIENT: 'multi_client',
  CUSTOM_REPORTS: 'custom_reports',
  API_ACCESS: 'api_access',
  WHITE_LABEL: 'white_label',
  
  // Admin features
  TEAM_MANAGEMENT: 'team_management',
  AUDIT_LOGS: 'audit_logs',
  SYSTEM_HEALTH: 'system_health'
};

// Configuração padrão de features por role
const DEFAULT_FEATURE_CONFIG = {
  owner: {
    [FEATURES.ADVANCED_ANALYTICS]: true,
    [FEATURES.CONTENT_HELPER]: true,
    [FEATURES.BETA_FEATURES]: true,
    [FEATURES.AI_INSIGHTS]: true,
    [FEATURES.MULTI_CLIENT]: true,
    [FEATURES.CUSTOM_REPORTS]: true,
    [FEATURES.API_ACCESS]: true,
    [FEATURES.WHITE_LABEL]: true,
    [FEATURES.TEAM_MANAGEMENT]: true,
    [FEATURES.AUDIT_LOGS]: true,
    [FEATURES.SYSTEM_HEALTH]: true,
  },
  admin: {
    [FEATURES.ADVANCED_ANALYTICS]: true,
    [FEATURES.CONTENT_HELPER]: true,
    [FEATURES.BETA_FEATURES]: false,
    [FEATURES.AI_INSIGHTS]: true,
    [FEATURES.MULTI_CLIENT]: true,
    [FEATURES.CUSTOM_REPORTS]: true,
    [FEATURES.API_ACCESS]: false,
    [FEATURES.WHITE_LABEL]: false,
    [FEATURES.TEAM_MANAGEMENT]: true,
    [FEATURES.AUDIT_LOGS]: true,
    [FEATURES.SYSTEM_HEALTH]: false,
  },
  team: {
    [FEATURES.ADVANCED_ANALYTICS]: false,
    [FEATURES.CONTENT_HELPER]: true,
    [FEATURES.BETA_FEATURES]: false,
    [FEATURES.AI_INSIGHTS]: true,
    [FEATURES.MULTI_CLIENT]: false,
    [FEATURES.CUSTOM_REPORTS]: false,
    [FEATURES.API_ACCESS]: false,
    [FEATURES.WHITE_LABEL]: false,
    [FEATURES.TEAM_MANAGEMENT]: false,
    [FEATURES.AUDIT_LOGS]: false,
    [FEATURES.SYSTEM_HEALTH]: false,
  },
  client: {
    [FEATURES.ADVANCED_ANALYTICS]: false,
    [FEATURES.CONTENT_HELPER]: false,
    [FEATURES.BETA_FEATURES]: false,
    [FEATURES.AI_INSIGHTS]: false,
    [FEATURES.MULTI_CLIENT]: false,
    [FEATURES.CUSTOM_REPORTS]: false,
    [FEATURES.API_ACCESS]: false,
    [FEATURES.WHITE_LABEL]: false,
    [FEATURES.TEAM_MANAGEMENT]: false,
    [FEATURES.AUDIT_LOGS]: false,
    [FEATURES.SYSTEM_HEALTH]: false,
  }
};

/**
 * Hook para verificar features
 */
export function useFeatures() {
  const { user, agency } = useSession();
  
  const hasFeature = (featureName) => {
    if (!user || !featureName) return false;
    
    // Verificar se a agência tem configuração específica
    const agencyFeatures = agency?.feature_flags || {};
    if (agencyFeatures.hasOwnProperty(featureName)) {
      return agencyFeatures[featureName];
    }
    
    // Fallback para configuração padrão por role
    const userRole = user.role || 'client';
    const roleFeatures = DEFAULT_FEATURE_CONFIG[userRole] || DEFAULT_FEATURE_CONFIG.client;
    
    return roleFeatures[featureName] || false;
  };
  
  const hasAnyFeature = (featureNames = []) => {
    return featureNames.some(featureName => hasFeature(featureName));
  };
  
  const hasAllFeatures = (featureNames = []) => {
    return featureNames.every(featureName => hasFeature(featureName));
  };
  
  return {
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    userRole: user?.role || 'client',
    features: FEATURES
  };
}

/**
 * Componente FeatureGate - mostra conteúdo apenas se feature estiver habilitada
 */
export default function FeatureGate({ 
  feature, 
  features = [], 
  requireAll = false,
  children, 
  fallback = null 
}) {
  const { hasFeature, hasAnyFeature, hasAllFeatures } = useFeatures();
  
  let isEnabled = false;
  
  if (feature) {
    // Verificação de feature única
    isEnabled = hasFeature(feature);
  } else if (features.length > 0) {
    // Verificação de múltiplas features
    isEnabled = requireAll ? hasAllFeatures(features) : hasAnyFeature(features);
  }
  
  if (!isEnabled) {
    return fallback;
  }
  
  return <>{children}</>;
}

/**
 * HOC para componentes que dependem de features
 */
export function withFeatureGate(Component, feature, fallbackComponent = null) {
  return function FeatureGatedComponent(props) {
    return (
      <FeatureGate feature={feature} fallback={fallbackComponent}>
        <Component {...props} />
      </FeatureGate>
    );
  };
}