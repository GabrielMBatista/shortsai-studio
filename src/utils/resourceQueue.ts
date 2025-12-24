
// Global Queue Manager for R2/Media Resources
// Prevents flooding the browser/CDN with too many concurrent download requests (ERR_CONNECTION_CLOSED)

type Task = () => void;

const queue: Task[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3; // Reduzido para evitar bloqueio do R2 (ERR_CONNECTION_CLOSED)

export const resourceQueue = {
    enqueue: (task: Task) => {
        queue.push(task);
        processQueue();

        // Return a cleanup function in case component unmounts before starting
        return () => {
            const idx = queue.indexOf(task);
            if (idx > -1) queue.splice(idx, 1);
        };
    },

    release: () => {
        if (activeRequests > 0) activeRequests--;
        processQueue();
    },

    // Debug info
    getStatus: () => ({ active: activeRequests, queued: queue.length })
};

function processQueue() {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) return; // Busy
    if (queue.length === 0) return; // Empty

    const nextTask = queue.shift();
    if (nextTask) {
        activeRequests++;
        console.debug(`[ResourceQueue] Starting task. Active: ${activeRequests}, Queued: ${queue.length}`);

        // Execute carefully
        try {
            nextTask();
        } catch (e) {
            console.error("[ResourceQueue] Task execution failed immediately", e);
            // If task crashed synchronously, release the slot immediately
            resourceQueue.release();
        }
    }
}
