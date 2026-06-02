// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory users (Replace with Supabase later)
const users = [
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

router.post('/login', async (req, res) => {
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

module.exports = router;