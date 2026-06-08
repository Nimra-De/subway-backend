const express = require('express');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/players  — list all players (public) ────────────
router.get('/', async (req, res) => {
  try {
    const { search, country, page = 1, limit = 20 } = req.query;
    const query = { role: 'player' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } }
      ];
    }
    if (country) query.country = country;

    const skip = (Number(page) - 1) * Number(limit);
    const [players, total] = await Promise.all([
      User.find(query)
          .select('-password -email')
          .sort({ highScore: -1 })
          .skip(skip)
          .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({ players, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/players/:id  (public) ───────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const player = await User.findById(req.params.id).select('-password -email');
    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json({ player });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/players/score  — submit a new score (logged in) ─
router.post('/score', protect, async (req, res) => {
  try {
    const { score } = req.body;
    if (!score || isNaN(score)) {
      return res.status(400).json({ message: 'Valid score is required' });
    }

    const user = req.user;
    const updates = { $inc: { totalRuns: 1 } };
    if (score > user.highScore) updates.$set = { highScore: score };

    const updated = await User.findByIdAndUpdate(user._id, updates, { new: true }).select('-password');
    res.json({ message: 'Score submitted', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/players/:id  (admin only) ────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Player deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
