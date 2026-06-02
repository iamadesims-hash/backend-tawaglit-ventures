// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const Stripe = require('stripe');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'tawaglit-ventures-secret-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// ===================== IN-MEMORY USERS (Replace with Supabase later) =====================
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
  if (!token) return res.status(401).json({ success: false, message: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
};

// ===================== ROUTES =====================

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
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

  res.json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Admin Routes
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
  res.json({ success: true, message: `KYC ${req.params.id} approved` });
});

// Payments Routes
app.post('/api/payments/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Stripe Webhook
app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    console.log("✅ Stripe Payment Successful");
    // Update wallet balance in database here
  }

  res.json({ received: true });
});

// ===================== SOCKET.IO =====================
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId }) => socket.join(roomId));

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Tawaglit Backend running on http://localhost:${PORT}`);
});