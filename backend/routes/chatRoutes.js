const express = require('express');
const auth = require('../middleware/AuthMiddleware');
const ChatService = require('../services/ChatService');

const router = express.Router();

// list chats for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await ChatService.listForUser(req.user._id);
    res.json({ chats });
  } catch (err) {
    console.error('Chat list error', err);
    res.status(500).json({ error: 'Failed to list chats' });
  }
});

// create chat
router.post('/', auth, async (req, res) => {
  try {
    const { participants, context } = req.body;
    const chat = await ChatService.createChat(req.user._id, { participants, context });
    res.json({ chat });
  } catch (err) {
    console.error('Chat create error', err);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// get chat by id
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await ChatService.getById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err) {
    console.error('Get chat error', err);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// post message to chat – for FRIEND CHAT we will call this with generateReply:false
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { text, generateReply = true, replyContext = null } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const result = await ChatService.handleUserMessage(req.params.id, req.user, text, {
      generateReply,
      replyContext
    });
    res.json(result);
  } catch (err) {
    console.error('Post chat message error', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

module.exports = router;
