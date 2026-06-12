const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

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
    const quickReplies =
      conversation.channel === 'parent'
        ? [
            '方便先介绍一下孩子的基本情况吗？',
            '我们也在新化，可以先了解双方家庭情况。',
            '如果孩子本人也愿意，我们再安排双方沟通。'
          ]
        : [
            '可以先聊聊平时生活节奏吗？',
            '我认真看了资料，想多了解你的择偶想法。',
            '如果聊得合适，我们再慢慢约时间见面。'
          ];
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
