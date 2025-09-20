/**
 * 🔐 Implementação de Autenticação Local
 * 
 * Suporte para Auth0, Keycloak e autenticação mock
 */

// Implementação Auth0
class Auth0Auth {
  constructor(config) {
    this.config = config;
    this.auth0Client = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      const { createAuth0Client } = await import('@auth0/auth0-spa-js');
      this.auth0Client = await createAuth0Client({
        domain: this.config.domain,
        clientId: this.config.clientId,
        authorizationParams: {
          redirect_uri: window.location.origin
        }
      });

      // Verificar se usuário já está logado
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      if (isAuthenticated) {
        this.currentUser = await this.auth0Client.getUser();
      }

      console.log('✅ Auth0 inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Auth0:', error);
      throw error;
    }
  }

  async login() {
    try {
      await this.auth0Client.loginWithRedirect();
    } catch (error) {
      console.error('❌ Erro no login Auth0:', error);
      throw error;
    }
  }

  async me() {
    try {
      if (!this.currentUser) {
        const isAuthenticated = await this.auth0Client.isAuthenticated();
        if (isAuthenticated) {
          this.currentUser = await this.auth0Client.getUser();
        }
      }
      return this.currentUser;
    } catch (error) {
      console.error('❌ Erro ao obter usuário Auth0:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
      this.currentUser = null;
    } catch (error) {
      console.error('❌ Erro no logout Auth0:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      return await this.auth0Client.getTokenSilently();
    } catch (error) {
      console.error('❌ Erro ao obter token Auth0:', error);
      throw error;
    }
  }
}

// Implementação Keycloak
class KeycloakAuth {
  constructor(config) {
    this.config = config;
    this.keycloak = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      const Keycloak = (await import('keycloak-js')).default;
      this.keycloak = new Keycloak({
        url: this.config.url,
        realm: this.config.realm,
        clientId: this.config.clientId
      });

      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
      });

      if (authenticated) {
        this.currentUser = this.keycloak.tokenParsed;
      }

      console.log('✅ Keycloak inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Keycloak:', error);
      throw error;
    }
  }

  async login() {
    try {
      await this.keycloak.login();
    } catch (error) {
      console.error('❌ Erro no login Keycloak:', error);
      throw error;
    }
  }

  async me() {
    try {
      if (this.keycloak.authenticated) {
        this.currentUser = this.keycloak.tokenParsed;
        return {
          id: this.currentUser.sub,
          email: this.currentUser.email,
          name: this.currentUser.name,
          agencyId: this.currentUser.agencyId || this.currentUser.organization,
          permissions: this.currentUser.permissions || []
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao obter usuário Keycloak:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.keycloak.logout();
      this.currentUser = null;
    } catch (error) {
      console.error('❌ Erro no logout Keycloak:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      return this.keycloak.token;
    } catch (error) {
      console.error('❌ Erro ao obter token Keycloak:', error);
      throw error;
    }
  }
}

// Implementação Mock (para desenvolvimento)
class MockAuth {
  constructor() {
    this.currentUser = null;
    this.users = [
      {
        id: 'mock-user-1',
        email: 'admin@evocto.com',
        name: 'Administrador',
        agencyId: 'mock-agency-1',
        permissions: ['admin', 'briefing:manage', 'service:manage']
      },
      {
        id: 'mock-user-2',
        email: 'consultant@evocto.com',
        name: 'Consultor',
        agencyId: 'mock-agency-1',
        permissions: ['briefing:create', 'service:read', 'task:manage']
      },
      {
        id: 'mock-user-3',
        email: 'client@evocto.com',
        name: 'Cliente',
        agencyId: 'mock-agency-1',
        permissions: ['briefing:read', 'service:read']
      }
    ];
    console.log('✅ Autenticação Mock inicializada');
  }

  async login(email = 'admin@evocto.com') {
    // Simular delay de login
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.users.find(u => u.email === email);
    if (user) {
      this.currentUser = user;
      return user;
    } else {
      throw new Error('Usuário não encontrado');
    }
  }

  async me() {
    return this.currentUser;
  }

  async logout() {
    // Simular delay de logout
    await new Promise(resolve => setTimeout(resolve, 200));
    this.currentUser = null;
  }

  async getAccessToken() {
    return 'mock-access-token';
  }

  // Métodos auxiliares para desenvolvimento
  switchUser(email) {
    const user = this.users.find(u => u.email === email);
    if (user) {
      this.currentUser = user;
      return user;
    }
    throw new Error('Usuário não encontrado');
  }

  getAvailableUsers() {
    return this.users.map(u => ({ email: u.email, name: u.name }));
  }
}

// Implementação JWT simples
class JWTAuth {
  constructor(config) {
    this.config = config;
    this.currentUser = null;
    this.secret = config.secret || 'your-secret-key';
  }

  async login(email, password) {
    // Simular validação de credenciais
    const user = await this.validateCredentials(email, password);
    if (user) {
      const token = this.generateToken(user);
      localStorage.setItem('auth_token', token);
      this.currentUser = user;
      return user;
    }
    throw new Error('Credenciais inválidas');
  }

  async me() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const user = this.verifyToken(token);
        this.currentUser = user;
        return user;
      } catch (error) {
        localStorage.removeItem('auth_token');
        return null;
      }
    }
    return null;
  }

  async logout() {
    localStorage.removeItem('auth_token');
    this.currentUser = null;
  }

  async getAccessToken() {
    return localStorage.getItem('auth_token');
  }

  async validateCredentials(email, password) {
    // Implementar validação real contra banco de dados
    // Por enquanto, mock simples
    if (email === 'admin@evocto.com' && password === 'admin123') {
      return {
        id: 'jwt-user-1',
        email,
        name: 'Administrador JWT',
        agencyId: 'jwt-agency-1',
        permissions: ['admin']
      };
    }
    return null;
  }

  generateToken(user) {
    // Implementação simples de JWT
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      ...user,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    }));
    const signature = btoa(this.secret);
    return `${header}.${payload}.${signature}`;
  }

  verifyToken(token) {
    const [header, payload, signature] = token.split('.');
    const user = JSON.parse(atob(payload));
    
    if (user.exp < Date.now()) {
      throw new Error('Token expirado');
    }
    
    return user;
  }
}

export { Auth0Auth, KeycloakAuth, MockAuth, JWTAuth };

