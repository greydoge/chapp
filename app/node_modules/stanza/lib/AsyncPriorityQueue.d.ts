export type Worker<T> = (task: T, done: () => void) => Promise<void> | void;
export interface AsyncPriorityQueue<T> {
    push(task: T, priority: number, callback?: (err?: Error) => void): void;
    pause(): void;
    resume(): void;
    kill(): void;
    idle(): boolean;
    drain(): Promise<void>;
}
export declare function priorityQueue<T>(worker: Worker<T>, concurrency?: number): AsyncPriorityQueue<T>;
