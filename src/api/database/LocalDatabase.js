/**
 * 🗄️ Implementação de Banco de Dados Local
 * 
 * Suporte para PostgreSQL, SQLite e banco em memória
 */

// Implementação PostgreSQL
class PostgreSQLDatabase {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.init();
  }

  async init() {
    try {
      const { Pool } = await import('pg');
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Criar tabelas se não existirem
      await this.createTables();
      console.log('✅ PostgreSQL conectado e tabelas criadas');
    } catch (error) {
      console.error('❌ Erro ao conectar PostgreSQL:', error);
      throw error;
    }
  }

  async createTables() {
    const entities = [
      'clients', 'services', 'tasks', 'agencies', 'users', 'projects',
      'briefs', 'insights', 'learning_entries', 'scopes', 'notifications',
      'approval_requests', 'financial_kpis', 'client_documents'
    ];

    for (const entity of entities) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${entity} (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Criar índices para performance
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_${entity}_created_at ON ${entity}(created_at)
      `);
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_${entity}_updated_at ON ${entity}(updated_at)
      `);
    }
  }

  async createEntity(entityType, data) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ${entityType} (id, data, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await client.query(query, [data.id, JSON.stringify(data)]);
      return { ...data, ...result.rows[0] };
    } finally {
      client.release();
    }
  }

  async getEntity(entityType, id) {
    const client = await this.pool.connect();
    try {
      const query = `SELECT * FROM ${entityType} WHERE id = $1`;
      const result = await client.query(query, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return { ...JSON.parse(row.data), id: row.id };
    } finally {
      client.release();
    }
  }

  async updateEntity(entityType, id, data) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE ${entityType} 
        SET data = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(query, [JSON.stringify(data), id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return { ...JSON.parse(row.data), id: row.id };
    } finally {
      client.release();
    }
  }

  async deleteEntity(entityType, id) {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM ${entityType} WHERE id = $1`;
      await client.query(query, [id]);
      return { success: true };
    } finally {
      client.release();
    }
  }

  async listEntities(entityType, filters = {}) {
    const client = await this.pool.connect();
    try {
      let query = `SELECT * FROM ${entityType}`;
      const params = [];
      let paramCount = 0;

      if (Object.keys(filters).length > 0) {
        const conditions = [];
        for (const [key, value] of Object.entries(filters)) {
          paramCount++;
          if (typeof value === 'object' && value.$ne) {
            conditions.push(`data->>'${key}' != $${paramCount}`);
            params.push(value.$ne);
          } else {
            conditions.push(`data->>'${key}' = $${paramCount}`);
            params.push(value);
          }
        }
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await client.query(query, params);
      return result.rows.map(row => ({ ...JSON.parse(row.data), id: row.id }));
    } finally {
      client.release();
    }
  }

  async filterEntities(entityType, filters) {
    return this.listEntities(entityType, filters);
  }
}

// Implementação SQLite
class SQLiteDatabase {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.init();
  }

  async init() {
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.config.path || './local.db');
      this.createTables();
      console.log('✅ SQLite conectado e tabelas criadas');
    } catch (error) {
      console.error('❌ Erro ao conectar SQLite:', error);
      throw error;
    }
  }

  createTables() {
    const entities = [
      'clients', 'services', 'tasks', 'agencies', 'users', 'projects',
      'briefs', 'insights', 'learning_entries', 'scopes', 'notifications',
      'approval_requests', 'financial_kpis', 'client_documents'
    ];

    for (const entity of entities) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${entity} (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Criar índices
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${entity}_created_at ON ${entity}(created_at)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${entity}_updated_at ON ${entity}(updated_at)`);
    }
  }

  async createEntity(entityType, data) {
    const stmt = this.db.prepare(`
      INSERT INTO ${entityType} (id, data, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(data.id, JSON.stringify(data));
    return data;
  }

  async getEntity(entityType, id) {
    const stmt = this.db.prepare(`SELECT * FROM ${entityType} WHERE id = ?`);
    const row = stmt.get(id);
    if (!row) return null;
    
    return { ...JSON.parse(row.data), id: row.id };
  }

  async updateEntity(entityType, id, data) {
    const stmt = this.db.prepare(`
      UPDATE ${entityType} 
      SET data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(JSON.stringify(data), id);
    if (result.changes === 0) return null;
    
    return data;
  }

  async deleteEntity(entityType, id) {
    const stmt = this.db.prepare(`DELETE FROM ${entityType} WHERE id = ?`);
    stmt.run(id);
    return { success: true };
  }

  async listEntities(entityType, filters = {}) {
    let query = `SELECT * FROM ${entityType}`;
    const params = [];

    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === 'object' && value.$ne) {
          conditions.push(`json_extract(data, '$.${key}') != ?`);
          params.push(value.$ne);
        } else {
          conditions.push(`json_extract(data, '$.${key}') = ?`);
          params.push(value);
        }
      }
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(params);
    return rows.map(row => ({ ...JSON.parse(row.data), id: row.id }));
  }

  async filterEntities(entityType, filters) {
    return this.listEntities(entityType, filters);
  }
}

// Implementação em memória (para desenvolvimento)
class MemoryDatabase {
  constructor() {
    this.data = new Map();
    this.init();
  }

  init() {
    const entities = [
      'clients', 'services', 'tasks', 'agencies', 'users', 'projects',
      'briefs', 'insights', 'learning_entries', 'scopes', 'notifications',
      'approval_requests', 'financial_kpis', 'client_documents'
    ];

    entities.forEach(entity => {
      this.data.set(entity, new Map());
    });

    console.log('✅ Banco em memória inicializado');
  }

  async createEntity(entityType, data) {
    if (!this.data.has(entityType)) {
      this.data.set(entityType, new Map());
    }
    this.data.get(entityType).set(data.id, data);
    return data;
  }

  async getEntity(entityType, id) {
    return this.data.get(entityType)?.get(id) || null;
  }

  async updateEntity(entityType, id, data) {
    if (!this.data.has(entityType)) {
      this.data.set(entityType, new Map());
    }
    this.data.get(entityType).set(id, data);
    return data;
  }

  async deleteEntity(entityType, id) {
    this.data.get(entityType)?.delete(id);
    return { success: true };
  }

  async listEntities(entityType, filters = {}) {
    const entities = Array.from(this.data.get(entityType)?.values() || []);
    return this.applyFilters(entities, filters);
  }

  async filterEntities(entityType, filters) {
    const entities = Array.from(this.data.get(entityType)?.values() || []);
    return this.applyFilters(entities, filters);
  }

  applyFilters(entities, filters) {
    return entities.filter(entity => {
      return Object.entries(filters).every(([key, value]) => {
        if (typeof value === 'object' && value.$ne) {
          return entity[key] !== value.$ne;
        }
        return entity[key] === value;
      });
    });
  }
}

export { PostgreSQLDatabase, SQLiteDatabase, MemoryDatabase };

