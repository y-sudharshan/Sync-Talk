const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      let message = 'Not authorized, token failed';
      if (error.name === 'TokenExpiredError') {
        message = 'Not authorized, token expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Not authorized, invalid token';
      }

      return res.status(401).json({
        success: false,
        message
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

// Middleware to check if user is admin of a group chat
const isGroupAdmin = async (req, res, next) => {
  try {
    const Chat = require('../models/Chat');
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can perform this action'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Group admin check error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authorization check'
    });
  }
};

// Middleware to check if user is member of a chat
const isChatMember = async (req, res, next) => {
  try {
    const Chat = require('../models/Chat');
    const chatId = req.params.chatId || req.body.chat;
    
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isMember = chat.users.some(user => user.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error('Chat member check error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authorization check'
    });
  }
};

module.exports = { protect, isGroupAdmin, isChatMember };
