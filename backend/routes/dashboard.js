const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');
const router = express.Router();

// Dashboard Route
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let leads, totalLeads, newLeads, inProgressLeads, completedLeads;

    if (user.role === 'admin') {
      
      leads = await Lead.find()
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .limit(10);

      totalLeads = await Lead.countDocuments();
      newLeads = await Lead.countDocuments({ status: 'New' });
      inProgressLeads = await Lead.countDocuments({ status: 'In Progress' });
      completedLeads = await Lead.countDocuments({ status: 'Completed' });
    } else {
      leads = await Lead.find({ assignedTo: user._id })
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .limit(10);

      totalLeads = await Lead.countDocuments({ assignedTo: user._id });
      newLeads = await Lead.countDocuments({ assignedTo: user._id, status: 'New' });
      inProgressLeads = await Lead.countDocuments({ assignedTo: user._id, status: 'In Progress' });
      completedLeads = await Lead.countDocuments({ assignedTo: user._id, status: 'Completed' });
    }

    const stats = {
      totalLeads,
      newLeads,
      inProgressLeads,
      completedLeads,
      paidLeads: await Lead.countDocuments(
        user.role === 'admin' 
          ? { paymentStatus: 'Full' } 
          : { assignedTo: user._id, paymentStatus: 'Full' }
      ),
      partialPaidLeads: await Lead.countDocuments(
        user.role === 'admin' 
          ? { paymentStatus: 'Partial' } 
          : { assignedTo: user._id, paymentStatus: 'Partial' }
      )
    };

    res.render('auth/dashboard', {
      user,
      leads,
      stats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error/500', { message: 'Server error occurred' });
  }
});

// Dashboard logout

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});

module.exports = router;