// Safe API Fetch interceptor wrapper
export const getVisitorId = (): string => {
  if (typeof window === 'undefined') return 'default_user';
  
  // Prefer logged in user ID if authentication is active
  const userId = localStorage.getItem('pendulum_user_id');
  if (userId) {
    return userId;
  }

  let id = localStorage.getItem('pendulum_visitor_id');
  if (!id) {
    id = `visitor_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem('pendulum_visitor_id', id);
  }
  return id;
};

export const addAccountBackup = (backup: { id: string; email: string; passwordHash: string; isPaid: boolean; createdAt?: string; twoFactorEnabled?: boolean }) => {
  if (typeof window === 'undefined' || !backup || !backup.email) return;
  try {
    const raw = localStorage.getItem('pendulum_backup_accounts');
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) {
      localStorage.setItem('pendulum_backup_accounts', JSON.stringify([backup]));
      return;
    }
    
    // Filter out existing backup on same email and replace it
    const filtered = list.filter((item: any) => item && item.email && item.email.toLowerCase() !== backup.email.toLowerCase());
    filtered.push(backup);
    localStorage.setItem('pendulum_backup_accounts', JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save local account credentials backup:', err);
  }
};

export const getAccountBackups = (): Array<{ id: string; email: string; passwordHash: string; isPaid: boolean; createdAt?: string; twoFactorEnabled?: boolean }> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('pendulum_backup_accounts');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const visitorId = getVisitorId();
  const cleanInit = init || {};
  const headers = new Headers(cleanInit.headers || {});
  if (!headers.has('X-Visitor-ID')) {
    headers.set('X-Visitor-ID', visitorId);
  }
  
  if (typeof window !== 'undefined') {
    const email = localStorage.getItem('pendulum_user_email');
    if (email) {
      headers.set('X-User-Email', email);
    }
  }

  cleanInit.headers = headers;
  return fetch(input, cleanInit);
};
