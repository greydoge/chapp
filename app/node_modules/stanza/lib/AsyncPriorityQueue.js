"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priorityQueue = priorityQueue;
class MinHeap {
    heap = [];
    insertionCounter = 0;
    get length() {
        return this.heap.length;
    }
    push(task, priority, callback) {
        // Reset counter when heap is empty to prevent overflow in long-lived queues
        if (this.heap.length === 0) {
            this.insertionCounter = 0;
        }
        const entry = {
            task,
            priority,
            insertionOrder: this.insertionCounter++,
            callback
        };
        this.heap.push(entry);
        this.bubbleUp(this.heap.length - 1);
    }
    isHigherPriority(a, b) {
        if (a.priority !== b.priority) {
            return a.priority < b.priority;
        }
        return a.insertionOrder < b.insertionOrder;
    }
    pop() {
        if (this.heap.length === 0) {
            return undefined;
        }
        const result = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return result;
    }
    clear() {
        this.heap = [];
        this.insertionCounter = 0;
    }
    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            if (!this.isHigherPriority(this.heap[index], this.heap[parentIndex])) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }
    bubbleDown(index) {
        const length = this.heap.length;
        while (true) {
            const left = (index << 1) + 1;
            const right = left + 1;
            let smallest = index;
            if (left < length && this.isHigherPriority(this.heap[left], this.heap[smallest])) {
                smallest = left;
            }
            if (right < length && this.isHigherPriority(this.heap[right], this.heap[smallest])) {
                smallest = right;
            }
            if (smallest === index) {
                break;
            }
            this.swap(index, smallest);
            index = smallest;
        }
    }
    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}
function priorityQueue(worker, concurrency = 1) {
    const heap = new MinHeap();
    let paused = false;
    let killed = false;
    let running = 0;
    let drainResolvers = [];
    const checkDrain = () => {
        if (heap.length === 0 && running === 0) {
            for (const resolve of drainResolvers) {
                resolve();
            }
            drainResolvers = [];
        }
    };
    const process = async () => {
        if (paused || killed || running >= concurrency || heap.length === 0) {
            return;
        }
        const entry = heap.pop();
        if (!entry) {
            return;
        }
        running++;
        try {
            await new Promise(resolve => {
                const done = () => resolve();
                const result = worker(entry.task, done);
                if (result instanceof Promise) {
                    result.then(done).catch(done);
                }
            });
            entry.callback?.();
        }
        catch (err) {
            entry.callback?.(err instanceof Error ? err : new Error(String(err)));
        }
        finally {
            running--;
            if (!killed) {
                checkDrain();
                process();
            }
        }
    };
    return {
        push(task, priority, callback) {
            if (killed) {
                return;
            }
            heap.push(task, priority, callback);
            queueMicrotask(() => process());
        },
        pause() {
            paused = true;
        },
        resume() {
            paused = false;
            process();
        },
        kill() {
            killed = true;
            heap.clear();
            drainResolvers = [];
        },
        idle() {
            return heap.length === 0 && running === 0;
        },
        drain() {
            if (heap.length === 0 && running === 0) {
                return Promise.resolve();
            }
            return new Promise(resolve => {
                drainResolvers.push(resolve);
            });
        }
    };
}
