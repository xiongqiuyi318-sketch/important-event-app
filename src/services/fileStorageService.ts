import { supabase } from '../lib/supabase';
import { StepAttachment, StepStatusImage } from '../types';

const IMAGE_BUCKET = import.meta.env.VITE_EVENT_IMAGE_BUCKET || 'event-images';
const EXCEL_BUCKET = import.meta.env.VITE_EVENT_EXCEL_BUCKET || 'event-excel';
const PDF_BUCKET = import.meta.env.VITE_EVENT_PDF_BUCKET || 'event-pdf';

const safeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_');

const buildPath = (eventId: string, stepId: string, filename: string): string => {
  return `${safeSegment(eventId)}/${safeSegment(stepId)}/${Date.now()}-${safeSegment(filename)}`;
};

const canUseSupabaseStorage = (): boolean => Boolean(supabase);

export interface UploadFileParams {
  eventId: string;
  stepId: string;
  file: File;
  blob?: Blob;
}

type FileRefInput = Pick<StepStatusImage, 'dataUrl' | 'url' | 'storageBucket' | 'storagePath'>;

export async function resolveFileUrl(file: FileRefInput): Promise<string> {
  if (file.url) return file.url;
  if (file.dataUrl) return file.dataUrl;
  if (!supabase || !file.storageBucket || !file.storagePath) {
    throw new Error('MISSING_FILE_URL');
  }

  const { data, error } = await supabase.storage.from(file.storageBucket).createSignedUrl(file.storagePath, 300);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'SIGN_URL_FAILED');
  }
  return data.signedUrl;
}

export async function uploadStepImage(params: UploadFileParams): Promise<StepStatusImage> {
  const source = params.blob || params.file;
  const type = params.blob?.type || params.file.type || 'image/jpeg';
  const size = params.blob?.size || params.file.size;

  if (!canUseSupabaseStorage()) {
    return {
      dataUrl: await readAsDataUrl(source),
      name: params.file.name,
      type,
      size,
      addedAt: new Date().toISOString(),
    };
  }

  const path = buildPath(params.eventId, params.stepId, params.file.name || 'image.jpg');
  try {
    const { error } = await supabase!.storage
      .from(IMAGE_BUCKET)
      .upload(path, source, { contentType: type, upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase!.storage.from(IMAGE_BUCKET).getPublicUrl(path);

    return {
      name: params.file.name,
      type,
      size,
      addedAt: new Date().toISOString(),
      storageBucket: IMAGE_BUCKET,
      storagePath: path,
      url: data.publicUrl || undefined,
    };
  } catch {
    // 若桶策略未放行或网络波动，回退到 dataUrl，避免前端“无法上传”。
    return {
      dataUrl: await readAsDataUrl(source),
      name: params.file.name,
      type,
      size,
      addedAt: new Date().toISOString(),
    };
  }
}

export async function uploadStepDocument(
  params: UploadFileParams & { kind: 'excel' | 'pdf' }
): Promise<StepAttachment> {
  const bucket = params.kind === 'pdf' ? PDF_BUCKET : EXCEL_BUCKET;

  if (!canUseSupabaseStorage()) {
    return {
      dataUrl: await readAsDataUrl(params.file),
      name: params.file.name,
      type: params.file.type,
      size: params.file.size,
      addedAt: new Date().toISOString(),
    };
  }

  const path = buildPath(params.eventId, params.stepId, params.file.name || 'file.bin');
  try {
    const { error } = await supabase!.storage
      .from(bucket)
      .upload(path, params.file, { contentType: params.file.type || 'application/octet-stream', upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabase!.storage.from(bucket).getPublicUrl(path);
    return {
      name: params.file.name,
      type: params.file.type,
      size: params.file.size,
      addedAt: new Date().toISOString(),
      storageBucket: bucket,
      storagePath: path,
      url: data.publicUrl || undefined,
    };
  } catch {
    return {
      dataUrl: await readAsDataUrl(params.file),
      name: params.file.name,
      type: params.file.type,
      size: params.file.size,
      addedAt: new Date().toISOString(),
    };
  }
}

async function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
