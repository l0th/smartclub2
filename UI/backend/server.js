require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const historyRoutes = require('./routes/historyRoutes');
const renewalRoutes = require('./routes/renewalRoutes');
const chatRoutes = require('./routes/chatRoutes');
const forgotCardRoutes = require('./routes/forgotCardRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Services
const chatService = require('./services/chatService');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;
const ENABLE_TUNNEL = process.env.ENABLE_TUNNEL !== 'false';

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================
   API ROUTES
===================== */
app.use('/api/auth', authRoutes);
app.use('/api/auth/password-reset', passwordResetRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/member/history', historyRoutes);
app.use('/api/member/renewal', renewalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/forgot-card', forgotCardRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/payment', paymentRoutes);

/* =====================
   HEALTH CHECK
===================== */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SmartClub API is running'
  });
});

/* =====================
   STATIC UI (QUAN TRỌNG NHẤT)
===================== */
/**
 * BẮT BUỘC cấu trúc:
 * backend/
 * ├─ public/
 * │  ├─ index.html
 * │  ├─ css/
 * │  └─ js/
 */
app.use(express.static(path.join(__dirname, 'public')));

// Route root → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =====================
   SOCKET.IO
===================== */
const userSockets = {};

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('identify', (data) => {
    const username = data?.username;
    if (username) {
      userSockets[username] = socket.id;
      console.log(`👤 User ${username} registered with socket ${socket.id}`);
    }
  });

  socket.on('private_message', async (data) => {
    try {
      const { from, to, message, fileData, fileName, fileType } = data;
      if (!from || !to || (!message && !fileData)) return;

      const MAX_FILE_SIZE = 10 * 1024 * 1024;

      let fileBuffer = null;
      let fileDataUrl = null;
      let fileSize = null;
      if (fileData && fileName) {
        fileBuffer = Buffer.from(fileData, 'base64');
        fileSize = fileBuffer.length;

        if (fileSize > MAX_FILE_SIZE) {
          socket.emit('message_error', { error: 'File size exceeds 10MB limit' });
          return;
        }

        const mimeType = fileType || 'application/octet-stream';
        fileDataUrl = `data:${mimeType};base64,${fileData}`;
      }

      await chatService.saveMessage(
        from,
        to,
        message || '',
        fileBuffer,
        fileName,
        fileType,
        null,
        fileSize
      );

      const targetSocketId = userSockets[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('private_message', {
          from,
          to,
          message,
          fileData: fileDataUrl,
          fileName,
          fileType,
          timestamp: new Date().toISOString()
        });
      }

      socket.emit('message_sent', { success: true });
    } catch (error) {
      console.error('❌ Private message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    for (const [username, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        delete userSockets[username];
        break;
      }
    }
  });
});

/* =====================
   START SERVER (QUAN TRỌNG)
===================== */
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ REST API server running on port ${PORT}`);
  console.log(`✅ Socket.IO server integrated on same port`);

  if (ENABLE_TUNNEL && !process.env.VNPAY_RETURN_URL) {
    try {
      const tunnelService = require('./services/tunnelService');
      console.log('🔄 Starting tunnel for VNPay...');
      const tunnelUrl = await tunnelService.startTunnel(PORT, {
        maxRetries: 3,
        retryDelay: 2000
      });
      console.log(`✅ VNPay tunnel established: ${tunnelUrl}`);
      console.log(`   Return URL: ${tunnelUrl}/payment-callback.html`);
      console.log(`   IPN URL: ${tunnelUrl}/api/payment/vnpay/ipn`);
    } catch (error) {
      console.error('❌ Failed to start tunnel:', error.message);
    }
  } else if (process.env.VNPAY_RETURN_URL) {
    console.log(`✅ Using VNPay URL from environment: ${process.env.VNPAY_RETURN_URL}`);
  }
});

/* =====================
   GRACEFUL SHUTDOWN
===================== */
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  const tunnelService = require('./services/tunnelService');
  await tunnelService.stopTunnel();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  const tunnelService = require('./services/tunnelService');
  await tunnelService.stopTunnel();
  process.exit(0);
});
