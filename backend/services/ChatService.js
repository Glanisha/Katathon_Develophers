const Chat = require('../models/Chat');
const GeminiService = require('./GeminiService');

class ChatService {
  // List all chats where the user is either:
  // - in participants.userId, OR
  // - the owner of the chat
  async listForUser(userId) {
    return Chat.find({
      $or: [
        { 'participants.userId': userId },
        { owner: userId }
      ]
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getById(chatId) {
    return Chat.findById(chatId).lean();
  }

  async createChat(ownerId, { participants = [], context = {} } = {}) {
    // ensure owner is also in participants (in case frontend forgot)
    const alreadyHasOwner = participants.some(
      (p) => String(p.userId) === String(ownerId)
    );

    const finalParticipants = alreadyHasOwner
      ? participants
      : [{ userId: ownerId, name: 'Owner' }, ...participants];

    const chat = new Chat({
      owner: ownerId,
      participants: finalParticipants,
      context,
      messages: []
    });

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

  // add user message, optionally generate assistant reply
  async handleUserMessage(
    chatId,
    user,
    text,
    options = { generateReply: true, replyContext: null }
  ) {
    // save user message
    const { chat } = await this.addMessage(chatId, {
      sender: 'user',
      userId: user._id,
      text
    });

    let assistantMessage = null;

    // 🔒 Do NOT generate AI reply for friend-to-friend chats
    const isFriendChat = chat?.context?.type === 'friend';
    const shouldGenerateReply = options?.generateReply && !isFriendChat;

    if (shouldGenerateReply) {
      try {
        const replyText =
          (await GeminiService.generateReply?.(text, {
            chatContext: chat.context,
            replyContext: options.replyContext
          })) ||
          (await GeminiService.generateRouteCommentary?.(
            'chat',
            { safetyScore: null },
            null
          )) ||
          'Sorry, assistant unavailable.';

        const saved = await this.addMessage(chatId, {
          sender: 'assistant',
          text: replyText
        });
        assistantMessage = saved.message;
      } catch (err) {
        console.warn('[ChatService] assistant generation failed', err && err.message);
      }
    }

    return { chat, assistantMessage };
  }
}

module.exports = new ChatService();
