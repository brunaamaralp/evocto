#!/usr/bin/env node

/**
 * 🔒 Script de Correção de Segurança
 * 
 * Identifica e corrige problemas de segurança no código
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SECURITY_ISSUES = {
  // Padrões inseguros para detectar
  patterns: [
    {
      name: 'Hardcoded Password',
      pattern: /password[_\s]*[:=]\s*['"][^'"]*['"]/gi,
      severity: 'HIGH',
      fix: 'Use hashPassword() function'
    },
    {
      name: 'Hardcoded Token',
      pattern: /token[_\s]*[:=]\s*['"][^'"]*['"]/gi,
      severity: 'HIGH',
      fix: 'Use generateSecureToken() function'
    },
    {
      name: 'Console Log with Sensitive Data',
      pattern: /console\.(log|warn|error)\([^)]*(password|token|secret|key)[^)]*\)/gi,
      severity: 'MEDIUM',
      fix: 'Use sanitizeForLog() before logging'
    },
    {
      name: 'Unsafe innerHTML',
      pattern: /innerHTML\s*=\s*[^;]+/gi,
      severity: 'HIGH',
      fix: 'Use textContent or sanitize HTML'
    },
    {
      name: 'eval() Usage',
      pattern: /\beval\s*\(/gi,
      severity: 'CRITICAL',
      fix: 'Remove eval() usage'
    },
    {
      name: 'document.write()',
      pattern: /document\.write\s*\(/gi,
      severity: 'HIGH',
      fix: 'Use DOM manipulation instead'
    }
  ],
  
  // Arquivos para verificar
  files: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}'
  ]
};

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0
    };
  }

  async run() {
    console.log('🔒 Iniciando auditoria de segurança...\n');

    const files = await this.findFiles();
    console.log(`📁 Encontrados ${files.length} arquivos para verificar\n`);

    for (const file of files) {
      await this.scanFile(file);
    }

    this.printReport();
    this.generateFixSuggestions();
  }

  async findFiles() {
    const allFiles = [];
    
    for (const pattern of SECURITY_ISSUES.files) {
      const files = glob.sync(pattern);
      allFiles.push(...files);
    }
    
    return [...new Set(allFiles)]; // Remove duplicatas
  }

  async scanFile(filePath) {
    try {
      this.stats.filesScanned++;
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (const issue of SECURITY_ISSUES.patterns) {
        const matches = content.match(issue.pattern);
        
        if (matches) {
          matches.forEach(match => {
            const lineNumber = this.findLineNumber(content, match);
            const lineContent = lines[lineNumber - 1]?.trim() || '';
            
            this.issues.push({
              file: filePath,
              line: lineNumber,
              issue: issue.name,
              severity: issue.severity,
              match: match,
              lineContent: lineContent,
              fix: issue.fix
            });

            this.stats.issuesFound++;
            this.updateSeverityCount(issue.severity);
          });
        }
      }

    } catch (error) {
      console.error(`❌ Erro ao verificar ${filePath}:`, error.message);
    }
  }

  findLineNumber(content, match) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match.substring(0, 50))) {
        return i + 1;
      }
    }
    return 1;
  }

  updateSeverityCount(severity) {
    switch (severity) {
      case 'CRITICAL':
        this.stats.criticalIssues++;
        break;
      case 'HIGH':
        this.stats.highIssues++;
        break;
      case 'MEDIUM':
        this.stats.mediumIssues++;
        break;
    }
  }

  printReport() {
    console.log('📊 RELATÓRIO DE SEGURANÇA\n');
    console.log(`📁 Arquivos verificados: ${this.stats.filesScanned}`);
    console.log(`🔍 Problemas encontrados: ${this.stats.issuesFound}`);
    console.log(`🚨 Críticos: ${this.stats.criticalIssues}`);
    console.log(`⚠️  Altos: ${this.stats.highIssues}`);
    console.log(`📝 Médios: ${this.stats.mediumIssues}\n`);

    if (this.issues.length === 0) {
      console.log('✅ Nenhum problema de segurança encontrado!');
      return;
    }

    // Agrupar por severidade
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');

    if (criticalIssues.length > 0) {
      console.log('🚨 PROBLEMAS CRÍTICOS:');
      criticalIssues.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
        console.log(`   📝 ${issue.lineContent}`);
        console.log(`   🔧 Solução: ${issue.fix}\n`);
      });
    }

    if (highIssues.length > 0) {
      console.log('⚠️  PROBLEMAS ALTOS:');
      highIssues.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
        console.log(`   📝 ${issue.lineContent}`);
        console.log(`   🔧 Solução: ${issue.fix}\n`);
      });
    }

    if (mediumIssues.length > 0) {
      console.log('📝 PROBLEMAS MÉDIOS:');
      mediumIssues.slice(0, 5).forEach(issue => { // Mostrar apenas os primeiros 5
        console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
        console.log(`   🔧 Solução: ${issue.fix}`);
      });
      
      if (mediumIssues.length > 5) {
        console.log(`   ... e mais ${mediumIssues.length - 5} problemas médios\n`);
      }
    }
  }

  generateFixSuggestions() {
    if (this.issues.length === 0) return;

    console.log('🔧 SUGESTÕES DE CORREÇÃO:\n');

    // Agrupar por tipo de problema
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.issue]) {
        issuesByType[issue.issue] = [];
      }
      issuesByType[issue.issue].push(issue);
    });

    Object.entries(issuesByType).forEach(([issueType, issues]) => {
      console.log(`📋 ${issueType} (${issues.length} ocorrências):`);
      
      if (issueType === 'Hardcoded Password') {
        console.log('   1. Importar função de hash: import { hashPassword } from "@/utils/security"');
        console.log('   2. Substituir: password_hash: "hardcoded"');
        console.log('   3. Por: password_hash: await hashPassword(password)\n');
      }
      
      if (issueType === 'Console Log with Sensitive Data') {
        console.log('   1. Importar sanitização: import { sanitizeForLog } from "@/utils/security"');
        console.log('   2. Substituir: console.log(data)');
        console.log('   3. Por: console.log(sanitizeForLog(data))\n');
      }
      
      if (issueType === 'Unsafe innerHTML') {
        console.log('   1. Usar textContent para texto simples');
        console.log('   2. Usar biblioteca de sanitização para HTML');
        console.log('   3. Exemplo: element.textContent = userInput\n');
      }
    });
  }
}

// Executar auditoria
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.run().catch(console.error);
}

module.exports = SecurityAuditor;

