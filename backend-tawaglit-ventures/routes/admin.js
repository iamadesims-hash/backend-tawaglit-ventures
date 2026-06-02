// routes/admin.js
const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes are protected
router.get('/kyc-pending', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "Adebayo Oluwaseun", type: "NIN + Selfie", time: "2 min ago" },
      { id: 2, name: "Chioma Eze", type: "Passport", time: "15 min ago" }
    ]
  });
});

router.post('/kyc/:id/approve', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({ success: true, message: `KYC for ID ${req.params.id} approved` });
});

router.post('/kyc/:id/reject', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({ success: true, message: `KYC for ID ${req.params.id} rejected` });
});

router.post('/group/approve', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({ success: true, message: "Group chat approved" });
});

router.post('/community/approve', authenticateToken, authorizeRole(['ADMIN']), (req, res) => {
  res.json({ success: true, message: "Community approved" });
});

module.exports = router;