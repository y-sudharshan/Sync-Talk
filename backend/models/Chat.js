const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatName: {
    type: String,
    trim: true,
    maxlength: [100, 'Chat name cannot be more than 100 characters']
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupDescription: {
    type: String,
    maxlength: [500, 'Group description cannot be more than 500 characters']
  },
  groupAvatar: {
    type: String,
    default: ''
  },
  // For tracking unread messages per user
  unreadCount: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    },
    lastRead: {
      type: Date,
      default: Date.now
    }
  }],
  // For tracking typing indicators
  typingUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ users: 1 });
chatSchema.index({ latestMessage: 1 });
chatSchema.index({ isGroupChat: 1 });
chatSchema.index({ 'unreadCount.user': 1 });

// Virtual for getting chat display name
chatSchema.virtual('displayName').get(function() {
  if (this.isGroupChat) {
    return this.chatName;
  }
  // For one-on-one chats, we'll set the display name in the controller
  return this.chatName || 'Private Chat';
});

// Static method to find user's chats
chatSchema.statics.findUserChats = function(userId) {
  return this.find({ users: { $elemMatch: { $eq: userId } } })
    .populate('users', '-password -socketId')
    .populate('latestMessage')
    .populate('groupAdmin', '-password -socketId')
    .sort({ updatedAt: -1 });
};

// Static method to find or create one-on-one chat
chatSchema.statics.findOrCreateOneOnOneChat = async function(userId1, userId2) {
  // Check if chat already exists
  let chat = await this.findOne({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: userId1 } } },
      { users: { $elemMatch: { $eq: userId2 } } }
    ]
  }).populate('users', '-password -socketId');

  if (chat) {
    return chat;
  }

  // Create new chat
  const newChat = await this.create({
    chatName: 'Private Chat',
    isGroupChat: false,
    users: [userId1, userId2],
    unreadCount: [
      { user: userId1, count: 0 },
      { user: userId2, count: 0 }
    ]
  });

  return await this.findById(newChat._id).populate('users', '-password -socketId');
};

// Instance method to add user to unread count tracking
chatSchema.methods.initializeUnreadCount = function(userId) {
  const existingUnread = this.unreadCount.find(item => item.user.toString() === userId.toString());
  if (!existingUnread) {
    this.unreadCount.push({ user: userId, count: 0 });
  }
};

// Instance method to increment unread count for users
chatSchema.methods.incrementUnreadCount = function(excludeUserId) {
  this.unreadCount.forEach(item => {
    if (item.user.toString() !== excludeUserId.toString()) {
      item.count += 1;
    }
  });
};

// Instance method to reset unread count for a user
chatSchema.methods.resetUnreadCount = function(userId) {
  const unreadItem = this.unreadCount.find(item => item.user.toString() === userId.toString());
  if (unreadItem) {
    unreadItem.count = 0;
    unreadItem.lastRead = new Date();
  }
};

// Instance method to add typing user
chatSchema.methods.addTypingUser = function(userId) {
  // Remove user if already typing (to reset timestamp)
  this.typingUsers = this.typingUsers.filter(item => item.user.toString() !== userId.toString());
  // Add user as typing
  this.typingUsers.push({ user: userId, timestamp: new Date() });
};

// Instance method to remove typing user
chatSchema.methods.removeTypingUser = function(userId) {
  this.typingUsers = this.typingUsers.filter(item => item.user.toString() !== userId.toString());
};

// Instance method to clean old typing indicators (older than 5 seconds)
chatSchema.methods.cleanOldTypingIndicators = function() {
  const fiveSecondsAgo = new Date(Date.now() - 5000);
  this.typingUsers = this.typingUsers.filter(item => item.timestamp > fiveSecondsAgo);
};

module.exports = mongoose.model('Chat', chatSchema);
