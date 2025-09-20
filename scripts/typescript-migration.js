#!/usr/bin/env node

/**
 * 🔷 Script de Migração para TypeScript
 * 
 * Migra gradualmente o projeto de JavaScript para TypeScript
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TypeScriptMigration {
  constructor() {
    this.tsDependencies = [
      'typescript',
      '@types/react',
      '@types/react-dom',
      '@types/node',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'ts-node'
    ];
    
    this.migrationOrder = [
      'config',      // Arquivos de configuração
      'utils',       // Utilitários e helpers
      'hooks',       // Hooks customizados
      'components',  // Componentes UI
      'pages'        // Páginas principais
    ];
    
    this.priorityFiles = [
      'src/utils/security.js',
      'src/hooks/useQATestRunner.js',
      'src/hooks/usePerformanceMonitor.js',
      'src/components/qa/TestRunner.jsx',
      'src/components/qa/PerformanceMetrics.jsx'
    ];
  }

  async run() {
    console.log('🔷 Iniciando migração para TypeScript...\n');
    
    try {
      // 1. Instalar dependências TypeScript
      await this.installTypeScriptDependencies();
      
      // 2. Configurar TypeScript
      await this.setupTypeScriptConfig();
      
      // 3. Configurar ESLint para TypeScript
      await this.setupTypeScriptESLint();
      
      // 4. Migrar arquivos prioritários
      await this.migratePriorityFiles();
      
      // 5. Atualizar configurações do Vite
      await this.updateViteConfig();
      
      console.log('\n✅ Migração para TypeScript concluída!');
      console.log('\n📋 Próximos passos:');
      console.log('   npm run type-check    # Verificar tipos');
      console.log('   npm run build         # Build com TypeScript');
      console.log('   npm run dev           # Dev com TypeScript');
      
    } catch (error) {
      console.error('\n❌ Erro na migração TypeScript:', error.message);
      process.exit(1);
    }
  }

  async installTypeScriptDependencies() {
    console.log('📦 Instalando dependências TypeScript...');
    
    for (const dep of this.tsDependencies) {
      try {
        console.log(`   Instalando ${dep}...`);
        execSync(`npm install -D ${dep}`, { stdio: 'pipe' });
        console.log(`   ✅ ${dep} instalado`);
      } catch (error) {
        console.log(`   ⚠️  ${dep} já instalado ou erro na instalação`);
      }
    }
    
    console.log('✅ Dependências TypeScript instaladas\n');
  }

  async setupTypeScriptConfig() {
    console.log('⚙️  Configurando TypeScript...');
    
    // tsconfig.json
    const tsConfig = {
      "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": true,
        
        /* Bundler mode */
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx",
        
        /* Linting */
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true,
        
        /* Path mapping */
        "baseUrl": ".",
        "paths": {
          "@/*": ["./src/*"]
        }
      },
      "include": [
        "src/**/*",
        "src/**/*.ts",
        "src/**/*.tsx",
        "src/**/*.js",
        "src/**/*.jsx"
      ],
      "exclude": [
        "node_modules",
        "dist"
      ]
    };

    fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
    console.log('   ✅ tsconfig.json criado');

    // tsconfig.node.json
    const tsConfigNode = {
      "compilerOptions": {
        "composite": true,
        "skipLibCheck": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true
      },
      "include": ["vite.config.ts"]
    };

    fs.writeFileSync('tsconfig.node.json', JSON.stringify(tsConfigNode, null, 2));
    console.log('   ✅ tsconfig.node.json criado');

    console.log('✅ Configuração TypeScript criada\n');
  }

  async setupTypeScriptESLint() {
    console.log('🔍 Configurando ESLint para TypeScript...');
    
    const eslintConfig = `import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]`;

    fs.writeFileSync('eslint.config.js', eslintConfig);
    console.log('   ✅ ESLint configurado para TypeScript');

    console.log('✅ ESLint TypeScript configurado\n');
  }

  async migratePriorityFiles() {
    console.log('🔄 Migrando arquivos prioritários...');
    
    for (const file of this.priorityFiles) {
      if (fs.existsSync(file)) {
        await this.migrateFile(file);
      }
    }
    
    console.log('✅ Arquivos prioritários migrados\n');
  }

  async migrateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newPath = filePath.replace(/\.(js|jsx)$/, '.ts$1');
    
    // Adicionar tipos básicos
    let tsContent = content;
    
    // Adicionar imports de tipos se necessário
    if (filePath.includes('security.js')) {
      tsContent = `// Tipos para funções de segurança
export interface PasswordValidation {
  isValid: boolean;
  score: number;
  message: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    noCommon: boolean;
  };
}

export interface MetricData {
  name: string;
  value?: number;
  duration?: number;
  threshold?: number;
  timestamp: number;
  status: 'good' | 'warning' | 'error' | 'info';
}

\n${tsContent}`;
    }
    
    if (filePath.includes('useQATestRunner.js')) {
      tsContent = `// Tipos para QA Test Runner
export interface TestResult {
  step: number;
  name: string;
  status: 'success' | 'error';
  details?: string;
  contextData?: Record<string, any>;
  duration?: number;
  error?: string;
}

export interface TestSummary {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface TestContext {
  agencyId?: string;
  userId?: string;
  userRole?: string;
  clientId?: string;
  serviceId?: string;
}

\n${tsContent}`;
    }
    
    if (filePath.includes('TestRunner.jsx')) {
      tsContent = `// Tipos para TestRunner component
import { TestContext } from '@/hooks/useQATestRunner';

interface TestRunnerProps {
  testContext?: TestContext;
}

\n${tsContent}`;
    }
    
    // Converter para TypeScript
    tsContent = tsContent
      .replace(/export default function/g, 'export default function')
      .replace(/function (\w+)/g, 'function $1')
      .replace(/const (\w+) = /g, 'const $1: any = ')
      .replace(/useState\(/g, 'useState<any>(')
      .replace(/useCallback\(/g, 'useCallback<any>(');
    
    fs.writeFileSync(newPath, tsContent);
    console.log(`   ✅ ${filePath} → ${newPath}`);
    
    // Manter arquivo original por enquanto
    console.log(`   ℹ️  Arquivo original mantido: ${filePath}`);
  }

  async updateViteConfig() {
    console.log('⚙️  Atualizando configuração do Vite...');
    
    // Renomear vite.config.js para vite.config.ts
    if (fs.existsSync('vite.config.js')) {
      const content = fs.readFileSync('vite.config.js', 'utf8');
      const tsContent = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})`;

      fs.writeFileSync('vite.config.ts', tsContent);
      console.log('   ✅ vite.config.ts criado');
    }
    
    // Atualizar package.json scripts
    const packagePath = 'package.json';
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      packageContent.scripts = {
        ...packageContent.scripts,
        'type-check': 'tsc --noEmit',
        'type-check:watch': 'tsc --noEmit --watch'
      };
      
      fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
      console.log('   ✅ Scripts TypeScript adicionados');
    }
    
    console.log('✅ Configuração Vite atualizada\n');
  }
}

// Executar migração
if (require.main === module) {
  const migration = new TypeScriptMigration();
  migration.run().catch(console.error);
}

module.exports = TypeScriptMigration;

