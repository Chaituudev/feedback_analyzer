const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', authenticate, subjectController.getSubjects);
router.post('/', authenticate, authorizeRoles('admin', 'university'), subjectController.createSubject);

module.exports = router;