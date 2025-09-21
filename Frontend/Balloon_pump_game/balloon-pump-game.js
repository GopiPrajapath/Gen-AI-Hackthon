
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
        showMessage('Data saved to Firestore!', 'success');
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        showMessage('Error saving data to Firestore.', 'danger');
        throw e;
    }
}
// Game State
        let gameData = {
            rounds: [],
            currentRound: 1,
            totalScore: 0,
            totalPops: 0,
            gameStartTime: Date.now()
        };

        let currentRoundData = {
            roundNumber: 1,
            pumps: 0,
            cashOutValue: 0,
            popped: false,
            decisionTimes: [],
            roundStartTime: Date.now(),
            burstThreshold: generateBurstThreshold()
        };

        let awaitingDecision = false;
        let decisionStartTime = 0;

        function generateBurstThreshold() {
            // Random threshold between 3 and 15 pumps
            return Math.floor(Math.random() * 13) + 3;
        }

        function startDecisionTimer() {
            awaitingDecision = true;
            decisionStartTime = Date.now();
        }

        function recordDecisionTime() {
            if (awaitingDecision) {
                const decisionTime = Date.now() - decisionStartTime;
                currentRoundData.decisionTimes.push(decisionTime);
                awaitingDecision = false;
            }
        }

        function pump() {
            recordDecisionTime();
            
            currentRoundData.pumps++;
            const currentReward = currentRoundData.pumps * 10;
            
            // Update UI
            document.getElementById('pumpCount').textContent = currentRoundData.pumps;
            document.getElementById('currentReward').textContent = currentReward;
            
            // Scale balloon
            const balloon = document.getElementById('balloon');
            const scale = 1 + (currentRoundData.pumps * 0.2);
            balloon.style.transform = `scale(${scale})`;
            
            // Check if balloon should pop
            if (currentRoundData.pumps >= currentRoundData.burstThreshold) {
                popBalloon();
            } else {
                // Start timer for next decision
                startDecisionTimer();
            }
        }

        function cashOut() {
            recordDecisionTime();
            
            const reward = currentRoundData.pumps * 10;
            currentRoundData.cashOutValue = reward;
            gameData.totalScore += reward;
            
            showMessage(`Success! You cashed out $${reward}`, 'success');
            
            // Update UI
            document.getElementById('totalScore').textContent = gameData.totalScore;
            
            endRound();
        }

        function popBalloon() {
            currentRoundData.popped = true;
            currentRoundData.cashOutValue = 0;
            gameData.totalPops++;
            
            // Visual feedback
            const balloon = document.getElementById('balloon');
            const container = document.querySelector('.balloon-container');
            
            balloon.classList.add('popped');
            
            // Add explosion effect
            const explosion = document.createElement('div');
            explosion.className = 'explosion';
            explosion.textContent = '💥';
            container.appendChild(explosion);
            
            setTimeout(() => {
                if (container.contains(explosion)) {
                    container.removeChild(explosion);
                }
            }, 500);
            
            showMessage(`Pop! The balloon burst at ${currentRoundData.pumps} pumps. Threshold was ${currentRoundData.burstThreshold}.`, 'danger');
            
            // Update UI
            document.getElementById('totalPops').textContent = gameData.totalPops;
            
            endRound();
        }

        function endRound() {
            // Disable buttons temporarily
            document.getElementById('pumpBtn').disabled = true;
            document.getElementById('cashoutBtn').disabled = true;
            
            // Save round data
            gameData.rounds.push({...currentRoundData});
            
            // Update success rate
            const successfulRounds = gameData.rounds.filter(r => !r.popped).length;
            const successRate = Math.round((successfulRounds / gameData.rounds.length) * 100);
            document.getElementById('successRate').textContent = successRate + '%';
            document.getElementById('roundsCompleted').textContent = gameData.rounds.length;
            
            // Show next game button after 3 rounds
            if (gameData.rounds.length >= 3) {
                document.getElementById('nextGameBtn').style.display = 'block';
            }
            
            setTimeout(() => {
                startNewRound();
            }, 2000);
        }

        function startNewRound() {
            // Reset for new round
            gameData.currentRound++;
            currentRoundData = {
                roundNumber: gameData.currentRound,
                pumps: 0,
                cashOutValue: 0,
                popped: false,
                decisionTimes: [],
                roundStartTime: Date.now(),
                burstThreshold: generateBurstThreshold()
            };
            
            // Reset UI
            document.getElementById('currentRound').textContent = gameData.currentRound;
            document.getElementById('pumpCount').textContent = 0;
            document.getElementById('currentReward').textContent = 0;
            
            const balloon = document.getElementById('balloon');
            balloon.classList.remove('popped');
            balloon.style.transform = 'scale(1)';
            
            // Re-enable buttons
            document.getElementById('pumpBtn').disabled = false;
            document.getElementById('cashoutBtn').disabled = false;
            
            showMessage(`Round ${gameData.currentRound} started!`, 'info');
            
            // Start decision timer
            startDecisionTimer();
        }

        function showMessage(text, type) {
            const messageArea = document.getElementById('messageArea');
            const message = document.createElement('div');
            message.className = `message ${type}`;
            message.textContent = text;
            
            messageArea.innerHTML = '';
            messageArea.appendChild(message);
            
            setTimeout(() => {
                if (messageArea.contains(message)) {
                    messageArea.removeChild(message);
                }
            }, 3000);
        }

        function calculateRiskBehaviorChange() {
            if (gameData.rounds.length < 3) return "Insufficient data";
            
            const early = gameData.rounds.slice(0, Math.floor(gameData.rounds.length / 2));
            const late = gameData.rounds.slice(Math.floor(gameData.rounds.length / 2));
            
            const earlyAvgPumps = early.reduce((sum, r) => sum + r.pumps, 0) / early.length;
            const lateAvgPumps = late.reduce((sum, r) => sum + r.pumps, 0) / late.length;
            
            const change = lateAvgPumps - earlyAvgPumps;
            
            if (Math.abs(change) < 0.5) return "No significant change";
            return change > 0 ? "More risk-taking over time" : "More risk-averse over time";
        }

        function exportJSON() {
            const exportData = {
                gameType: "Balloon Pump Game",
                gameData: gameData,
                analysis: {
                    totalRounds: gameData.rounds.length,
                    averagePumpsPerRound: gameData.rounds.reduce((sum, r) => sum + r.pumps, 0) / gameData.rounds.length,
                    popRate: (gameData.totalPops / gameData.rounds.length * 100).toFixed(1) + '%',
                    averageDecisionTime: gameData.rounds.reduce((sum, r) => 
                        sum + (r.decisionTimes.reduce((s, t) => s + t, 0) / r.decisionTimes.length || 0), 0
                    ) / gameData.rounds.length,
                    behaviorChange: calculateRiskBehaviorChange()
                },
                exportTime: new Date().toISOString()
            };
            
            // Save to JSON_Data directory
            saveGameData(exportData, 'balloon_pump_game');
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `balloon_game_data_${Date.now()}.json`;
            link.click();
        }

        function exportCSV() {
            const headers = [
                'Round', 'Pumps', 'CashOutValue', 'Popped', 
                'AvgDecisionTime', 'BurstThreshold'
            ];
            
            let csvContent = headers.join(',') + '\n';
            
            gameData.rounds.forEach(round => {
                const avgDecisionTime = round.decisionTimes.reduce((sum, t) => sum + t, 0) / round.decisionTimes.length || 0;
                const row = [
                    round.roundNumber,
                    round.pumps,
                    round.cashOutValue,
                    round.popped,
                    avgDecisionTime.toFixed(0),
                    round.burstThreshold
                ];
                csvContent += row.join(',') + '\n';
            });
            
            const dataBlob = new Blob([csvContent], {type: 'text/csv'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `balloon_game_data_${Date.now()}.csv`;
            link.click();
        }

        function showAnalysis() {
            if (gameData.rounds.length === 0) {
                showMessage('No data to analyze yet!', 'info');
                return;
            }
            
            const totalRounds = gameData.rounds.length;
            const avgPumps = (gameData.rounds.reduce((sum, r) => sum + r.pumps, 0) / totalRounds).toFixed(1);
            const popRate = ((gameData.totalPops / totalRounds) * 100).toFixed(1);
            const avgDecisionTime = (gameData.rounds.reduce((sum, r) => 
                sum + (r.decisionTimes.reduce((s, t) => s + t, 0) / r.decisionTimes.length || 0), 0
            ) / totalRounds).toFixed(0);
            
            const analysis = `
📊 GAME ANALYSIS
📈 Total Rounds: ${totalRounds}
🎯 Average Pumps: ${avgPumps}
💥 Pop Rate: ${popRate}%
⏱️ Avg Decision Time: ${avgDecisionTime}ms
📉 Behavior Change: ${calculateRiskBehaviorChange()}
💰 Total Score: $${gameData.totalScore}
            `;
            
            alert(analysis);
        }

        function resetGame() {
            if (confirm('Are you sure you want to reset all game data?')) {
                gameData = {
                    rounds: [],
                    currentRound: 1,
                    totalScore: 0,
                    totalPops: 0,
                    gameStartTime: Date.now()
                };
                
                currentRoundData = {
                    roundNumber: 1,
                    pumps: 0,
                    cashOutValue: 0,
                    popped: false,
                    decisionTimes: [],
                    roundStartTime: Date.now(),
                    burstThreshold: generateBurstThreshold()
                };
                
                // Reset UI
                document.getElementById('currentRound').textContent = 1;
                document.getElementById('totalScore').textContent = 0;
                document.getElementById('totalPops').textContent = 0;
                document.getElementById('successRate').textContent = '0%';
                document.getElementById('pumpCount').textContent = 0;
                document.getElementById('currentReward').textContent = 0;
                document.getElementById('roundsCompleted').textContent = 0;
                
                const balloon = document.getElementById('balloon');
                balloon.classList.remove('popped');
                balloon.style.transform = 'scale(1)';
                
                document.getElementById('pumpBtn').disabled = false;
                document.getElementById('cashoutBtn').disabled = false;
                document.getElementById('nextGameBtn').style.display = 'none';
                
                showMessage('Game reset! Starting fresh.', 'info');
                startDecisionTimer();
            }
        }

        // Navigation function
        function proceedToNextGame() {
            // Save current game data before proceeding
            exportJSON();
            
            // Navigate to next game
            window.open('../Memory_Attention_Game/Memory_Attention_Game.html', '_blank');
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

            // Format data according to your schema for balloon game
            const formattedData = {
                balloon_pump_game: {
                    number_of_pumps_per_round: actualGameData.rounds.map(round => round.pumps),
                    cash_out_point_value: actualGameData.rounds.map(round => round.cashOutValue),
                    balloon_pop_count: actualGameData.totalPops || 0,
                    decision_time_seconds: actualGameData.rounds.map(round =>
                        round.decisionTimes.reduce((a, b) => a + b, 0) / 1000
                    ),
                    behavior_change_pattern: calculateBehaviorPattern(actualGameData.rounds)
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
                gameType: "Balloon Pump Game",
                gameData: actualGameData,
                formattedData: formattedData,
                analysis: data.analysis || {
                    totalRounds: actualGameData.rounds.length,
                    averagePumpsPerRound: actualGameData.rounds.reduce((sum, r) => sum + r.pumps, 0) / actualGameData.rounds.length,
                    popRate: (actualGameData.totalPops / actualGameData.rounds.length * 100).toFixed(1) + '%',
                    averageDecisionTime: actualGameData.rounds.reduce((sum, r) => 
                        sum + (r.decisionTimes.reduce((s, t) => s + t, 0) / r.decisionTimes.length || 0), 0
                    ) / actualGameData.rounds.length,
                    behaviorChange: calculateRiskBehaviorChange()
                },
                timestamp: new Date().toISOString(),
                userId: `user_${Date.now()}`, // Simple user identification
                gameVersion: "1.0"
            };
            
            // Call the existing saveToFirestore function
            console.log('Attempting to save to Firestore:', firestoreData);
            saveToFirestore(firestoreData, 'balloon_pump_game_results');
        }

        function calculateBehaviorPattern(rounds) {
            if (rounds.length < 3) return "insufficient_data";
            
            const early = rounds.slice(0, Math.floor(rounds.length / 2));
            const late = rounds.slice(Math.floor(rounds.length / 2));
            
            const earlyAvgPumps = early.reduce((sum, r) => sum + r.pumps, 0) / early.length;
            const lateAvgPumps = late.reduce((sum, r) => sum + r.pumps, 0) / late.length;
            
            if (lateAvgPumps > earlyAvgPumps * 1.2) return "increasingly_risky";
            if (lateAvgPumps < earlyAvgPumps * 0.8) return "increasingly_cautious";
            return "consistent";
        }
window.pump = pump;
window.cashOut = cashOut;
window.exportJSON = exportJSON;
window.exportCSV = exportCSV;
window.showAnalysis = showAnalysis;
window.resetGame = resetGame;
window.proceedToNextGame = proceedToNextGame;