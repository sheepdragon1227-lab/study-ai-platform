import { AppState } from './state.js';
import { UIManager } from './ui.js';
import { FileProcessor } from './fileProcessor.js';
import { QuestionGenerator } from './questionGenerator.js';
import { Database } from './database.js';

class StudyAIApp {
    constructor() {
        this.state = new AppState();
        this.ui = new UIManager(this);
        this.fileProcessor = new FileProcessor();
        this.questionGenerator = new QuestionGenerator();
        this.db = new Database();
        this.init();
    }

    async init() {
        // Initialize database
        await this.db.init();
        
        // Load saved data from localStorage
        this.loadState();
        
        // Setup UI event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.ui.init();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.startUpload());
        }
    }

    handleFiles(files) {
        const filesToAdd = Array.from(files).filter(file => {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
            const isAllowed = allowedTypes.includes(file.type) || file.name.endsWith('.pdf');
            if (!isAllowed) {
                alert(`지원하지 않는 파일 형식입니다: ${file.name}`);
            }
            return isAllowed;
        });

        this.state.files = [...this.state.files, ...filesToAdd];
        this.ui.updateFileList(this.state.files);
        document.getElementById('uploadBtn').disabled = this.state.files.length === 0;
    }

    async startUpload() {
        if (this.state.files.length === 0) return;

        this.state.isUploading = true;
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading"></span> 업로드 중...';

        try {
            // Process files
            const processedFiles = [];
            for (let i = 0; i < this.state.files.length; i++) {
                const file = this.state.files[i];
                const progress = ((i + 1) / this.state.files.length) * 100;
                
                try {
                    const processedFile = await this.fileProcessor.process(file);
                    processedFiles.push(processedFile);
                    this.ui.updateFileProgress(file.name, progress, 'success');
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    this.ui.updateFileProgress(file.name, 0, 'error');
                }
            }

            // Save processed files
            this.state.processedFiles = processedFiles;
            this.state.files = [];
            await this.db.saveFiles(processedFiles);
            this.saveState();

            // Show success message
            this.ui.showAlert('success', `${processedFiles.length}개 파일이 업로드되었습니다.`);
            
            // Redirect to analysis
            setTimeout(() => {
                this.navigateTo('analysis');
            }, 1500);
        } catch (error) {
            console.error('Upload error:', error);
            this.ui.showAlert('error', '파일 업로드 중 오류가 발생했습니다.');
        } finally {
            this.state.isUploading = false;
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '업로드 시작';
            document.getElementById('fileInput').value = '';
        }
    }

    async navigateTo(page) {
        this.ui.showPage(page);
        
        if (page === 'analysis') {
            await this.showAnalysis();
        } else if (page === 'settings') {
            await this.showSettings();
        } else if (page === 'quiz') {
            await this.showQuiz();
        } else if (page === 'mistakes') {
            await this.showMistakes();
        } else if (page === 'statistics') {
            await this.showStatistics();
        }
    }

    async showAnalysis() {
        const content = document.getElementById('analysisContent');
        if (this.state.processedFiles.length === 0) return;

        let html = '<div style="margin-bottom: 24px;">';
        html += '<h3 style="font-weight: 600; margin-bottom: 16px;">업로드된 자료</h3>';
        html += '<div class="grid grid-2">';
        
        for (const file of this.state.processedFiles) {
            html += `
                <div class="card">
                    <div style="font-weight: 600; margin-bottom: 8px;">${file.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
                        페이지: ${file.pageCount || '분석 중'} | 크기: ${(file.size / 1024 / 1024).toFixed(2)}MB
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; max-height: 100px; overflow-y: auto;">
                        ${file.preview || '분석 중...'}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        html += '<button class="btn btn-primary" onclick="app.startQuestionGeneration()">문제 설정하기</button>';
        html += '</div>';
        
        content.innerHTML = html;
    }

    async showSettings() {
        const content = document.getElementById('settingsContent');
        if (this.state.processedFiles.length === 0) return;

        let html = `
            <div class="form-group">
                <label>문제 범위</label>
                <div class="radio-group">
                    <div class="radio-item">
                        <input type="radio" name="range" value="all" id="range-all" checked>
                        <label for="range-all">전체 자료</label>
                    </div>
                    <div class="radio-item">
                        <input type="radio" name="range" value="custom" id="range-custom">
                        <label for="range-custom">범위 지정</label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>문제 수</label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px;">
                    ${[5, 10, 15, 20, 30].map(num => `
                        <button class="btn btn-secondary" style="flex: 1;" onclick="app.setQuestionCount(${num})">${num}</button>
                    `).join('')}
                </div>
                <input type="number" placeholder="또는 직접 입력" min="1" max="100" style="margin-top: 8px;" id="customCount">
            </div>

            <div class="form-group">
                <label>문제 유형 (중복 선택 가능)</label>
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="checkbox" id="type-multiple" name="type" value="multiple" checked>
                        <label for="type-multiple">객관식 (4지선다)</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="type-multiple5" name="type" value="multiple5">
                        <label for="type-multiple5">객관식 (5지선다)</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="type-short" name="type" value="short">
                        <label for="type-short">주관식</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="type-ox" name="type" value="ox">
                        <label for="type-ox">O/X</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="type-blank" name="type" value="blank">
                        <label for="type-blank">빈칸</label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>난이도</label>
                <div class="radio-group">
                    ${['easy', 'normal', 'hard', 'very-hard', 'mixed'].map(level => `
                        <div class="radio-item">
                            <input type="radio" name="difficulty" value="${level}" id="diff-${level}" ${level === 'mixed' ? 'checked' : ''}>
                            <label for="diff-${level}">${this.getDifficultyLabel(level)}</label>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="btn btn-primary" onclick="app.generateQuestions()">문제 생성하기</button>
        `;
        
        content.innerHTML = html;
    }

    getDifficultyLabel(level) {
        const labels = {
            'easy': '쉬움',
            'normal': '보통',
            'hard': '어려움',
            'very-hard': '매우 어려움',
            'mixed': '혼합'
        };
        return labels[level] || level;
    }

    setQuestionCount(count) {
        this.state.questionSettings.count = count;
        document.getElementById('customCount').value = count;
    }

    async generateQuestions() {
        const range = document.querySelector('input[name="range"]:checked').value;
        const count = parseInt(document.getElementById('customCount').value) || this.state.questionSettings.count || 10;
        const types = Array.from(document.querySelectorAll('input[name="type"]:checked')).map(el => el.value) || ['multiple'];
        const difficulty = document.querySelector('input[name="difficulty"]:checked').value;

        this.state.questionSettings = { count, types, difficulty, range };
        this.saveState();

        const settingsBtn = event.target;
        settingsBtn.disabled = true;
        settingsBtn.innerHTML = '<span class="loading"></span> 생성 중...';

        try {
            // Generate questions
            const questions = await this.questionGenerator.generate(
                this.state.processedFiles,
                this.state.questionSettings
            );

            this.state.currentQuestions = questions;
            this.state.currentQuestionIndex = 0;
            this.state.userAnswers = new Array(questions.length).fill(null);
            await this.db.saveQuestions(questions);
            this.saveState();

            this.ui.showAlert('success', `${questions.length}개의 문제가 생성되었습니다.`);
            setTimeout(() => {
                this.navigateTo('quiz');
            }, 1500);
        } catch (error) {
            console.error('Question generation error:', error);
            this.ui.showAlert('error', '문제 생성 중 오류가 발생했습니다.');
        } finally {
            settingsBtn.disabled = false;
            settingsBtn.innerHTML = '문제 생성하기';
        }
    }

    async showQuiz() {
        const content = document.getElementById('quizContent');
        if (this.state.currentQuestions.length === 0) return;

        const question = this.state.currentQuestions[this.state.currentQuestionIndex];
        const index = this.state.currentQuestionIndex;
        const total = this.state.currentQuestions.length;

        let html = `
            <div class="question-card">
                <div class="question-header">
                    <span class="question-number">문제 ${index + 1}/${total}</span>
                    <span class="question-difficulty difficulty-${question.difficulty}">${this.getDifficultyLabel(question.difficulty)}</span>
                </div>

                <div class="question-content">
                    <div class="question-text">${question.question}</div>
        `;

        if (question.type === 'multiple' || question.type === 'multiple5') {
            html += '<div class="options">';
            (question.options || []).forEach((option, i) => {
                const checked = this.state.userAnswers[index]?.answer === i ? 'checked' : '';
                html += `
                    <label class="option">
                        <input type="radio" name="answer" value="${i}" ${checked}>
                        <span>${option}</span>
                    </label>
                `;
            });
            html += '</div>';
        } else if (question.type === 'ox') {
            const checked1 = this.state.userAnswers[index]?.answer === 'O' ? 'checked' : '';
            const checked2 = this.state.userAnswers[index]?.answer === 'X' ? 'checked' : '';
            html += `
                <div class="options">
                    <label class="option">
                        <input type="radio" name="answer" value="O" ${checked1}>
                        <span>O (참)</span>
                    </label>
                    <label class="option">
                        <input type="radio" name="answer" value="X" ${checked2}>
                        <span>X (거짓)</span>
                    </label>
                </div>
            `;
        } else if (question.type === 'short' || question.type === 'blank') {
            const userAnswer = this.state.userAnswers[index]?.answer || '';
            html += `
                <div class="answer-input-group">
                    <label>답변</label>
                    <textarea id="answerInput" placeholder="답변을 입력하세요">${userAnswer}</textarea>
                </div>
            `;
        }

        html += `
                </div>
            </div>

            <div class="question-controls">
                <div class="progress-indicator">진행률: ${index + 1}/${total}</div>
                <div class="controls-group">
                    <button class="btn btn-secondary" onclick="app.prevQuestion()" ${index === 0 ? 'disabled' : ''}>← 이전</button>
                    <button class="btn btn-primary" onclick="app.nextQuestion()">다음 →</button>
                </div>
            </div>

            ${index === total - 1 ? `
                <div style="margin-top: 16px;">
                    <button class="btn btn-success" onclick="app.submitQuiz()" style="width: 100%; padding: 12px;">제출 및 채점</button>
                </div>
            ` : ''}
        `;

        content.innerHTML = html;

        // Add event listener for answer changes
        content.querySelectorAll('input[name="answer"]').forEach(input => {
            input.addEventListener('change', () => {
                this.state.userAnswers[index] = {
                    answer: input.type === 'radio' ? input.value : input.value,
                    type: question.type
                };
                this.saveState();
            });
        });

        if (document.getElementById('answerInput')) {
            document.getElementById('answerInput').addEventListener('change', () => {
                this.state.userAnswers[index] = {
                    answer: document.getElementById('answerInput').value,
                    type: question.type
                };
                this.saveState();
            });
        }
    }

    nextQuestion() {
        if (this.state.currentQuestionIndex < this.state.currentQuestions.length - 1) {
            this.state.currentQuestionIndex++;
            this.saveState();
            this.showQuiz();
        }
    }

    prevQuestion() {
        if (this.state.currentQuestionIndex > 0) {
            this.state.currentQuestionIndex--;
            this.saveState();
            this.showQuiz();
        }
    }

    async submitQuiz() {
        const results = this.questionGenerator.grade(
            this.state.currentQuestions,
            this.state.userAnswers
        );

        this.state.lastResult = results;
        this.state.allResults.push(results);
        await this.db.saveResult(results);
        this.saveState();

        this.showResults(results);
    }

    showResults(results) {
        const content = document.getElementById('quizContent');
        const correctCount = results.correctCount;
        const totalCount = results.totalCount;
        const percentage = Math.round((correctCount / totalCount) * 100);

        let html = `
            <div class="result-summary">
                <div style="font-size: 14px; font-weight: 600; opacity: 0.9;">채점 결과</div>
                <div class="result-score">${percentage}%</div>
                <div class="result-details">
                    <div class="result-item">
                        <span class="result-item-value">${correctCount}</span>
                        <span class="result-item-label">정답</span>
                    </div>
                    <div class="result-item">
                        <span class="result-item-value">${totalCount - correctCount}</span>
                        <span class="result-item-label">오답</span>
                    </div>
                    <div class="result-item">
                        <span class="result-item-value">${totalCount}</span>
                        <span class="result-item-label">전체</span>
                    </div>
                </div>
            </div>
        `;

        // Show detailed review
        html += '<h3 style="font-weight: 600; margin: 24px 0 16px 0;">문제별 해설</h3>';
        
        results.details.forEach((detail, index) => {
            const statusClass = detail.correct ? 'correct' : 'incorrect';
            const statusText = detail.correct ? '✓ 정답' : '✗ 오답';
            
            html += `
                <div class="problem-review">
                    <div class="review-header">
                        <span style="font-weight: 600;">문제 ${index + 1}</span>
                        <span class="review-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="review-content">
                        <div class="review-item">
                            <div class="review-label">문제</div>
                            <div class="review-value">${this.state.currentQuestions[index].question}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">당신의 답</div>
                            <div class="review-value">${detail.userAnswer || '(답변 없음)'}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">정답</div>
                            <div class="review-value">${detail.correctAnswer}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">해설</div>
                            <div class="review-value">${detail.explanation || '설명이 없습니다.'}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="app.navigateTo('mistakes')">오답노트 보기</button>
                <button class="btn btn-secondary" onclick="app.navigateTo('statistics')">학습 통계</button>
                <button class="btn btn-secondary" onclick="app.navigateTo('upload')">새로운 파일 업로드</button>
            </div>
        `;

        content.innerHTML = html;
    }

    async showMistakes() {
        const content = document.getElementById('mistakesContent');
        const mistakes = this.state.allResults.flatMap(result => 
            result.details
                .map((detail, idx) => ({ ...detail, questionIndex: idx }))
                .filter(d => !d.correct)
        );

        if (mistakes.length === 0) return;

        let html = '';
        mistakes.forEach((mistake, i) => {
            html += `
                <div class="problem-review">
                    <div class="review-header">
                        <span style="font-weight: 600;">오답 ${i + 1}</span>
                        <button class="btn btn-small btn-secondary" onclick="app.repeatMistake(${i})">다시 풀기</button>
                    </div>
                    <div class="review-content">
                        <div class="review-item">
                            <div class="review-label">문제</div>
                            <div class="review-value">${mistake.question}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">당신의 답</div>
                            <div class="review-value" style="color: var(--error);">${mistake.userAnswer || '(답변 없음)'}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">정답</div>
                            <div class="review-value" style="color: var(--success);">${mistake.correctAnswer}</div>
                        </div>
                        <div class="review-item">
                            <div class="review-label">해설</div>
                            <div class="review-value">${mistake.explanation || '설명이 없습니다.'}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        content.innerHTML = html || '<div class="empty-state"><div class="empty-icon">✨</div><div class="empty-title">완벽합니다!</div></div>';
    }

    async showStatistics() {
        const content = document.getElementById('statisticsContent');
        
        if (this.state.allResults.length === 0) return;

        const totalQuestions = this.state.allResults.reduce((sum, r) => sum + r.totalCount, 0);
        const totalCorrect = this.state.allResults.reduce((sum, r) => sum + r.correctCount, 0);
        const avgScore = Math.round((totalCorrect / totalQuestions) * 100);

        let html = `
            <div class="grid grid-3">
                <div class="stat-card">
                    <div class="stat-value">${totalQuestions}</div>
                    <div class="stat-label">총 문제 풀이수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgScore}%</div>
                    <div class="stat-label">평균 점수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalCorrect}</div>
                    <div class="stat-label">총 정답</div>
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <h3 class="card-title">최근 학습 기록</h3>
                <div style="max-height: 400px; overflow-y: auto;">
        `;

        // Show last 10 results
        const recentResults = this.state.allResults.slice(-10).reverse();
        recentResults.forEach((result, i) => {
            const percentage = Math.round((result.correctCount / result.totalCount) * 100);
            html += `
                <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">풀이 ${i + 1}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">정답: ${result.correctCount}/${result.totalCount}</div>
                    </div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--primary);">${percentage}%</div>
                </div>
            `;
        });

        html += `
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <h3 class="card-title">약점 분석</h3>
                <button class="btn btn-primary" onclick="app.generateMissingConcepts()">약한 부분 집중 연습</button>
            </div>
        `;

        content.innerHTML = html;
    }

    async generateMissingConcepts() {
        this.ui.showAlert('info', '약한 부분을 분석하여 문제를 생성하고 있습니다...');
        // Generate new questions focused on weak areas
        this.navigateTo('settings');
    }

    repeatMistake(index) {
        this.ui.showAlert('info', '이 기능은 준비 중입니다.');
    }

    startQuestionGeneration() {
        this.navigateTo('settings');
    }

    saveState() {
        try {
            localStorage.setItem('studyAIState', JSON.stringify({
                processedFiles: this.state.processedFiles,
                currentQuestions: this.state.currentQuestions,
                userAnswers: this.state.userAnswers,
                questionSettings: this.state.questionSettings,
                allResults: this.state.allResults,
                currentQuestionIndex: this.state.currentQuestionIndex
            }));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('studyAIState');
            if (saved) {
                const data = JSON.parse(saved);
                this.state.processedFiles = data.processedFiles || [];
                this.state.currentQuestions = data.currentQuestions || [];
                this.state.userAnswers = data.userAnswers || [];
                this.state.questionSettings = data.questionSettings || {};
                this.state.allResults = data.allResults || [];
                this.state.currentQuestionIndex = data.currentQuestionIndex || 0;
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }
}

// Initialize app
const app = new StudyAIApp();
window.app = app;