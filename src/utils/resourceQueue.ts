
// Global Queue Manager for R2/Media Resources
// Optimized: Separate queues but SHARED concurrency limit
// Prevents flooding even with multiple queue types

type Task = () => Promise<void> | void;

// GLOBAL CONCURRENCY LIMIT (Total open connections)
// Safe limit for browsers: 6. We use 5 to leave 1 spare for high priority/api calls.
const MAX_GLOBAL_CONCURRENT = 5;
let globalActiveRequests = 0;

class Queue {
    private queue: Task[] = [];
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    enqueue(task: Task) {
        this.queue.push(task);
        this.process();

        // Return cleanup function
        return () => {
            const idx = this.queue.indexOf(task);
            if (idx > -1) this.queue.splice(idx, 1);
        };
    }

    // Tries to process the next item in THIS queue
    process() {
        // 1. Check Global Limit
        if (globalActiveRequests >= MAX_GLOBAL_CONCURRENT) {
            return; // System busy
        }

        // 2. Check Queue Empty
        if (this.queue.length === 0) return;

        // 3. Start Task
        const nextTask = this.queue.shift();
        if (nextTask) {
            globalActiveRequests++;
            // console.debug(`[Queue:${this.name}] Start. Global Active: ${globalActiveRequests}/${MAX_GLOBAL_CONCURRENT}`);

            try {
                const result = nextTask();
                if (result instanceof Promise) {
                    result
                        .then(() => {
                            this.release();
                        })
                        .catch(e => {
                            console.error(`[Queue:${this.name}] Error:`, e);
                            this.release();
                        });
                } else {
                    // Sync task: release immediately
                    this.release();
                }
            } catch (e) {
                console.error(`[Queue:${this.name}] Sync Error:`, e);
                this.release();
            }
        }
    }

    // Called when a task finishes
    release() {
        if (globalActiveRequests > 0) globalActiveRequests--;

        // Trigger processing for ALL queues to fill the slot
        // Prioritize Images over Media
        resourceQueue.processAll();
    }
}

// Instantiate Queues
const imageQueue = new Queue('Images');
const mediaQueue = new Queue('Media');

export const resourceQueue = {
    enqueue: (task: Task, type: 'image' | 'video' | 'audio' = 'image') => {
        if (type === 'image') {
            return imageQueue.enqueue(task);
        } else {
            return mediaQueue.enqueue(task);
        }
    },

    release: (_type: any) => {
        // Manually decrement if needed (mostly internal use now)
        if (globalActiveRequests > 0) globalActiveRequests--;
        resourceQueue.processAll();
    },

    processAll: () => {
        // Strategy: Give priority to images (fast imports)
        // If slots available, imageQueue takes them first
        imageQueue.process();

        // Only if slots still available, mediaQueue runs
        if (globalActiveRequests < MAX_GLOBAL_CONCURRENT) {
            mediaQueue.process();
        }
    },

    getDebug: () => ({
        globalActive: globalActiveRequests,
        max: MAX_GLOBAL_CONCURRENT
    })
};
