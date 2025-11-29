const Chat = require('../models/Chat');
const GeminiService = require('./GeminiService');

class ChatService {
  async listForUser(userId) {
    return Chat.find({ 'participants.userId': userId }).sort({ updatedAt: -1 }).lean();
  }

  async getById(chatId) {
    return Chat.findById(chatId).lean();
  }

  async createChat(ownerId, { participants = [], context = {} } = {}) {
    const chat = new Chat({ owner: ownerId, participants, context, messages: [] });
    return chat.save();
  }

  async addMessage(chatId, message) {
    const m = {
      sender: message.sender || 'user',
      userId: message.userId || null,
      text: message.text,
      meta: message.meta || {},
      createdAt: new Date()
    };
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { messages: m }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    return { chat, message: m };
  }

  // convenience: add user message, optionally generate assistant reply and save it
  async handleUserMessage(chatId, user, text, options = { generateReply: true, replyContext: null }) {
    // save user message
    const { chat } = await this.addMessage(chatId, { sender: 'user', userId: user._id, text });
    let assistantMessage = null;

    if (options.generateReply) {
      try {
        // ask Gemini for reply (GeminiService should have a method like generateReply)
        const replyText = await GeminiService.generateReply?.(text, { chatContext: chat.context, replyContext: options.replyContext }) 
                          || await GeminiService.generateRouteCommentary?.('chat', { safetyScore: null }, null)
                          || 'Sorry, assistant unavailable.';
        // save assistant reply
        const saved = await this.addMessage(chatId, { sender: 'assistant', text: replyText });
        assistantMessage = saved.message;
      } catch (err) {
        console.warn('[ChatService] assistant generation failed', err && err.message);
      }
    }

    return { chat, assistantMessage };
  }
}

module.exports = new ChatService();