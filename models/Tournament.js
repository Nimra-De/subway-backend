const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  player1:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  player2:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  winner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  score1:    { type: Number, default: 0 },
  score2:    { type: Number, default: 0 },
  round:     { type: Number, default: 1 },
  playedAt:  { type: Date }
});

const tournamentSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date },
  status:      { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  prizePool:   { type: Number, default: 0 },
  maxPlayers:  { type: Number, default: 32 },
  players:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  matches:     [matchSchema],
  winner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
