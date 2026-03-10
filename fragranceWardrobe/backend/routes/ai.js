const express = require('express');
const router = express.Router();
const { getConversationTitle, getHistory, deleteConversation, chat } = require('../controllers/aiController');

router.post('/conversation-title',              getConversationTitle);
router.post('/chat',                            chat);
router.get('/history/:userId',                  getHistory);
router.delete('/history/:userId/:conversationId', deleteConversation);

module.exports = router;
