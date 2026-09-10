/**
 * Shim Appwrite compatível com imports do módulo financeiro do Nave.
 * Delega para o client canônico do Evocto.
 */
import {
  getAppwriteClient,
  getAccount,
  getTablesDB,
  getStorage,
  getTeams,
  DATABASE_ID,
  ID,
  Query,
  Permission,
  Role,
} from '@/api/appwriteClient';

export const DB_ID = DATABASE_ID;
export const databases = {
  async listDocuments(dbId, collectionId, queries = []) {
    const tables = getTablesDB();
    return tables.listRows({ databaseId: dbId || DATABASE_ID, tableId: collectionId, queries });
  },
  async getDocument(dbId, collectionId, documentId) {
    const tables = getTablesDB();
    return tables.getRow({ databaseId: dbId || DATABASE_ID, tableId: collectionId, rowId: documentId });
  },
  async createDocument(dbId, collectionId, documentId, data, permissions) {
    const tables = getTablesDB();
    return tables.createRow({
      databaseId: dbId || DATABASE_ID,
      tableId: collectionId,
      rowId: documentId === 'unique()' ? ID.unique() : documentId,
      data,
      permissions,
    });
  },
  async updateDocument(dbId, collectionId, documentId, data, permissions) {
    const tables = getTablesDB();
    return tables.updateRow({
      databaseId: dbId || DATABASE_ID,
      tableId: collectionId,
      rowId: documentId,
      data,
      permissions,
    });
  },
  async deleteDocument(dbId, collectionId, documentId) {
    const tables = getTablesDB();
    return tables.deleteRow({
      databaseId: dbId || DATABASE_ID,
      tableId: collectionId,
      rowId: documentId,
    });
  },
};

export const account = {
  get: () => getAccount().get(),
  createJWT: async () => {
    try {
      return await getAccount().createJWT();
    } catch {
      return { jwt: '' };
    }
  },
};

export async function createSessionJwt() {
  try {
    const res = await account.createJWT();
    return res?.jwt || '';
  } catch {
    return '';
  }
}

/** Limpa JWT em memória (shim — sessão real fica no Appwrite SDK). */
export function clearClientJwt() {}
export function clearSessionJwtCache() {}

/** Stub Functions API — não usado no backend local do Evocto. */
export const functions = {
  createExecution: async () => ({ $id: '', responseBody: '{}' }),
};

export const client = {
  get: getAppwriteClient,
  ping: (...args) => getAppwriteClient().ping(...args),
};

export {
  getAppwriteClient,
  getAccount,
  getTablesDB,
  getStorage,
  getTeams,
  ID,
  Query,
  Permission,
  Role,
  DATABASE_ID,
};

// Collection ID placeholders (overridden by env when present)
export const LEADS_COL = import.meta.env.VITE_APPWRITE_LEADS_COLLECTION_ID || 'clients';
export const ACADEMIES_COL = import.meta.env.VITE_APPWRITE_ACADEMIES_COLLECTION_ID || 'agencies';
export const STUDENTS_COL = import.meta.env.VITE_APPWRITE_STUDENTS_COLLECTION_ID || 'clients';
export const FINANCIAL_TX_COL =
  import.meta.env.VITE_APPWRITE_FINANCIAL_TX_COLLECTION_ID || 'financial_tx';
export const STUDENT_PAYMENTS_COL =
  import.meta.env.VITE_APPWRITE_STUDENT_PAYMENTS_COLLECTION_ID || 'client_billings';
export const ACCOUNTS_COL =
  import.meta.env.VITE_APPWRITE_ACCOUNTS_COLLECTION_ID || 'finance_accounts';
export const JOURNAL_COL =
  import.meta.env.VITE_APPWRITE_JOURNAL_COLLECTION_ID || 'finance_journal';
export const BANK_STATEMENTS_COL =
  import.meta.env.VITE_APPWRITE_BANK_STATEMENTS_COLLECTION_ID || 'bank_statements';
export const BANK_STATEMENT_ITEMS_COL =
  import.meta.env.VITE_APPWRITE_BANK_STATEMENT_ITEMS_COLLECTION_ID || 'bank_statement_items';
export const FINANCIAL_AUDIT_LOG_COL =
  import.meta.env.VITE_APPWRITE_FINANCIAL_AUDIT_LOG_COLLECTION_ID || 'financial_audit_log';

export const FINANCE_TX_FN_ID = '';

export const CLASSES_COL = '';
