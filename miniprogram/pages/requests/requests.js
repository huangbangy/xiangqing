const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    tab: 'inbox',
    tabs: [
      { label: '我收到的', value: 'inbox' },
      { label: '我发出的', value: 'outbox' }
    ],
    summary: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0
    },
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
        messageText: item.message || '对方没有留言',
        messageQuality: this.messageQuality(item.message),
        statusHint: this.statusHint(item)
      })
    );
  },

  messageQuality(message) {
    const text = String(message || '').trim();
    if (!text) {
      return {
        text: '未写留言',
        tone: 'warn'
      };
    }
    if (text.length >= 24) {
      return {
        text: '留言较认真',
        tone: 'good'
      };
    }
    return {
      text: '留言偏简短',
      tone: 'soft'
    };
  },

  statusHint(item) {
    const channelText = item.channel === 'parent' ? '家长联系方式' : '联系方式';
    if (item.status === 'accepted') {
      return `已同意，双方可查看${channelText}并站内聊天。`;
    }
    if (item.status === 'rejected') {
      return '已拒绝，本次申请不会继续推进。';
    }
    if (this.data.tab === 'inbox') {
      return `同意后，对方将可查看你的${channelText}。`;
    }
    return '等待对方处理，未同意前不会展示联系方式。';
  },

  requestSummary(list) {
    const result = {
      total: list.length,
      pending: 0,
      accepted: 0,
      rejected: 0
    };
    list.forEach((item) => {
      if (item.status === 'pending') {
        result.pending += 1;
      } else if (item.status === 'accepted') {
        result.accepted += 1;
      } else if (item.status === 'rejected') {
        result.rejected += 1;
      }
    });
    return result;
  },

  loadRequests() {
    if (cloudService.isReady()) {
      cloudService
        .getContactRequests(this.data.tab)
        .then((list) => {
          const decorated = this.decorateRequests(list);
          this.setData({
            list: decorated,
            summary: this.requestSummary(decorated)
          });
        })
        .catch((err) => {
          console.warn('cloud requests failed, fallback to mock', err);
          const list = this.decorateRequests(service.getContactRequests(this.data.tab));
          this.setData({
            list,
            summary: this.requestSummary(list)
          });
        });
      return;
    }
    const list = this.decorateRequests(service.getContactRequests(this.data.tab));
    this.setData({
      list,
      summary: this.requestSummary(list)
    });
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
    if (!current) {
      wx.showToast({
        title: '申请不存在',
        icon: 'none'
      });
      return;
    }
    this.confirmRespond(current, decision).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.submitRespond(current, decision);
    });
  },

  confirmRespond(current, decision) {
    return new Promise((resolve) => {
      const isAccept = decision === 'accept';
      const channelText = current.channel === 'parent' ? '家长联系方式' : '联系方式';
      wx.showModal({
        title: isAccept ? '确认同意申请' : '确认拒绝申请',
        content: isAccept
          ? `同意后，双方可以站内聊天，并可查看${channelText}。请确认已认真看过对方资料。`
          : '拒绝后，本次申请不会继续推进。对方不会看到你的联系方式。',
        confirmText: isAccept ? '同意' : '拒绝',
        cancelText: '再看看',
        success: (res) => {
          resolve(!!res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  },

  submitRespond(current, decision) {
    const id = current.id;
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
