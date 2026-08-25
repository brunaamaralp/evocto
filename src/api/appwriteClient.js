import { Client, Account, TablesDB, Storage, Teams, ID, Query, Permission, Role } from 'appwrite';

export const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'evocto';
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID || 'files';

let clientInstance = null;

export function getAppwriteClient() {
  if (clientInstance) return clientInstance;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
    throw new Error(
      'Appwrite não configurado. Defina VITE_APPWRITE_ENDPOINT e VITE_APPWRITE_PROJECT_ID em .env.local'
    );
  }

  clientInstance = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  return clientInstance;
}

export function getAccount() {
  return new Account(getAppwriteClient());
}

export function getTablesDB() {
  return new TablesDB(getAppwriteClient());
}

export function getStorage() {
  return new Storage(getAppwriteClient());
}

export function getTeams() {
  return new Teams(getAppwriteClient());
}

export { ID, Query, Permission, Role };
