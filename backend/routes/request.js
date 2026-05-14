const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/request/university', authenticate, authorizeRoles('teacher'), requestController.teacherToUniversity);
router.post('/request/subject', authenticate, authorizeRoles('teacher'), requestController.teacherToSubject);
router.post('/request/teacher', authenticate, authorizeRoles('student'), requestController.studentToTeacher);
router.post('/leave-university', authenticate, authorizeRoles('teacher'), requestController.leaveUniversity);
router.get('/requests', authenticate, requestController.getRequests);
router.post('/approve', authenticate, authorizeRoles('teacher', 'university'), requestController.approveRequest);
router.post('/reject', authenticate, authorizeRoles('teacher', 'university'), requestController.rejectRequest);

module.exports = router;
