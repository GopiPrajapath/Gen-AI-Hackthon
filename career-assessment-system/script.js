// script.js - Fixed version with correct Gemini API call
require('dotenv').config();
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function main() {
  try {
    console.log('Starting career assessment generation...');
    
    // Step 1: Retrieve data from Firestore
    console.log('1. Retrieving assessment data...');
    const collections = [
      'balloon_pump_game_results',
      'creative_problem_solving_results',
      'emotional_recognition_results',
      'memory_attention_game_results',
      'open_ended_questions_results'
    ];

    const assessmentData = {};
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const collectionData = [];
      
      snapshot.forEach(doc => {
        collectionData.push({ id: doc.id, ...doc.data() });
      });
      
      assessmentData[collectionName] = collectionData;
      console.log(`   Retrieved ${collectionData.length} documents from ${collectionName}`);
    }

    // Step 2: Read and merge with system prompt
    console.log('2. Merging data with system prompt...');
    const systemPromptPath = process.env.SYSTEM_PROMPT_PATH || './System Prompt.txt';
    let systemPrompt = await fs.readFile(systemPromptPath, 'utf8');
    
    // Format assessment data - Fix the variable names to match what was retrieved
    const dataInsert = `
ASSESSMENT DATA:

1. BALLOON PUMP GAME RESULTS:
${JSON.stringify(assessmentData.balloon_pump_game_results, null, 2)}

2. CREATIVE PROBLEM SOLVING RESULTS:
${JSON.stringify(assessmentData.creative_problem_solving_result, null, 2)}

3. EMOTIONAL RECOGNITION RESULTS:
${JSON.stringify(assessmentData.emotional_recognition_results, null, 2)}

4. MEMORY & ATTENTION GAME RESULTS:
${JSON.stringify(assessmentData.memory_attention_game_results, null, 2)}

5. OPEN-ENDED QUESTIONS RESULTS:
${JSON.stringify(assessmentData.open_ended_questions_results, null, 2)}

END ASSESSMENT DATA
    `;

    // Insert data into system prompt
    const insertionPoint = '<<Herr comes the json files >>';
    systemPrompt = systemPrompt.replace(insertionPoint, dataInsert);

    // Step 3: Send to Gemini AI - FIXED VERSION
    console.log('3. Sending to Gemini AI...');
    
    // Combine system prompt and user request - THIS IS THE FIX
    const fullPrompt = `${systemPrompt}\n\nUSER REQUEST: Please analyze this assessment data and provide a comprehensive career profile following the format specified in the system prompt.`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const careerProfile = response.text();
    
    // Step 4: Save results
    console.log('4. Saving results...');
    const timestamp = new Date().toISOString();
    const outputData = {
      timestamp,
      assessmentData,
      careerProfile,
      metadata: {
        totalAssessments: Object.values(assessmentData).reduce((sum, arr) => sum + arr.length, 0),
        geminiModel: 'gemini-pro',
        processingTime: new Date().toISOString()
      }
    };

    // Save to file
    await fs.writeFile(`career-profile-${timestamp.split('T')[0]}.json`, JSON.stringify(outputData, null, 2));
    
    // Optionally save to Firestore
    await db.collection('career_profiles').add(outputData);
    
    console.log('✅ Career profile generation completed!');
    console.log('\n--- CAREER PROFILE ---');
    console.log(careerProfile);
    console.log('\n--- END PROFILE ---');
    
    return outputData;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main };