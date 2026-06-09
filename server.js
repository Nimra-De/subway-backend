require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const Groq     = require('groq-sdk');

const app  = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// Chatbot Route (Groq - free, no region restrictions)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: 'No message provided.' });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a cheerful and helpful assistant for the Subway Surfers Tournament website. Answer questions about tournament schedules, how to sign up, player profiles, leaderboard standings, game rules, and prizes. Keep responses short (2-4 sentences) and enthusiastic! Use a gaming emoji occasionally.'
        },
        { role: 'user', content: message }
      ],
      max_tokens: 200
    });

    const reply = completion.choices[0].message.content;
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
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });