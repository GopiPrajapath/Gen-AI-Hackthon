// Firebase imports and configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDH1DEkiYsUXpsxbsWqucbaTckYeYGXEwk",
    authDomain: "gen-ai-hackthon-cf13c.firebaseapp.com",
    projectId: "gen-ai-hackthon-cf13c",
    storageBucket: "gen-ai-hackthon-cf13c.firebasestorage.app",
    messagingSenderId: "1040795548342",
    appId: "1:1040795548342:web:25cd472ea38b1ffb90c417",
    measurementId: "G-GGJB660BFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to save data to Firestore
async function saveToFirestore(data, collectionName) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
}

// Game state
let currentQuestion = 0;
let startTime = Date.now();
let questionStartTime = Date.now();
let gameData = {
    responses: [],
    totalQuestions: 20,
    sessionId: Date.now().toString(),
    startTime: new Date().toISOString()
};

// Emotion database with expressions, scenarios, and metadata
const emotions = [
    // Basic emotions
    { emotion: 'happy', face: '😊', category: 'positive', difficulty: 'basic', scenario: 'A person just received great news about a job promotion they\'ve been hoping for.' },
    { emotion: 'sad', face: '😢', category: 'negative', difficulty: 'basic', scenario: 'Someone is looking at old photos after losing a beloved pet.' },
    { emotion: 'angry', face: '😠', category: 'negative', difficulty: 'basic', scenario: 'A person discovers their car has been vandalized in the parking lot.' },
    { emotion: 'surprised', face: '😲', category: 'neutral', difficulty: 'basic', scenario: 'Someone walks into their own surprise birthday party.' },
    { emotion: 'fear', face: '😨', category: 'negative', difficulty: 'basic', scenario: 'A person hears strange noises coming from their basement late at night.' },
    { emotion: 'disgusted', face: '🤢', category: 'negative', difficulty: 'basic', scenario: 'Someone opens their lunch box to find moldy, spoiled food.' },
    
    // Complex emotions
    { emotion: 'disappointed', face: '😞', category: 'negative', difficulty: 'complex', scenario: 'A student worked hard all semester but received a lower grade than expected on their final exam.' },
    { emotion: 'envious', face: '😒', category: 'negative', difficulty: 'complex', scenario: 'A person sees their colleague get the promotion they wanted for themselves.' },
    { emotion: 'proud', face: '😌', category: 'positive', difficulty: 'complex', scenario: 'A parent watches their child graduate from college after years of hard work.' },
    { emotion: 'guilty', face: '😳', category: 'negative', difficulty: 'complex', scenario: 'Someone realizes they forgot their best friend\'s birthday.' },
    { emotion: 'relieved', face: '😅', category: 'positive', difficulty: 'complex', scenario: 'A person finds their lost wallet with all their money and cards still inside.' },
    { emotion: 'embarrassed', face: '😅', category: 'negative', difficulty: 'complex', scenario: 'Someone trips and falls in front of a large crowd of people.' },
    
    // Subtle emotions
    { emotion: 'curious', face: '🤔', category: 'neutral', difficulty: 'subtle', scenario: 'A person notices an unusual package on their doorstep from an unknown sender.' },
    { emotion: 'contempt', face: '😏', category: 'negative', difficulty: 'subtle', scenario: 'Someone listens to a person bragging about achievements they know are exaggerated.' },
    { emotion: 'melancholy', face: '😔', category: 'negative', difficulty: 'subtle', scenario: 'A person sits alone in their childhood bedroom, now empty, as their parents prepare to sell the house.' },
    { emotion: 'nostalgic', face: '🥺', category: 'neutral', difficulty: 'subtle', scenario: 'Someone finds an old mixtape from high school in a box of memories.' },
    { emotion: 'skeptical', face: '🤨', category: 'neutral', difficulty: 'subtle', scenario: 'A person listens to a salesperson making claims that seem too good to be true.' },
    { emotion: 'hopeful', face: '🙂', category: 'positive', difficulty: 'subtle', scenario: 'Someone is waiting to hear back about a job interview for their dream position.' },
    { emotion: 'resigned', face: '😑', category: 'neutral', difficulty: 'subtle', scenario: 'A person realizes they\'ll have to work late again for the third night this week.' },
    { emotion: 'amused', face: '😏', category: 'positive', difficulty: 'subtle', scenario: 'Someone overhears a child mispronouncing words while trying to sound very serious and adult-like.' }
];

// Generate options for each question (correct + 3 distractors)
function generateOptions(correctEmotion, difficulty) {
    const options = [correctEmotion];
    const availableEmotions = emotions.filter(e => e.emotion !== correctEmotion);
    
    // Add distractors based on difficulty and category
    if (difficulty === 'subtle') {
        // For subtle emotions, add similar complexity distractors
        const similar = availableEmotions.filter(e => 
            e.difficulty === 'subtle' || e.difficulty === 'complex'
        ).slice(0, 3);
        options.push(...similar.map(e => e.emotion));
    } else {
        // For basic/complex, mix difficulties
        const distractors = availableEmotions.slice(0, 3);
        options.push(...distractors.map(e => e.emotion));
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
}

function startGame() {
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    // Shuffle emotions for varied gameplay
    emotions.sort(() => Math.random() - 0.5);
    
    showQuestion();
    startTimer();
}

function showQuestion() {
    if (currentQuestion >= gameData.totalQuestions) {
        endGame();
        return;
    }

    const emotion = emotions[currentQuestion];
    questionStartTime = Date.now();

    // Update UI
    document.getElementById('question-counter').textContent = `Question ${currentQuestion + 1} of ${gameData.totalQuestions}`;
    document.getElementById('progress-fill').style.width = `${((currentQuestion) / gameData.totalQuestions) * 100}%`;
    
    // Set difficulty badge
    const badge = document.getElementById('difficulty-badge');
    badge.textContent = emotion.difficulty.toUpperCase();
    badge.className = `difficulty-badge difficulty-${emotion.difficulty}`;

    // Show emotion stimulus (alternating between face and scenario)
    const showScenario = Math.random() > 0.5;
    const emotionFace = document.getElementById('emotion-face');
    const emotionDescription = document.getElementById('emotion-description');
    
    if (showScenario) {
        emotionFace.style.display = 'none';
        emotionDescription.style.display = 'block';
        emotionDescription.textContent = emotion.scenario;
    } else {
        emotionFace.style.display = 'block';
        emotionDescription.style.display = 'none';
        emotionFace.textContent = emotion.face;
    }

    // Generate and display options
    const options = generateOptions(emotion.emotion, emotion.difficulty);
    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => selectAnswer(option, emotion.emotion);
        optionsGrid.appendChild(btn);
    });

    // Hide feedback and next button
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
}

function selectAnswer(selectedEmotion, correctEmotion) {
    const responseTime = Date.now() - questionStartTime;
    const emotion = emotions[currentQuestion];
    
    // Record response data
    const response = {
        questionNumber: currentQuestion + 1,
        correctEmotion: correctEmotion,
        selectedEmotion: selectedEmotion,
        isCorrect: selectedEmotion === correctEmotion,
        responseTime: responseTime,
        emotionCategory: emotion.category,
        difficulty: emotion.difficulty,
        stimulusType: document.getElementById('emotion-face').style.display === 'none' ? 'scenario' : 'face',
        timestamp: new Date().toISOString()
    };
    
    gameData.responses.push(response);

    // Update UI to show selection and feedback
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        btn.onclick = null;
        if (btn.textContent === correctEmotion) {
            btn.classList.add('correct');
        } else if (btn.textContent === selectedEmotion && selectedEmotion !== correctEmotion) {
            btn.classList.add('incorrect');
        }
    });

    // Show feedback
    const feedback = document.getElementById('feedback');
    if (response.isCorrect) {
        feedback.className = 'feedback correct';
        feedback.textContent = `Correct! You identified "${correctEmotion}" in ${(responseTime / 1000).toFixed(1)} seconds.`;
    } else {
        feedback.className = 'feedback incorrect';
        feedback.textContent = `Incorrect. The correct emotion was "${correctEmotion}". You selected "${selectedEmotion}".`;
    }
    feedback.style.display = 'block';

    // Show next button
    document.getElementById('next-btn').style.display = 'inline-block';
}

function nextQuestion() {
    currentQuestion++;
    showQuestion();
}

function endGame() {
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('results-screen').classList.add('active');
    
    gameData.endTime = new Date().toISOString();
    gameData.totalTime = Date.now() - startTime;
    
    calculateAndDisplayResults();
}

function calculateAndDisplayResults() {
    const responses = gameData.responses;
    
    // 1. Accuracy of emotion identification
    const totalCorrect = responses.filter(r => r.isCorrect).length;
    const accuracyRate = (totalCorrect / responses.length * 100).toFixed(1);
    
    // 2. Speed of identification
    const avgResponseTime = (responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length / 1000).toFixed(1);
    
    // 3. Recognition of subtle or complex emotions
    const complexEmotions = responses.filter(r => r.difficulty === 'complex' || r.difficulty === 'subtle');
    const basicEmotions = responses.filter(r => r.difficulty === 'basic');
    const complexAccuracy = complexEmotions.length > 0 ? (complexEmotions.filter(r => r.isCorrect).length / complexEmotions.length * 100).toFixed(1) : 0;
    const basicAccuracy = basicEmotions.length > 0 ? (basicEmotions.filter(r => r.isCorrect).length / basicEmotions.length * 100).toFixed(1) : 0;
    
    // 4. Discrepancy between stated and observed emotion
    const commonMistakes = responses.filter(r => !r.isCorrect).length;
    const discrepancyRate = (commonMistakes / responses.length * 100).toFixed(1);
    
    // 5. Performance across different emotional categories
    const positiveEmotions = responses.filter(r => r.emotionCategory === 'positive');
    const negativeEmotions = responses.filter(r => r.emotionCategory === 'negative');
    const neutralEmotions = responses.filter(r => r.emotionCategory === 'neutral');
    
    const positiveAccuracy = positiveEmotions.length > 0 ? (positiveEmotions.filter(r => r.isCorrect).length / positiveEmotions.length * 100).toFixed(1) : 0;
    const negativeAccuracy = negativeEmotions.length > 0 ? (negativeEmotions.filter(r => r.isCorrect).length / negativeEmotions.length * 100).toFixed(1) : 0;
    const neutralAccuracy = neutralEmotions.length > 0 ? (neutralEmotions.filter(r => r.isCorrect).length / neutralEmotions.length * 100).toFixed(1) : 0;

    // Display results
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = `
        <div class="result-card">
            <h3>Overall Accuracy</h3>
            <div class="result-value">${accuracyRate}%</div>
            <div class="result-description">Percentage of correctly identified emotions</div>
        </div>
        <div class="result-card">
            <h3>Average Response Time</h3>
            <div class="result-value">${avgResponseTime}s</div>
            <div class="result-description">Speed of emotion identification</div>
        </div>
        <div class="result-card">
            <h3>Complex Emotions</h3>
            <div class="result-value">${complexAccuracy}%</div>
            <div class="result-description">Accuracy on subtle and complex emotions</div>
        </div>
        <div class="result-card">
            <h3>Recognition Errors</h3>
            <div class="result-value">${discrepancyRate}%</div>
            <div class="result-description">Rate of misidentification</div>
        </div>
    `;

    // Display category breakdown
    const categoryResults = document.getElementById('category-results');
    categoryResults.innerHTML = `
        <div class="category-item">
            <span><strong>Positive Emotions</strong> (happy, proud, relieved, etc.)</span>
            <span><strong>${positiveAccuracy}%</strong></span>
        </div>
        <div class="category-item">
            <span><strong>Negative Emotions</strong> (sad, angry, disappointed, etc.)</span>
            <span><strong>${negativeAccuracy}%</strong></span>
        </div>
        <div class="category-item">
            <span><strong>Neutral Emotions</strong> (curious, surprised, resigned, etc.)</span>
            <span><strong>${neutralAccuracy}%</strong></span>
        </div>
        <div class="category-item">
            <span><strong>Basic Emotions</strong> (fundamental expressions)</span>
            <span><strong>${basicAccuracy}%</strong></span>
        </div>
    `;
}

function exportJSON() {
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], {type:'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `emotion-recognition-results-${gameData.sessionId}.json`;
    link.click();
}

function exportCSV() {
    const headers = [
        'Question Number', 'Correct Emotion', 'Selected Emotion', 'Is Correct', 
        'Response Time (ms)', 'Emotion Category', 'Difficulty', 'Stimulus Type', 'Timestamp'
    ];
    
    const rows = gameData.responses.map(r => [
        r.questionNumber, r.correctEmotion, r.selectedEmotion, r.isCorrect,
        r.responseTime, r.emotionCategory, r.difficulty, r.stimulusType, r.timestamp
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    const dataBlob = new Blob([csvContent], {type:'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `emotion-recognition-results-${gameData.sessionId}.csv`;
    link.click();
}

function restartGame() {
    currentQuestion = 0;
    startTime = Date.now();
    gameData = {
        responses: [],
        totalQuestions: 20,
        sessionId: Date.now().toString(),
        startTime: new Date().toISOString()
    };
    
    document.getElementById('results-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.add('active');
    
    // Reset timer display
    document.getElementById('timer').textContent = 'Time: 0s';
}

function startTimer() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').textContent = `Time: ${elapsed}s`;
    }, 1000);
}

function proceedToNextGame() {
    // Save current game data before proceeding
    const exportData = {
        gameType: "Emotion Recognition Game",
        gameMetadata: {
            totalQuestions: gameData.totalQuestions,
            completedAt: new Date().toISOString(),
            gameVersion: '1.0',
            sessionId: gameData.sessionId
        },
        summary: calculateSummaryStats(),
        responses: gameData.responses,
        rawData: {
            // Data Point 1: Accuracy by emotion category
            categoryAccuracy: calculateCategoryAccuracy(),
            
            // Data Point 2: Response times by difficulty
            responseTimesByDifficulty: calculateResponseTimesByDifficulty(),
            
            // Data Point 3: Error patterns
            errorPatterns: calculateErrorPatterns(),
            
            // Data Point 4: Performance consistency
            performanceConsistency: calculatePerformanceConsistency()
        }
    };
    
    // Save to Firestore and local storage
    saveGameData(exportData, 'emotion_recognition_game');
    
    // Navigate to next game
    window.open('../CreativeProblemSolvingChallenge/CreativeProblemSolvingChallengegame.html', '_blank');
}

function calculateSummaryStats() {
    const responses = gameData.responses;
    if (responses.length === 0) {
        return {
            overallAccuracy: 0,
            averageResponseTime: 0,
            totalQuestions: 0,
            correctAnswers: 0
        };
    }
    const totalCorrect = responses.filter(r => r.isCorrect).length;
    const accuracyRate = (totalCorrect / responses.length * 100);
    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length / 1000;
    
    return {
        overallAccuracy: accuracyRate,
        averageResponseTime: avgResponseTime,
        totalQuestions: responses.length,
        correctAnswers: totalCorrect
    };
}

function calculateCategoryAccuracy() {
    const responses = gameData.responses;
    const categories = ['positive', 'negative', 'neutral'];
    
    return categories.map(category => {
        const categoryResponses = responses.filter(r => r.emotionCategory === category);
        const correct = categoryResponses.filter(r => r.isCorrect).length;
        return {
            category: category,
            accuracy: categoryResponses.length > 0 ? (correct / categoryResponses.length * 100) : 0,
            totalQuestions: categoryResponses.length,
            correctAnswers: correct
        };
    });
}

function calculateResponseTimesByDifficulty() {
    const responses = gameData.responses;
    const difficulties = ['basic', 'complex', 'subtle'];
    
    return difficulties.map(difficulty => {
        const difficultyResponses = responses.filter(r => r.difficulty === difficulty);
        const avgTime = difficultyResponses.length > 0 ? 
            difficultyResponses.reduce((sum, r) => sum + r.responseTime, 0) / difficultyResponses.length : 0;
        
        return {
            difficulty: difficulty,
            averageResponseTime: avgTime,
            totalQuestions: difficultyResponses.length
        };
    });
}

function calculateErrorPatterns() {
    const responses = gameData.responses;
    const errors = responses.filter(r => !r.isCorrect);
    
    const errorsByEmotion = {};
    errors.forEach(error => {
        const key = `${error.correctEmotion}_as_${error.selectedEmotion}`;
        errorsByEmotion[key] = (errorsByEmotion[key] || 0) + 1;
    });
    
    return {
        totalErrors: errors.length,
        errorRate: (errors.length / responses.length * 100),
        commonMistakes: errorsByEmotion
    };
}

function calculatePerformanceConsistency() {
    const responses = gameData.responses;
    const accuracies = [];
    const times = responses.map(r => r.responseTime);
    
    // Calculate accuracy in chunks of 5 questions
    for (let i = 0; i < responses.length; i += 5) {
        const chunk = responses.slice(i, i + 5);
        const chunkAccuracy = chunk.filter(r => r.isCorrect).length / chunk.length * 100;
        accuracies.push(chunkAccuracy);
    }
    
    const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    const accuracyStdDev = Math.sqrt(accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracies.length);
    const timeStdDev = Math.sqrt(times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length);
    
    return {
        accuracyStandardDeviation: accuracyStdDev,
        timeStandardDeviation: timeStdDev,
        consistencyScore: Math.max(0, 100 - (accuracyStdDev + timeStdDev / 1000))
    };
}

// Function to save game data to localStorage, sessionStorage, and Firestore
function saveGameData(data, gameType) {
    // Store in localStorage
    const gameDataKey = `assessment_${gameType}_${Date.now()}`;
    try {
        localStorage.setItem(gameDataKey, JSON.stringify(data));
        console.log('✅ Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
    }
    
    // Store in sessionStorage
    try {
        if (!sessionStorage.getItem('assessmentData')) {
            sessionStorage.setItem('assessmentData', JSON.stringify([]));
        }
        
        const assessmentData = JSON.parse(sessionStorage.getItem('assessmentData'));
        assessmentData.push({
            gameType: gameType,
            data: data,
            timestamp: new Date().toISOString()
        });
        sessionStorage.setItem('assessmentData', JSON.stringify(assessmentData));
        console.log('✅ Data saved to sessionStorage');
    } catch (error) {
        console.error('❌ Error saving to sessionStorage:', error);
    }
    
    // Save to Firestore
    const firestoreData = {
        gameType: data.gameType,
        gameMetadata: data.gameMetadata,
        summary: data.summary,
        responses: data.responses,
        rawData: data.rawData,
        timestamp: new Date().toISOString(),
        userId: `user_${Date.now()}`,
        gameVersion: "1.0"
    };

    console.log('Attempting to save to Firestore:', firestoreData);
    saveToFirestore(firestoreData, 'emotional_recognition_results');
}



// Global window assignments
window.startGame = startGame;
window.nextQuestion = nextQuestion;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
window.restartGame = restartGame;
window.proceedToNextGame = proceedToNextGame;