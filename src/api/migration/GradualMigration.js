/**
 * 🔄 Migração Gradual do Base44
 * 
 * Sistema para migrar gradualmente do Base44 para serviços locais
 */

import { localClient } from './localClient.js';
import { getEnvironmentConfig, validateConfig } from '../config/environment.js';

export class GradualMigration {
  constructor() {
    this.config = getEnvironmentConfig();
    this.migrationMode = 'hybrid'; // 'base44' | 'hybrid' | 'local'
    this.base44Client = null;
    this.localClient = null;
    this.migrationStats = {
      entitiesMigrated: 0,
      functionsMigrated: 0,
      errors: []
    };
  }

  async initialize() {
    console.log('🔄 Inicializando migração gradual...');

    // Validar configuração
    const validation = validateConfig(this.config);
    if (!validation.isValid) {
      console.error('❌ Configuração inválida:', validation.errors);
      throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
    }

    // Inicializar cliente local
    this.localClient = new localClient.constructor(this.config);
    console.log('✅ Cliente local inicializado');

    // Inicializar cliente Base44 (se ainda necessário)
    if (this.migrationMode === 'hybrid' || this.migrationMode === 'base44') {
      try {
        const { base44 } = await import('./base44Client.js');
        this.base44Client = base44;
        console.log('✅ Cliente Base44 inicializado');
      } catch (error) {
        console.warn('⚠️ Base44 não disponível, usando apenas cliente local');
        this.migrationMode = 'local';
      }
    }

    console.log(`🎯 Modo de migração: ${this.migrationMode}`);
  }

  // Método para obter entidade (com fallback)
  async getEntity(entityType, id) {
    try {
      // Tentar cliente local primeiro
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        const localEntity = await this.localClient.entities.get(entityType, id);
        if (localEntity) {
          return localEntity;
        }
      }

      // Fallback para Base44
      if (this.base44Client && (this.migrationMode === 'base44' || this.migrationMode === 'hybrid')) {
        const base44Entity = await this.base44Client.entities[entityType].get(id);
        if (base44Entity) {
          // Migrar para local se encontrado no Base44
          if (this.migrationMode === 'hybrid') {
            await this.migrateEntity(entityType, id);
          }
          return base44Entity;
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro ao buscar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  // Método para criar entidade
  async createEntity(entityType, data) {
    try {
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        const localEntity = await this.localClient.entities.create(entityType, data);
        
        // Sincronizar com Base44 se necessário
        if (this.base44Client && this.migrationMode === 'hybrid') {
          try {
            await this.base44Client.entities[entityType].create(data);
          } catch (error) {
            console.warn(`⚠️ Falha ao sincronizar ${entityType} com Base44:`, error);
          }
        }
        
        return localEntity;
      } else if (this.base44Client) {
        return await this.base44Client.entities[entityType].create(data);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar ${entityType}:`, error);
      throw error;
    }
  }

  // Método para atualizar entidade
  async updateEntity(entityType, id, data) {
    try {
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        const localEntity = await this.localClient.entities.update(entityType, id, data);
        
        // Sincronizar com Base44 se necessário
        if (this.base44Client && this.migrationMode === 'hybrid') {
          try {
            await this.base44Client.entities[entityType].update(id, data);
          } catch (error) {
            console.warn(`⚠️ Falha ao sincronizar atualização ${entityType}:${id} com Base44:`, error);
          }
        }
        
        return localEntity;
      } else if (this.base44Client) {
        return await this.base44Client.entities[entityType].update(id, data);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  // Método para deletar entidade
  async deleteEntity(entityType, id) {
    try {
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        await this.localClient.entities.delete(entityType, id);
        
        // Sincronizar com Base44 se necessário
        if (this.base44Client && this.migrationMode === 'hybrid') {
          try {
            await this.base44Client.entities[entityType].delete(id);
          } catch (error) {
            console.warn(`⚠️ Falha ao sincronizar exclusão ${entityType}:${id} com Base44:`, error);
          }
        }
        
        return { success: true };
      } else if (this.base44Client) {
        return await this.base44Client.entities[entityType].delete(id);
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar ${entityType}:${id}:`, error);
      throw error;
    }
  }

  // Método para filtrar entidades
  async filterEntities(entityType, filters) {
    try {
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        return await this.localClient.entities.filter(entityType, filters);
      } else if (this.base44Client) {
        return await this.base44Client.entities[entityType].filter(filters);
      }
    } catch (error) {
      console.error(`❌ Erro ao filtrar ${entityType}:`, error);
      throw error;
    }
  }

  // Método para chamar funções
  async callFunction(functionName, params) {
    try {
      if (this.migrationMode === 'local' || this.migrationMode === 'hybrid') {
        // Tentar função local primeiro
        if (this.localClient.functions[functionName]) {
          return await this.localClient.functions[functionName](params);
        }
      }

      // Fallback para Base44
      if (this.base44Client && this.base44Client.functions[functionName]) {
        return await this.base44Client.functions[functionName](params);
      }

      throw new Error(`Função ${functionName} não encontrada`);
    } catch (error) {
      console.error(`❌ Erro ao chamar função ${functionName}:`, error);
      throw error;
    }
  }

  // Método para migrar entidade específica
  async migrateEntity(entityType, id) {
    try {
      if (!this.base44Client) {
        throw new Error('Base44 não disponível para migração');
      }

      console.log(`🔄 Migrando ${entityType}:${id}...`);

      // Buscar do Base44
      const base44Entity = await this.base44Client.entities[entityType].get(id);
      if (!base44Entity) {
        throw new Error(`${entityType}:${id} não encontrado no Base44`);
      }

      // Salvar localmente
      const localEntity = await this.localClient.entities.create(entityType, base44Entity);
      
      this.migrationStats.entitiesMigrated++;
      console.log(`✅ ${entityType}:${id} migrado com sucesso`);
      
      return localEntity;
    } catch (error) {
      console.error(`❌ Erro ao migrar ${entityType}:${id}:`, error);
      this.migrationStats.errors.push({
        entityType,
        id,
        error: error.message
      });
      throw error;
    }
  }

  // Método para migrar todas as entidades de um tipo
  async migrateAllEntities(entityType) {
    try {
      if (!this.base44Client) {
        throw new Error('Base44 não disponível para migração');
      }

      console.log(`🔄 Migrando todas as entidades ${entityType}...`);

      // Buscar todas do Base44
      const base44Entities = await this.base44Client.entities[entityType].list();
      
      console.log(`📊 Encontradas ${base44Entities.length} entidades ${entityType} no Base44`);

      // Migrar uma por uma
      const migrated = [];
      for (const entity of base44Entities) {
        try {
          const localEntity = await this.migrateEntity(entityType, entity.id);
          migrated.push(localEntity);
        } catch (error) {
          console.warn(`⚠️ Falha ao migrar ${entityType}:${entity.id}:`, error);
        }
      }

      console.log(`✅ ${migrated.length}/${base44Entities.length} entidades ${entityType} migradas`);
      return migrated;
    } catch (error) {
      console.error(`❌ Erro ao migrar entidades ${entityType}:`, error);
      throw error;
    }
  }

  // Método para migrar todas as entidades
  async migrateAll() {
    try {
      console.log('🔄 Iniciando migração completa...');

      const entityTypes = [
        'clients', 'services', 'tasks', 'agencies', 'users', 'projects',
        'briefs', 'insights', 'learning_entries', 'scopes', 'notifications',
        'approval_requests', 'financial_kpis', 'client_documents'
      ];

      const results = {};
      
      for (const entityType of entityTypes) {
        try {
          results[entityType] = await this.migrateAllEntities(entityType);
        } catch (error) {
          console.error(`❌ Falha na migração de ${entityType}:`, error);
          results[entityType] = [];
        }
      }

      console.log('✅ Migração completa finalizada');
      this.printMigrationStats();
      
      return results;
    } catch (error) {
      console.error('❌ Erro na migração completa:', error);
      throw error;
    }
  }

  // Método para alterar modo de migração
  setMigrationMode(mode) {
    if (!['base44', 'hybrid', 'local'].includes(mode)) {
      throw new Error('Modo de migração inválido. Use: base44, hybrid, local');
    }

    this.migrationMode = mode;
    console.log(`🎯 Modo de migração alterado para: ${mode}`);
  }

  // Método para obter estatísticas de migração
  getMigrationStats() {
    return {
      ...this.migrationStats,
      mode: this.migrationMode,
      config: this.config
    };
  }

  // Método para imprimir estatísticas
  printMigrationStats() {
    console.log('\n📊 ESTATÍSTICAS DE MIGRAÇÃO:');
    console.log('='.repeat(40));
    console.log(`Modo: ${this.migrationMode}`);
    console.log(`Entidades migradas: ${this.migrationStats.entitiesMigrated}`);
    console.log(`Funções migradas: ${this.migrationStats.functionsMigrated}`);
    console.log(`Erros: ${this.migrationStats.errors.length}`);
    
    if (this.migrationStats.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      this.migrationStats.errors.forEach(error => {
        console.log(`  - ${error.entityType}:${error.id} - ${error.error}`);
      });
    }
  }

  // Método para verificar integridade
  async checkIntegrity(entityType, id) {
    try {
      const localEntity = await this.localClient.entities.get(entityType, id);
      const base44Entity = this.base44Client ? 
        await this.base44Client.entities[entityType].get(id) : null;

      if (!localEntity && !base44Entity) {
        return { status: 'not_found', message: 'Entidade não encontrada em nenhum sistema' };
      }

      if (localEntity && base44Entity) {
        // Comparar dados
        const localData = JSON.stringify(localEntity);
        const base44Data = JSON.stringify(base44Entity);
        
        if (localData === base44Data) {
          return { status: 'synced', message: 'Entidades sincronizadas' };
        } else {
          return { status: 'out_of_sync', message: 'Entidades com dados diferentes' };
        }
      }

      if (localEntity && !base44Entity) {
        return { status: 'local_only', message: 'Entidade existe apenas localmente' };
      }

      if (!localEntity && base44Entity) {
        return { status: 'base44_only', message: 'Entidade existe apenas no Base44' };
      }
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

// Instância global para uso na aplicação
export const migrationManager = new GradualMigration();

// Inicializar automaticamente
migrationManager.initialize().catch(error => {
  console.error('❌ Erro ao inicializar migração:', error);
});

