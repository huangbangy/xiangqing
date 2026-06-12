const service = require('../../utils/service');
const format = require('../../utils/format');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    list: []
  },

  onShow() {
    this.loadMessages();
  },

  loadMessages() {
    if (cloudService.isReady()) {
      cloudService
        .getConversations()
        .then((list) => {
          this.setData({ list: this.decorateConversations(list) });
        })
        .catch((err) => {
          console.warn('cloud conversations failed, fallback to mock', err);
          this.setData({ list: this.decorateConversations(service.getConversations()) });
        });
      return;
    }
    const list = this.decorateConversations(service.getConversations());
    this.setData({ list });
  },

  decorateConversations(list) {
    return list.map((item) => {
      const peerProfile = item.peerProfile || {};
      return Object.assign({}, item, {
        peerProfile: Object.assign({}, peerProfile, {
          bioShort: format.truncate(peerProfile.introSnippet || peerProfile.bio || '', 34)
        })
      });
    });
  },

  goChat(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/chat?id=${id}`
    });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  goIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
