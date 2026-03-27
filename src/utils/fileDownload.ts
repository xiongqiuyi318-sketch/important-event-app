export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

export function getImageExtension(dataUrl?: string, type?: string): string {
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
  type?: string
): string {
  const ext = getImageExtension(dataUrl, type);
  return `${safeFilename(eventTitle || '事件')}-步骤${stepNumber}.${ext}`;
}
