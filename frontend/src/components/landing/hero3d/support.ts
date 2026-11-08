// L'esperienza 3D richiede WebGL e rispetta "riduci movimento": altrimenti si mostra l'hero statico.
export const canUseHero3D = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
