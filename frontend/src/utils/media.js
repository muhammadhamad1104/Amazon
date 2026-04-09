const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const normalizeSlashes = (value) => value.replace(/\\/g, '/');

const getWindowOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

const resolveApiOrigin = () => {
  const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (configuredApiUrl) {
    try {
      return new URL(configuredApiUrl, getWindowOrigin() || undefined).origin;
    } catch {
      return getWindowOrigin();
    }
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  return getWindowOrigin();
};

const API_ORIGIN = resolveApiOrigin();

const withApiOrigin = (path) => (API_ORIGIN ? `${API_ORIGIN}${path}` : path);

export const resolveImageUrl = (value) => {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (!rawValue) return '';

  const normalized = normalizeSlashes(rawValue);

  if (/^(data:|blob:)/i.test(normalized)) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsedUrl = new URL(normalized);
      const hostname = (parsedUrl.hostname || '').toLowerCase();
      const pathname = normalizeSlashes(parsedUrl.pathname || '');

      if (LOCAL_HOSTNAMES.has(hostname) && pathname.startsWith('/uploads/')) {
        return withApiOrigin(`${pathname}${parsedUrl.search}${parsedUrl.hash}`);
      }

      return normalized;
    } catch {
      return normalized;
    }
  }

  if (normalized.startsWith('/uploads/')) {
    return withApiOrigin(normalized);
  }

  if (normalized.startsWith('uploads/')) {
    return withApiOrigin(`/${normalized}`);
  }

  if (normalized.startsWith('/api/uploads/')) {
    return withApiOrigin(normalized.replace(/^\/api/, ''));
  }

  if (normalized.startsWith('api/uploads/')) {
    return withApiOrigin(`/${normalized.replace(/^api\//, '')}`);
  }

  return normalized;
};
