const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const File = require('../models/File');
const verifyToken = require('../middleware/auth');
const router = express.Router();

// Helper function to check admin access
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access denied - Admin only');
  }
  next();
}

// Get all leads
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let leads;
    
    if (user.role === 'admin') {
      leads = await Lead.find()
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    } else {
      leads = await Lead.find({ assignedTo: user._id })
        .populate('assignedTo', 'username')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    }
    
    res.render('leads/list', { user, leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).render('error/500', { message: 'Server error occurred' });
  }
});

// Create lead form
router.get('/create', verifyToken, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }, 'username email');

    // Get enum values from Lead schema
    const visaTypes = Lead.schema.path('visaType').enumValues || [];
    const statuses = Lead.schema.path('status').enumValues || [];
    const paymentStatuses = Lead.schema.path('paymentStatus').enumValues || [];

    res.render('leads/create', { 
      user: req.user, 
      users, 
      visaTypes, 
      statuses, 
      paymentStatuses,
      error: null
    });
  } catch (error) {
    console.error('Create lead form error:', error);
    res.status(500).render('error/500', { message: 'Server error occurred' });
  }
});

// Create lead POST
router.post('/create', verifyToken, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user._id
    };

    const lead = new Lead(leadData);
    await lead.save();
    res.redirect('/leads');
  } catch (error) {
    console.error('Create lead error:', error);
    
    try {
      const users = await User.find({ isActive: true }, 'username email');
      const visaTypes = Lead.schema.path('visaType').enumValues || [];
      const statuses = Lead.schema.path('status').enumValues || [];
      const paymentStatuses = Lead.schema.path('paymentStatus').enumValues || [];
      
      res.render('leads/create', { 
        user: req.user, 
        users, 
        visaTypes,
        statuses,
        paymentStatuses,
        error: 'Error creating lead. Please check your input.' 
      });
    } catch (renderError) {
      console.error('Render error:', renderError);
      res.status(500).render('error/500', { message: 'Server error occurred' });
    }
  }
});

// Edit lead form
router.get('/edit/:id', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).render('error/404', { message: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).render('error/403', { message: 'Access denied' });
    }
    
    const users = await User.find({ isActive: true }, 'username email');
    const visaTypes = Lead.schema.path('visaType').enumValues || [];
    const statuses = Lead.schema.path('status').enumValues || [];
    const paymentStatuses = Lead.schema.path('paymentStatus').enumValues || [];
    
    res.render('leads/edit', { 
      user, 
      lead, 
      users, 
      visaTypes,
      statuses,
      paymentStatuses,
      error: null 
    });
  } catch (error) {
    console.error('Edit lead form error:', error);
    res.status(500).render('error/500', { message: 'Server error occurred' });
  }
});

// Update lead
router.post('/edit/:id', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).render('error/404', { message: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).render('error/403', { message: 'Access denied' });
    }
    
    await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.redirect('/leads');
  } catch (error) {
    console.error('Update lead error:', error);
    
    try {
      const users = await User.find({ isActive: true }, 'username email');
      const lead = await Lead.findById(req.params.id);
      const visaTypes = Lead.schema.path('visaType').enumValues || [];
      const statuses = Lead.schema.path('status').enumValues || [];
      const paymentStatuses = Lead.schema.path('paymentStatus').enumValues || [];
      
      res.render('leads/edit', { 
        user: req.user, 
        lead,
        users, 
        visaTypes,
        statuses,
        paymentStatuses,
        error: 'Error updating lead. Please check your input.' 
      });
    } catch (renderError) {
      console.error('Render error:', renderError);
      res.status(500).render('error/500', { message: 'Server error occurred' });
    }
  }
});

// Delete lead (Admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Delete associated files
    const files = await File.find({ leadId: req.params.id });
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    await File.deleteMany({ leadId: req.params.id });
    
    // Delete the lead
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// View lead details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .populate('notes.createdBy', 'username');
    
    if (!lead) {
      return res.status(404).render('error/404', { message: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo && lead.assignedTo._id.toString() !== user._id.toString()) {
      return res.status(403).render('error/403', { message: 'Access denied' });
    }
    
    const files = await File.find({ leadId: req.params.id })
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.render('leads/view', { user, lead, files });
  } catch (error) {
    console.error('View lead error:', error);
    res.status(500).render('error/500', { message: 'Server error occurred' });
  }
});

// Add note to lead
router.post('/:id/notes', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.body.content || req.body.content.trim() === '') {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    lead.notes.push({
      content: req.body.content.trim(),
      createdBy: user._id,
      createdAt: new Date()
    });
    
    await lead.save();
    res.json({ success: true, message: 'Note added successfully' });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lead statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let filter = {};
    
    if (user.role !== 'admin') {
      filter.assignedTo = user._id;
    }
    
    const stats = {
      total: await Lead.countDocuments(filter),
      new: await Lead.countDocuments({ ...filter, status: 'New' }),
      inProgress: await Lead.countDocuments({ ...filter, status: 'In Progress' }),
      completed: await Lead.countDocuments({ ...filter, status: 'Completed' }),
      paid: await Lead.countDocuments({ ...filter, paymentStatus: 'Full' }),
      partial: await Lead.countDocuments({ ...filter, paymentStatus: 'Partial' }),
      pending: await Lead.countDocuments({ ...filter, paymentStatus: 'Pending' })
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;