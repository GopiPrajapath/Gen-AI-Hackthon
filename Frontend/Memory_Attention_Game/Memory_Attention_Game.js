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
        // showMessage('Data saved to Firestore!', 'success'); // REMOVED
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        // showMessage('Error saving data to Firestore.', 'danger'); // REMOVED
        throw e;
    }
}

// Game State
let gameData = {
    rounds: [],
    currentRound: 0,
    totalRounds: 8,
    isPlaying: false,
    currentSequence: [],
    playerRecall: [],
    startTime: 0,
    distractorsActive: false,
    distractorErrors: 0
};

// Game Configuration
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const colorNames = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

// Initialize Game
function startGame() {
    gameData = {
        rounds: [],
        currentRound: 0,
        totalRounds: 8,
        isPlaying: true,
        currentSequence: [],
        playerRecall: [],
        startTime: 0,
        distractorsActive: false,
        distractorErrors: 0
    };

    document.getElementById('start-btn').disabled = true;
    document.getElementById('export-btn').disabled = true;
    document.getElementById('results-panel').classList.add('hidden');
    
    startNextRound();
}

function startNextRound() {
    if (gameData.currentRound >= gameData.totalRounds) {
        endGame();
        return;
    }

    gameData.currentRound++;
    const sequenceLength = Math.min(3 + Math.floor(gameData.currentRound / 2), 8);
    const hasDistractors = gameData.currentRound >= 4;

    // Generate sequence
    gameData.currentSequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        gameData.currentSequence.push(Math.floor(Math.random() * colors.length));
    }

    gameData.playerRecall = [];
    gameData.distractorsActive = hasDistractors;
    gameData.distractorErrors = 0;

    updateUI();
    presentationPhase();
}

function presentationPhase() {
    document.getElementById('phase-display').textContent = 'Memorize the sequence';
    document.getElementById('recall-area').classList.add('hidden');
    
    const container = document.getElementById('sequence-container');
    container.innerHTML = '';

    // Show sequence items with animation delay
    gameData.currentSequence.forEach((colorIndex, index) => {
        setTimeout(() => {
            const item = createSequenceItem(colorIndex, colorNames[colorIndex]);
            container.appendChild(item);
        }, index * 400);
    });

    // Start recall phase after presentation
    setTimeout(() => {
        recallPhase();
    }, gameData.currentSequence.length * 400 + 2000);
}

function recallPhase() {
    document.getElementById('phase-display').textContent = 'Recall the sequence';
    gameData.startTime = Date.now();

    // Clear sequence display
    const container = document.getElementById('sequence-container');
    container.innerHTML = '';

    // Show available options
    colors.forEach((color, index) => {
        const item = createSequenceItem(index, colorNames[index]);
        item.onclick = () => selectItem(index);
        container.appendChild(item);
    });

    // Show recall area
    document.getElementById('recall-area').classList.remove('hidden');
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('clear-btn').disabled = false;

    // Add distractors if needed
    if (gameData.distractorsActive) {
        addDistractors();
    }

    startTimer();
}

function createSequenceItem(colorIndex, text) {
    const item = document.createElement('div');
    item.className = `sequence-item color-${colors[colorIndex]}`;
    item.textContent = text;
    return item;
}

function selectItem(colorIndex) {
    if (gameData.distractorsActive && Math.random() < 0.1) {
        gameData.distractorErrors++;
    }

    gameData.playerRecall.push(colorIndex);
    updateRecallArea();
}

function updateRecallArea() {
    const recallArea = document.getElementById('recall-area');
    const existingItems = recallArea.querySelectorAll('.sequence-item');
    existingItems.forEach(item => item.remove());

    gameData.playerRecall.forEach((colorIndex, index) => {
        const item = createSequenceItem(colorIndex, colorNames[colorIndex]);
        item.style.margin = '5px';
        recallArea.appendChild(item);
    });
}

function clearRecall() {
    gameData.playerRecall = [];
    updateRecallArea();
}

function submitRecall() {
    const endTime = Date.now();
    const responseTime = (endTime - gameData.startTime) / 1000;

    // Clear distractors
    clearDistractors();

    // Analyze results
    const roundData = analyzeRound(responseTime);
    gameData.rounds.push(roundData);

    // Show feedback
    showFeedback(roundData);

    // Update UI
    updateUI();

    // Prepare for next round
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('clear-btn').disabled = true;

    setTimeout(() => {
        startNextRound();
    }, 2000);
}

function analyzeRound(responseTime) {
    const correctItems = [];
    const errors = [];
    let correctCount = 0;

    // Check each position
    for (let i = 0; i < Math.max(gameData.currentSequence.length, gameData.playerRecall.length); i++) {
        const expected = gameData.currentSequence[i];
        const actual = gameData.playerRecall[i];

        if (expected === actual) {
            correctItems.push(i);
            correctCount++;
        } else {
            // Classify error type
            let errorType;
            if (actual === undefined) {
                errorType = 'misremembering'; // Didn't recall this item
            } else if (gameData.currentSequence.includes(actual)) {
                errorType = 'misplacing'; // Right item, wrong position
            } else {
                errorType = 'misremembering'; // Wrong item entirely
            }

            errors.push({
                position: i,
                expected: expected,
                actual: actual ?? null,
                type: errorType
            });
        }
    }

    const accuracy = (correctCount / gameData.currentSequence.length) * 100;

    return {
        round: gameData.currentRound,
        sequenceLength: gameData.currentSequence.length,
        sequence: [...gameData.currentSequence],
        recall: [...gameData.playerRecall],
        accuracy: accuracy,
        correctCount: correctCount,
        errors: errors,
        responseTime: responseTime,
        distractorErrors: gameData.distractorErrors,
        hasDistractors: gameData.distractorsActive
    };
}

function showFeedback(roundData) {
    const container = document.getElementById('sequence-container');
    container.innerHTML = '';

    // Show correct sequence with feedback
    gameData.currentSequence.forEach((colorIndex, index) => {
        const item = createSequenceItem(colorIndex, colorNames[colorIndex]);
        const playerChoice = gameData.playerRecall[index];
        
        if (playerChoice === colorIndex) {
            item.classList.add('correct');
        } else {
            item.classList.add('incorrect');
        }
        
        container.appendChild(item);
    });

    // Update phase display
    const accuracy = Math.round(roundData.accuracy);
    document.getElementById('phase-display').textContent = 
        `Round ${gameData.currentRound} Complete! Accuracy: ${accuracy}%`;
}

function addDistractors() {
    const container = document.querySelector('.game-container');
    const distractorCount = 3;

    for (let i = 0; i < distractorCount; i++) {
        setTimeout(() => {
            const distractor = document.createElement('div');
            distractor.className = 'distractor';
            distractor.style.left = Math.random() * (container.offsetWidth - 40) + 'px';
            distractor.style.top = Math.random() * (container.offsetHeight - 40) + 'px';
            container.appendChild(distractor);

            setTimeout(() => {
                if (distractor.parentNode) {
                    distractor.parentNode.removeChild(distractor);
                }
            }, 2000);
        }, i * 1000);
    }
}

function clearDistractors() {
    const distractors = document.querySelectorAll('.distractor');
    distractors.forEach(d => d.remove());
}

function startTimer() {
    const timerDisplay = document.getElementById('timer-display');
    let seconds = 0;
    
    const timer = setInterval(() => {
        seconds++;
        timerDisplay.textContent = `${seconds}s`;
        
        if (!gameData.isPlaying) {
            clearInterval(timer);
            timerDisplay.textContent = '';
        }
    }, 1000);
}

function updateUI() {
    // Update round counter
    document.getElementById('round-counter').textContent = gameData.currentRound;

    // Update progress
    const progress = (gameData.currentRound / gameData.totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    if (gameData.rounds.length > 0) {
        // Calculate overall accuracy
        const totalCorrect = gameData.rounds.reduce((sum, round) => sum + round.correctCount, 0);
        const totalItems = gameData.rounds.reduce((sum, round) => sum + round.sequenceLength, 0);
        const overallAccuracy = Math.round((totalCorrect / totalItems) * 100);
        document.getElementById('accuracy-rate').textContent = overallAccuracy + '%';

        // Calculate total errors
        const totalErrors = gameData.rounds.reduce((sum, round) => sum + round.errors.length, 0);
        document.getElementById('error-count').textContent = totalErrors;

        // Calculate average response time
        const avgTime = gameData.rounds.reduce((sum, round) => sum + round.responseTime, 0) / gameData.rounds.length;
        document.getElementById('avg-time').textContent = avgTime.toFixed(1) + 's';
    }
}

function endGame() {
    gameData.isPlaying = false;
    document.getElementById('phase-display').textContent = 'Game Complete!';
    document.getElementById('timer-display').textContent = '';
    document.getElementById('start-btn').disabled = false;
    document.getElementById('export-btn').disabled = false;
    document.getElementById('recall-area').classList.add('hidden');
    document.getElementById('sequence-container').innerHTML = '';

    // Show next game button
    document.getElementById('nextGameBtn').style.display = 'block';

    showResults();
}

function showResults() {
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    
    // Calculate summary statistics
    const stats = calculateGameStatistics();
    
    let html = '';
    
    // Overall Performance
    html += '<div class="result-row"><strong>Overall Accuracy:</strong><span>' + stats.overallAccuracy.toFixed(1) + '%</span></div>';
    html += '<div class="result-row"><strong>Total Errors:</strong><span>' + stats.totalErrors + '</span></div>';
    html += '<div class="result-row"><strong>Distraction Errors:</strong><span>' + stats.distractorErrors + '</span></div>';
    html += '<div class="result-row"><strong>Average Response Time:</strong><span>' + stats.avgResponseTime.toFixed(2) + 's</span></div>';
    html += '<div class="result-row"><strong>Performance Trend:</strong><span>' + stats.performanceTrend + '</span></div>';
    
    // Error Analysis
    html += '<br><h4>Error Analysis:</h4>';
    html += '<div class="result-row"><strong>Misremembering Items:</strong><span>' + stats.misrememberingErrors + '</span></div>';
    html += '<div class="result-row"><strong>Misplacing Items:</strong><span>' + stats.misplacingErrors + '</span></div>';
    
    // Consistency Analysis
    html += '<br><h4>Performance Consistency:</h4>';
    html += '<div class="result-row"><strong>Accuracy Std Dev:</strong><span>' + stats.accuracyStdDev.toFixed(1) + '%</span></div>';
    html += '<div class="result-row"><strong>Time Std Dev:</strong><span>' + stats.timeStdDev.toFixed(2) + 's</span></div>';

    resultsContent.innerHTML = html;
    resultsPanel.classList.remove('hidden');
}

function calculateGameStatistics() {
    if (gameData.rounds.length === 0) return {};

    // Overall accuracy
    const totalCorrect = gameData.rounds.reduce((sum, round) => sum + round.correctCount, 0);
    const totalItems = gameData.rounds.reduce((sum, round) => sum + round.sequenceLength, 0);
    const overallAccuracy = (totalCorrect / totalItems) * 100;

    // Total errors
    const totalErrors = gameData.rounds.reduce((sum, round) => sum + round.errors.length, 0);
    const distractorErrors = gameData.rounds.reduce((sum, round) => sum + round.distractorErrors, 0);

    // Error types
    let misrememberingErrors = 0;
    let misplacingErrors = 0;
    gameData.rounds.forEach(round => {
        round.errors.forEach(error => {
            if (error.type === 'misremembering') {
                misrememberingErrors++;
            } else if (error.type === 'misplacing') {
                misplacingErrors++;
            }
        });
    });

    // Average response time
    const avgResponseTime = gameData.rounds.reduce((sum, round) => sum + round.responseTime, 0) / gameData.rounds.length;

    // Performance trend (compare first half vs second half)
    const firstHalf = gameData.rounds.slice(0, Math.floor(gameData.rounds.length / 2));
    const secondHalf = gameData.rounds.slice(Math.floor(gameData.rounds.length / 2));
    
    const firstHalfAccuracy = firstHalf.reduce((sum, round) => sum + round.accuracy, 0) / firstHalf.length;
    const secondHalfAccuracy = secondHalf.reduce((sum, round) => sum + round.accuracy, 0) / secondHalf.length;
    
    let performanceTrend;
    if (secondHalfAccuracy > firstHalfAccuracy + 5) {
        performanceTrend = 'Improving';
    } else if (firstHalfAccuracy > secondHalfAccuracy + 5) {
        performanceTrend = 'Declining';
    } else {
        performanceTrend = 'Stable';
    }

    // Standard deviations for consistency
    const accuracies = gameData.rounds.map(round => round.accuracy);
    const times = gameData.rounds.map(round => round.responseTime);
    
    const accuracyMean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const timeMean = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    const accuracyStdDev = Math.sqrt(accuracies.reduce((sum, acc) => sum + Math.pow(acc - accuracyMean, 2), 0) / accuracies.length);
    const timeStdDev = Math.sqrt(times.reduce((sum, time) => sum + Math.pow(time - timeMean, 2), 0) / times.length);

    return {
        overallAccuracy,
        totalErrors,
        distractorErrors,
        misrememberingErrors,
        misplacingErrors,
        avgResponseTime,
        performanceTrend,
        accuracyStdDev,
        timeStdDev
    };
}

function exportData() {
    // Check if there are rounds to export. If not, log a message and return.
    if (gameData.rounds.length === 0) {
        console.warn("No game data to export. At least one round must be completed.");
        return;
    }
    
    const exportData = {
        gameType: "Memory & Attention Game",
        gameMetadata: {
            totalRounds: gameData.rounds.length,
            completedAt: new Date().toISOString(),
            gameVersion: '1.0'
        },
        // The summary is now guaranteed to have valid values
        summary: calculateGameStatistics(),
        rounds: gameData.rounds,
        rawData: {
            accuracyRates: gameData.rounds.map(round => ({
                round: round.round,
                accuracy: round.accuracy,
                correctItems: round.correctCount,
                totalItems: round.sequenceLength
            })),
            
            distractorErrors: gameData.rounds.map(round => ({
                round: round.round,
                hasDistractors: round.hasDistractors,
                distractorErrors: round.distractorErrors
            })),
            
            responseTimes: gameData.rounds.map(round => ({
                round: round.round,
                responseTime: round.responseTime
            })),
            
            performanceConsistency: {
                accuracyByRound: gameData.rounds.map(round => round.accuracy),
                timesByRound: gameData.rounds.map(round => round.responseTime),
                accuracyStandardDeviation: calculateGameStatistics().accuracyStdDev,
                timeStandardDeviation: calculateGameStatistics().timeStdDev
            },
            
            errorAnalysis: gameData.rounds.map(round => ({
                round: round.round,
                errors: round.errors.map(error => ({
                    position: error.position,
                    expectedItem: error.expected,
                    actualItem: error.actual,
                    errorType: error.type
                }))
            }))
        }
    };

    saveGameData(exportData, 'memory_attention_game');

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory-attention-game-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}


function proceedToNextGame() {
    // Save current game data before proceeding
    exportData(); // Fix: was calling exportJSON() which doesn't exist
    
    // Navigate to next game
    window.open('../Emotion_Recognition_Game/Emotion_Recognition_Game.html', '_blank');
}

// Function to save game data to localStorage, sessionStorage, and Firestore
function saveGameData(data, gameType) {
    // Extract the actual game data (handle both direct gameData and nested structure)
    const actualGameData = data.gameData || data;
    
    // Add a check to ensure rounds exists and is an array before proceeding
    if (!actualGameData.rounds || !Array.isArray(actualGameData.rounds)) {
        console.error('Data cannot be saved: `rounds` array is missing or invalid.');
        console.log('Received data structure:', data);
        return; // Exit the function gracefully
    }
    
    // Format data according to your schema for memory game
    const formattedData = {
        memory_attention_game: {
            average_accuracy: actualGameData.rounds.reduce((sum, r) => sum + r.accuracy, 0) / actualGameData.rounds.length,
            distraction_errors: actualGameData.distractorErrors || 0,
            average_response_time_ms: actualGameData.rounds.reduce((sum, r) => sum + (r.responseTime * 1000), 0) / actualGameData.rounds.length,
            performance_consistency: calculateConsistency(actualGameData.rounds),
            error_type: determineErrorType(actualGameData.rounds)
        }
    };
    
    // Store in localStorage
    const gameDataKey = `assessment_${gameType}_${Date.now()}`;
    try {
        localStorage.setItem(gameDataKey, JSON.stringify(formattedData));
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
            data: formattedData,
            timestamp: new Date().toISOString()
        });
        sessionStorage.setItem('assessmentData', JSON.stringify(assessmentData));
        console.log('✅ Data saved to sessionStorage');
    } catch (error) {
        console.error('❌ Error saving to sessionStorage:', error);
    }
    
    // Save to Firestore
    // Prepare complete data for Firestore (including original game data)
    const firestoreData = {
        gameType: "Memory & Attention Game",
        gameData: actualGameData,
        formattedData: formattedData,
        analysis: data.summary || calculateGameStatistics(),
        timestamp: new Date().toISOString(),
        userId: `user_${Date.now()}`, // Simple user identification
        gameVersion: "1.0"
    };
    
    // Call the existing saveToFirestore function
    console.log('Attempting to save to Firestore:', firestoreData);
    saveToFirestore(firestoreData, 'memory_attention_game_results');
}

function calculateConsistency(rounds) {
    if (rounds.length < 3) return "insufficient_data";
    
    const accuracies = rounds.map(r => r.correctCount / r.sequenceLength);
    const mean = accuracies.reduce((a, b) => a + b) / accuracies.length;
    const variance = accuracies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accuracies.length;
    
    if (variance < 0.05) return "high";
    if (variance < 0.15) return "medium";
    return "low";
}

function determineErrorType(rounds) {
    const errors = rounds.flatMap(r => r.errors);
    const misremembering = errors.filter(e => e.type === 'misremembering').length;
    const misplacing = errors.filter(e => e.type === 'misplacing').length;
    
    if (misremembering > misplacing * 2) return 'misremembering';
    if (misplacing > misremembering * 2) return 'misplacing';
    return 'mixed';
}

window.startGame = startGame;
window.selectItem = selectItem;
window.clearRecall = clearRecall;
window.submitRecall = submitRecall;
window.exportData = exportData;
window.proceedToNextGame = proceedToNextGame;