import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { chatsAPI, messagesAPI } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  chats: [],
  activeChat: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  notifications: [],
  isLoading: false,
  error: null,
};

// Actions
const CHAT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CHATS: 'SET_CHATS',
  ADD_CHAT: 'ADD_CHAT',
  UPDATE_CHAT: 'UPDATE_CHAT',
  REMOVE_CHAT: 'REMOVE_CHAT',
  SET_ACTIVE_CHAT: 'SET_ACTIVE_CHAT',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  REMOVE_MESSAGE: 'REMOVE_MESSAGE',
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  UPDATE_USER_STATUS: 'UPDATE_USER_STATUS',
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  ADD_TYPING_USER: 'ADD_TYPING_USER',
  REMOVE_TYPING_USER: 'REMOVE_TYPING_USER',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  INCREMENT_UNREAD: 'INCREMENT_UNREAD',
  RESET_UNREAD: 'RESET_UNREAD',
};

// Reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case CHAT_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case CHAT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case CHAT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case CHAT_ACTIONS.SET_CHATS:
      return { ...state, chats: action.payload, isLoading: false };

    case CHAT_ACTIONS.ADD_CHAT:
      return {
        ...state,
        chats: [action.payload, ...state.chats.filter(chat => chat._id !== action.payload._id)]
      };

    case CHAT_ACTIONS.UPDATE_CHAT:
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload._id ? { ...chat, ...action.payload } : chat
        )
      };

    case CHAT_ACTIONS.REMOVE_CHAT:
      return {
        ...state,
        chats: state.chats.filter(chat => chat._id !== action.payload),
        activeChat: state.activeChat?._id === action.payload ? null : state.activeChat
      };

    case CHAT_ACTIONS.SET_ACTIVE_CHAT:
      return { ...state, activeChat: action.payload };

    case CHAT_ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages
        }
      };

    case CHAT_ACTIONS.ADD_MESSAGE:
      const chatId = action.payload.chatId || action.payload.message.chat;
      const existingMessages = state.messages[chatId] || [];
      
      // Check if message already exists to avoid duplicates
      const messageExists = existingMessages.some(msg => msg._id === action.payload.message._id);
      if (messageExists) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, action.payload.message]
        }
      };

    case CHAT_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: state.messages[action.payload.chatId]?.map(msg =>
            msg._id === action.payload.messageId ? { ...msg, ...action.payload.updates } : msg
          ) || []
        }
      };

    case CHAT_ACTIONS.REMOVE_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: state.messages[action.payload.chatId]?.filter(
            msg => msg._id !== action.payload.messageId
          ) || []
        }
      };

    case CHAT_ACTIONS.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload };

    case CHAT_ACTIONS.UPDATE_USER_STATUS:
      return {
        ...state,
        onlineUsers: action.payload.isOnline
          ? [...state.onlineUsers.filter(u => u._id !== action.payload.userId), action.payload.user]
          : state.onlineUsers.filter(u => u._id !== action.payload.userId)
      };

    case CHAT_ACTIONS.ADD_TYPING_USER:
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: [
            ...(state.typingUsers[action.payload.chatId] || []).filter(u => u._id !== action.payload.user._id),
            action.payload.user
          ]
        }
      };

    case CHAT_ACTIONS.REMOVE_TYPING_USER:
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: (state.typingUsers[action.payload.chatId] || []).filter(
            u => u._id !== action.payload.userId
          )
        }
      };

    case CHAT_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };

    case CHAT_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload)
      };

    case CHAT_ACTIONS.CLEAR_NOTIFICATIONS:
      return { ...state, notifications: [] };

    case CHAT_ACTIONS.INCREMENT_UNREAD:
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload.chatId
            ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
            : chat
        )
      };

    case CHAT_ACTIONS.RESET_UNREAD:
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload ? { ...chat, unreadCount: 0 } : chat
        )
      };

    default:
      return state;
  }
};

// Create context
const ChatContext = createContext();

// Chat provider component
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats();
      setupSocketListeners();
    }

    return () => {
      cleanupSocketListeners();
    };
  }, [isAuthenticated, user]);

  // Socket event listeners
  const setupSocketListeners = useCallback(() => {
    if (!socketService.isConnected()) return;

    // Message events
    socketService.on('message_received', handleMessageReceived);
    socketService.on('message_edited', handleMessageEdited);
    socketService.on('message_deleted', handleMessageDeleted);
    
    // Typing events
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stopped_typing', handleUserStoppedTyping);
    
    // Status events
    socketService.on('user_status_change', handleUserStatusChange);
    
    // Notification events
    socketService.on('notification', handleNotification);
    
    // Chat events
    socketService.on('chat_updated', handleChatUpdated);
    
    // Reaction events
    socketService.on('reaction_added', handleReactionAdded);
    socketService.on('reaction_removed', handleReactionRemoved);

  }, []);

  const cleanupSocketListeners = useCallback(() => {
    socketService.cleanup();
  }, []);

  // Socket event handlers
  const handleMessageReceived = useCallback((data) => {
    const { message, chatId } = data;
    
    dispatch({
      type: CHAT_ACTIONS.ADD_MESSAGE,
      payload: { message, chatId }
    });

    // Update chat with latest message
    dispatch({
      type: CHAT_ACTIONS.UPDATE_CHAT,
      payload: {
        _id: chatId,
        latestMessage: message,
        updatedAt: message.createdAt
      }
    });

    // Increment unread count if not in active chat
    if (state.activeChat?._id !== chatId) {
      dispatch({
        type: CHAT_ACTIONS.INCREMENT_UNREAD,
        payload: { chatId }
      });

      // Show notification
      const chat = state.chats.find(c => c._id === chatId);
      if (chat) {
        toast.success(`New message from ${message.sender.name}`, {
          duration: 3000,
        });
      }
    }
  }, [state.activeChat, state.chats]);

  const handleMessageEdited = useCallback((data) => {
    const { messageId, newContent, isEdited, editedAt } = data;
    
    // Find which chat this message belongs to
    const chatId = Object.keys(state.messages).find(cId =>
      state.messages[cId]?.some(msg => msg._id === messageId)
    );

    if (chatId) {
      dispatch({
        type: CHAT_ACTIONS.UPDATE_MESSAGE,
        payload: {
          chatId,
          messageId,
          updates: { content: newContent, isEdited, editedAt }
        }
      });
    }
  }, [state.messages]);

  const handleMessageDeleted = useCallback((data) => {
    const { messageId, chatId } = data;
    
    dispatch({
      type: CHAT_ACTIONS.REMOVE_MESSAGE,
      payload: { chatId, messageId }
    });
  }, []);

  const handleUserTyping = useCallback((data) => {
    const { userId, user, chatId } = data;
    
    dispatch({
      type: CHAT_ACTIONS.ADD_TYPING_USER,
      payload: { chatId, user }
    });
  }, []);

  const handleUserStoppedTyping = useCallback((data) => {
    const { userId, chatId } = data;
    
    dispatch({
      type: CHAT_ACTIONS.REMOVE_TYPING_USER,
      payload: { chatId, userId }
    });
  }, []);

  const handleUserStatusChange = useCallback((data) => {
    const { userId, isOnline, user } = data;
    
    dispatch({
      type: CHAT_ACTIONS.UPDATE_USER_STATUS,
      payload: { userId, isOnline, user }
    });
  }, []);

  const handleNotification = useCallback((data) => {
    const notification = {
      ...data,
      id: Date.now() + Math.random(),
      timestamp: new Date()
    };
    
    dispatch({
      type: CHAT_ACTIONS.ADD_NOTIFICATION,
      payload: notification
    });
  }, []);

  const handleChatUpdated = useCallback((data) => {
    const { chatId, latestMessage } = data;
    
    dispatch({
      type: CHAT_ACTIONS.UPDATE_CHAT,
      payload: {
        _id: chatId,
        latestMessage,
        updatedAt: latestMessage.createdAt
      }
    });
  }, []);

  const handleReactionAdded = useCallback((data) => {
    const { messageId, reactions } = data;
    
    // Find which chat this message belongs to
    const chatId = Object.keys(state.messages).find(cId =>
      state.messages[cId]?.some(msg => msg._id === messageId)
    );

    if (chatId) {
      dispatch({
        type: CHAT_ACTIONS.UPDATE_MESSAGE,
        payload: {
          chatId,
          messageId,
          updates: { reactions }
        }
      });
    }
  }, [state.messages]);

  const handleReactionRemoved = useCallback((data) => {
    const { messageId, reactions } = data;
    
    // Find which chat this message belongs to
    const chatId = Object.keys(state.messages).find(cId =>
      state.messages[cId]?.some(msg => msg._id === messageId)
    );

    if (chatId) {
      dispatch({
        type: CHAT_ACTIONS.UPDATE_MESSAGE,
        payload: {
          chatId,
          messageId,
          updates: { reactions }
        }
      });
    }
  }, [state.messages]);

  // API functions
  const loadChats = async () => {
    dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
    
    try {
      const response = await chatsAPI.getChats();
      dispatch({
        type: CHAT_ACTIONS.SET_CHATS,
        payload: response.data.data
      });
    } catch (error) {
      dispatch({
        type: CHAT_ACTIONS.SET_ERROR,
        payload: error.response?.data?.message || 'Failed to load chats'
      });
    }
  };

  const createOrAccessChat = async (userId) => {
    try {
      const response = await chatsAPI.accessChat(userId);
      const chat = response.data.data;
      
      dispatch({
        type: CHAT_ACTIONS.ADD_CHAT,
        payload: chat
      });
      
      return chat;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create chat');
      throw error;
    }
  };

  const createGroupChat = async (chatData) => {
    try {
      const response = await chatsAPI.createGroupChat(chatData);
      const chat = response.data.data;
      
      dispatch({
        type: CHAT_ACTIONS.ADD_CHAT,
        payload: chat
      });
      
      toast.success('Group chat created successfully');
      return chat;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group chat');
      throw error;
    }
  };

  const selectChat = async (chat) => {
    dispatch({ type: CHAT_ACTIONS.SET_ACTIVE_CHAT, payload: chat });
    
    // Mark chat as read
    try {
      await chatsAPI.markAsRead(chat._id);
      dispatch({ type: CHAT_ACTIONS.RESET_UNREAD, payload: chat._id });
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
    
    // Join chat room
    socketService.joinChat(chat._id);
    
    // Load messages if not already loaded
    if (!state.messages[chat._id]) {
      await loadMessages(chat._id);
    }
  };

  const loadMessages = async (chatId, page = 1) => {
    try {
      const response = await messagesAPI.getMessages(chatId, { page, limit: 50 });
      const messages = response.data.data.messages;
      
      dispatch({
        type: CHAT_ACTIONS.SET_MESSAGES,
        payload: { chatId, messages }
      });
      
      return response.data.data;
    } catch (error) {
      toast.error('Failed to load messages');
      throw error;
    }
  };

  const sendMessage = async (messageData) => {
    try {
      // Emit through socket for real-time delivery
      socketService.sendMessage(messageData);
      
      // Also send through API for persistence
      await messagesAPI.sendMessage(messageData);
    } catch (error) {
      toast.error('Failed to send message');
      throw error;
    }
  };

  const startTyping = (chatId) => {
    socketService.startTyping(chatId);
  };

  const stopTyping = (chatId) => {
    socketService.stopTyping(chatId);
  };

  const addReaction = async (messageId, emoji) => {
    try {
      socketService.addReaction(messageId, emoji);
      await messagesAPI.addReaction(messageId, emoji);
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const removeReaction = async (messageId) => {
    try {
      socketService.removeReaction(messageId);
      await messagesAPI.removeReaction(messageId);
    } catch (error) {
      toast.error('Failed to remove reaction');
    }
  };

  const clearError = () => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    loadChats,
    createOrAccessChat,
    createGroupChat,
    selectChat,
    loadMessages,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
