const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './config.env' });

const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../views'));

// Global middlewares
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Clear res.locals.user middleware
app.use((req, res, next) => {
  res.locals.user = null;
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const fileRoutes = require('./routes/files');
const dashboardRoutes = require('./routes/dashboard');

// Mount routes
app.use('/auth', authRoutes);
app.use('/leads', leadRoutes);
app.use('/files', fileRoutes);
app.use('/dashboard', dashboardRoutes);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.get('/', (req, res) => {
  res.redirect('/auth/home');
});

// Root route
app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

app.get('/register', (req, res) => {
  res.redirect('/auth/register');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// 404 handler

app.use((req, res) => {
  res.status(404).render('error/404', { message: 'Page not found' });

});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


module.exports = app;
