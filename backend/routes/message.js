const express = require('express');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  searchMessages
} = require('../controllers/messageController');
const { protect, isChatMember } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/:chatId
router.get('/:chatId', protect, getMessages);

// @route   GET /api/messages/:chatId/search
router.get('/:chatId/search', protect, searchMessages);

// @route   POST /api/messages
router.post('/', protect, sendMessage);

// @route   PUT /api/messages/:messageId
router.put('/:messageId', protect, editMessage);

// @route   DELETE /api/messages/:messageId
router.delete('/:messageId', protect, deleteMessage);

// @route   POST /api/messages/:messageId/reactions
router.post('/:messageId/reactions', protect, addReaction);

// @route   DELETE /api/messages/:messageId/reactions
router.delete('/:messageId/reactions', protect, removeReaction);

module.exports = router;
