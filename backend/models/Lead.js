const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  visaType: {
    type: String,
    required: true,
    enum: ['Tourist', 'Student', 'Work', 'Family', 'Business', 'Other']
  },
  status: {
    type: String,
    enum: ['New', 'In Progress', 'Documents Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'New'
  },
  paymentStatus: {
    type: String,
    enum: ['Not Paid', 'Partial', 'Full'],
    default: 'Not Paid'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
