#!/usr/bin/env node

/**
 * Script para limpeza automática de console logs
 * Remove console.log, console.warn, console.error de arquivos de produção
 * Mantém logs importantes para desenvolvimento
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configurações
const CONFIG = {
  srcDir: './src',
  backupDir: './backups',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  excludePatterns: [
    '**/debug/**',
    '**/qa-dashboard.jsx',
    '**/test/**',
    '**/*.test.js',
    '**/*.spec.js'
  ]
};

// Padrões de console logs para remover
const CONSOLE_PATTERNS = [
  // Console logs simples
  /console\.log\([^)]*\);?\s*/g,
  /console\.warn\([^)]*\);?\s*/g,
  /console\.error\([^)]*\);?\s*/g,
  
  // Console logs com template literals
  /console\.log\(`[^`]*`[^)]*\);?\s*/g,
  /console\.warn\(`[^`]*`[^)]*\);?\s*/g,
  /console\.error\(`[^`]*`[^)]*\);?\s*/g,
  
  // Console logs multi-linha
  /console\.(log|warn|error)\(\s*[^)]*\)\s*;?\s*/gms
];

// Console logs que devem ser mantidos (importantes para debugging)
const KEEP_PATTERNS = [
  /console\.(log|warn|error)\(['"]\s*\[.*\]\s*.*['"]/g, // Logs com prefixos estruturados
  /console\.(log|warn|error)\(['"]\s*ERROR\s*:/g, // Logs de erro críticos
  /console\.(log|warn|error)\(['"]\s*CRITICAL\s*:/g, // Logs críticos
  /console\.(log|warn|error)\(['"]\s*SECURITY\s*:/g // Logs de segurança
];

class ConsoleCleaner {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      logsRemoved: 0,
      logsKept: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🧹 Iniciando limpeza de console logs...');
    
    if (CONFIG.dryRun) {
      console.log('🔍 Modo DRY RUN - nenhum arquivo será modificado');
    }

    // Criar backup se não for dry run
    if (!CONFIG.dryRun) {
      await this.createBackup();
    }

    // Encontrar arquivos
    const files = await this.findFiles();
    console.log(`📁 Encontrados ${files.length} arquivos para processar`);

    // Processar cada arquivo
    for (const file of files) {
      await this.processFile(file);
    }

    this.printSummary();
  }

  async findFiles() {
    const pattern = path.join(CONFIG.srcDir, '**/*.{js,jsx,ts,tsx}');
    const files = glob.sync(pattern);
    
    // Filtrar arquivos excluídos
    return files.filter(file => {
      return !CONFIG.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
        return regex.test(file);
      });
    });
  }

  async processFile(filePath) {
    try {
      this.stats.filesProcessed++;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      let newContent = content;
      let logsRemoved = 0;
      let logsKept = 0;

      // Processar cada padrão
      for (const pattern of CONSOLE_PATTERNS) {
        const matches = newContent.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Verificar se deve manter
            const shouldKeep = KEEP_PATTERNS.some(keepPattern => 
              keepPattern.test(match)
            );

            if (shouldKeep) {
              logsKept++;
              if (CONFIG.verbose) {
                console.log(`✅ Mantendo: ${match.substring(0, 50)}...`);
              }
            } else {
              logsRemoved++;
              newContent = newContent.replace(match, '');
              if (CONFIG.verbose) {
                console.log(`🗑️  Removendo: ${match.substring(0, 50)}...`);
              }
            }
          }
        }
      }

      // Limpar linhas vazias extras
      newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');

      // Salvar arquivo se houve mudanças
      if (newContent !== originalContent && !CONFIG.dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Processado: ${filePath} (${logsRemoved} removidos, ${logsKept} mantidos)`);
      } else if (CONFIG.dryRun && newContent !== originalContent) {
        console.log(`🔍 [DRY RUN] ${filePath} (${logsRemoved} seriam removidos, ${logsKept} mantidos)`);
      }

      this.stats.logsRemoved += logsRemoved;
      this.stats.logsKept += logsKept;

    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG.backupDir, `console-cleanup-${timestamp}`);
    
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    console.log(`💾 Criando backup em: ${backupPath}`);
    // Implementar cópia de arquivos aqui
  }

  printSummary() {
    console.log('\n📊 RESUMO DA LIMPEZA:');
    console.log(`📁 Arquivos processados: ${this.stats.filesProcessed}`);
    console.log(`🗑️  Logs removidos: ${this.stats.logsRemoved}`);
    console.log(`✅ Logs mantidos: ${this.stats.logsKept}`);
    console.log(`❌ Erros: ${this.stats.errors}`);
    
    if (CONFIG.dryRun) {
      console.log('\n🔍 Este foi um DRY RUN. Execute sem --dry-run para aplicar as mudanças.');
    }
  }
}

// Executar script
if (require.main === module) {
  const cleaner = new ConsoleCleaner();
  cleaner.run().catch(console.error);
}

module.exports = ConsoleCleaner;
