/**
 * Appwrite Databases client (server / API key).
 */
import { Client, Databases } from 'node-appwrite';

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || '';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT ||
  process.env.VITE_APPWRITE_PROJECT ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || '';

export function getDatabaseId() {
  return (
    process.env.APPWRITE_DATABASE_ID ||
    process.env.VITE_APPWRITE_DATABASE_ID ||
    'evocto'
  );
}

let cachedDb = null;

export function getDatabases() {
  if (cachedDb) return cachedDb;
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error('Appwrite admin não configurado (ENDPOINT/PROJECT/API_KEY)');
  }
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  cachedDb = new Databases(client);
  return cachedDb;
}

/** Proxy lazy — compatível com `import { databases } from './appwrite.js'` */
export const databases = {
  createDocument: (...args) => getDatabases().createDocument(...args),
  getDocument: (...args) => getDatabases().getDocument(...args),
  updateDocument: (...args) => getDatabases().updateDocument(...args),
  listDocuments: (...args) => getDatabases().listDocuments(...args),
  deleteDocument: (...args) => getDatabases().deleteDocument(...args),
};

export default databases;
