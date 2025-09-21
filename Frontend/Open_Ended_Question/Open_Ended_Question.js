// Firebase imports and configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Function to fetch the latest career profile from Firestore
async function fetchLatestCareerProfile() {
    try {
        console.log('Fetching latest career profile from server...');
        
        // Query the career_profiles collection for the latest entry
        const q = query(
            collection(db, 'career_profiles'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('No career profiles found in the database');
        }
        
        const latestDoc = querySnapshot.docs[0];
        const profileData = latestDoc.data();
        
        console.log('✅ Career profile fetched successfully');
        return {
            id: latestDoc.id,
            ...profileData
        };
        
    } catch (error) {
        console.error('❌ Error fetching career profile:', error);
        throw error;
    }
}

// Function to download the server-generated full report
async function downloadFullReport() {
    try {
        // Show loading state
        const exportBtn = document.getElementById('exportBtn');
        const originalText = exportBtn.textContent;
        exportBtn.textContent = 'Downloading Report...';
        exportBtn.disabled = true;
        
        // Fetch the latest career profile from Firebase
        const careerProfileData = await fetchLatestCareerProfile();
        
        // Create a comprehensive report combining local and server data
        const fullReport = {
            reportMetadata: {
                reportType: "Complete Career Assessment Report",
                generatedAt: new Date().toISOString(),
                dataSource: "Server-Generated Analysis",
                reportVersion: "2.0",
                profileId: careerProfileData.id
            },
            localAssessmentData: {
                gameType: "Open-Ended Questions",
                responses: responses,
                localInsights: analysisResults
            },
            serverGeneratedProfile: {
                careerProfile: careerProfileData.careerProfile,
                comprehensiveAnalysis: careerProfileData.assessmentData,
                aiGeneratedInsights: careerProfileData.metadata
            },
            downloadTimestamp: new Date().toISOString()
        };
        
        // Create and download the file
        const reportStr = JSON.stringify(fullReport, null, 2);
        const reportBlob = new Blob([reportStr], { type: 'application/json' });
        const url = URL.createObjectURL(reportBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `full-career-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        // Show success message
        alert('✅ Full career report downloaded successfully! This includes both your responses and the AI-generated career analysis from our server.');
        
        // Reset button state
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
        
    } catch (error) {
        console.error('Error downloading full report:', error);
        alert('❌ Error downloading report: ' + error.message + '. Please try again or contact support.');
        
        // Reset button state
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.textContent = 'Get Full Report';
        exportBtn.disabled = false;
    }
}

// Function to create a formatted HTML report (alternative option)
async function downloadFormattedReport() {
    try {
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.textContent = 'Generating Report...';
        exportBtn.disabled = true;
        
        const careerProfileData = await fetchLatestCareerProfile();
        
        // Create HTML formatted report
        const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Career Assessment Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        .section {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .responses {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .career-profile {
            background: #e8f5e8;
            border-left-color: #28a745;
        }
        pre {
            white-space: pre-wrap;
            font-family: inherit;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Career Assessment Report</h1>
        <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="section">
        <h2>Your Responses</h2>
        ${responses.map((resp, index) => `
            <div class="responses">
                <h4>Question ${index + 1}: ${questions[index].text}</h4>
                <p><strong>Your Response:</strong> ${resp.response}</p>
                <p class="timestamp">Answered: ${new Date(resp.timestamp).toLocaleString()}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="section career-profile">
        <h2>AI-Generated Career Profile</h2>
        <pre>${careerProfileData.careerProfile || 'Career profile analysis in progress...'}</pre>
    </div>
    
    <div class="section">
        <h2>Report Metadata</h2>
        <p><strong>Report ID:</strong> ${careerProfileData.id}</p>
        <p><strong>Generated:</strong> ${new Date(careerProfileData.timestamp).toLocaleString()}</p>
        <p><strong>Total Assessments Processed:</strong> ${careerProfileData.metadata?.totalAssessments || 'N/A'}</p>
    </div>
</body>
</html>
        `;
        
        const htmlBlob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(htmlBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `career-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        exportBtn.textContent = 'Get Full Report';
        exportBtn.disabled = false;
        
        alert('✅ Formatted career report downloaded successfully!');
        
    } catch (error) {
        console.error('Error generating formatted report:', error);
        alert('❌ Error generating report: ' + error.message);
        
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.textContent = 'Get Full Report';
        exportBtn.disabled = false;
    }
}

// Questions data
const questions = [
    {
        id: 1,
        text: "What is one accomplishment you're most proud of, and what role did you play in it?",
        framework: "self_efficacy"
    },
    {
        id: 2,
        text: "If money were no object, what kind of work would you be doing?",
        framework: "intrinsic_motivation"
    },
    {
        id: 3,
        text: "What's a problem in the world you would like to help solve?",
        framework: "social_purpose"
    },
    {
        id: 4,
        text: "What's a skill you've learned recently, and how did you learn it?",
        framework: "growth_mindset"
    },
    {
        id: 5,
        text: "Describe a time you worked as part of a team. What was your role?",
        framework: "collaboration"
    }
];

// Application state
let currentQuestionIndex = 0;
let responses = [];
let analysisResults = null;

// Initialize
function initializeAssessment() {
    responses = questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        response: '',
        timestamp: null
    }));
}

// Start assessment
function startAssessment() {
    initializeAssessment();
    document.getElementById('introScreen').classList.remove('active');
    document.getElementById('questionScreen').classList.add('active');
    displayQuestion();
}

// Display current question
function displayQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('questionNumber').textContent = `Question ${question.id} of ${questions.length}`;
    document.getElementById('questionText').textContent = question.text;
    document.getElementById('responseArea').value = responses[currentQuestionIndex].response || '';
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').textContent = 
        currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next';
    
    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    updateCharCount();
}

// Save current response
function saveCurrentResponse() {
    const responseText = document.getElementById('responseArea').value.trim();
    responses[currentQuestionIndex].response = responseText;
    responses[currentQuestionIndex].timestamp = new Date().toISOString();
}

// Navigate to next question
function nextQuestion() {
    saveCurrentResponse();
    
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        // All questions answered, analyze and show results
        analyzeResponses();
        completeAssessment();
    }
}

// Navigate to previous question
function previousQuestion() {
    saveCurrentResponse();
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Update character count
function updateCharCount() {
    const text = document.getElementById('responseArea').value;
    document.getElementById('charCount').textContent = `${text.length} characters`;
}

// NLP Analysis Functions
function analyzeResponses() {
    // Show loading state
    document.getElementById('questionScreen').classList.remove('active');
    document.getElementById('resultsScreen').classList.add('active');
    
    // Perform NLP analysis
    analysisResults = {
        timestamp: new Date().toISOString(),
        responses: responses,
        nlpAnalysis: responses.map((resp, index) => analyzeText(resp.response, questions[index])),
        aggregateInsights: generateAggregateInsights(responses)
    };
    
    displayResults();
}

// Simple NLP analysis (in production, would use proper NLP library or API)
function analyzeText(text, question) {
    const analysis = {
        framework: question.framework,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
        sentiment: analyzeSentiment(text),
        keywords: extractKeywords(text),
        traits: extractTraits(text, question.framework),
        confidence: Math.random() * 0.3 + 0.7 // Simulated confidence score
    };
    
    return analysis;
}

// Sentiment analysis (simplified)
function analyzeSentiment(text) {
    const positiveWords = ['proud', 'happy', 'excited', 'passionate', 'love', 'enjoy', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['difficult', 'hard', 'challenging', 'problem', 'issue', 'concern', 'worried', 'frustrated'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
    });
    
    const total = positiveScore + negativeScore || 1;
    return {
        positive: positiveScore / total,
        negative: negativeScore / total,
        neutral: 1 - (positiveScore + negativeScore) / total
    };
}

// Extract keywords (simplified)
function extractKeywords(text) {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'my', 'your', 'our', 'their'];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = {};
    
    words.forEach(word => {
        if (!commonWords.includes(word) && word.length > 3) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });
    
    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}

// Extract psychological traits based on framework
function extractTraits(text, framework) {
    const traitMappings = {
        self_efficacy: {
            keywords: ['led', 'managed', 'achieved', 'completed', 'succeeded', 'overcame', 'initiated'],
            traits: ['confident', 'self-directed', 'achievement-oriented', 'resilient']
        },
        intrinsic_motivation: {
            keywords: ['passion', 'love', 'enjoy', 'fascinated', 'curious', 'interested', 'meaningful'],
            traits: ['passionate', 'purpose-driven', 'intrinsically motivated', 'value-aligned']
        },
        social_purpose: {
            keywords: ['help', 'support', 'community', 'impact', 'change', 'improve', 'contribute'],
            traits: ['empathetic', 'socially conscious', 'altruistic', 'impact-focused']
        },
        growth_mindset: {
            keywords: ['learned', 'practiced', 'improved', 'developed', 'grew', 'challenged', 'explored'],
            traits: ['growth-oriented', 'adaptable', 'curious', 'persistent']
        },
        collaboration: {
            keywords: ['team', 'together', 'collaborated', 'supported', 'communicated', 'coordinated', 'shared'],
            traits: ['collaborative', 'communicative', 'team-oriented', 'supportive']
        }
    };
    
    const mapping = traitMappings[framework];
    const textLower = text.toLowerCase();
    const detectedTraits = [];
    
    mapping.keywords.forEach(keyword => {
        if (textLower.includes(keyword)) {
            const randomTrait = mapping.traits[Math.floor(Math.random() * mapping.traits.length)];
            if (!detectedTraits.includes(randomTrait)) {
                detectedTraits.push(randomTrait);
            }
        }
    });
    
    // Add some default traits if none detected
    if (detectedTraits.length === 0) {
        detectedTraits.push(mapping.traits[0]);
    }
    
    return detectedTraits;
}

// Generate aggregate insights
function generateAggregateInsights(responses) {
    const allTraits = [];
    const allKeywords = [];
    let totalSentiment = { positive: 0, negative: 0, neutral: 0 };
    
    responses.forEach((resp, index) => {
        if (resp.response) {
            const analysis = analyzeText(resp.response, questions[index]);
            allTraits.push(...analysis.traits);
            allKeywords.push(...analysis.keywords);
            totalSentiment.positive += analysis.sentiment.positive;
            totalSentiment.negative += analysis.sentiment.negative;
            totalSentiment.neutral += analysis.sentiment.neutral;
        }
    });
    
    // Count trait frequencies
    const traitFreq = {};
    allTraits.forEach(trait => {
        traitFreq[trait] = (traitFreq[trait] || 0) + 1;
    });
    
    // Get top traits
    const topTraits = Object.entries(traitFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([trait]) => trait);
    
    // Average sentiment
    const responseCount = responses.filter(r => r.response).length || 1;
    const avgSentiment = {
        positive: totalSentiment.positive / responseCount,
        negative: totalSentiment.negative / responseCount,
        neutral: 1 - (totalSentiment.positive + totalSentiment.negative) / responseCount
    };
    
    // Career alignment suggestions
    const careerSuggestions = generateCareerSuggestions(topTraits, allKeywords);
    
    return {
        dominantTraits: topTraits,
        overallSentiment: avgSentiment,
        careerAlignment: careerSuggestions,
        keyThemes: [...new Set(allKeywords)].slice(0, 10)
    };
}

// Generate career suggestions based on traits
function generateCareerSuggestions(traits, keywords) {
    const suggestions = [];
    
    if (traits.includes('empathetic') || traits.includes('socially conscious')) {
        suggestions.push('Social Impact Roles', 'Healthcare', 'Education');
    }
    if (traits.includes('analytical') || keywords.includes('data')) {
        suggestions.push('Data Science', 'Research', 'Analytics');
    }
    if (traits.includes('creative') || keywords.includes('design')) {
        suggestions.push('Creative Industries', 'Design', 'Marketing');
    }
    if (traits.includes('collaborative') || traits.includes('team-oriented')) {
        suggestions.push('Project Management', 'Team Leadership', 'Consulting');
    }
    if (traits.includes('growth-oriented') || traits.includes('curious')) {
        suggestions.push('Innovation Roles', 'Startups', 'R&D');
    }
    
    return suggestions.length > 0 ? suggestions : ['Diverse Career Paths'];
}

// Display results
function displayResults() {
    const container = document.getElementById('insightsContainer');
    const insights = analysisResults.aggregateInsights;
    
    // Clear previous content
    container.innerHTML = '';
    
    // Personal Traits
    const traitsCard = document.createElement('div');
    traitsCard.className = 'insight-card';
    traitsCard.innerHTML = `
        <h3>Your Dominant Traits</h3>
        <p>Based on your responses, these qualities stand out:</p>
        <div class="trait-list">
            ${insights.dominantTraits.map(trait => 
                `<span class="trait-tag">${trait}</span>`
            ).join('')}
        </div>
    `;
    container.appendChild(traitsCard);
    
    // Career Alignment
    const careerCard = document.createElement('div');
    careerCard.className = 'insight-card';
    careerCard.innerHTML = `
        <h3>Career Path Alignment</h3>
        <p>Your responses suggest strong alignment with:</p>
        <div class="trait-list">
            ${insights.careerAlignment.map(career => 
                `<span class="trait-tag">${career}</span>`
            ).join('')}
        </div>
    `;
    container.appendChild(careerCard);
    
    // Key Themes
    const themesCard = document.createElement('div');
    themesCard.className = 'insight-card';
    themesCard.innerHTML = `
        <h3>Key Themes in Your Responses</h3>
        <p>These concepts appeared frequently in your answers:</p>
        <p style="margin-top: 10px; font-style: italic; color: #764ba2;">
            ${insights.keyThemes.join(', ')}
        </p>
    `;
    container.appendChild(themesCard);
    
    // Sentiment Overview
    const sentimentCard = document.createElement('div');
    sentimentCard.className = 'insight-card';
    const dominantSentiment = Object.entries(insights.overallSentiment)
        .sort((a, b) => b[1] - a[1])[0][0];
    sentimentCard.innerHTML = `
        <h3>Response Tone</h3>
        <p>Your overall response tone was <strong>${dominantSentiment}</strong>, 
        indicating ${dominantSentiment === 'positive' ? 'optimism and enthusiasm' : 
                      dominantSentiment === 'negative' ? 'realistic awareness of challenges' : 
                      'balanced and objective thinking'}.</p>
    `;
    container.appendChild(sentimentCard);
}

// Export results as JSON (local analysis only)
function exportResults() {
    const exportData = {
        ...analysisResults,
        exportTimestamp: new Date().toISOString(),
        version: '1.0',
        privacy: 'anonymized',
        note: 'This is local analysis only. Use "Get Full Report" for server-generated insights.'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `local_insights_${Date.now()}.json`;
    link.click();
}

// Complete assessment
function completeAssessment() {
    // Save current game data before completing
    const exportData = {
        gameType: "Open-Ended Questions",
        gameMetadata: {
            totalQuestions: questions.length,
            completedAt: new Date().toISOString(),
            gameVersion: '1.0',
            sessionId: Date.now().toString()
        },
        responses: responses,
        insights: analysisResults,
        rawData: {
            responseAnalysis: responses.map(response => ({
                question: response.questionText,
                response: response.response,
                wordCount: response.response.split(' ').length,
                characterCount: response.response.length,
                timestamp: response.timestamp
            }))
        }
    };
    
    // Save to Firestore and local storage
    saveGameData(exportData, 'open_ended_questions');
    
    // Show completion message
    alert('Assessment completed! Your data has been saved. You can now download the full report with AI-generated insights.');
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
        responses: data.responses,
        insights: data.insights,
        rawData: data.rawData,
        timestamp: new Date().toISOString(),
        userId: `user_${Date.now()}`,
        gameVersion: "1.0"
    };

    console.log('Attempting to save to Firestore:', firestoreData);
    saveToFirestore(firestoreData, 'open_ended_questions_results');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    // Any initialization code
});

// Global window assignments
window.startAssessment = startAssessment;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.updateCharCount = updateCharCount;
window.exportResults = exportResults;
window.downloadFullReport = downloadFullReport;
window.downloadFormattedReport = downloadFormattedReport;
window.completeAssessment = completeAssessment;