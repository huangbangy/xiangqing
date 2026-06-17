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
      hintText: '',
      tips: []
    },
    reviewFeedback: null,
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
      reviewFeedback: this.buildReviewFeedback(profile),
      mode,
      profileCompletion: Object.assign({}, completion, {
        missingText,
        hintText,
        tips: this.buildProfileTips(profile, completion)
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
            reviewFeedback: this.buildReviewFeedback(cloudProfile),
            profileCompletion: Object.assign({}, cloudCompletion, {
              missingText: cloudMissingText,
              hintText: cloudCompletion.missing.length ? `还差：${cloudMissingText}` : cloudMissingText,
              tips: this.buildProfileTips(cloudProfile, cloudCompletion)
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

  buildProfileTips(profile, completion) {
    const current = profile || {};
    const tips = [];
    if (!current.avatarUrl) {
      tips.push('上传一张清晰头像，别人更愿意认真看资料。');
    }
    if (!Array.isArray(current.photos) || !current.photos.length) {
      tips.push('补充 1-3 张生活照，能明显提升可信度。');
    }
    if (!current.lifeRhythm || !current.relationshipView || !current.weekendPlan) {
      tips.push('补齐“三句话认识我”，比长篇介绍更容易被记住。');
    }
    if (!current.matchAnswerCount && (!current.matchAnswers || !Object.keys(current.matchAnswers).length)) {
      tips.push('回答缘分问答，系统能生成更自然的开场白。');
    }
    if (completion && completion.score >= 90) {
      tips.push('资料质量已经不错，下一步可以等待审核或主动浏览合适的人。');
    }
    return tips.slice(0, 3);
  },

  buildReviewFeedback(profile) {
    const current = profile || {};
    if (current.reviewStatus === 'rejected') {
      return {
        title: '资料未通过审核',
        text: current.reviewRemark || '资料暂未通过，请根据审核要求修改后重新提交。',
        tone: 'warn',
        actionText: '修改后重新提交'
      };
    }
    if (current.reviewStatus === 'hidden') {
      return {
        title: '资料已下架',
        text: current.reviewRemark || '资料已下架，请修改后重新提交审核。',
        tone: 'danger',
        actionText: '修改资料'
      };
    }
    if (current.reviewStatus === 'pending') {
      return {
        title: '资料审核中',
        text: '管理员会先确认资料真实性和内容安全，审核通过后才会公开展示。',
        tone: 'info',
        actionText: ''
      };
    }
    return null;
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

  goLaunchCheck() {
    wx.navigateTo({
      url: '/pages/launch/launch'
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
