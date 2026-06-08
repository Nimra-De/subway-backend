const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  player:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score:       { type: Number, required: true },
  distance:    { type: Number, default: 0 },
  coinsCollected: { type: Number, default: 0 },
  tournament:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', scoreSchema);
