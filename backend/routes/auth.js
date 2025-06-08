const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

// Login POST with JWT
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('auth/login', { error: 'Username and password are required' });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('auth/login', { error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.render('auth/login', { error: 'Account is disabled' });
    }

    // Create and set JWT in cookie
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'Server error occurred' });
  }
});

// Register page
router.get('/register', (req, res) => {
  res.render('auth/register', { error: null,  success: null  });
});

router.get('/home', (req, res) => {
  res.render('auth/home');
});
// Register POST

router.post('/register', async (req, res) => {
  try {
    const { username, email, password} = req.body;

    if (!username || !email || !password ) {
      return res.render('auth/register', { error: 'All fields are required', success: null });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('auth/register', { error: 'Username or email already exists' , success: null});
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.redirect('/auth/login');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('auth/register', { error: 'Server error occurred', success: null });
  }
});


// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/home');
});

// GET logout for convenience
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/home');
});

module.exports = router;