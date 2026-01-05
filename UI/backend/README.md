# SmartClub Web API Backend

Node.js backend API for SmartClub web application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials

4. Start server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with card code
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info

### Member
- `GET /api/member/profile` - Get member profile
- `GET /api/member/card` - Get card information
- `GET /api/member/package` - Get package information

### History
- `GET /api/member/history?page=1&limit=20` - Get access history with pagination

### Renewal
- `GET /api/member/renewal/plans` - Get all available plans
- `POST /api/member/renewal/request` - Submit renewal request

### Chat
- `GET /api/chat/messages?limit=50` - Get chat history
- `POST /api/chat/messages` - Save message

## Socket.IO

Socket.IO is integrated on the same port as REST API.

Events:
- `identify` - Register user with username
- `private_message` - Send private message
- `message_sent` - Confirm message sent
- `message_error` - Error sending message

## Database

Uses MySQL database shared with desktop application.

