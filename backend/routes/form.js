const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/', authenticate, authorizeRoles('university'), formController.createForm);
router.get('/', authenticate, formController.getForms);
router.get('/templates/list', authenticate, authorizeRoles('university'), formController.getFormTemplates);
router.get('/templates/:templateId', authenticate, authorizeRoles('university'), formController.getFormTemplateById);
router.get('/:formId', authenticate, formController.getFormById);

module.exports = router;
