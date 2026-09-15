export class AppState {
    constructor() {
        this.files = []; // Raw files being uploaded
        this.processedFiles = []; // Processed file data
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.questionSettings = {};
        this.lastResult = null;
        this.allResults = [];
        this.isUploading = false;
    }
}