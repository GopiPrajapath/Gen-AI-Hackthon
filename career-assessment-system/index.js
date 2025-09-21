const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./path/to/your/serviceAccountKey.json'); // Update this path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com" // Update with your project ID
});

const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-gemini-api-key');

class CareerAssessmentSystem {
  constructor() {
    this.db = db;
    this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Task 1: Retrieve data from Firestore collections
   */
  async retrieveAssessmentData() {
    try {
      console.log('🔍 Retrieving assessment data from Firestore...');
      
      const collections = [
        'balloon_pump_game_results',
        'creative_problem_solving_results', 
        'emotional_recognition_results',
        'memory_attention_game_results',
        'open_ended_questions_results'
      ];

      const assessmentData = {};

      for (const collectionName of collections) {
        console.log(`📊 Fetching ${collectionName}...`);
        
        const snapshot = await this.db.collection(collectionName).get();
        
        if (snapshot.empty) {
          console.warn(`⚠️ No documents found in ${collectionName}`);
          assessmentData[collectionName] = [];
          continue;
        }

        const collectionData = [];
        snapshot.forEach(doc => {
          collectionData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        assessmentData[collectionName] = collectionData;
        console.log(`✅ Retrieved ${collectionData.length} documents from ${collectionName}`);
      }

      console.log('🎉 Successfully retrieved all assessment data');
      return assessmentData;
    } catch (error) {
      console.error('❌ Error retrieving assessment data:', error);
      throw new Error(`Failed to retrieve data from Firestore: ${error.message}`);
    }
  }

  /**
   * Alternative method to retrieve specific document by ID
   */
  async retrieveSpecificAssessment(participantId) {
    try {
      console.log(`🔍 Retrieving assessment data for participant: ${participantId}`);
      
      const collections = [
        'balloon_pump_game_results',
        'creative_problem_solving_results', 
        'emotional_recognition_results',
        'memory_attention_game_results',
        'open_ended_questions_results'
      ];

      const assessmentData = {};

      for (const collectionName of collections) {
        const docRef = this.db.collection(collectionName).doc(participantId);
        const doc = await docRef.get();
        
        if (doc.exists) {
          assessmentData[collectionName] = doc.data();
          console.log(`✅ Found ${collectionName} for participant ${participantId}`);
        } else {
          console.warn(`⚠️ No ${collectionName} found for participant ${participantId}`);
          assessmentData[collectionName] = null;
        }
      }

      return assessmentData;
    } catch (error) {
      console.error('❌ Error retrieving specific assessment:', error);
      throw new Error(`Failed to retrieve assessment for ${participantId}: ${error.message}`);
    }
  }

  /**
   * Task 2: Merge assessment data into system prompt
   */
  async mergeDataIntoSystemPrompt(assessmentData, systemPromptPath) {
    try {
      console.log('📝 Reading system prompt template...');
      
      // Read the system prompt file
      const systemPromptTemplate = await fs.readFile(systemPromptPath, 'utf8');
      
      // Convert assessment data to formatted JSON strings
      const formattedData = {
        balloon_pump_game: JSON.stringify(assessmentData.balloon_pump_game_results || [], null, 2),
        creative_problem_solving: JSON.stringify(assessmentData.creative_problem_solving_results || [], null, 2),
        emotional_recognition: JSON.stringify(assessmentData.emotional_recognition_results || [], null, 2),
        memory_attention_game: JSON.stringify(assessmentData.memory_attention_game_results || [], null, 2),
        open_ended_questions: JSON.stringify(assessmentData.open_ended_questions_results || [], null, 2)
      };

      // Replace the placeholder in the system prompt
      let completedPrompt = systemPromptTemplate;
      
      // Look for the insertion point in the system prompt
      const insertionPoint = '<<Herr comes the json files >>';
      
      if (completedPrompt.includes(insertionPoint)) {
        const dataInsert = `
ASSESSMENT DATA:

1. BALLOON PUMP GAME RESULTS:
${formattedData.balloon_pump_game}

2. CREATIVE PROBLEM SOLVING RESULTS:
${formattedData.creative_problem_solving}

3. EMOTIONAL RECOGNITION RESULTS:
${formattedData.emotional_recognition}

4. MEMORY & ATTENTION GAME RESULTS:
${formattedData.memory_attention_game}

5. OPEN-ENDED QUESTIONS RESULTS:
${formattedData.open_ended_questions}

END ASSESSMENT DATA
        `;
        
        completedPrompt = completedPrompt.replace(insertionPoint, dataInsert);
        console.log('✅ Successfully merged assessment data into system prompt');
      } else {
        console.warn('⚠️ Insertion point not found, appending data to end of prompt');
        completedPrompt += '\n\n' + `
ASSESSMENT DATA:
${Object.entries(formattedData).map(([key, value]) => `${key.toUpperCase()}: ${value}`).join('\n\n')}
        `;
      }

      return completedPrompt;
    } catch (error) {
      console.error('❌ Error merging data into system prompt:', error);
      throw new Error(`Failed to merge data into system prompt: ${error.message}`);
    }
  }

  /**
   * Task 3: Send completed prompt to Gemini AI
   */
  async sendToGeminiAI(completedPrompt, userQuery = "Please analyze this assessment data and provide a comprehensive career profile.") {
    try {
      console.log('🤖 Sending prompt to Gemini AI...');
      
      const result = await this.model.generateContent([
        {
          role: "system",
          parts: [{ text: completedPrompt }]
        },
        {
          role: "user", 
          parts: [{ text: userQuery }]
        }
      ]);

      const response = await result.response;
      const careerProfile = response.text();
      
      console.log('🎉 Successfully received career profile from Gemini AI');
      return careerProfile;
    } catch (error) {
      console.error('❌ Error calling Gemini AI:', error);
      throw new Error(`Failed to get response from Gemini AI: ${error.message}`);
    }
  }

  /**
   * Main orchestration method that runs all three tasks
   */
  async generateCareerProfile(participantId = null, systemPromptPath = './System Prompt.txt') {
    try {
      console.log('🚀 Starting career profile generation process...');
      
      // Task 1: Retrieve data
      const assessmentData = participantId 
        ? await this.retrieveSpecificAssessment(participantId)
        : await this.retrieveAssessmentData();

      // Task 2: Merge into system prompt
      const completedPrompt = await this.mergeDataIntoSystemPrompt(assessmentData, systemPromptPath);
      
      // Task 3: Send to Gemini AI
      const careerProfile = await this.sendToGeminiAI(completedPrompt);
      
      console.log('🎊 Career profile generation completed successfully!');
      
      return {
        success: true,
        assessmentData,
        careerProfile,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('💥 Error in career profile generation:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Save career profile to Firestore
   */
  async saveCareerProfile(participantId, profileData) {
    try {
      await this.db.collection('career_profiles').doc(participantId).set({
        ...profileData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Career profile saved for participant: ${participantId}`);
    } catch (error) {
      console.error('❌ Error saving career profile:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple assessments
   */
  async batchProcessAssessments(participantIds) {
    console.log(`🔄 Starting batch processing for ${participantIds.length} participants...`);
    
    const results = [];
    
    for (const participantId of participantIds) {
      try {
        console.log(`🎯 Processing participant: ${participantId}`);
        const result = await this.generateCareerProfile(participantId);
        
        if (result.success) {
          await this.saveCareerProfile(participantId, result);
          results.push({ participantId, success: true });
        } else {
          results.push({ participantId, success: false, error: result.error });
        }
      } catch (error) {
        console.error(`❌ Error processing ${participantId}:`, error);
        results.push({ participantId, success: false, error: error.message });
      }
    }
    
    console.log('🏁 Batch processing completed');
    return results;
  }
}

// Usage examples and API endpoints (Express.js)
const express = require('express');
const app = express();
const careerSystem = new CareerAssessmentSystem();

app.use(express.json());

// Single assessment endpoint
app.post('/api/generate-career-profile/:participantId?', async (req, res) => {
  try {
    const participantId = req.params.participantId;
    const result = await careerSystem.generateCareerProfile(participantId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch processing endpoint
app.post('/api/batch-process', async (req, res) => {
  try {
    const { participantIds } = req.body;
    
    if (!Array.isArray(participantIds)) {
      return res.status(400).json({
        success: false,
        error: 'participantIds must be an array'
      });
    }
    
    const results = await careerSystem.batchProcessAssessments(participantIds);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Career Assessment AI System',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌟 Career Assessment System running on port ${PORT}`);
});

// Export for use as module
module.exports = CareerAssessmentSystem;

// Example usage in standalone script
if (require.main === module) {
  (async () => {
    const system = new CareerAssessmentSystem();
    
    // Example: Process a specific participant
    // const result = await system.generateCareerProfile('participant_123');
    // console.log(JSON.stringify(result, null, 2));
    
    // Example: Process all assessments
    const result = await system.generateCareerProfile();
    console.log('Career profile generated:', result.success ? '✅' : '❌');
  })();
}