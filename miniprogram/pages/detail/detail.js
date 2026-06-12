const service = require('../../utils/service');
const format = require('../../utils/format');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    id: '',
    profile: null,
    message: '你好，看到你的资料，想认识一下。',
    statusText: '',
    loading: false,
    greetingTemplates: [
      {
        label: '生活节奏',
        text: '你好，看到你的资料，感觉我们的生活节奏挺接近，想简单认识一下。'
      },
      {
        label: '同城开场',
        text: '你好，我们都在新化这边，感觉可以先聊聊，看看是否合适。'
      },
      {
        label: '认真了解',
        text: '你好，我认真看了你的资料，觉得择偶想法比较真诚，想进一步了解一下。'
      }
    ]
  },

  onLoad(options) {
    this.setData({
      id: options.id || ''
    });
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const viewerMode = service.getViewerMode();
    if (cloudService.isReady()) {
      this.setData({ loading: true });
      cloudService
        .getProfile(this.data.id, viewerMode)
        .then((profile) => {
          service.recordProfileView(profile.userId);
          this.applyProfile(profile);
        })
        .catch((err) => {
          console.warn('cloud get profile failed, fallback to mock', err);
          this.loadLocalProfile();
        });
      return;
    }
    this.loadLocalProfile();
  },

  loadLocalProfile() {
    const profile = service.getProfile(this.data.id);
    if (!profile) {
      wx.showToast({
        title: '资料不存在',
        icon: 'none'
      });
      return;
    }
    service.recordProfileView(profile.userId);
    this.applyProfile(profile);
  },

  applyProfile(profile) {
    const greetingTemplates =
      profile.contactChannel === 'parent'
        ? [
            {
              label: '家长开场',
              text: '你好，我是家长，想帮成年子女先了解一下双方基本情况。'
            },
            {
              label: '同城了解',
              text: '你好，我们也在新化这边，想先和家长简单沟通一下。'
            },
            {
              label: '认真沟通',
              text: '你好，看到资料感觉比较合适，想先了解一下家庭和孩子本人的想法。'
            }
          ]
        : [
            {
              label: '生活节奏',
              text: '你好，看到你的资料，感觉我们的生活节奏挺接近，想简单认识一下。'
            },
            {
              label: '同城开场',
              text: '你好，我们都在新化这边，感觉可以先聊聊，看看是否合适。'
            },
            {
              label: '认真了解',
              text: '你好，我认真看了你的资料，觉得择偶想法比较真诚，想进一步了解一下。'
            }
          ];
    this.setData({
      greetingTemplates,
      message: greetingTemplates[0].text,
      loading: false,
      profile: Object.assign({}, profile, {
        statusText: format.formatStatus(profile.reviewStatus),
        heightText: format.formatHeight(profile.height),
        childrenText: profile.hasChildren ? '有孩子' : '无孩子',
        summary: format.profileSummary(profile),
        contactButtonText: profile.contactActionText,
        lockedContactText:
          profile.contactChannel === 'parent'
            ? '双方同意家长沟通申请后，这里才会显示家长联系方式。'
            : '对方同意联系申请后，这里才会显示联系方式。'
      })
    });
  },

  onMessageInput(event) {
    this.setData({
      message: event.detail.value
    });
  },

  useGreetingTemplate(event) {
    const text = event.currentTarget.dataset.text;
    this.setData({
      message: text
    });
  },

  toggleFavorite() {
    const profile = this.data.profile;
    if (profile.isCloud) {
      cloudService
        .toggleFavorite(profile.userId)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadProfile();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '收藏失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.toggleFavorite(profile.userId);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadProfile();
  },

  contact() {
    const profile = this.data.profile;
    if (profile.isCloud) {
      if (profile.canViewContact) {
        this.goChat();
        return;
      }
      cloudService
        .createContactRequest({
          toUserId: profile.userId,
          message: this.data.message,
          channel: profile.contactChannel,
          viewerMode: service.getViewerMode()
        })
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadProfile();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '申请失败',
            icon: 'none'
          });
        });
      return;
    }
    if (profile.canViewContact) {
      this.goChat();
      return;
    }
    const result = service.createContactRequest({
      toUserId: profile.userId,
      message: this.data.message,
      channel: profile.contactChannel
    });
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadProfile();
  },

  goChat() {
    const profile = this.data.profile;
    if (profile.isCloud) {
      if (!profile.conversationId) {
        wx.showToast({
          title: '请先等待对方同意',
          icon: 'none'
        });
        return;
      }
      wx.navigateTo({
        url: `/pages/chat/chat?id=${profile.conversationId}`
      });
      return;
    }
    const conversation = profile.conversationId
      ? { id: profile.conversationId }
      : service.getConversationByProfile(profile.userId, profile.contactChannel);
    if (!conversation || !conversation.id) {
      wx.showToast({
        title: '请先等待对方同意',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/chat?id=${conversation.id}`
    });
  },

  report() {
    const profile = this.data.profile;
    wx.navigateTo({
      url: `/pages/report/report?targetUserId=${profile.userId}&profileId=${profile.id}`
    });
  },

  onShareAppMessage() {
    const profile = this.data.profile;
    return {
      title: profile ? `${profile.nickname}的相亲资料` : '新化相亲',
      path: profile ? `/pages/detail/detail?id=${profile.id}` : '/pages/index/index'
    };
  }
});
