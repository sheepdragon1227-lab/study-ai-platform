export class Database {
    constructor() {
        this.store = new Map();
    }

    async init() {
        // Initialize database (currently using localStorage)
        return Promise.resolve();
    }

    async saveFiles(files) {
        this.store.set('files', files);
        return Promise.resolve();
    }

    async getFiles() {
        return Promise.resolve(this.store.get('files') || []);
    }

    async saveQuestions(questions) {
        this.store.set('questions', questions);
        return Promise.resolve();
    }

    async getQuestions() {
        return Promise.resolve(this.store.get('questions') || []);
    }

    async saveResult(result) {
        const results = this.store.get('results') || [];
        results.push(result);
        this.store.set('results', results);
        return Promise.resolve();
    }

    async getResults() {
        return Promise.resolve(this.store.get('results') || []);
    }
}