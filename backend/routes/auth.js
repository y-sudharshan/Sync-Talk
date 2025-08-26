const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required')
];

// @route   POST /api/auth/register
router.post('/register', registerValidation, registerUser);

// @route   POST /api/auth/login
router.post('/login', loginValidation, loginUser);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

// @route   POST /api/auth/logout
router.post('/logout', protect, logoutUser);

// @route   PUT /api/auth/profile
router.put('/profile', protect, updateProfile);

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, changePassword);

module.exports = router;
