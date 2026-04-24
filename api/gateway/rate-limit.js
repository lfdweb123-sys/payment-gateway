// Stockage simple en mémoire (réinitialisé à chaque déploiement)
const requestCounts = new Map();
const MAX_REQUESTS = 100; // max requêtes
const WINDOW_MS = 60 * 1000; // par minute

export function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = apiKey || 'anonymous';
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }
  
  const timestamps = requestCounts.get(key).filter(t => now - t < WINDOW_MS);
  
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000) };
  }
  
  timestamps.push(now);
  requestCounts.set(key, timestamps);
  return { allowed: true };
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestCounts) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, valid);
    }
  }
}, 60000);