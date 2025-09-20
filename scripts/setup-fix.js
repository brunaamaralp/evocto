#!/usr/bin/env node

/**
 * 📦 Script de Setup para Correções
 * 
 * Instala dependências e prepara ambiente para as correções
 */

const { execSync } = require('child_process');
const fs = require('fs');

class SetupFixer {
  constructor() {
    this.requiredDependencies = [
      'glob',
      'chalk',
      'inquirer'
    ];
    
    this.scriptsToMakeExecutable = [
      'scripts/cleanup-console-logs.js',
      'scripts/security-audit.js',
      'scripts/master-fix.js'
    ];
  }

  async run() {
    console.log('🔧 Configurando ambiente para correções...\n');
    
    try {
      // 1. Verificar Node.js
      await this.checkNodeVersion();
      
      // 2. Instalar dependências
      await this.installDependencies();
      
      // 3. Tornar scripts executáveis
      await this.makeScriptsExecutable();
      
      // 4. Criar diretórios necessários
      await this.createDirectories();
      
      // 5. Verificar estrutura
      await this.verifyStructure();
      
      console.log('\n✅ Setup concluído! Agora você pode executar:');
      console.log('   npm run fix:console    # Limpar console logs');
      console.log('   npm run fix:security   # Auditoria de segurança');
      console.log('   npm run fix:all        # Todas as correções');
      
    } catch (error) {
      console.error('\n❌ Erro no setup:', error.message);
      process.exit(1);
    }
  }

  async checkNodeVersion() {
    console.log('🔍 Verificando versão do Node.js...');
    
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error('Node.js 16+ é necessário. Versão atual: ' + version);
    }
    
    console.log(`✅ Node.js ${version} OK\n`);
  }

  async installDependencies() {
    console.log('📦 Instalando dependências...');
    
    for (const dep of this.requiredDependencies) {
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

  async makeScriptsExecutable() {
    console.log('🔧 Tornando scripts executáveis...');
    
    for (const script of this.scriptsToMakeExecutable) {
      if (fs.existsSync(script)) {
        try {
          execSync(`chmod +x ${script}`, { stdio: 'pipe' });
          console.log(`   ✅ ${script} executável`);
        } catch (error) {
          console.log(`   ⚠️  Não foi possível tornar ${script} executável`);
        }
      }
    }
    
    console.log('✅ Scripts configurados\n');
  }

  async createDirectories() {
    console.log('📁 Criando diretórios necessários...');
    
    const directories = [
      'backups',
      'security-fixes',
      'refactor-plan',
      'refactor-plan/hooks',
      'refactor-plan/components'
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ ${dir} criado`);
      } else {
        console.log(`   ℹ️  ${dir} já existe`);
      }
    }
    
    console.log('✅ Diretórios criados\n');
  }

  async verifyStructure() {
    console.log('🔍 Verificando estrutura do projeto...');
    
    const requiredFiles = [
      'package.json',
      'src',
      'src/App.jsx',
      'src/main.jsx'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      console.log('⚠️  Arquivos não encontrados:');
      missingFiles.forEach(file => console.log(`   - ${file}`));
      console.log('   Continuando mesmo assim...\n');
    } else {
      console.log('✅ Estrutura do projeto OK\n');
    }
  }
}

// Executar setup
if (require.main === module) {
  const setup = new SetupFixer();
  setup.run().catch(console.error);
}

module.exports = SetupFixer;

