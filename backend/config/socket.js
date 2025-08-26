const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Store connected users
const connectedUsers = new Map();

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

const handleConnection = (io) => {
  return async (socket) => {
    try {
      console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);

      // Update user's online status and socket ID
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Store user connection
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user
      });

      // Join user to their personal room (for notifications)
      socket.join(socket.userId);

      // Get user's chats and join chat rooms
      const userChats = await Chat.find({
        users: { $elemMatch: { $eq: socket.userId } }
      });

      userChats.forEach(chat => {
        socket.join(chat._id.toString());
      });

      // Broadcast user online status to all chat members
      const chatIds = userChats.map(chat => chat._id.toString());
      chatIds.forEach(chatId => {
        socket.to(chatId).emit('user_status_change', {
          userId: socket.userId,
          isOnline: true,
          user: socket.user
        });
      });

      // Handle joining a specific chat
      socket.on('join_chat', async (data) => {
        try {
          const { chatId } = data;
          
          // Verify user is member of the chat
          const chat = await Chat.findById(chatId);
          if (chat && chat.users.includes(socket.userId)) {
            socket.join(chatId);
            
            // Mark chat as read when user joins
            chat.resetUnreadCount(socket.userId);
            await chat.save();

            socket.emit('joined_chat', { chatId });
            
            console.log(`User ${socket.user.name} joined chat: ${chatId}`);
          } else {
            socket.emit('error', { message: 'Not authorized to join this chat' });
          }
        } catch (error) {
          console.error('Join chat error:', error.message);
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      // Handle leaving a chat
      socket.on('leave_chat', (data) => {
        const { chatId } = data;
        socket.leave(chatId);
        socket.emit('left_chat', { chatId });
        console.log(`User ${socket.user.name} left chat: ${chatId}`);
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const { content, chatId, messageType = 'text', replyTo } = data;

          // Verify user is member of the chat
          const chat = await Chat.findById(chatId);
          if (!chat || !chat.users.includes(socket.userId)) {
            return socket.emit('error', { message: 'Not authorized to send message to this chat' });
          }

          // Create and save message
          const message = await Message.create({
            sender: socket.userId,
            content: content?.trim(),
            chat: chatId,
            messageType,
            replyTo: replyTo || undefined
          });

          // Populate message
          const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name avatar email')
            .populate('replyTo', 'content sender')
            .populate({
              path: 'replyTo',
              populate: { path: 'sender', select: 'name avatar' }
            });

          // Update chat
          chat.latestMessage = message._id;
          chat.incrementUnreadCount(socket.userId);
          chat.removeTypingUser(socket.userId);
          await chat.save();

          // Emit to all chat members
          io.to(chatId).emit('message_received', {
            message: populatedMessage,
            chatId: chatId
          });

          // Send notification to offline users or users not in chat room
          chat.users.forEach(async (userId) => {
            if (userId.toString() !== socket.userId) {
              const userConnection = connectedUsers.get(userId.toString());
              if (!userConnection) {
                // User is offline - you can implement push notifications here
                console.log(`User ${userId} is offline - send push notification`);
              } else {
                // User is online but might not be in the chat room
                io.to(userId.toString()).emit('notification', {
                  type: 'new_message',
                  chatId: chatId,
                  message: populatedMessage,
                  sender: socket.user
                });
              }
            }
          });

        } catch (error) {
          console.error('Send message error:', error.message);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', async (data) => {
        try {
          const { chatId } = data;
          
          const chat = await Chat.findById(chatId);
          if (chat && chat.users.includes(socket.userId)) {
            chat.addTypingUser(socket.userId);
            await chat.save();

            // Broadcast to other chat members
            socket.to(chatId).emit('user_typing', {
              userId: socket.userId,
              user: socket.user,
              chatId: chatId
            });

            // Auto-remove typing indicator after 5 seconds
            setTimeout(async () => {
              try {
                const updatedChat = await Chat.findById(chatId);
                if (updatedChat) {
                  updatedChat.removeTypingUser(socket.userId);
                  await updatedChat.save();
                  
                  socket.to(chatId).emit('user_stopped_typing', {
                    userId: socket.userId,
                    chatId: chatId
                  });
                }
              } catch (error) {
                console.error('Auto-remove typing error:', error.message);
              }
            }, 5000);
          }
        } catch (error) {
          console.error('Typing indicator error:', error.message);
        }
      });

      socket.on('stop_typing', async (data) => {
        try {
          const { chatId } = data;
          
          const chat = await Chat.findById(chatId);
          if (chat && chat.users.includes(socket.userId)) {
            chat.removeTypingUser(socket.userId);
            await chat.save();

            socket.to(chatId).emit('user_stopped_typing', {
              userId: socket.userId,
              chatId: chatId
            });
          }
        } catch (error) {
          console.error('Stop typing error:', error.message);
        }
      });

      // Handle user going online/offline manually
      socket.on('user_status_update', async (data) => {
        try {
          const { isOnline } = data;
          
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: Boolean(isOnline),
            lastSeen: new Date()
          });

          // Broadcast status change to all user's chats
          const userChats = await Chat.find({
            users: { $elemMatch: { $eq: socket.userId } }
          });

          userChats.forEach(chat => {
            socket.to(chat._id.toString()).emit('user_status_change', {
              userId: socket.userId,
              isOnline: Boolean(isOnline),
              user: socket.user
            });
          });

        } catch (error) {
          console.error('User status update error:', error.message);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        try {
          console.log(`User ${socket.user.name} disconnected: ${reason}`);

          // Update user's offline status
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
            socketId: ''
          });

          // Remove from connected users
          connectedUsers.delete(socket.userId);

          // Clean up typing indicators
          const userChats = await Chat.find({
            users: { $elemMatch: { $eq: socket.userId } }
          });

          userChats.forEach(async (chat) => {
            chat.removeTypingUser(socket.userId);
            await chat.save();

            // Broadcast user offline status
            socket.to(chat._id.toString()).emit('user_status_change', {
              userId: socket.userId,
              isOnline: false,
              user: socket.user
            });

            // Remove typing indicator if user was typing
            socket.to(chat._id.toString()).emit('user_stopped_typing', {
              userId: socket.userId,
              chatId: chat._id.toString()
            });
          });

        } catch (error) {
          console.error('Disconnect handling error:', error.message);
        }
      });

      // Handle message reactions in real-time
      socket.on('add_reaction', async (data) => {
        try {
          const { messageId, emoji } = data;
          
          const message = await Message.findById(messageId);
          if (message) {
            // Check if user is member of the chat
            const chat = await Chat.findById(message.chat);
            if (chat && chat.users.includes(socket.userId)) {
              message.addReaction(socket.userId, emoji);
              await message.save();

              const updatedMessage = await Message.findById(messageId)
                .populate('reactions.user', 'name avatar');

              io.to(message.chat.toString()).emit('reaction_added', {
                messageId: messageId,
                reactions: updatedMessage.reactions
              });
            }
          }
        } catch (error) {
          console.error('Add reaction error:', error.message);
        }
      });

      socket.on('remove_reaction', async (data) => {
        try {
          const { messageId } = data;
          
          const message = await Message.findById(messageId);
          if (message) {
            message.removeReaction(socket.userId);
            await message.save();

            const updatedMessage = await Message.findById(messageId)
              .populate('reactions.user', 'name avatar');

            io.to(message.chat.toString()).emit('reaction_removed', {
              messageId: messageId,
              reactions: updatedMessage.reactions
            });
          }
        } catch (error) {
          console.error('Remove reaction error:', error.message);
        }
      });

    } catch (error) {
      console.error('Socket connection error:', error.message);
      socket.emit('error', { message: 'Connection failed' });
    }
  };
};

// Utility function to get connected users
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values()).map(conn => ({
    userId: conn.user._id,
    user: conn.user,
    socketId: conn.socketId
  }));
};

// Utility function to send notification to specific user
const sendNotificationToUser = (io, userId, notification) => {
  const userConnection = connectedUsers.get(userId);
  if (userConnection) {
    io.to(userId).emit('notification', notification);
    return true;
  }
  return false;
};

module.exports = {
  socketAuth,
  handleConnection,
  getConnectedUsers,
  sendNotificationToUser,
  connectedUsers
};
