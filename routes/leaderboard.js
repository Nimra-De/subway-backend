const express = require('express');
const User    = require('../models/User');
const Score   = require('../models/Score');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/leaderboard  — global top players ───────────────
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const players = await User.find({ role: 'player' })
      .select('firstName lastName country highScore totalRuns wins avatar')
      .sort({ highScore: -1 })
      .limit(Number(limit));

    // Add rank number
    const ranked = players.map((p, i) => ({
      rank: i + 1,
      id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      country: p.country,
      highScore: p.highScore,
      totalRuns: p.totalRuns,
      wins: p.wins,
      avatar: p.avatar
    }));

    res.json({ leaderboard: ranked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/leaderboard/submit  — submit a run score ───────
router.post('/submit', protect, async (req, res) => {
  try {
    const { score, distance, coinsCollected, tournamentId } = req.body;

    if (!score || isNaN(score)) {
      return res.status(400).json({ message: 'Valid score is required' });
    }

    // Save score entry
    const entry = await Score.create({
      player: req.user._id,
      score,
      distance: distance || 0,
      coinsCollected: coinsCollected || 0,
      tournament: tournamentId || null
    });

    // Update user's highScore if beaten
    if (score > req.user.highScore) {
      await User.findByIdAndUpdate(req.user._id, {
        highScore: score,
        $inc: { totalRuns: 1 }
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $inc: { totalRuns: 1 } });
    }

    res.status(201).json({ message: 'Score submitted', entry });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/leaderboard/my-scores  — personal history ───────
router.get('/my-scores', protect, async (req, res) => {
  try {
    const scores = await Score.find({ player: req.user._id })
      .sort({ score: -1 })
      .limit(20);
    res.json({ scores });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
