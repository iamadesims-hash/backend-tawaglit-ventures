// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

const JWT_SECRET = process.env.JWT_SECRET || 'tawaglit-ventures-secret-2026';
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// ===================== IN-MEMORY USERS (Replace with DB later) =====================
let users = [
  {
    id: "1",
    email: "admin@tawaglit.com",
    password: bcrypt.hashSync("admin123", 10),
    name: "Super Admin",
    role: "ADMIN"
  },
  {
    id: "2",
    email: "agent@tawaglit.com",
    password: bcrypt.hashSync("agent123", 10),
    name: "Adebayo Oluwaseun",
    role: "AGENT"
  },
  {
    id: "3",
    email: "user@tawaglit.com",
    password: bcrypt.hashSync("user123", 10),
    name: "Dolapo Olayinka",
    role: "USER"
  }
];

// ===================== MIDDLEWARE =====================
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ Token verification failed");
      return res.status(403).json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.log(`❌ Unauthorized access attempt by role: ${req.user.role}`);
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
};

// ===================== AUTH ROUTES =====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${user.email} (${user.role})`);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===================== ADMIN ROUTES =====================
app.get('/api/admin/kyc-pending', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "Adebayo Oluwaseun", type: "NIN + Selfie", time: "2 min ago" },
      { id: 2, name: "Chioma Eze", type: "Passport", time: "15 min ago" }
    ]
  });
});

app.post('/api/admin/kyc/:id/approve', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  console.log(`✅ KYC Approved: ID ${req.params.id}`);
  res.json({ success: true, message: `KYC ${req.params.id} approved` });
});

// ===================== PAYMENTS =====================
app.post('/api/payments/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    // In production: Use real Stripe call here
    res.json({ success: true, clientSecret: "demo_client_secret_" + Date.now() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== SOCKET.IO =====================
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Tawaglit Backend running on backend-tawaglit-ventures-production.up.railway.app:${PORT}`);
});
