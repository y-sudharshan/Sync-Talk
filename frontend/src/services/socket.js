import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      autoConnect: false
    });

    this.socket.connect();

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.callbacks.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store callback for cleanup
      if (!this.callbacks.has(event)) {
        this.callbacks.set(event, []);
      }
      this.callbacks.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored callbacks
      if (this.callbacks.has(event)) {
        const callbacks = this.callbacks.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // Emit events
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Chat-specific methods
  joinChat(chatId) {
    this.emit('join_chat', { chatId });
  }

  leaveChat(chatId) {
    this.emit('leave_chat', { chatId });
  }

  sendMessage(messageData) {
    this.emit('send_message', messageData);
  }

  startTyping(chatId) {
    this.emit('typing', { chatId });
  }

  stopTyping(chatId) {
    this.emit('stop_typing', { chatId });
  }

  updateUserStatus(isOnline) {
    this.emit('user_status_update', { isOnline });
  }

  addReaction(messageId, emoji) {
    this.emit('add_reaction', { messageId, emoji });
  }

  removeReaction(messageId) {
    this.emit('remove_reaction', { messageId });
  }

  // Cleanup method
  cleanup() {
    if (this.socket) {
      // Remove all stored callbacks
      this.callbacks.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.callbacks.clear();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
