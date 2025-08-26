# Sync-Talk Development Guide

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git
- VS Code (recommended)

### Quick Start
1. Clone the repository
2. Run the setup script:
   ```powershell
   # Windows PowerShell
   .\setup.ps1
   ```
   
   Or manually:
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Update with your MongoDB connection string
   - Update JWT secret

4. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend
   npm start
   ```

## 🏗️ Architecture Overview

### Backend Architecture
```
backend/
├── config/          # Database and Socket.io configuration
├── controllers/     # Request handlers and business logic
├── middleware/      # Authentication and error handling
├── models/          # MongoDB schemas and models
├── routes/          # API route definitions
├── utils/           # Utility functions
└── server.js        # Main server file
```

### Frontend Architecture
```
frontend/src/
├── components/      # React components
│   ├── Auth/        # Authentication components
│   ├── Chat/        # Chat-related components
│   ├── Common/      # Reusable components
│   └── Notifications/
├── contexts/        # React Context providers
├── services/        # API and Socket services
├── styles/          # CSS styles
├── utils/           # Utility functions
└── App.js           # Main application component
```

## 🔄 Development Workflow

### 1. Backend Development

#### API Development
- Use RESTful conventions
- Implement proper error handling
- Add input validation
- Write comprehensive comments

#### Database Operations
```javascript
// Example model method
userSchema.statics.findUsersByStatus = function(status) {
  return this.find({ isOnline: status })
    .select('-password -socketId')
    .sort({ name: 1 });
};
```

#### Socket.io Events
```javascript
// Server-side event handling
socket.on('send_message', async (data) => {
  // Validate data
  // Save to database
  // Emit to relevant users
});
```

### 2. Frontend Development

#### Component Structure
```jsx
const ChatComponent = () => {
  // Hooks
  const { user } = useAuth();
  const { sendMessage } = useChat();
  
  // State
  const [message, setMessage] = useState('');
  
  // Effects
  useEffect(() => {
    // Component logic
  }, []);
  
  // Handlers
  const handleSubmit = () => {
    // Submit logic
  };
  
  // Render
  return (
    <div className="chat-component">
      {/* JSX */}
    </div>
  );
};
```

#### Context Usage
```jsx
// Using contexts
const { isAuthenticated, login, logout } = useAuth();
const { chats, activeChat, sendMessage } = useChat();
```

## Testing

### Backend Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test specific file
npm test -- auth.test.js
```

### Frontend Testing
```bash
# Unit tests
npm test

# Coverage report
npm test -- --coverage
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Chat creation (private and group)
- [ ] Message sending and receiving
- [ ] Real-time features (typing, online status)
- [ ] Responsive design on different devices
- [ ] Error handling scenarios
- [ ] Performance under load

## 🎨 Styling Guidelines

### CSS Architecture
- Use CSS variables for consistent theming
- Follow BEM naming convention
- Mobile-first responsive design
- Accessible color contrast

### Component Styling
```css
/* Component-specific styles */
.chat-window {
  /* Layout */
  display: flex;
  flex-direction: column;
  
  /* Styling */
  background: var(--surface-color);
  border-radius: var(--border-radius);
  
  /* Responsive */
  @media (max-width: 768px) {
    /* Mobile styles */
  }
}
```

## Security Considerations

### Authentication
- JWT tokens with appropriate expiration
- Secure password hashing with bcrypt
- Input validation and sanitization

### Authorization
- Route protection middleware
- User permission checks
- Socket event authorization

### Data Protection
- Environment variable usage
- Secure headers with Helmet.js
- Rate limiting implementation

## 📊 Performance Optimization

### Backend Optimization
```javascript
// Database indexing
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ name: 'text', email: 'text' });

// Efficient queries
const users = await User.find({ isOnline: true })
  .select('name avatar isOnline')
  .limit(50);
```

### Frontend Optimization
```jsx
// Memoization
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// Lazy loading
const ChatWindow = lazy(() => import('./ChatWindow'));
```

## 🐛 Debugging

### Backend Debugging
```javascript
// Logging
console.log('Debug info:', { userId, chatId, messageData });

// Error tracking
try {
  // Operation
} catch (error) {
  console.error('Error in sendMessage:', error);
  // Handle error
}
```

### Frontend Debugging
```jsx
// React Developer Tools
// Console logging
console.log('Component state:', { chats, activeChat });

// Error boundaries
class ErrorBoundary extends React.Component {
  // Error boundary implementation
}
```

## Common Development Tasks

### Adding a New API Endpoint
1. Define route in `routes/` directory
2. Create controller function
3. Add middleware if needed
4. Update API documentation
5. Test endpoint

### Adding a New React Component
1. Create component file
2. Define props interface
3. Implement component logic
4. Add styling
5. Export and use in parent component

### Adding Socket Events
1. Define event in backend socket config
2. Add event handler
3. Implement frontend event emission
4. Add event listener in frontend
5. Test real-time functionality

```

## Code Standards

### JavaScript/TypeScript
- Use ES6+ features
- Consistent naming conventions
- Proper error handling
- Comment complex logic

### React
- Functional components with hooks
- Proper prop types or TypeScript interfaces
- Clean component structure
- Performance considerations

### MongoDB
- Proper schema design
- Efficient indexing
- Data validation
- Consistent naming

## 🔄 Git Workflow

### Branch Strategy
```bash
# Feature branch
git checkout -b feature/user-profile-edit

# Bug fix branch  
git checkout -b bugfix/message-timestamp

# Release branch
git checkout -b release/v1.1.0
```

### Commit Messages
```bash
# Format: type(scope): description
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(chat): resolve message duplication issue"
git commit -m "docs(readme): update installation instructions"
```

## 📖 API Documentation

### Authentication Endpoints
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Chat Endpoints
```
GET    /api/chats
POST   /api/chats
POST   /api/chats/group
PUT    /api/chats/group/:id/rename
DELETE /api/chats/:id
```

### Message Endpoints
```
GET    /api/messages/:chatId
POST   /api/messages
PUT    /api/messages/:id
DELETE /api/messages/:id
```

## Advanced Features

### Real-time Features
- Message typing indicators
- Online/offline status
- Read receipts
- Push notifications

### File Upload
```javascript
// Backend - Multer configuration
const upload = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

### Search Functionality
```javascript
// Backend - Text search
const messages = await Message.find({
  chat: chatId,
  $text: { $search: searchQuery }
});
```

## 🔍 Monitoring and Logging

### Development Logging
```javascript
// Backend logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});
```

### Performance Monitoring
```javascript
// API response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

## Best Practices

### Code Organization
- Separate concerns (models, views, controllers)
- Use meaningful file and variable names
- Keep functions small and focused
- Write self-documenting code

### Error Handling
- Implement global error handlers
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases

### Performance
- Optimize database queries
- Implement caching where appropriate
- Use pagination for large datasets
- Optimize bundle sizes

### Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Keep dependencies updated
