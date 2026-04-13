const detectOs = (ua: string): string => {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
};

const detectBrowser = (ua: string): string => {
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua) && !/edg|opr|opera/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios|edg|opr|opera/i.test(ua)) return 'Safari';
  return 'Browser';
};

export const getCurrentDeviceLabel = (): string => {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent || '';
  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  return `${os} ${browser}`;
};
