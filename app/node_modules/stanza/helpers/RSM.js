"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultSetPager = void 0;
exports.createPager = createPager;
class ResultSetPager {
    query;
    cursor;
    direction;
    reverse;
    pageSize;
    resultCount;
    resultComplete = false;
    fetchedCount = 0;
    yieldedCount = 0;
    constructor(opts) {
        this.cursor = { first: opts.before, last: opts.after };
        this.query = opts.query;
        this.direction = opts.direction ?? 'forward';
        this.reverse = opts.reverse ?? this.direction === 'backward';
        this.pageSize = opts.pageSize ?? 20;
    }
    async *[Symbol.asyncIterator]() {
        let currentResults = [];
        do {
            currentResults = await this.fetchPage();
            for (const item of currentResults) {
                this.yieldedCount += 1;
                yield item;
            }
        } while (currentResults.length > 0);
    }
    async size() {
        if (this.resultCount !== undefined) {
            return this.resultCount;
        }
        const { paging } = await this.query({ max: 0 });
        this.resultCount = paging.count;
        return paging.count;
    }
    queryCompleted() {
        return this.resultComplete;
    }
    finished() {
        return this.resultComplete && this.yieldedCount === this.fetchedCount;
    }
    async fetchPage() {
        const { results, paging } = await this.query({
            before: this.direction === 'backward' ? this.cursor.first ?? '' : undefined,
            after: this.direction === 'forward' ? this.cursor.last : undefined,
            max: this.pageSize
        });
        this.cursor = paging;
        this.resultCount = paging.count;
        this.fetchedCount += results.length;
        if ((this.pageSize && results.length < this.pageSize) ||
            (this.resultCount && this.fetchedCount === this.resultCount)) {
            this.resultComplete = true;
        }
        if (this.reverse) {
            results.reverse();
        }
        return results;
    }
}
exports.ResultSetPager = ResultSetPager;
function createPager(opts) {
    return new ResultSetPager(opts);
}
