const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');
const match = require('../../utils/match');

Page({
  data: {
    id: '',
    conversation: null,
    messages: [],
    input: '',
    quickReplies: [],
    scrollIntoView: ''
  },

  onLoad(options) {
    this.setData({
      id: options.id || ''
    });
  },

  onShow() {
    this.loadConversation();
  },

  loadConversation() {
    if (cloudService.isReady()) {
      cloudService
        .getConversation(this.data.id)
        .then((conversation) => {
          this.applyConversation(conversation);
        })
        .catch((err) => {
          console.warn('cloud conversation failed, fallback to mock', err);
          const conversation = service.getConversation(this.data.id);
          if (!conversation) {
            wx.showToast({
              title: '会话不存在',
              icon: 'none'
            });
            return;
          }
          this.applyConversation(conversation);
        });
      return;
    }
    const conversation = service.getConversation(this.data.id);
    if (!conversation) {
      wx.showToast({
        title: '会话不存在',
        icon: 'none'
      });
      return;
    }
    this.applyConversation(conversation);
  },

  applyConversation(conversation) {
    const quickReplies = match.buildIcebreakers(conversation.peerProfile, conversation.channel || 'self');
    const messages = conversation.messages || [];
    this.setData({
      conversation,
      messages,
      quickReplies,
      scrollIntoView: messages.length ? `msg-${messages[messages.length - 1].id}` : ''
    });
  },

  onInput(event) {
    this.setData({
      input: event.detail.value
    });
  },

  useQuickReply(event) {
    this.setData({
      input: event.currentTarget.dataset.text || ''
    });
  },

  sendMessage() {
    if (this.data.conversation && this.data.conversation.isCloud) {
      cloudService
        .sendMessage(this.data.id, this.data.input)
        .then((result) => {
          wx.showToast({
            title: result.message || '已发送',
            icon: 'success'
          });
          this.setData({
            input: ''
          });
          this.loadConversation();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '发送失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.sendMessage(this.data.id, this.data.input);
    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      });
      return;
    }
    this.setData({
      input: ''
    });
    this.loadConversation();
  },

  goProfile() {
    const conversation = this.data.conversation;
    if (!conversation || !conversation.peerProfile || !conversation.peerProfile.id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${conversation.peerProfile.id}`
    });
  }
});
