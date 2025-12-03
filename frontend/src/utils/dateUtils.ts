export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const addDays = (date: string, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};

// Restituisce YYYY-MM-DD in locale, evitando gli shift di timezone di toISOString
export const toInputDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getNotificationStatus = (daysUntilExpiry: number): 'safe' | 'warning' | 'critical' | 'expired' => {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'critical';
  if (daysUntilExpiry <= 30) return 'warning';
  return 'safe';
};

export const isExpiringSoon = (expiryDate: string, daysThreshold: number = 30): boolean => {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil <= daysThreshold && daysUntil >= 0;
};
