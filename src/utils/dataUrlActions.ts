/** 将 data URL 转为 Blob（比直接把超长 data: 写在 a.href 上更兼容移动端/微信内置浏览器） */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** 触发下载（优先走 Blob URL，避免 data: 链接在移动端被忽略或打开为空白页） */
export async function downloadDataUrlAsFile(dataUrl: string, filename: string): Promise<void> {
  if (!dataUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const blob = await dataUrlToBlob(dataUrl);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

/**
 * 在新窗口打开（先同步 open 空白页再赋 blob URL，利于 iOS/部分 WebView 保留用户手势）
 */
export async function openDataUrlInNewWindow(dataUrl: string): Promise<void> {
  if (!dataUrl.startsWith('data:')) {
    const newWin = window.open(dataUrl, '_blank', 'noopener,noreferrer');
    if (!newWin) throw new Error('POPUP_BLOCKED');
    return;
  }
  const newWin = window.open('', '_blank', 'noopener,noreferrer');
  if (!newWin) {
    throw new Error('POPUP_BLOCKED');
  }
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    newWin.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch {
    try {
      newWin.close();
    } catch {
      /* ignore */
    }
    throw new Error('OPEN_FAILED');
  }
}
