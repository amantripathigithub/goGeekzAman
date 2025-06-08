const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Lead = require('../models/Lead');
const File = require('../models/File');
const verifyToken = require('../middleware/auth');
const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join('uploads', req.params.leadId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  }
});

// Upload file
router.post('/upload/:leadId', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      leadId: req.params.leadId,
      uploadedBy: user._id,
      description: req.body.description || ''
    });
    
    await file.save();
    res.json({ success: true, message: 'File uploaded successfully', file });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Download file
router.get('/download/:fileId', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const file = await File.findById(req.params.fileId).populate({
      path: 'leadId',
      select: 'assignedTo'
    });
    
    if (!file) {
      return res.status(404).send('File not found');
    }
    
    // Check access
    if (user.role !== 'admin' && file.leadId.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).send('Access denied');
    }
    
    if (!fs.existsSync(file.path)) {
      return res.status(404).send('File not found on server');
    }
    
    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).send('Server error');
  }
});

// Delete file
router.delete('/:fileId', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const file = await File.findById(req.params.fileId).populate({
      path: 'leadId',
      select: 'assignedTo'
    });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && file.leadId.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete file from filesystem
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    await File.findByIdAndDelete(req.params.fileId);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get files for a lead
router.get('/lead/:leadId', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Check access
    if (user.role !== 'admin' && lead.assignedTo.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const files = await File.find({ leadId: req.params.leadId })
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;