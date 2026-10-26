import {
  getStorage,
  getAccount,
  getTablesDB,
  BUCKET_ID,
  DATABASE_ID,
  ID,
  Permission,
  Role,
} from '@/api/appwriteClient';
import { buildStorageUploadPermissions } from '@/lib/storageUploadPermissions';

const stubMode = import.meta.env.VITE_INTEGRATION_STUBS || 'mock';

function stub(name) {
  return async (payload) => {
    if (stubMode === 'error') {
      throw new Error(`${name} não migrado ainda (Fase 1 Appwrite)`);
    }
    console.warn(`[Appwrite stub] ${name}`, payload);
    if (name === 'InvokeLLM') {
      const prompt = payload?.prompt || payload?.input || '';
      return { output: `[mock] ${String(prompt).slice(0, 80)}` };
    }
    return { success: true, mocked: true };
  };
}

async function resolveUploadActor(explicitAgencyId) {
  const account = getAccount();
  const user = await account.get();
  let agencyId = String(explicitAgencyId || '').trim();
  if (!agencyId) {
    try {
      const tables = getTablesDB();
      const profile = await tables.getRow({
        databaseId: DATABASE_ID,
        tableId: 'profiles',
        rowId: user.$id,
      });
      agencyId = String(profile?.agencyId || '').trim();
    } catch {
      agencyId = '';
    }
  }
  return { userId: user.$id, agencyId };
}

/**
 * Upload com ACL mínima: team da agência + uploader.
 * Não usa Role.users() (qualquer autenticado no projeto).
 */
export async function UploadFile({ file, agencyId: agencyIdOpt } = {}) {
  if (!file) throw new Error('Arquivo obrigatório');
  const { userId, agencyId } = await resolveUploadActor(agencyIdOpt);
  const permissions = buildStorageUploadPermissions(
    { agencyId, userId },
    { Permission, Role }
  );

  const storage = getStorage();
  const fileId = ID.unique();
  const created = await storage.createFile({
    bucketId: BUCKET_ID,
    fileId,
    file,
    permissions,
  });

  const file_url = storage.getFileView({
    bucketId: BUCKET_ID,
    fileId: created.$id,
  });

  return {
    file_url: typeof file_url === 'string' ? file_url : file_url?.href || String(file_url),
    fileId: created.$id,
    url: typeof file_url === 'string' ? file_url : file_url?.href || String(file_url),
  };
}

export const UploadPrivateFile = UploadFile;

/**
 * View URL da sessão atual — não é URL assinada de longa duração.
 * Acesso continua sujeito às permissões do arquivo.
 */
export async function CreateFileSignedUrl({ fileId } = {}) {
  if (!fileId) throw new Error('fileId obrigatório');
  const storage = getStorage();
  const url = storage.getFileView({ bucketId: BUCKET_ID, fileId });
  return { url: typeof url === 'string' ? url : url?.href || String(url) };
}

export const InvokeLLM = stub('InvokeLLM');
export const SendEmail = stub('SendEmail');
export const GenerateImage = stub('GenerateImage');
export const ExtractDataFromUploadedFile = stub('ExtractDataFromUploadedFile');

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile,
};
