const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);
router.get('/teachers', authenticate, authorizeRoles('admin', 'university'), authController.getUniversityTeachers);

module.exports = router;
