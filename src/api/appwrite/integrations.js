import { getStorage, BUCKET_ID, ID, Permission, Role } from '@/api/appwriteClient';

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

export async function UploadFile({ file } = {}) {
  if (!file) throw new Error('Arquivo obrigatório');
  const storage = getStorage();
  const fileId = ID.unique();
  const created = await storage.createFile({
    bucketId: BUCKET_ID,
    fileId,
    file,
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
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

export async function CreateFileSignedUrl({ fileId } = {}) {
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
