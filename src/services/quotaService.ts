import { getCurrentUser, saveUsageLog } from './storageService';

// Simple event bus for Quota HUD
type QuotaListener = (stats: { rpm: number; type: string }) => void;
const listeners: QuotaListener[] = [];

export const subscribeToQuota = (listener: QuotaListener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = (type: string, rpm: number) => {
    listeners.forEach(l => l({ rpm, type }));
};

// Usage tracking windows (1 minute)
const usageHistory: { timestamp: number; type: string }[] = [];

export const trackUsage = (model: string, cost: number) => {
    const now = Date.now();
    const user = getCurrentUser();
    
    // 1. Log to DB for audit
    if (user) {
        saveUsageLog({
            id: crypto.randomUUID(),
            userId: user.id,
            actionType: 'API_CALL',
            provider: 'gemini',
            modelName: model,
            timestamp: now,
            status: 'success'
        });
    }

    // 2. Track for HUD (In-memory)
    let type = 'text';
    if (model.includes('image')) type = 'image';
    if (model.includes('audio') || model.includes('tts')) type = 'audio';

    usageHistory.push({ timestamp: now, type });

    // Cleanup old logs (> 1 min)
    const cutoff = now - 60000;
    let i = usageHistory.length;
    while (i--) {
        if (usageHistory[i].timestamp < cutoff) {
            usageHistory.splice(i, 1);
        }
    }

    // Calculate RPM for this specific type
    const count = usageHistory.filter(h => h.type === type).length;
    notifyListeners(type, count);
};