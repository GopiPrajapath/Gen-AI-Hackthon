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
let currentChallenge = 0;
let gameStartTime = Date.now();
let challengeStartTime = Date.now();
let timeRemaining = 300; // 5 minutes per challenge
let timerInterval;

// Game data tracking
let gameData = {
    sessionId: Date.now().toString(),
    startTime: new Date().toISOString(),
    challenges: [],
    totalActions: 0,
    sessionActions: []
};

// Challenge database
const challenges = [
    {
        id: 1,
        type: "Alternative Uses",
        title: "Creative Uses for a Paperclip",
        description: "A paperclip is typically used to hold papers together. But what if you had 100 paperclips and needed to solve various problems? Think beyond the obvious! Consider different contexts: survival situations, art projects, household repairs, games, etc.",
        interactive: false,
        timeLimit: 300,
        objects: []
    },
    {
        id: 2,
        type: "Scenario Solving",
        title: "Desert Island Survival",
        description: "You're stranded on a desert island with only: a broken smartphone, a water bottle, a rope, sunglasses, and a chocolate bar. How would you use these items to survive, signal for help, find food and water, or create shelter? Be creative and detailed!",
        interactive: true,
        timeLimit: 300,
        objects: ["📱", "🍫", "🕶️", "🪢", "💧"]
    },
    {
        id: 3,
        type: "Alternative Uses",
        title: "Reimagining a Brick",
        description: "You have access to unlimited bricks. Think of all the ways bricks could be used beyond construction. Consider entertainment, tools, art, problem-solving, etc. How might different cultures or professions use bricks creatively?",
        interactive: false,
        timeLimit: 300,
        objects: []
    },
    {
        id: 4,
        type: "Interactive Sandbox",
        title: "Office Supply Innovation Lab",
        description: "You work at a innovation lab where you must create new inventions using only common office supplies. Combine these objects in unexpected ways to solve everyday problems or create entirely new products!",
        interactive: true,
        timeLimit: 300,
        objects: ["📎", "✂️", "🖇️", "📌", "🖊️", "📏", "🗂️", "💿"]
    },
    {
        id: 5,
        type: "Scenario Solving", 
        title: "Time Travel Communication",
        description: "You've time-traveled to 500 years ago but can only bring 3 modern items to prove you're from the future and help advance civilization. What would you choose and how would you use them to make the biggest positive impact?",
        interactive: false,
        timeLimit: 300,
        objects: []
    }
];

// Common responses database for novelty scoring
const commonResponses = {
    paperclip: [
        "bookmark", "zipper pull", "keychain", "jewelry", "phone stand", "lock pick", 
        "wire", "hook", "fastener", "clip", "tool", "hanger"
    ],
    brick: [
        "doorstop", "hammer", "weight", "building", "weapon", "decoration", 
        "exercise", "bookend", "table", "wall"
    ],
    survival: [
        "shelter", "fire", "water collection", "signal", "food storage", "first aid",
        "fishing", "hunting", "cooking", "protection"
    ]
};

// Drag and drop functionality
let draggedElement = null;

function startGame() {
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    gameStartTime = Date.now();
    gameData.challenges = [];
    
    showChallenge();
    startTimer();
    logAction("Game started", "system");
}

function showChallenge() {
    if (currentChallenge >= challenges.length) {
        endGame();
        return;
    }

    const challenge = challenges[currentChallenge];
    challengeStartTime = Date.now();
    timeRemaining = challenge.timeLimit;

    // Update UI
    document.getElementById('challenge-counter').textContent = `Challenge ${currentChallenge + 1} of ${challenges.length}`;
    document.getElementById('challenge-title').textContent = challenge.title;
    document.getElementById('challenge-description').textContent = challenge.description;
    document.getElementById('challenge-type').textContent = challenge.type;

    // Initialize challenge data
    gameData.challenges[currentChallenge] = {
        challengeId: challenge.id,
        type: challenge.type,
        title: challenge.title,
        startTime: new Date().toISOString(),
        solutions: [],
        actions: [],
        interactiveActions: [],
        timeSpent: 0
    };

    // Setup interactive elements
    setupInteractiveArea(challenge);
    
    // Clear previous solutions
    clearSolutions();
    
    logAction(`Started challenge: ${challenge.title}`, "challenge");
}

function setupInteractiveArea(challenge) {
    const interactiveArea = document.getElementById('interactive-area');
    const sandboxObjects = document.getElementById('sandbox-objects');
    
    if (challenge.interactive && challenge.objects.length > 0) {
        interactiveArea.style.display = 'block';
        sandboxObjects.innerHTML = '';
        
        challenge.objects.forEach((emoji, index) => {
            const obj = document.createElement('div');
            obj.className = 'draggable-object';
            obj.textContent = emoji;
            obj.draggable = true;
            obj.dataset.objectId = index;
            obj.dataset.emoji = emoji;
            
            obj.addEventListener('dragstart', handleDragStart);
            obj.addEventListener('dragend', handleDragEnd);
            obj.addEventListener('click', () => logObjectInteraction(emoji, 'clicked'));
            
            sandboxObjects.appendChild(obj);
        });
        
        // Setup drop zones
        setupDropZones();
    } else {
        interactiveArea.style.display = 'none';
    }
}

function setupDropZones() {
    const solutionZone = document.getElementById('solution-zone');
    const experimentZone = document.getElementById('experiment-zone');
    
    [solutionZone, experimentZone].forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
        zone.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    logObjectInteraction(e.target.dataset.emoji, 'drag_start');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElement = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    if (draggedElement) {
        const emoji = draggedElement.dataset.emoji;
        const zoneType = e.target.id.replace('-zone', '');
        
        logObjectInteraction(emoji, `dropped_in_${zoneType}`);
        
        // Visual feedback
        const feedback = document.createElement('div');
        feedback.textContent = `${emoji} → ${zoneType}`;
        feedback.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #4ecdc4; color: white; padding: 5px 10px; border-radius: 15px;
            font-size: 0.8em; pointer-events: none; z-index: 1000;
        `;
        e.target.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 2000);
    }
}

function logObjectInteraction(object, action) {
    const interaction = {
        object: object,
        action: action,
        timestamp: new Date().toISOString(),
        challengeId: challenges[currentChallenge].id
    };
    
    if (gameData.challenges[currentChallenge]) {
        gameData.challenges[currentChallenge].interactiveActions.push(interaction);
        gameData.totalActions++;
        
        logAction(`${action.replace('_', ' ')} ${object}`, "interaction");
    }
}

function addSolution() {
    const input = document.getElementById('solution-input');
    const text = input.value.trim();
    
    if (text.length === 0) {
        alert('Please enter a solution before adding it.');
        return;
    }

    if (text.length < 5) {
        alert('Please provide a more detailed solution (at least 5 characters).');
        return;
    }

    const solution = {
        id: Date.now(),
        text: text,
        timestamp: new Date().toISOString(),
        noveltyScore: calculateNoveltyScore(text),
        elaborationScore: calculateElaborationScore(text),
        categoryTags: extractCategoryTags(text)
    };

    gameData.challenges[currentChallenge].solutions.push(solution);
    
    // Update UI
    displaySolution(solution);
    input.value = '';
    updateCharCount();
    updateSolutionCount();
    
    logAction(`Added solution: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, "solution");
}

function calculateNoveltyScore(text) {
    const words = text.toLowerCase().split(/\s+/);
    const challengeType = challenges[currentChallenge].type.toLowerCase();
    
    let commonWordsFound = 0;
    let totalWords = words.length;
    
    // Check against common responses
    Object.keys(commonResponses).forEach(category => {
        if (challengeType.includes(category) || text.includes(category)) {
            commonWordsFound += words.filter(word => 
                commonResponses[category].includes(word)
            ).length;
        }
    });
    
    // Calculate novelty (higher score = more original)
    const noveltyRatio = Math.max(0, 1 - (commonWordsFound / Math.max(totalWords, 5)));
    return Math.min(100, Math.round(noveltyRatio * 100) + 
        (text.includes('unusual') || text.includes('creative') || text.includes('unique') ? 10 : 0));
}

function calculateElaborationScore(text) {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const hasDetails = /\b(because|since|by|using|through|via|with|from)\b/i.test(text);
    const hasSteps = /\b(first|then|next|finally|step|process)\b/i.test(text);
    
    let score = 0;
    
    // Word count scoring
    if (wordCount >= 20) score += 40;
    else if (wordCount >= 10) score += 25;
    else if (wordCount >= 5) score += 15;
    else score += 5;
    
    // Sentence structure
    if (sentenceCount > 2) score += 20;
    else if (sentenceCount > 1) score += 10;
    
    // Detail indicators
    if (hasDetails) score += 20;
    if (hasSteps) score += 20;
    
    return Math.min(100, score);
}

function extractCategoryTags(text) {
    const categories = {
        'practical': ['tool', 'use', 'function', 'work', 'fix', 'repair', 'build'],
        'creative': ['art', 'design', 'create', 'make', 'craft', 'draw', 'paint'],
        'social': ['people', 'group', 'team', 'community', 'share', 'help', 'teach'],
        'survival': ['emergency', 'rescue', 'survive', 'safety', 'protection', 'shelter'],
        'entertainment': ['game', 'fun', 'play', 'entertainment', 'sport', 'activity'],
        'technological': ['digital', 'electronic', 'computer', 'tech', 'innovation', 'modern']
    };
    
    const foundTags = [];
    const lowerText = text.toLowerCase();
    
    Object.keys(categories).forEach(category => {
        if (categories[category].some(keyword => lowerText.includes(keyword))) {
            foundTags.push(category);
        }
    });
    
    return foundTags.length > 0 ? foundTags : ['general'];
}

function displaySolution(solution) {
    const container = document.getElementById('solutions-container');
    
    if (container.children.length === 1 && container.children[0].style.fontStyle === 'italic') {
        container.innerHTML = '';
    }
    
    const solutionDiv = document.createElement('div');
    solutionDiv.className = 'solution-item';
    solutionDiv.innerHTML = `
        <div class="solution-text">${solution.text}</div>
        <div class="solution-metrics">
            <span class="metric-badge">Novelty: ${solution.noveltyScore}/100</span>
            <span class="metric-badge">Detail: ${solution.elaborationScore}/100</span>
            <span class="metric-badge">Tags: ${solution.categoryTags.join(', ')}</span>
        </div>
    `;
    
    container.appendChild(solutionDiv);
}

function updateCharCount() {
    const input = document.getElementById('solution-input');
    const counter = document.getElementById('char-count');
    counter.textContent = input.value.length;
}

function updateSolutionCount() {
    const count = gameData.challenges[currentChallenge].solutions.length;
    document.getElementById('solution-count').textContent = count;
}

function clearSolutions() {
    const container = document.getElementById('solutions-container');
    container.innerHTML = '<p style="color: #6c757d; font-style: italic;">No solutions added yet. Start brainstorming!</p>';
    document.getElementById('solution-count').textContent = '0';
    document.getElementById('solution-input').value = '';
    updateCharCount();
}

function logAction(description, type) {
    const action = {
        description: description,
        type: type,
        timestamp: new Date().toISOString(),
        challengeId: challenges[currentChallenge] ? challenges[currentChallenge].id : 0
    };
    
    gameData.sessionActions.push(action);
    
    if (gameData.challenges[currentChallenge]) {
        gameData.challenges[currentChallenge].actions.push(action);
    }
    
    // Update activity log UI
    const container = document.getElementById('actions-container');
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-item';
    actionDiv.textContent = `${new Date().toLocaleTimeString()}: ${description}`;
    
    container.appendChild(actionDiv);
    container.scrollTop = container.scrollHeight;
    
    // Keep only last 10 actions visible
    if (container.children.length > 10) {
        container.removeChild(container.firstChild);
    }
}

function nextChallenge() {
    // Record time spent on current challenge
    if (gameData.challenges[currentChallenge]) {
        gameData.challenges[currentChallenge].timeSpent = Date.now() - challengeStartTime;
        gameData.challenges[currentChallenge].endTime = new Date().toISOString();
    }
    
    currentChallenge++;
    
    if (currentChallenge >= challenges.length) {
        endGame();
    } else {
        showChallenge();
        resetTimer();
    }
}

function skipChallenge() {
    logAction(`Skipped challenge: ${challenges[currentChallenge].title}`, "navigation");
    nextChallenge();
}

function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    timeRemaining--;
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Warning when 1 minute left
    if (timeRemaining === 60) {
        showTimeWarning();
    }
    
    // Auto-advance when time runs out
    if (timeRemaining <= 0) {
        logAction("Time limit reached", "system");
        nextChallenge();
    }
}

function resetTimer() {
    timeRemaining = challenges[currentChallenge].timeLimit;
    hideTimeWarning();
}

function showTimeWarning() {
    if (!document.getElementById('time-warning')) {
        const warning = document.createElement('div');
        warning.id = 'time-warning';
        warning.className = 'time-warning';
        warning.textContent = '⚠️ One minute remaining! Finish your current thoughts.';
        
        const challengeDisplay = document.getElementById('challenge-display');
        challengeDisplay.parentNode.insertBefore(warning, challengeDisplay.nextSibling);
    }
}

function hideTimeWarning() {
    const warning = document.getElementById('time-warning');
    if (warning) {
        warning.remove();
    }
}

function endGame() {
    clearInterval(timerInterval);
    
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('results-screen').classList.add('active');
    
    gameData.endTime = new Date().toISOString();
    gameData.totalGameTime = Date.now() - gameStartTime;
    
    calculateAndDisplayResults();
}

function calculateAndDisplayResults() {
    const allSolutions = gameData.challenges.flatMap(c => c.solutions || []);
    const allActions = gameData.sessionActions;
    
    // 1. Number of unique solutions generated
    const uniqueSolutions = allSolutions.length;
    
    // 2. Novelty score (average across all solutions)
    const avgNoveltyScore = allSolutions.length > 0 ? 
        Math.round(allSolutions.reduce((sum, s) => sum + s.noveltyScore, 0) / allSolutions.length) : 0;
    
    // 3. Elaboration score (average across all solutions)
    const avgElaborationScore = allSolutions.length > 0 ?
        Math.round(allSolutions.reduce((sum, s) => sum + s.elaborationScore, 0) / allSolutions.length) : 0;
    
    // 4. Flexibility score (number of unique categories)
    const allCategories = new Set(allSolutions.flatMap(s => s.categoryTags));
    const flexibilityScore = Math.min(100, allCategories.size * 15); // Max score when 6+ categories
    
    // 5. User actions within the game
    const interactionActions = allActions.filter(a => a.type === 'interaction');
    const experimentalActions = interactionActions.filter(a => 
        a.description.includes('experiment') || a.description.includes('dropped')
    );
    const actionDiversityScore = Math.min(100, (experimentalActions.length / Math.max(1, interactionActions.length)) * 100);
    
    // Display main results
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = `
        <div class="result-card">
            <h3>Total Solutions</h3>
            <div class="result-value">${uniqueSolutions}</div>
            <div class="result-description">Unique creative solutions generated</div>
        </div>
        <div class="result-card">
            <h3>Originality</h3>
            <div class="result-value">${avgNoveltyScore}/100</div>
            <div class="result-description">Average novelty score of your ideas</div>
        </div>
        <div class="result-card">
            <h3>Detail Level</h3>
            <div class="result-value">${avgElaborationScore}/100</div>
            <div class="result-description">Depth and elaboration of solutions</div>
        </div>
        <div class="result-card">
            <h3>Flexibility</h3>
            <div class="result-value">${flexibilityScore}/100</div>
            <div class="result-description">Variety across ${allCategories.size} different categories</div>
        </div>
        <div class="result-card">
            <h3>Experimentation</h3>
            <div class="result-value">${Math.round(actionDiversityScore)}/100</div>
            <div class="result-description">Creative exploration and risk-taking</div>
        </div>
    `;
    
    // Display creativity dimensions
    const dimensionsContainer = document.getElementById('creativity-dimensions');
    dimensionsContainer.innerHTML = `
        <div class="creativity-dimension">
            <div class="dimension-label">Fluency (Idea Generation)</div>
            <div class="dimension-score">${Math.min(100, uniqueSolutions * 10)}/100</div>
        </div>
        <div class="creativity-dimension">
            <div class="dimension-label">Originality (Novelty)</div>
            <div class="dimension-score">${avgNoveltyScore}/100</div>
        </div>
        <div class="creativity-dimension">
            <div class="dimension-label">Elaboration (Detail)</div>
            <div class="dimension-score">${avgElaborationScore}/100</div>
        </div>
        <div class="creativity-dimension">
            <div class="dimension-label">Flexibility (Category Range)</div>
            <div class="dimension-score">${flexibilityScore}/100</div>
        </div>
        <div class="creativity-dimension">
            <div class="dimension-label">Risk-Taking (Experimentation)</div>
            <div class="dimension-score">${Math.round(actionDiversityScore)}/100</div>
        </div>
    `;
    
    // Add interpretation
    const interpretation = getCreativityInterpretation(uniqueSolutions, avgNoveltyScore, avgElaborationScore, flexibilityScore);
    
    const interpretationDiv = document.createElement('div');
    interpretationDiv.style.cssText = `
        background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; 
        margin: 20px 0; border-radius: 8px; text-align: left;
    `;
    interpretationDiv.innerHTML = `
        <h4 style="color: #1976d2; margin-bottom: 10px;">Your Creative Profile</h4>
        <p style="color: #424242; line-height: 1.6;">${interpretation}</p>
    `;
    
    dimensionsContainer.appendChild(interpretationDiv);
}

function getCreativityInterpretation(solutions, novelty, elaboration, flexibility) {
    let interpretation = "";
    
    if (solutions >= 10) {
        interpretation += "You demonstrate excellent fluency in idea generation. ";
    } else if (solutions >= 5) {
        interpretation += "You show good creative fluency with multiple ideas. ";
    } else {
        interpretation += "Focus on generating more ideas - quantity often leads to quality. ";
    }
    
    if (novelty >= 70) {
        interpretation += "Your ideas are highly original and innovative. ";
    } else if (novelty >= 50) {
        interpretation += "You balance conventional and creative thinking well. ";
    } else {
        interpretation += "Try thinking more outside conventional boundaries. ";
    }
    
    if (elaboration >= 70) {
        interpretation += "You excel at developing detailed, well-thought-out solutions. ";
    } else if (elaboration >= 50) {
        interpretation += "Your solutions show good development. ";
    } else {
        interpretation += "Consider adding more detail and steps to your solutions. ";
    }
    
    if (flexibility >= 60) {
        interpretation += "You demonstrate excellent cognitive flexibility across diverse categories.";
    } else {
        interpretation += "Try exploring solutions from different angles and domains.";
    }
    
    return interpretation;
}

function exportJSON() {
    const exportData = {
        ...gameData,
        analysis: {
            totalSolutions: gameData.challenges.flatMap(c => c.solutions || []).length,
            avgNoveltyScore: calculateAverageScore('noveltyScore'),
            avgElaborationScore: calculateAverageScore('elaborationScore'),
            uniqueCategories: getUniqueCategories().length,
            totalInteractions: gameData.totalActions
        }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `creativity-assessment-${gameData.sessionId}.json`;
    link.click();
}

function exportCSV() {
    const headers = [
        'Challenge ID', 'Challenge Type', 'Solution Text', 'Novelty Score', 
        'Elaboration Score', 'Categories', 'Timestamp', 'Time Spent (ms)'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    gameData.challenges.forEach(challenge => {
        if (challenge.solutions) {
            challenge.solutions.forEach(solution => {
                const row = [
                    challenge.challengeId,
                    `"${challenge.type}"`,
                    `"${solution.text.replace(/"/g, '""')}"`,
                    solution.noveltyScore,
                    solution.elaborationScore,
                    `"${solution.categoryTags.join(', ')}"`,
                    solution.timestamp,
                    challenge.timeSpent || 0
                ];
                csvContent += row.join(',') + '\n';
            });
        }
    });
    
    const dataBlob = new Blob([csvContent], {type: 'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `creativity-assessment-${gameData.sessionId}.csv`;
    link.click();
}

function calculateAverageScore(scoreType) {
    const allSolutions = gameData.challenges.flatMap(c => c.solutions || []);
    return allSolutions.length > 0 ? 
        Math.round(allSolutions.reduce((sum, s) => sum + s[scoreType], 0) / allSolutions.length) : 0;
}

function getUniqueCategories() {
    const allSolutions = gameData.challenges.flatMap(c => c.solutions || []);
    return [...new Set(allSolutions.flatMap(s => s.categoryTags))];
}

function restartGame() {
    currentChallenge = 0;
    clearInterval(timerInterval);
    
    gameData = {
        sessionId: Date.now().toString(),
        startTime: new Date().toISOString(),
        challenges: [],
        totalActions: 0,
        sessionActions: []
    };
    
    document.getElementById('results-screen').classList.remove('active');
    document.getElementById('welcome-screen').classList.add('active');
}

function proceedToNextGame() {
    // Save current game data before proceeding
    const exportData = {
        gameType: "Creative Problem Solving Challenge",
        gameMetadata: {
            totalChallenges: challenges.length,
            completedAt: new Date().toISOString(),
            gameVersion: '1.0',
            sessionId: gameData.sessionId
        },
        summary: calculateGameSummary(),
        gameData: gameData,
        rawData: {
            // Data Point 1: Fluency (number of solutions)
            solutionFluency: gameData.challenges.map(challenge => ({
                challengeId: challenge.challengeId,
                solutionCount: challenge.solutions ? challenge.solutions.length : 0
            })),
            
            // Data Point 2: Originality scores
            originalityScores: gameData.challenges.flatMap(challenge => 
                challenge.solutions ? challenge.solutions.map(s => ({
                    challengeId: challenge.challengeId,
                    noveltyScore: s.noveltyScore
                })) : []
            ),
            
            // Data Point 3: Elaboration scores
            elaborationScores: gameData.challenges.flatMap(challenge => 
                challenge.solutions ? challenge.solutions.map(s => ({
                    challengeId: challenge.challengeId,
                    elaborationScore: s.elaborationScore
                })) : []
            ),
            
            // Data Point 4: Interactive actions
            interactiveActions: gameData.challenges.flatMap(challenge => 
                challenge.interactiveActions || []
            )
        }
    };
    
    // Save to Firestore
    saveGameData(exportData, 'creative_problem_solving');
    
    // Navigate to next game
    window.open('../Open_Ended_Question/Open_Ended_Question.html', '_blank');
}

function calculateGameSummary() {
    const allSolutions = gameData.challenges.flatMap(c => c.solutions || []);
    
    return {
        totalSolutions: allSolutions.length,
        averageNoveltyScore: allSolutions.length > 0 ? 
            allSolutions.reduce((sum, s) => sum + s.noveltyScore, 0) / allSolutions.length : 0,
        averageElaborationScore: allSolutions.length > 0 ?
            allSolutions.reduce((sum, s) => sum + s.elaborationScore, 0) / allSolutions.length : 0,
        totalInteractions: gameData.totalActions
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
        gameData: data.gameData,
        rawData: data.rawData,
        timestamp: new Date().toISOString(),
        userId: `user_${Date.now()}`,
        gameVersion: "1.0"
    };

    console.log('Attempting to save to Firestore:', firestoreData);
    saveToFirestore(firestoreData, 'creative_problem_solving_results');
}

// Event listeners
document.getElementById('solution-input').addEventListener('input', updateCharCount);
document.getElementById('solution-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        addSolution();
    }
});

// Initialize character counter
updateCharCount();

// Global window assignments
window.startGame = startGame;
window.addSolution = addSolution;
window.nextChallenge = nextChallenge;
window.skipChallenge = skipChallenge;
window.endGame = endGame;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
window.restartGame = restartGame;
window.proceedToNextGame = proceedToNextGame;