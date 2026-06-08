const express    = require('express');
const Tournament = require('../models/Tournament');
const User       = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/tournaments  — list all (public) ────────────────
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const tournaments = await Tournament.find(query)
      .populate('winner', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });

    res.json({ tournaments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/tournaments/:id  (public) ───────────────────────
router.get('/:id', async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id)
      .populate('players', 'firstName lastName country highScore avatar')
      .populate('winner', 'firstName lastName')
      .populate('matches.player1', 'firstName lastName')
      .populate('matches.player2', 'firstName lastName')
      .populate('matches.winner', 'firstName lastName');

    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    res.json({ tournament: t });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/tournaments  — create (admin only) ─────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, startDate, endDate, prizePool, maxPlayers } = req.body;
    if (!name || !startDate) {
      return res.status(400).json({ message: 'Name and start date are required' });
    }

    const tournament = await Tournament.create({
      name, description, startDate, endDate,
      prizePool: prizePool || 0,
      maxPlayers: maxPlayers || 32,
      createdBy: req.user._id
    });

    res.status(201).json({ message: 'Tournament created', tournament });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/tournaments/:id/join  — player joins ───────────
router.post('/:id/join', protect, async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    if (t.status !== 'upcoming') {
      return res.status(400).json({ message: 'Tournament is no longer open for registration' });
    }
    if (t.players.length >= t.maxPlayers) {
      return res.status(400).json({ message: 'Tournament is full' });
    }
    if (t.players.includes(req.user._id)) {
      return res.status(409).json({ message: 'Already registered' });
    }

    t.players.push(req.user._id);
    await t.save();

    res.json({ message: 'Joined tournament successfully', playerCount: t.players.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/tournaments/:id/status  — change status (admin) ─
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['upcoming', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const t = await Tournament.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ message: 'Status updated', tournament: t });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/tournaments/:id/result  — record match result (admin) ─
router.post('/:id/result', protect, adminOnly, async (req, res) => {
  try {
    const { player1Id, player2Id, score1, score2, round } = req.body;
    const winnerId = score1 > score2 ? player1Id : player2Id;

    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    t.matches.push({
      player1: player1Id,
      player2: player2Id,
      score1, score2,
      winner: winnerId,
      round: round || 1,
      playedAt: new Date()
    });

    await t.save();

    // Increment winner's wins
    await User.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });

    res.json({ message: 'Match result recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/tournaments/:id/winner  — set final winner (admin) ─
router.put('/:id/winner', protect, adminOnly, async (req, res) => {
  try {
    const { winnerId } = req.body;
    const t = await Tournament.findByIdAndUpdate(
      req.params.id,
      { winner: winnerId, status: 'completed' },
      { new: true }
    ).populate('winner', 'firstName lastName');

    await User.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });

    res.json({ message: 'Tournament completed', tournament: t });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ── DELETE /api/tournaments/:id  — delete tournament (admin) ─
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const t = await Tournament.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    res.json({ message: 'Tournament deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

// ── DELETE /api/tournaments/:id  — delete tournament (admin) ─
// Note: module.exports stays at the end of the original file.
// Append this route before the existing export by replacing the last line.
