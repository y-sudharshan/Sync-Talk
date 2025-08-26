const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
  try {
    const chats = await Chat.findUserChats(req.user._id);

    // Process chats to add display names and unread counts
    const processedChats = await Promise.all(
      chats.map(async (chat) => {
        const chatObject = chat.toObject();

        // Set display name for one-on-one chats
        if (!chat.isGroupChat) {
          const otherUser = chat.users.find(user => user._id.toString() !== req.user._id.toString());
          chatObject.displayName = otherUser ? otherUser.name : 'Unknown User';
          chatObject.chatAvatar = otherUser ? otherUser.avatar : '';
        } else {
          chatObject.displayName = chat.chatName;
          chatObject.chatAvatar = chat.groupAvatar;
        }

        // Get unread count for current user
        const unreadItem = chat.unreadCount.find(item => item.user.toString() === req.user._id.toString());
        chatObject.unreadCount = unreadItem ? unreadItem.count : 0;

        // Get typing users (exclude current user)
        chat.cleanOldTypingIndicators();
        const typingUsers = chat.typingUsers
          .filter(item => item.user.toString() !== req.user._id.toString())
          .map(item => item.user);
        chatObject.typingUsers = typingUsers;

        return chatObject;
      })
    );

    res.json({
      success: true,
      data: processedChats
    });
  } catch (error) {
    console.error('Get chats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chats'
    });
  }
};

// @desc    Create or access one-on-one chat
// @route   POST /api/chats
// @access  Private
const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId parameter is required'
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find or create one-on-one chat
    const chat = await Chat.findOrCreateOneOnOneChat(req.user._id, userId);

    // Populate the latest message
    await chat.populate('latestMessage');

    // Set display name
    const chatObject = chat.toObject();
    const otherUser = chat.users.find(user => user._id.toString() !== req.user._id.toString());
    chatObject.displayName = otherUser.name;
    chatObject.chatAvatar = otherUser.avatar;

    // Get unread count
    const unreadItem = chat.unreadCount.find(item => item.user.toString() === req.user._id.toString());
    chatObject.unreadCount = unreadItem ? unreadItem.count : 0;

    res.json({
      success: true,
      message: 'Chat accessed successfully',
      data: chatObject
    });
  } catch (error) {
    console.error('Access chat error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while accessing chat'
    });
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
  try {
    const { users, chatName, groupDescription } = req.body;

    if (!users || !Array.isArray(users) || users.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Group chat must have at least 2 other users'
      });
    }

    if (!chatName || chatName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group chat name is required'
      });
    }

    // Validate all user IDs
    const validUsers = await User.find({ _id: { $in: users } });
    if (validUsers.length !== users.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more user IDs are invalid'
      });
    }

    // Add current user to the group
    const allUsers = [req.user._id, ...users];

    // Remove duplicates
    const uniqueUsers = [...new Set(allUsers.map(id => id.toString()))];

    const groupChat = await Chat.create({
      chatName: chatName.trim(),
      users: uniqueUsers,
      isGroupChat: true,
      groupAdmin: req.user._id,
      groupDescription: groupDescription ? groupDescription.trim() : '',
      groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName.trim())}&background=random&size=200`,
      unreadCount: uniqueUsers.map(userId => ({ user: userId, count: 0 }))
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password -socketId')
      .populate('groupAdmin', '-password -socketId');

    res.status(201).json({
      success: true,
      message: 'Group chat created successfully',
      data: fullGroupChat
    });
  } catch (error) {
    console.error('Create group chat error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while creating group chat'
    });
  }
};

// @desc    Rename group chat
// @route   PUT /api/chats/group/:chatId/rename
// @access  Private
const renameGroup = async (req, res) => {
  try {
    const { chatName } = req.body;

    if (!chatName || chatName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group chat name is required'
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { chatName: chatName.trim() },
      { new: true }
    )
      .populate('users', '-password -socketId')
      .populate('groupAdmin', '-password -socketId');

    if (!updatedChat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      message: 'Group chat renamed successfully',
      data: updatedChat
    });
  } catch (error) {
    console.error('Rename group error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while renaming group'
    });
  }
};

// @desc    Add user to group chat
// @route   PUT /api/chats/group/:chatId/add
// @access  Private
const addToGroup = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already in the group
    if (req.chat.users.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already in the group'
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      {
        $push: { 
          users: userId,
          unreadCount: { user: userId, count: 0 }
        }
      },
      { new: true }
    )
      .populate('users', '-password -socketId')
      .populate('groupAdmin', '-password -socketId');

    res.json({
      success: true,
      message: 'User added to group successfully',
      data: updatedChat
    });
  } catch (error) {
    console.error('Add to group error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while adding user to group'
    });
  }
};

// @desc    Remove user from group chat
// @route   PUT /api/chats/group/:chatId/remove
// @access  Private
const removeFromGroup = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is in the group
    if (!req.chat.users.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not in the group'
      });
    }

    // Don't allow removing the group admin
    if (req.chat.groupAdmin.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove group admin. Transfer admin rights first.'
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      req.params.chatId,
      {
        $pull: { 
          users: userId,
          unreadCount: { user: userId }
        }
      },
      { new: true }
    )
      .populate('users', '-password -socketId')
      .populate('groupAdmin', '-password -socketId');

    res.json({
      success: true,
      message: 'User removed from group successfully',
      data: updatedChat
    });
  } catch (error) {
    console.error('Remove from group error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while removing user from group'
    });
  }
};

// @desc    Leave group chat
// @route   DELETE /api/chats/group/:chatId/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
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

    // Check if user is in the group
    if (!chat.users.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // If user is admin, transfer admin rights to another user
    if (chat.groupAdmin.toString() === req.user._id.toString()) {
      const otherUsers = chat.users.filter(userId => userId.toString() !== req.user._id.toString());
      
      if (otherUsers.length > 0) {
        chat.groupAdmin = otherUsers[0]; // Transfer to first available user
      } else {
        // If no other users, delete the group
        await Chat.findByIdAndDelete(chat._id);
        return res.json({
          success: true,
          message: 'Group deleted as you were the last member'
        });
      }
    }

    // Remove user from group
    chat.users = chat.users.filter(userId => userId.toString() !== req.user._id.toString());
    chat.unreadCount = chat.unreadCount.filter(item => item.user.toString() !== req.user._id.toString());
    
    await chat.save();

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while leaving group'
    });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:chatId
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is member of the chat
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this chat'
      });
    }

    // For group chats, only admin can delete
    if (chat.isGroupChat && chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can delete the group'
      });
    }

    // Delete all messages in this chat
    await Message.deleteMany({ chat: chat._id });

    // Delete the chat
    await Chat.findByIdAndDelete(chat._id);

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting chat'
    });
  }
};

// @desc    Mark chat as read
// @route   PUT /api/chats/:chatId/read
// @access  Private
const markChatAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is member of the chat
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Reset unread count for current user
    chat.resetUnreadCount(req.user._id);
    await chat.save();

    res.json({
      success: true,
      message: 'Chat marked as read'
    });
  } catch (error) {
    console.error('Mark chat as read error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while marking chat as read'
    });
  }
};

module.exports = {
  getChats,
  accessChat,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  leaveGroup,
  deleteChat,
  markChatAsRead
};
