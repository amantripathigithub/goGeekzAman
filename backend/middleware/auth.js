const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
module.exports = async function verifyToken(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.redirect('/auth/login');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    
    if (!user.isActive) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    
    req.user = user;
    res.locals.user = user; // Make user available in templates
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};