import React from 'react';
import { FaComments, FaUsers, FaBell, FaLock, FaBars } from 'react-icons/fa';

const WelcomeScreen = ({ user, onOpenSidebar }) => {
  return (
    <div className="welcome-screen">
      {/* Header for mobile */}
      <div className="welcome-header">
        <h1 className="welcome-title">Sync-Talk</h1>
        <button 
          className="mobile-menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <FaBars />
        </button>
      </div>

      {/* Welcome Content */}
      <div className="welcome-content">
        <div className="welcome-icon">
          <FaComments />
        </div>
        
        <h2 className="welcome-heading">
          Welcome to Sync-Talk, {user?.name}!
        </h2>
        
        <p className="welcome-message">
          Start a conversation by selecting a chat from the sidebar or create a new one. 
          Connect with friends and colleagues in real-time.
        </p>

        {/* Features Grid */}
        <div className="welcome-features">
          <div className="feature-item">
            <div className="feature-icon">
              <FaComments />
            </div>
            <h3 className="feature-title">Real-time Messaging</h3>
            <p className="feature-description">
              Send and receive messages instantly with live updates
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3 className="feature-title">Group Chats</h3>
            <p className="feature-description">
              Create groups and chat with multiple people at once
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <FaBell />
            </div>
            <h3 className="feature-title">Smart Notifications</h3>
            <p className="feature-description">
              Stay updated with real-time notifications and status indicators
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <FaLock />
            </div>
            <h3 className="feature-title">Secure & Private</h3>
            <p className="feature-description">
              Your conversations are protected with modern security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
