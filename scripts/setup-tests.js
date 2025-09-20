#!/usr/bin/env node

/**
 * 🧪 Script de Setup para Testes
 * 
 * Configura ambiente de testes completo para o projeto
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestSetup {
  constructor() {
    this.testDependencies = [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'vitest',
      '@vitest/ui',
      'jsdom',
      'msw', // Mock Service Worker
      '@testing-library/react-hooks'
    ];
    
    this.testConfig = {
      vitest: {
        test: {
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.js'],
          globals: true
        }
      }
    };
  }

  async run() {
    console.log('🧪 Configurando ambiente de testes...\n');
    
    try {
      // 1. Instalar dependências
      await this.installDependencies();
      
      // 2. Criar estrutura de testes
      await this.createTestStructure();
      
      // 3. Configurar arquivos de teste
      await this.createTestConfigs();
      
      // 4. Criar testes iniciais
      await this.createInitialTests();
      
      // 5. Configurar scripts
      await this.updatePackageScripts();
      
      console.log('\n✅ Setup de testes concluído!');
      console.log('\n📋 Próximos passos:');
      console.log('   npm run test        # Executar testes');
      console.log('   npm run test:ui     # Interface visual');
      console.log('   npm run test:coverage # Cobertura de código');
      
    } catch (error) {
      console.error('\n❌ Erro no setup de testes:', error.message);
      process.exit(1);
    }
  }

  async installDependencies() {
    console.log('📦 Instalando dependências de teste...');
    
    for (const dep of this.testDependencies) {
      try {
        console.log(`   Instalando ${dep}...`);
        execSync(`npm install -D ${dep}`, { stdio: 'pipe' });
        console.log(`   ✅ ${dep} instalado`);
      } catch (error) {
        console.log(`   ⚠️  ${dep} já instalado ou erro na instalação`);
      }
    }
    
    console.log('✅ Dependências instaladas\n');
  }

  async createTestStructure() {
    console.log('📁 Criando estrutura de testes...');
    
    const testDirs = [
      'src/test',
      'src/test/setup',
      'src/test/mocks',
      'src/test/utils',
      'src/components/__tests__',
      'src/hooks/__tests__',
      'src/utils/__tests__',
      'src/pages/__tests__'
    ];
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ ${dir} criado`);
      } else {
        console.log(`   ℹ️  ${dir} já existe`);
      }
    }
    
    console.log('✅ Estrutura criada\n');
  }

  async createTestConfigs() {
    console.log('⚙️  Criando configurações de teste...');
    
    // vitest.config.js
    const vitestConfig = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});`;

    fs.writeFileSync('vitest.config.js', vitestConfig);
    console.log('   ✅ vitest.config.js criado');

    // Setup file
    const setupContent = `import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Estender expect com matchers customizados
expect.extend({
  toBeInTheDocument: require('@testing-library/jest-dom/matchers').toBeInTheDocument,
  toHaveClass: require('@testing-library/jest-dom/matchers').toHaveClass,
  toHaveTextContent: require('@testing-library/jest-dom/matchers').toHaveTextContent
});

// Configurar MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock de APIs globais
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});`;

    fs.writeFileSync('src/test/setup.js', setupContent);
    console.log('   ✅ src/test/setup.js criado');

    // MSW Server
    const mswServer = `import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);`;

    fs.writeFileSync('src/test/mocks/server.js', mswServer);
    console.log('   ✅ src/test/mocks/server.js criado');

    // MSW Handlers
    const mswHandlers = `import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock da API Base44
  http.get('*/api/users/me', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      agencyId: 'test-agency-id'
    });
  }),

  http.get('*/api/clients', () => {
    return HttpResponse.json([
      {
        id: 'client-1',
        name: 'Test Client',
        email: 'client@example.com',
        agencyId: 'test-agency-id'
      }
    ]);
  }),

  http.get('*/api/tasks', () => {
    return HttpResponse.json([
      {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo',
        clientId: 'client-1',
        agencyId: 'test-agency-id'
      }
    ]);
  }),

  // Mock de erro para testes
  http.get('*/api/error', () => {
    return HttpResponse.json(
      { error: 'Test error' },
      { status: 500 }
    );
  })
];`;

    fs.writeFileSync('src/test/mocks/handlers.js', mswHandlers);
    console.log('   ✅ src/test/mocks/handlers.js criado');

    console.log('✅ Configurações criadas\n');
  }

  async createInitialTests() {
    console.log('📝 Criando testes iniciais...');
    
    // Teste para useQATestRunner
    const qaTestRunnerTest = `import { renderHook, act } from '@testing-library/react';
import { useQATestRunner } from '@/hooks/useQATestRunner';

describe('useQATestRunner', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    expect(result.current.testResults).toEqual({});
    expect(result.current.isRunning).toBe(false);
    expect(result.current.currentTest).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should have correct test types', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    expect(result.current.TEST_TYPES).toEqual({
      KANBAN_CLIENT: 'kanban_client',
      KANBAN_GLOBAL: 'kanban_global',
      PERFORMANCE: 'performance',
      STRESS: 'stress',
      CONSISTENCY: 'consistency'
    });
  });

  it('should clear results', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    act(() => {
      result.current.clearResults();
    });
    
    expect(result.current.testResults).toEqual({});
    expect(result.current.error).toBe(null);
  });
});`;

    fs.writeFileSync('src/hooks/__tests__/useQATestRunner.test.js', qaTestRunnerTest);
    console.log('   ✅ useQATestRunner.test.js criado');

    // Teste para usePerformanceMonitor
    const performanceMonitorTest = `import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
  it('should initialize with empty metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    expect(result.current.metrics).toEqual({});
    expect(result.current.history).toEqual([]);
    expect(result.current.isMonitoring).toBe(false);
  });

  it('should record metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.recordMetric('test-metric', 100, 200);
    });
    
    expect(result.current.metrics['test-metric']).toBeDefined();
    expect(result.current.metrics['test-metric'].value).toBe(100);
    expect(result.current.metrics['test-metric'].status).toBe('good');
  });

  it('should calculate stats correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.recordMetric('metric1', 100);
      result.current.recordMetric('metric2', 200);
    });
    
    const stats = result.current.getStats();
    expect(stats.total).toBe(2);
    expect(stats.average).toBe(150);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(200);
  });
});`;

    fs.writeFileSync('src/hooks/__tests__/usePerformanceMonitor.test.js', performanceMonitorTest);
    console.log('   ✅ usePerformanceMonitor.test.js criado');

    // Teste para TestRunner component
    const testRunnerComponentTest = `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestRunner } from '@/components/qa/TestRunner';

// Mock do hook
jest.mock('@/hooks/useQATestRunner', () => ({
  useQATestRunner: () => ({
    testResults: {},
    isRunning: false,
    currentTest: null,
    testProgress: { current: 0, total: 5 },
    error: null,
    runTest: jest.fn(),
    runAllTests: jest.fn(),
    cancelTest: jest.fn(),
    clearResults: jest.fn(),
    TEST_TYPES: {
      KANBAN_CLIENT: 'kanban_client',
      KANBAN_GLOBAL: 'kanban_global'
    },
    TEST_STEPS: {
      kanban_client: ['Step 1', 'Step 2'],
      kanban_global: ['Step 1', 'Step 2']
    }
  })
}));

describe('TestRunner', () => {
  it('should render test controls', () => {
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('Executor de Testes QA')).toBeInTheDocument();
    expect(screen.getByText('Executar Todos')).toBeInTheDocument();
    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });

  it('should display test types', () => {
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('kanban client')).toBeInTheDocument();
    expect(screen.getByText('kanban global')).toBeInTheDocument();
  });

  it('should show execute buttons for each test', () => {
    render(<TestRunner testContext={{}} />);
    
    const executeButtons = screen.getAllByText('Executar');
    expect(executeButtons).toHaveLength(2); // One for each test type
  });
});`;

    fs.writeFileSync('src/components/__tests__/TestRunner.test.js', testRunnerComponentTest);
    console.log('   ✅ TestRunner.test.js criado');

    // Teste para funções de segurança
    const securityUtilsTest = `import { 
  hashPassword, 
  validatePasswordStrength, 
  generateSecureToken,
  sanitizeForLog 
} from '@/utils/security';

describe('Security Utils', () => {
  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.checks.length).toBe(6);
    });

    it('should reject weak passwords', () => {
      const result = validatePasswordStrength('123');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(3);
    });

    it('should detect common passwords', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.checks.noCommon).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of correct length', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('sanitizeForLog', () => {
    it('should mask sensitive fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        email: 'test@example.com'
      };
      
      const sanitized = sanitizeForLog(data);
      
      expect(sanitized.password).toBe('[MASKED]');
      expect(sanitized.token).toBe('[MASKED]');
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should handle non-objects', () => {
      expect(sanitizeForLog('string')).toBe('string');
      expect(sanitizeForLog(null)).toBe(null);
      expect(sanitizeForLog(undefined)).toBe(undefined);
    });
  });
});`;

    fs.writeFileSync('src/utils/__tests__/security.test.js', securityUtilsTest);
    console.log('   ✅ security.test.js criado');

    console.log('✅ Testes iniciais criados\n');
  }

  async updatePackageScripts() {
    console.log('📝 Atualizando scripts do package.json...');
    
    const packagePath = 'package.json';
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      packageContent.scripts = {
        ...packageContent.scripts,
        'test': 'vitest',
        'test:ui': 'vitest --ui',
        'test:run': 'vitest run',
        'test:coverage': 'vitest run --coverage',
        'test:watch': 'vitest --watch'
      };
      
      fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
      console.log('   ✅ Scripts de teste adicionados');
    }
    
    console.log('✅ Scripts atualizados\n');
  }
}

// Executar setup
if (require.main === module) {
  const setup = new TestSetup();
  setup.run().catch(console.error);
}

module.exports = TestSetup;

