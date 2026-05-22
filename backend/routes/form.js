const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/', authenticate, authorizeRoles('admin', 'university'), formController.createForm);
router.get('/', authenticate, formController.getForms);
router.delete('/:formId', authenticate, authorizeRoles('admin', 'university'), formController.deleteForm);
router.get('/templates/list', authenticate, authorizeRoles('admin', 'university'), formController.getFormTemplates);
router.get('/templates/:templateId', authenticate, authorizeRoles('admin', 'university'), formController.getFormTemplateById);
router.get('/:formId', authenticate, formController.getFormById);

module.exports = router;
