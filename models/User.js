const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  age:        { type: Number },
  country:    { type: String, default: 'Unknown' },
  avatar:     { type: String, default: '' },
  role:       { type: String, enum: ['player', 'admin'], default: 'player' },
  highScore:  { type: Number, default: 0 },
  totalRuns:  { type: Number, default: 0 },
  wins:       { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
