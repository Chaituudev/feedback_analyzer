const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/', authenticate, authorizeRoles('student'), feedbackController.submitFeedback);
router.post('/complaint', authenticate, authorizeRoles('student'), feedbackController.submitComplaint);
router.delete('/bulk', authenticate, authorizeRoles('admin', 'university'), feedbackController.deleteFeedbackBulk);
router.delete('/:feedbackId', authenticate, authorizeRoles('admin', 'university'), feedbackController.deleteFeedback);
router.get('/', authenticate, feedbackController.getFeedbacks);
router.get('/analytics', authenticate, authorizeRoles('teacher', 'university'), feedbackController.getAnalytics);

module.exports = router;
