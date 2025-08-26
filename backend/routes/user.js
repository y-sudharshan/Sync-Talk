const express = require('express');
const {
  getUsers,
  searchUsers,
  getUserById,
  getOnlineUsers,
  updateUserStatus,
  toggleBlockUser,
  getBlockedUsers
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
router.get('/', protect, getUsers);

// @route   GET /api/users/search
router.get('/search', protect, searchUsers);

// @route   GET /api/users/online
router.get('/online', protect, getOnlineUsers);

// @route   GET /api/users/blocked
router.get('/blocked', protect, getBlockedUsers);

// @route   PUT /api/users/status
router.put('/status', protect, updateUserStatus);

// @route   PUT /api/users/:id/block
router.put('/:id/block', protect, toggleBlockUser);

// @route   GET /api/users/:id
router.get('/:id', protect, getUserById);

module.exports = router;
