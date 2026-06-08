const express      = require('express');
const Registration = require('../models/Registration');
const Tournament   = require('../models/Tournament');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ── Helper: simulate payment processing ──────────────────────
function simulatePayment(method, amount) {
  if (!method || method === 'Free' || amount === 0) {
    return { status: 'Paid', transactionId: 'FREE-' + Date.now() };
  }
  // Simulate success for all mock gateways
  const prefixes = {
    JazzCash:  'JC',
    EasyPaisa: 'EP',
    Stripe:    'STR',
    PayPal:    'PP',
    USDT:      'USDT',
    Bitcoin:   'BTC',
    Ethereum:  'ETH'
  };
  const prefix = prefixes[method] || 'TX';
  const txId = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return { status: 'Paid', transactionId: txId };
}

// ════════════════════════════════════════════════════════════
//  CREATE  —  POST /api/registrations
//  Body: { tournamentId, paymentMethod }
// ════════════════════════════════════════════════════════════
router.post('/', protect, async (req, res) => {
  try {
    const { tournamentId, paymentMethod } = req.body;

    if (!tournamentId) {
      return res.status(400).json({ message: 'tournamentId is required' });
    }

    // Check tournament exists and is open
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ message: 'Tournament is not open for registration' });
    }
    if (tournament.players.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: 'Tournament is full' });
    }

    // Check duplicate
    const exists = await Registration.findOne({
      user: req.user._id,
      tournament: tournamentId
    });
    if (exists) {
      return res.status(409).json({ message: 'You are already registered for this tournament' });
    }

    // Determine registration fee
    const fee = tournament.prizePool > 0 ? 5 : 0;   // $5 entry fee if prize pool exists

    // Simulate payment
    const payment = simulatePayment(paymentMethod || 'Free', fee);

    // Create registration record
    const registration = await Registration.create({
      user:           req.user._id,
      tournament:     tournamentId,
      playerName:     `${req.user.firstName} ${req.user.lastName}`,
      email:          req.user.email,
      country:        req.user.country || 'Unknown',
      status:         'confirmed',
      paymentMethod:  fee === 0 ? 'Free' : (paymentMethod || 'Free'),
      paymentStatus:  payment.status,
      paymentAmount:  fee,
      transactionId:  payment.transactionId
    });

    // Also add player to tournament.players array (keep in sync)
    if (!tournament.players.includes(req.user._id)) {
      tournament.players.push(req.user._id);
      await tournament.save();
    }

    const populated = await Registration.findById(registration._id)
      .populate('user',       'firstName lastName email country')
      .populate('tournament', 'name startDate status prizePool');

    res.status(201).json({
      message: 'Registration successful',
      registration: populated,
      paymentSimulation: {
        method:        registration.paymentMethod,
        status:        registration.paymentStatus,
        amount:        registration.paymentAmount,
        transactionId: registration.transactionId
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Already registered for this tournament' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  READ ALL  —  GET /api/registrations
//  Admin sees all; player sees only their own
//  Query: ?tournamentId=  ?status=  ?userId=  (admin only)
// ════════════════════════════════════════════════════════════
router.get('/', protect, async (req, res) => {
  try {
    const { tournamentId, status, userId } = req.query;
    const filter = {};

    // Non-admins can only see their own registrations
    if (req.user.role !== 'admin') {
      filter.user = req.user._id;
    } else {
      if (userId)       filter.user       = userId;
    }

    if (tournamentId) filter.tournament = tournamentId;
    if (status)       filter.status     = status;

    const registrations = await Registration.find(filter)
      .populate('user',       'firstName lastName email country avatar')
      .populate('tournament', 'name startDate endDate status prizePool')
      .sort({ registeredAt: -1 });

    res.json({ count: registrations.length, registrations });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  READ ONE  —  GET /api/registrations/:id
// ════════════════════════════════════════════════════════════
router.get('/:id', protect, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id)
      .populate('user',       'firstName lastName email country avatar')
      .populate('tournament', 'name startDate endDate status prizePool maxPlayers');

    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    // Only owner or admin can view
    if (req.user.role !== 'admin' && reg.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ registration: reg });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  UPDATE  —  PUT /api/registrations/:id
//  Player can update paymentMethod (re-pay).
//  Admin can update status, paymentStatus.
// ════════════════════════════════════════════════════════════
router.put('/:id', protect, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    // Only owner or admin
    if (req.user.role !== 'admin' && reg.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { paymentMethod, status, paymentStatus, playerName, country } = req.body;

    if (req.user.role === 'admin') {
      // Admin can change status and payment status
      if (status       && ['pending','confirmed','cancelled'].includes(status))  reg.status = status;
      if (paymentStatus && ['Unpaid','Pending','Paid','Refunded'].includes(paymentStatus)) reg.paymentStatus = paymentStatus;
    }

    // Player (or admin) can update these
    if (paymentMethod && ['JazzCash','EasyPaisa','Stripe','PayPal','USDT','Bitcoin','Ethereum','Free'].includes(paymentMethod)) {
      const payment = simulatePayment(paymentMethod, reg.paymentAmount);
      reg.paymentMethod  = paymentMethod;
      reg.paymentStatus  = payment.status;
      reg.transactionId  = payment.transactionId;
    }
    if (playerName) reg.playerName = playerName;
    if (country)    reg.country    = country;

    await reg.save();

    const updated = await Registration.findById(reg._id)
      .populate('user',       'firstName lastName email')
      .populate('tournament', 'name startDate status');

    res.json({ message: 'Registration updated', registration: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  DELETE  —  DELETE /api/registrations/:id
//  Player can cancel own; Admin can delete any
// ════════════════════════════════════════════════════════════
router.delete('/:id', protect, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    // Only owner or admin
    if (req.user.role !== 'admin' && reg.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove player from tournament.players array too
    await Tournament.findByIdAndUpdate(
      reg.tournament,
      { $pull: { players: reg.user } }
    );

    await Registration.findByIdAndDelete(req.params.id);

    res.json({ message: 'Registration deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ADMIN: GET /api/registrations/stats/summary
//  Summary stats for admin panel
// ════════════════════════════════════════════════════════════
router.get('/stats/summary', protect, adminOnly, async (req, res) => {
  try {
    const [total, confirmed, pending, cancelled, paid, revenue] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'confirmed' }),
      Registration.countDocuments({ status: 'pending' }),
      Registration.countDocuments({ status: 'cancelled' }),
      Registration.countDocuments({ paymentStatus: 'Paid' }),
      Registration.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
      ])
    ]);

    res.json({
      total, confirmed, pending, cancelled, paid,
      totalRevenue: revenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
