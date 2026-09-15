export class QuestionGenerator {
    async generate(files, settings) {
        // Simulate question generation
        const { count = 10, types = ['multiple'], difficulty = 'mixed' } = settings;
        
        const questions = [];
        const difficulties = ['easy', 'normal', 'hard', 'very-hard'];
        const questionTypes = types.length > 0 ? types : ['multiple'];

        for (let i = 0; i < count; i++) {
            const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
            const diffLevel = difficulty === 'mixed' 
                ? difficulties[Math.floor(Math.random() * difficulties.length)]
                : difficulty;

            const question = this.generateQuestion(i + 1, type, diffLevel, files);
            questions.push(question);
        }

        return questions;
    }

    generateQuestion(number, type, difficulty, files) {
        const topics = [
            '전압과 전류',
            '전기 회로',
            '전자기파',
            '에너지',
            '운동',
            '힘',
            '일과 에너지',
            '열과 온도'
        ];

        const topic = topics[Math.floor(Math.random() * topics.length)];

        let question = {
            id: `q-${number}`,
            number,
            type,
            difficulty,
            topic,
            question: `${topic}에 관한 문제 ${number}`,
            explanation: `이 문제의 답은 교과서에서 ${topic} 부분을 다루고 있습니다.`,
            correctAnswer: null,
            options: [],
            sourceFile: files.length > 0 ? files[0].name : 'Unknown',
            sourcePage: Math.floor(Math.random() * 100) + 1
        };

        if (type === 'multiple' || type === 'multiple5') {
            const optionCount = type === 'multiple' ? 4 : 5;
            question.options = this.generateOptions(optionCount);
            question.correctAnswer = question.options[0];
            question.options = this.shuffleArray(question.options);
        } else if (type === 'ox') {
            question.options = ['O (참)', 'X (거짓)'];
            question.correctAnswer = Math.random() > 0.5 ? 'O' : 'X';
        } else if (type === 'short' || type === 'blank') {
            question.correctAnswer = '정답';
        }

        return question;
    }

    generateOptions(count) {
        const baseAnswer = '정답';
        const options = [baseAnswer];
        
        for (let i = 1; i < count; i++) {
            options.push(`선택지 ${i}`);
        }

        return options;
    }

    grade(questions, userAnswers) {
        let correctCount = 0;
        const details = [];

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer && userAnswer.answer === question.correctAnswer;
            
            if (isCorrect) {
                correctCount++;
            }

            details.push({
                question: question.question,
                userAnswer: userAnswer ? (userAnswer.answer || '(답변 없음)') : '(답변 없음)',
                correctAnswer: question.correctAnswer,
                correct: isCorrect,
                explanation: question.explanation,
                topic: question.topic
            });
        });

        return {
            correctCount,
            totalCount: questions.length,
            percentage: Math.round((correctCount / questions.length) * 100),
            details,
            timestamp: new Date().toISOString()
        };
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}