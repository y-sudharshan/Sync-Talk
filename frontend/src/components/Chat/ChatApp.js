import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import Sidebar from './Sidebar/Sidebar';
import ChatWindow from './ChatWindow/ChatWindow';
import WelcomeScreen from './WelcomeScreen';
import LoadingSpinner from '../Common/LoadingSpinner';
import './ChatApp.css';

const ChatApp = () => {
  const { user } = useAuth();
  const { activeChat, isLoading } = useChat();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when selecting a chat on mobile
  useEffect(() => {
    if (activeChat && window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }, [activeChat]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Loading chats..." />;
  }

  return (
    <div className="chat-app">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar onCloseSidebar={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeChat ? (
          <ChatWindow onOpenSidebar={() => setIsSidebarOpen(true)} />
        ) : (
          <WelcomeScreen 
            user={user} 
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatApp;
