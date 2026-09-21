const express = require('express');
const router = express.Router();
const meetingsController = require('../controllers/meetingsController');

router.post('/analyze', meetingsController.analyzeMeeting);
router.get('/', meetingsController.getMeetings);
router.get('/stats', meetingsController.getDashboardStats);
router.get('/:id', meetingsController.getMeetingById);
router.post('/:id/summarize', meetingsController.summarizeMeeting);
router.delete('/:id', meetingsController.deleteMeeting);
router.patch('/action-items/:id', meetingsController.updateActionItemStatus);

module.exports = router;
