const express = require('express');
const {
  getChats,
  accessChat,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  leaveGroup,
  deleteChat,
  markChatAsRead
} = require('../controllers/chatController');
const { protect, isGroupAdmin, isChatMember } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chats
router.get('/', protect, getChats);

// @route   POST /api/chats
router.post('/', protect, accessChat);

// @route   POST /api/chats/group
router.post('/group', protect, createGroupChat);

// @route   PUT /api/chats/group/:chatId/rename
router.put('/group/:chatId/rename', protect, isGroupAdmin, renameGroup);

// @route   PUT /api/chats/group/:chatId/add
router.put('/group/:chatId/add', protect, isGroupAdmin, addToGroup);

// @route   PUT /api/chats/group/:chatId/remove
router.put('/group/:chatId/remove', protect, isGroupAdmin, removeFromGroup);

// @route   DELETE /api/chats/group/:chatId/leave
router.delete('/group/:chatId/leave', protect, leaveGroup);

// @route   DELETE /api/chats/:chatId
router.delete('/:chatId', protect, deleteChat);

// @route   PUT /api/chats/:chatId/read
router.put('/:chatId/read', protect, isChatMember, markChatAsRead);

module.exports = router;
