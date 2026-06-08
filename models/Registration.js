const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  // Who is registering
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Which tournament
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },

  // Player details at time of registration
  playerName: { type: String, required: true, trim: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  country:    { type: String, default: 'Unknown' },

  // Registration status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },

  // ── Payment ─────────────────────────────────────────────────
  paymentMethod: {
    type: String,
    enum: ['JazzCash', 'EasyPaisa', 'Stripe', 'PayPal', 'USDT', 'Bitcoin', 'Ethereum', 'Free'],
    default: 'Free'
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Pending', 'Paid', 'Refunded'],
    default: 'Unpaid'
  },
  paymentAmount: { type: Number, default: 0 },        // fee in USD
  transactionId: { type: String, default: '' },        // mock tx ID

  // Timestamps
  registeredAt: { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

// Ensure one registration per user per tournament
registrationSchema.index({ user: 1, tournament: 1 }, { unique: true });

// Auto-update updatedAt on save
registrationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);
