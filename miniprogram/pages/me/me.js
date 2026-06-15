const service = require('../../utils/service');
const format = require('../../utils/format');
const config = require('../../utils/config');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    user: null,
    profile: null,
    recentViews: [],
    statusText: '',
    counts: {
      favorites: 0,
      inbox: 0,
      outbox: 0,
      messages: 0
    },
    profileCompletion: {
      score: 0,
      missing: [],
      missingText: '',
      hintText: ''
    },
    mode: 'self',
    modeOptions: [
      {
        label: '本人模式',
        value: 'self',
        desc: '我自己看资料、发起联系'
      },
      {
        label: '家长代看',
        value: 'parent',
        desc: '我帮成年子女看看，优先发起家长沟通'
      }
    ],
    adminCode: '',
    cloudEnv: config.cloudEnv,
    cloudEnabled: config.useCloud
  },

  onShow() {
    this.loadMe();
  },

  loadMe() {
    const user = service.getCurrentUser();
    const profile = service.getMyProfile();
    const favorites = service.getFavorites();
    const inbox = service.getContactRequests('inbox');
    const outbox = service.getContactRequests('outbox');
    const conversations = service.getConversations();
    const mode = service.getViewerMode();
    const completion = service.calculateProfileCompletion(profile);
    const recentViews = service.getRecentViews(4).map((item) =>
      Object.assign({}, item, {
        summary: format.profileSummary(item),
        bioShort: format.truncate(item.bio, 30)
      })
    );
    const missingText = completion.missing.length
      ? `${completion.missing.slice(0, 4).join('、')}${completion.missing.length > 4 ? ' 等' : ''}`
      : '关键资料已补齐';
    const hintText = completion.missing.length ? `还差：${missingText}` : missingText;
    this.setData({
      user,
      profile,
      recentViews,
      statusText: format.formatStatus(profile.reviewStatus),
      mode,
      profileCompletion: Object.assign({}, completion, {
        missingText,
        hintText
      }),
      counts: {
        favorites: favorites.length,
        inbox: inbox.length,
        outbox: outbox.length,
        messages: conversations.length
      }
    });
    if (cloudService.isReady()) {
      Promise.all([
        cloudService.getMyProfile(),
        cloudService.getContactRequests('inbox'),
        cloudService.getContactRequests('outbox'),
        cloudService.getConversations()
      ])
        .then((result) => {
          const cloudProfile = result[0];
          const cloudInbox = result[1];
          const cloudOutbox = result[2];
          const cloudConversations = result[3];
          const cloudCompletion = service.calculateProfileCompletion(cloudProfile);
          const cloudMissingText = cloudCompletion.missing.length
            ? `${cloudCompletion.missing.slice(0, 4).join('、')}${cloudCompletion.missing.length > 4 ? ' 等' : ''}`
            : '关键资料已补齐';
          this.setData({
            profile: cloudProfile,
            statusText: format.formatStatus(cloudProfile.reviewStatus),
            profileCompletion: Object.assign({}, cloudCompletion, {
              missingText: cloudMissingText,
              hintText: cloudCompletion.missing.length ? `还差：${cloudMissingText}` : cloudMissingText
            }),
            counts: {
              favorites: favorites.length,
              inbox: cloudInbox.length,
              outbox: cloudOutbox.length,
              messages: cloudConversations.length
            }
          });
        })
        .catch((err) => {
          console.warn('cloud me failed, keep mock data', err);
        });
    }
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode;
    const result = service.setViewerMode(mode);
    this.setData({
      mode: result.mode
    });
    wx.showToast({
      title: result.label,
      icon: 'none'
    });
  },

  goIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  goEdit() {
    wx.navigateTo({
      url: '/pages/edit/edit'
    });
  },

  goFavorites() {
    wx.switchTab({
      url: '/pages/favorites/favorites'
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

  goRequests() {
    wx.switchTab({
      url: '/pages/requests/requests'
    });
  },

  goMessages() {
    wx.switchTab({
      url: '/pages/messages/messages'
    });
  },

  goLegal(event) {
    const type = event.currentTarget.dataset.type || 'terms';
    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`
    });
  },

  onAdminCodeInput(event) {
    this.setData({
      adminCode: event.detail.value
    });
  },

  enterAdmin() {
    if (cloudService.isReady()) {
      cloudService
        .setAdminByCode(this.data.adminCode)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          if (result.ok) {
            wx.navigateTo({
              url: '/pages/admin/admin'
            });
          }
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '进入失败',
            icon: 'none'
          });
        });
      return;
    }
    if (this.data.user && this.data.user.role === 'admin') {
      wx.navigateTo({
        url: '/pages/admin/admin'
      });
      return;
    }
    const result = service.setAdminByCode(this.data.adminCode);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    if (result.ok) {
      this.loadMe();
      wx.navigateTo({
        url: '/pages/admin/admin'
      });
    }
  },

  testCloud() {
    if (!config.useCloud || !wx.cloud) {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({
      title: '检测中'
    });
    wx.cloud.callFunction({
      name: 'cloudPing',
      data: {},
      success: (res) => {
        const result = (res && res.result) || {};
        wx.hideLoading();
        wx.showModal({
          title: result.ok ? '云开发已连通' : '云开发异常',
          content: `环境：${result.env || config.cloudEnv}\nOPENID：${result.openid || '未获取到'}`,
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({
          title: '云函数未连通',
          content: `请先在开发者工具里上传 cloudPing 云函数。\n${err && err.errMsg ? err.errMsg : ''}`,
          showCancel: false
        });
      }
    });
  },

  initCloudDatabase() {
    this.callXiangqinApi('initDatabase', '初始化真实数据库');
  },

  checkCloudDatabase() {
    this.callXiangqinApi('getCloudSummary', '查看云数据库');
  },

  callXiangqinApi(action, title) {
    if (!config.useCloud || !wx.cloud) {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'none'
      });
      return;
    }
    wx.showLoading({
      title: '处理中'
    });
    wx.cloud.callFunction({
      name: 'xiangqinApi',
      data: {
        action
      },
      success: (res) => {
        const result = (res && res.result) || {};
        const counts = result.counts || {};
        wx.hideLoading();
        if (!result.ok) {
          wx.showModal({
            title: title || '云数据库',
            content: result.message || '云函数执行失败',
            showCancel: false
          });
          return;
        }
        wx.showModal({
          title: title || '云数据库',
          content: `资料 ${counts.profiles || 0} 条\n用户 ${counts.users || 0} 条\n申请 ${counts.contactRequests || 0} 条\n消息 ${counts.messages || 0} 条`,
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({
          title: '云数据库未连通',
          content: `请先上传 xiangqinApi 云函数。\n${err && err.errMsg ? err.errMsg : ''}`,
          showCancel: false
        });
      }
    });
  }
});
