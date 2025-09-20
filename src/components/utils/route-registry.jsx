// Route Registry: Centralized route management and builders
export class RouteRegistry {
  static routes = {
    // Main App Routes
    home: '/',
    today: '/today',
    dashboard: '/dashboard',
    
    // Client Routes
    clients: '/clients',
    client: '/clients/:clientId',
    clientBrief: '/clients/:clientId/brief',
    clientEvolution: '/clients/:clientId/evolution',
    clientLibrary: '/clients/:clientId/library',
    
    // Service Routes
    clientService: '/clients/:clientId/services/:serviceId',
    clientServiceCycle: '/clients/:clientId/services/:serviceId/cycles/:cycleId',
    clientServiceCyclePlan: '/clients/:clientId/services/:serviceId/cycles/:cycleId/plan',
    clientServiceCycleClose: '/clients/:clientId/services/:serviceId/cycles/:cycleId/close',
    
    // Global Routes
    briefings: '/briefings',
    briefingEditor: '/briefing-editor',
    insights: '/insights',
    insightsEditor: '/insights-editor',
    scopeGenerator: '/scope-generator',
    scopeEditor: '/scope-editor',
    library: '/library',
    playbooks: '/playbooks',
    
    // Settings Routes
    settings: '/settings',
    agencySettings: '/agency-settings',
    agencyPolicies: '/agency-policies',
    agencyIdentitySettings: '/agency-identity-settings',
    notificationPreferences: '/notification-preferences',
    myAccount: '/my-account',
    
    // Service Management
    services: '/services',
    serviceEditor: '/service-editor',
    servicePolicies: '/services/policies',
    
    // Public Routes
    rcPublic: '/rc/:token',
    clientPortal: '/c/:clientSlug',
    publicApproval: '/public-approval',
    
    // Auth Routes
    passwordReset: '/password-reset'
  };

  // Route builders with parameter validation
  static builders = {
    home: () => '/',
    today: () => '/today',
    dashboard: () => '/dashboard',
    
    clients: () => '/clients',
    client: (clientId) => {
      if (!clientId) throw new Error('clientId is required');
      return `/clients/${clientId}`;
    },
    
    clientBrief: (clientId) => {
      if (!clientId) throw new Error('clientId is required');
      return `/clients/${clientId}/brief`;
    },
    
    clientEvolution: (clientId) => {
      if (!clientId) throw new Error('clientId is required');
      return `/clients/${clientId}/evolution`;
    },
    
    clientLibrary: (clientId) => {
      if (!clientId) throw new Error('clientId is required');
      return `/clients/${clientId}/library`;
    },
    
    clientService: (clientId, serviceId) => {
      if (!clientId || !serviceId) throw new Error('clientId and serviceId are required');
      return `/clients/${clientId}/services/${serviceId}`;
    },
    
    clientServiceCycle: (clientId, serviceId, cycleId) => {
      if (!clientId || !serviceId || !cycleId) throw new Error('clientId, serviceId and cycleId are required');
      return `/clients/${clientId}/services/${serviceId}/cycles/${cycleId}`;
    },
    
    clientServiceCyclePlan: (clientId, serviceId, cycleId) => {
      if (!clientId || !serviceId || !cycleId) throw new Error('clientId, serviceId and cycleId are required');
      return `/clients/${clientId}/services/${serviceId}/cycles/${cycleId}/plan`;
    },
    
    clientServiceCycleClose: (clientId, serviceId, cycleId) => {
      if (!clientId || !serviceId || !cycleId) throw new Error('clientId, serviceId and cycleId are required');
      return `/clients/${clientId}/services/${serviceId}/cycles/${cycleId}/close`;
    },
    
    briefingEditor: (briefId) => {
      if (!briefId) return '/briefing-editor';
      return `/briefing-editor?id=${briefId}`;
    },
    
    insightsEditor: (insightId) => {
      if (!insightId) return '/insights-editor';
      return `/insights-editor?id=${insightId}`;
    },
    
    scopeEditor: (scopeId) => {
      if (!scopeId) return '/scope-editor';
      return `/scope-editor?id=${scopeId}`;
    },
    
    serviceEditor: (serviceId) => {
      if (!serviceId) return '/service-editor';
      return `/service-editor?id=${serviceId}`;
    },
    
    rcPublic: (token) => {
      if (!token) throw new Error('token is required');
      return `/rc/${token}`;
    },
    
    clientPortal: (clientSlug) => {
      if (!clientSlug) throw new Error('clientSlug is required');
      return `/c/${clientSlug}`;
    },
    
    // Utility builders
    withQuery: (path, params) => {
      if (!params || Object.keys(params).length === 0) return path;
      const query = new URLSearchParams(params).toString();
      return `${path}?${query}`;
    },
    
    withFragment: (path, fragment) => {
      return fragment ? `${path}#${fragment}` : path;
    }
  };

  // Validation helpers
  static isValidRoute(path) {
    try {
      const url = new URL(path, 'http://localhost');
      return url.pathname.startsWith('/');
    } catch {
      return false;
    }
  }

  static extractParams(routePattern, actualPath) {
    const patternParts = routePattern.split('/');
    const pathParts = actualPath.split('/');
    const params = {};

    if (patternParts.length !== pathParts.length) return null;

    for (let i = 0; i < patternParts.length; i++) {
      const pattern = patternParts[i];
      const path = pathParts[i];

      if (pattern.startsWith(':')) {
        const paramName = pattern.slice(1);
        params[paramName] = path;
      } else if (pattern !== path) {
        return null;
      }
    }

    return params;
  }

  static matchRoute(path) {
    const cleanPath = path.split('?')[0].split('#')[0];
    
    for (const [name, pattern] of Object.entries(this.routes)) {
      const params = this.extractParams(pattern, cleanPath);
      if (params !== null) {
        return { name, pattern, params };
      }
    }
    
    return null;
  }

  // Smoke test all routes
  static async smokeTest() {
    const results = [];
    
    // Test routes with mock data
    const testData = {
      clientId: 'client_test_123',
      serviceId: 'service_test_123',
      cycleId: 'cycle_test_123',
      briefId: 'brief_test_123',
      token: 'test_token_123',
      clientSlug: 'test-client'
    };

    for (const [name, builder] of Object.entries(this.builders)) {
      if (typeof builder !== 'function') continue;
      
      try {
        let path;
        
        // Call builder with appropriate test data
        if (name.includes('client') && name.includes('cycle')) {
          path = builder(testData.clientId, testData.serviceId, testData.cycleId);
        } else if (name.includes('client') && name.includes('service')) {
          path = builder(testData.clientId, testData.serviceId);
        } else if (name.includes('client')) {
          path = builder(testData.clientId);
        } else if (name.includes('rc')) {
          path = builder(testData.token);
        } else if (name.includes('portal')) {
          path = builder(testData.clientSlug);
        } else if (name.includes('editor') && name !== 'serviceEditor') {
          path = builder(testData.briefId);
        } else {
          path = builder();
        }

        results.push({
          name,
          path,
          status: this.isValidRoute(path) ? 'ROUTE_OK' : 'ROUTE_INVALID',
          valid: true
        });

      } catch (error) {
        results.push({
          name,
          status: 'ROUTE_ERROR',
          error: error.message,
          valid: false
        });
      }
    }

    return results;
  }
}

// Export builders for easier use
export const routes = RouteRegistry.builders;

// Backward compatibility with createPageUrl
export const createPageUrl = (path, params) => {
  if (params) {
    return RouteRegistry.builders.withQuery(path, params);
  }
  return path.startsWith('/') ? path : `/${path}`;
};