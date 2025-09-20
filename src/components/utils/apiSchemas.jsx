// Sistema de validação manual (sem dependência Zod)

// Validadores básicos
const validators = {
  string: (value, defaultValue = '') => 
    typeof value === 'string' ? value : defaultValue,
  
  number: (value, defaultValue = 0) => 
    typeof value === 'number' && !isNaN(value) ? value : defaultValue,
  
  boolean: (value, defaultValue = false) => 
    typeof value === 'boolean' ? value : defaultValue,
  
  email: (value, defaultValue = '') => {
    if (typeof value !== 'string') return defaultValue;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? value : defaultValue;
  },
  
  datetime: (value, defaultValue = new Date().toISOString()) => {
    if (typeof value !== 'string') return defaultValue;
    const date = new Date(value);
    return !isNaN(date.getTime()) ? value : defaultValue;
  },
  
  url: (value, defaultValue = '') => {
    if (typeof value !== 'string') return defaultValue;
    try {
      new URL(value);
      return value;
    } catch {
      return defaultValue;
    }
  },
  
  enum: (value, allowedValues, defaultValue) => 
    allowedValues.includes(value) ? value : defaultValue,
  
  array: (value, defaultValue = []) => 
    Array.isArray(value) ? value : defaultValue,
  
  object: (value, defaultValue = {}) => 
    (value && typeof value === 'object' && !Array.isArray(value)) ? value : defaultValue
};

// Schema base para entidades
const BaseEntitySchema = {
  parse: (data) => ({
    id: validators.string(data?.id),
    created_date: validators.datetime(data?.created_date),
    updated_date: validators.datetime(data?.updated_date),
    created_by: validators.email(data?.created_by)
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: BaseEntitySchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Schema para User
export const UserSchema = {
  parse: (data) => ({
    ...BaseEntitySchema.parse(data),
    full_name: validators.string(data?.full_name, ''),
    email: validators.email(data?.email),
    role: validators.enum(data?.role, ['owner', 'admin', 'team', 'client'], 'client'),
    agencyId: data?.agencyId ? validators.string(data.agencyId) : undefined,
    clientId: data?.clientId ? validators.string(data.clientId) : undefined
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: UserSchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Schema para Agency
export const AgencySchema = {
  parse: (data) => ({
    ...BaseEntitySchema.parse(data),
    agencyName: validators.string(data?.agencyName),
    contactEmail: validators.email(data?.contactEmail),
    logoUrl: data?.logoUrl ? validators.url(data.logoUrl) : undefined,
    primaryColor: validators.string(data?.primaryColor, '#2563EB'),
    secondaryColor: validators.string(data?.secondaryColor, '#F1F5F9'),
    policies: validators.object(data?.policies, {
      rcExpiryDays: validators.number(data?.policies?.rcExpiryDays, 7),
      learningTriageHours: validators.number(data?.policies?.learningTriageHours, 48),
      digestTime: validators.string(data?.policies?.digestTime, '08:30'),
      quietHours: validators.object(data?.policies?.quietHours, {
        enabled: validators.boolean(data?.policies?.quietHours?.enabled, true),
        startTime: validators.string(data?.policies?.quietHours?.startTime, '20:00'),
        endTime: validators.string(data?.policies?.quietHours?.endTime, '08:00')
      }),
      confidenceAdditive: validators.number(data?.policies?.confidenceAdditive, 0.75),
      confidenceDisruptive: validators.number(data?.policies?.confidenceDisruptive, 0.9),
      isSharedDefault: validators.boolean(data?.policies?.isSharedDefault, false)
    })
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: AgencySchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Schema para Client
export const ClientSchema = {
  parse: (data) => ({
    ...BaseEntitySchema.parse(data),
    agencyId: validators.string(data?.agencyId),
    name: validators.string(data?.name),
    company: data?.company ? validators.string(data.company) : undefined,
    email: validators.email(data?.email),
    phone: data?.phone ? validators.string(data.phone) : undefined,
    industry: data?.industry ? validators.string(data.industry) : undefined,
    status: validators.enum(data?.status, ['ativo', 'inativo', 'prospecto'], 'prospecto')
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: ClientSchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Schema para Dashboard Stats
export const DashboardStatsSchema = {
  parse: (data) => ({
    totalClients: validators.number(data?.totalClients, 0),
    activeProjects: validators.number(data?.activeProjects, 0),
    pendingApprovals: validators.number(data?.pendingApprovals, 0),
    monthlyGrowth: validators.number(data?.monthlyGrowth, 0)
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: DashboardStatsSchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Schema para API Response wrapper
export const ApiResponseSchema = {
  parse: (data) => ({
    success: validators.boolean(data?.success),
    data: data?.data,
    error: data?.error ? validators.string(data.error) : undefined,
    message: data?.message ? validators.string(data.message) : undefined
  }),
  safeParse: (data) => {
    try {
      return { success: true, data: ApiResponseSchema.parse(data) };
    } catch (error) {
      return { success: false, error };
    }
  }
};

// Função helper para parsing seguro
export function safeParseOrFallback(schema, data, fallback) {
  if (data == null) return fallback;
  
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  
  console.warn('Schema validation failed:', result.error);
  return fallback;
}

// Hook para dados validados
import { useState, useEffect } from 'react';

export function useValidatedData(schema, initialData, fallback = null) {
  const [data, setData] = useState(() => 
    safeParseOrFallback(schema, initialData, fallback)
  );
  
  const setValidatedData = (newData) => {
    const validatedData = safeParseOrFallback(schema, newData, fallback);
    setData(validatedData);
  };
  
  return [data, setValidatedData];
}

// Validar array de dados
export function validateArray(schema, array, fallback = []) {
  if (!Array.isArray(array)) return fallback;
  
  return array
    .map(item => safeParseOrFallback(schema, item, null))
    .filter(item => item !== null);
}

// Hook para estado de dados com loading/error
export function useDataState(initialData = null) {
  const [state, setState] = useState({
    data: initialData,
    loading: false,
    error: null
  });

  const setData = (data) => {
    setState(prev => ({ ...prev, data, loading: false, error: null }));
  };

  const setLoading = (loading) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error) => {
    setState(prev => ({ ...prev, error, loading: false }));
  };

  return {
    ...state,
    setState,
    setData,
    setLoading,
    setError
  };
}