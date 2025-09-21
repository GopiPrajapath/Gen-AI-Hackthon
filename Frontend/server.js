const express = require('express');
require('dotenv').config();

const app = express();
const port = 3000;

app.get('/firebase-config', (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.VITE_API_KEY,
    authDomain: process.env.VITE_AUTH_DOMAIN,
    projectId: process.env.VITE_PROJECT_ID,
    storageBucket: process.env.VITE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_APP_ID,
    measurementId: process.env.VITE_MEASUREMENT_ID
  };
  res.json(firebaseConfig);
});

app.use(express.static('public')); // This serves your HTML file

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});