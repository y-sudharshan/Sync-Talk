const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chatId = req.params.chatId;

    // Check if chat exists and user is member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Get messages with pagination
    const messages = await Message.getChatMessages(chatId, parseInt(page), parseInt(limit));

    // Reverse to show oldest first (since we sorted by createdAt: -1 for pagination)
    const sortedMessages = messages.reverse();

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({ 
      chat: chatId, 
      isDeleted: false 
    });

    res.json({
      success: true,
      data: {
        messages: sortedMessages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(totalMessages / parseInt(limit)),
          total: totalMessages,
          hasMore: parseInt(page) * parseInt(limit) < totalMessages
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content, chatId, messageType = 'text', replyTo } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    if (!content && messageType === 'text') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Check if chat exists and user is member
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Validate reply message if replyTo is provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reply message'
        });
      }
    }

    // Create message
    const messageData = {
      sender: req.user._id,
      content: content?.trim(),
      chat: chatId,
      messageType,
      replyTo: replyTo || undefined
    };

    const message = await Message.create(messageData);

    // Populate message with sender and reply info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar email')
      .populate('replyTo', 'content sender')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name avatar' }
      });

    // Update chat's latest message and unread counts
    chat.latestMessage = message._id;
    chat.incrementUnreadCount(req.user._id);
    chat.removeTypingUser(req.user._id); // Remove typing indicator
    await chat.save();

    // Emit real-time message through Socket.io (will be handled in socket configuration)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Send to all chat members except sender
      chat.users.forEach(userId => {
        if (userId.toString() !== req.user._id.toString()) {
          io.to(userId.toString()).emit('message_received', {
            message: populatedMessage,
            chatId: chatId
          });
        }
      });

      // Update chat list for all members
      io.to(chatId).emit('chat_updated', {
        chatId: chatId,
        latestMessage: populatedMessage
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:messageId
// @access  Private
const editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.messageId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await Message.findById(messageId)
      .populate('sender', 'name avatar email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Check if message is not too old (e.g., 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < twentyFourHoursAgo) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit messages older than 24 hours'
      });
    }

    // Edit the message
    message.editContent(content.trim());
    await message.save();

    // Emit real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.chat.toString()).emit('message_edited', {
        messageId: message._id,
        newContent: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt
      });
    }

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });
  } catch (error) {
    console.error('Edit message error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while editing message'
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender or admin of group chat
    let canDelete = message.sender.toString() === req.user._id.toString();

    if (!canDelete) {
      // Check if user is admin of group chat
      const chat = await Chat.findById(message.chat);
      if (chat && chat.isGroupChat && chat.groupAdmin.toString() === req.user._id.toString()) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages or as group admin'
      });
    }

    // Soft delete the message
    message.softDelete(req.user._id);
    await message.save();

    // Update chat's latest message if this was the latest
    const chat = await Chat.findById(message.chat);
    if (chat.latestMessage && chat.latestMessage.toString() === messageId) {
      // Find the most recent non-deleted message
      const latestMessage = await Message.findOne({
        chat: message.chat,
        isDeleted: false
      }).sort({ createdAt: -1 });

      chat.latestMessage = latestMessage ? latestMessage._id : null;
      await chat.save();
    }

    // Emit real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.chat.toString()).emit('message_deleted', {
        messageId: message._id,
        chatId: message.chat
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/:messageId/reactions
// @access  Private
const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is member of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Add reaction
    message.addReaction(req.user._id, emoji);
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('reactions.user', 'name avatar');

    // Emit real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.chat.toString()).emit('reaction_added', {
        messageId: message._id,
        reactions: updatedMessage.reactions
      });
    }

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Add reaction error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reaction'
    });
  }
};

// @desc    Remove reaction from message
// @route   DELETE /api/messages/:messageId/reactions
// @access  Private
const removeReaction = async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove reaction
    message.removeReaction(req.user._id);
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('reactions.user', 'name avatar');

    // Emit real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.chat.toString()).emit('reaction_removed', {
        messageId: message._id,
        reactions: updatedMessage.reactions
      });
    }

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Remove reaction error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while removing reaction'
    });
  }
};

// @desc    Search messages in a chat
// @route   GET /api/messages/:chatId/search
// @access  Private
const searchMessages = async (req, res) => {
  try {
    const { q: query } = req.query;
    const chatId = req.params.chatId;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Check if user is member of the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    const messages = await Message.searchInChat(chatId, query.trim());

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Search messages error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching messages'
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  searchMessages
};
