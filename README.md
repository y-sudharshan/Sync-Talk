# Sync-Talk - Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.io.

## Features

-  JWT Authentication
-  Private and Group Chats
-  Online/Offline Status Indicators
-  Real-time Notifications
-  Typing Indicators
-  Responsive Design
-  Unread Message Badges
-  User Management
-  Scalable Architecture

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication
- bcryptjs for password hashing
- cors for cross-origin requests

### Frontend
- React with functional components and hooks
- Socket.io-client for real-time features
- Axios for HTTP requests
- React Router for navigation
- CSS3 with Flexbox/Grid for responsive design



## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/sync-talk.git
cd sync-talk
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up environment variables
Create a `.env` file in the backend directory with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/synctalk
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

5. Start the development servers
```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/search` - Search users
- `PUT /api/users/profile` - Update user profile

### Chats
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create/Access one-on-one chat
- `POST /api/chats/group` - Create group chat
- `PUT /api/chats/group/:id` - Update group chat
- `DELETE /api/chats/group/:id/leave` - Leave group chat

### Messages
- `GET /api/messages/:chatId` - Get messages for a chat
- `POST /api/messages` - Send a message

## Socket Events

### Client to Server
- `join_chat` - Join a specific chat room
- `send_message` - Send a message
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `user_online` - User came online
- `user_offline` - User went offline

### Server to Client
- `message_received` - New message received
- `typing` - Someone is typing
- `stop_typing` - Someone stopped typing
- `user_status_change` - User online/offline status changed
- `notification` - New notification

## Deployment

### Backend (Heroku/Render)
1. Build the application
2. Set environment variables
3. Deploy to your preferred platform

### Frontend (Netlify/Vercel)
1. Build the React application
2. Deploy the build folder

### Database (MongoDB )
1. Create a MongoDB  account
2. Set up a cluster
3. Update the MONGODB_URI in your environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.
