const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    tab: 'inbox',
    tabs: [
      { label: '我收到的', value: 'inbox' },
      { label: '我发出的', value: 'outbox' }
    ],
    list: []
  },

  onShow() {
    this.loadRequests();
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this.setData({ tab }, () => {
      this.loadRequests();
    });
  },

  decorateRequests(list) {
    return list.map((item) =>
      Object.assign({}, item, {
        displayProfile:
          (this.data.tab === 'inbox' ? item.fromProfile : item.toProfile) || {
            id: '',
            nickname: '已隐藏用户',
            avatarText: '?',
            avatarColor: '#94a3b8',
            gender: '',
            age: '',
            currentCity: ''
          },
        messageText: item.message || '对方没有留言'
      })
    );
  },

  loadRequests() {
    if (cloudService.isReady()) {
      cloudService
        .getContactRequests(this.data.tab)
        .then((list) => {
          this.setData({ list: this.decorateRequests(list) });
        })
        .catch((err) => {
          console.warn('cloud requests failed, fallback to mock', err);
          const list = this.decorateRequests(service.getContactRequests(this.data.tab));
          this.setData({ list });
        });
      return;
    }
    const list = this.decorateRequests(service.getContactRequests(this.data.tab));
    this.setData({ list });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  goChat(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/chat/chat?id=${id}`
    });
  },

  respond(event) {
    const id = event.currentTarget.dataset.id;
    const decision = event.currentTarget.dataset.decision;
    const current = (this.data.list || []).find((item) => item.id === id);
    if (current && current.isCloud) {
      cloudService
        .respondContactRequest(id, decision)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadRequests();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '处理失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.respondContactRequest(id, decision);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadRequests();
  }
});
