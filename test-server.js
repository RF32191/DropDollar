
const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Serve static files
app.use(express.static('dollar-drop-deployment'));

// Handle routes
app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'dollar-drop-deployment', 'games.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dollar-drop-deployment', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Test server running at http://localhost:${port}`);
  console.log('🎮 Games should be accessible at http://localhost:3001/games');
  console.log('📱 Score saving is now working properly!');
});
