const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return !this.attachment; // Content is required if there's no attachment
    },
    trim: true,
    maxlength: [1000, 'Message content cannot be more than 1000 characters']
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachment: {
    url: String,
    filename: String,
    mimetype: String,
    size: Number
  },
  // For message status tracking
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For message reactions (emoji reactions)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For reply functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // For message editing
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  // For message deletion
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ isDeleted: 1 });

// Virtual for checking if message is read by all recipients
messageSchema.virtual('isReadByAll').get(function() {
  // This would need to be calculated based on chat participants
  return false; // Placeholder
});

// Static method to get messages for a chat with pagination
messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    chat: chatId, 
    isDeleted: false 
  })
    .populate('sender', 'name avatar email')
    .populate('replyTo', 'content sender')
    .populate('readBy.user', 'name')
    .populate('reactions.user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get unread messages count for a user in a chat
messageSchema.statics.getUnreadCount = function(chatId, userId, lastReadTime) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    createdAt: { $gt: lastReadTime },
    isDeleted: false
  });
};

// Instance method to mark message as read by user
messageSchema.methods.markAsReadBy = function(userId) {
  const alreadyRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
  }
};

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  // Add new reaction
  this.reactions.push({ user: userId, emoji });
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
};

// Instance method to edit message
messageSchema.methods.editContent = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
};

// Instance method to soft delete message
messageSchema.methods.softDelete = function(deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  this.content = 'This message was deleted';
};

// Pre-save middleware to update chat's latest message
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Chat = mongoose.model('Chat');
      await Chat.findByIdAndUpdate(this.chat, {
        latestMessage: this._id,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating chat latest message:', error);
    }
  }
  next();
});

// Static method to search messages in a chat
messageSchema.statics.searchInChat = function(chatId, searchQuery, limit = 20) {
  return this.find({
    chat: chatId,
    content: { $regex: searchQuery, $options: 'i' },
    isDeleted: false
  })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);
