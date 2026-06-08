require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app   = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/players',       require('./routes/players'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/tournaments',   require('./routes/tournaments'));
app.use('/api/registrations', require('./routes/registrations'));

// Chatbot Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: 'No message provided.' });

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: 'You are a helpful assistant for a Subway Surfers tournament website. Answer questions about tournaments, scores, and gameplay. Keep responses short and enthusiastic!'
    });

    const result = await model.generateContent(message);
    const reply  = result.response.text();
    res.json({ reply });

  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.status(500).json({ reply: 'Sorry, the bot is unavailable right now.' });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database + Start
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(' MongoDB connected');
    app.listen(PORT, () => console.log(`?? Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
