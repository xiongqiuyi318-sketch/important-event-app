export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

export function getImageExtension(dataUrl?: string, type?: string, name?: string): string {
  if (name) {
    const m = name.match(/\.([a-z0-9]+)$/i);
    if (m) {
      const ext = m[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (dataUrl?.startsWith('data:image/png')) return 'png';
  if (dataUrl?.startsWith('data:image/webp')) return 'webp';
  if (dataUrl?.startsWith('data:image/gif')) return 'gif';
  return 'jpg';
}

export function buildStepImageFilename(
  eventTitle: string | undefined,
  stepNumber: number,
  dataUrl?: string,
  type?: string,
  name?: string
): string {
  const ext = getImageExtension(dataUrl, type, name);
  return `${safeFilename(eventTitle || '事件')}-步骤${stepNumber}.${ext}`;
}

/** 从文件名或 MIME 推断下载扩展名（默认 pdf / xlsx） */
export function getDocumentExtension(name?: string, type?: string, dataUrl?: string): string {
  if (name) {
    const m = name.match(/\.([a-z0-9]+)$/i);
    if (m) {
      const e = m[1].toLowerCase();
      if (['pdf', 'xls', 'xlsx', 'xlsm', 'csv'].includes(e)) return e;
    }
  }
  if (type?.includes('pdf') || dataUrl?.startsWith('data:application/pdf')) return 'pdf';
  if (
    type?.includes('spreadsheetml') ||
    type?.includes('ms-excel') ||
    dataUrl?.includes('spreadsheetml')
  ) {
    return type?.includes('ms-excel') && !type?.includes('openxml') ? 'xls' : 'xlsx';
  }
  return 'bin';
}

export function buildStepDocumentDownloadName(
  eventTitle: string | undefined,
  stepNumber: number,
  slotIndex: number,
  kind: 'excel' | 'pdf',
  attachment: { name?: string; type?: string; dataUrl?: string }
): string {
  const base = safeFilename(eventTitle || '事件');
  const ext = getDocumentExtension(attachment.name, attachment.type, attachment.dataUrl);
  const fallback = kind === 'pdf' ? 'pdf' : 'xlsx';
  const useExt = ext === 'bin' ? fallback : ext;
  return `${base}-步骤${stepNumber}-${kind === 'pdf' ? 'PDF' : 'Excel'}${slotIndex}.${useExt}`;
}
