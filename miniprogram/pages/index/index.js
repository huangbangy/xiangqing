const service = require('../../utils/service');
const format = require('../../utils/format');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    keyword: '',
    filters: {},
    filterSummary: '全部',
    viewerMode: 'self',
    viewerModeText: '本人模式',
    recommendations: [],
    recommendationStats: {
      total: 0,
      available: 0,
      hiddenCount: 0
    },
    list: [],
    loading: false,
    dataSourceText: '本地演示'
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    const filters = service.getSavedFilters();
    const viewerMode = service.getViewerMode();
    const keyword = this.data.keyword || filters.keyword || '';
    const nextFilters = Object.assign({}, filters, { keyword });
    this.setData({
      loading: true,
      keyword,
      filters: nextFilters,
      filterSummary: format.filterSummary(nextFilters),
      viewerMode,
      viewerModeText: viewerMode === 'parent' ? '家长代看' : '本人模式'
    });
    if (cloudService.isReady()) {
      cloudService
        .listProfiles(nextFilters, viewerMode)
        .then((profiles) => {
          const list = profiles.map((item) =>
            Object.assign({}, item, {
              summary: format.profileSummary(item),
              bioShort: format.truncate(item.bio, 42),
              introShort: format.truncate(item.introSnippet, 36),
              lifestyleTags: (item.lifestyleTags || []).slice(0, 4),
              contactButtonText: item.contactActionText
            })
          );
          const recommendations = list.slice(0, 3).map((item, index) =>
            Object.assign({}, cloudService.addRecommendationMeta(item, index), {
              lifestyleTags: (item.lifestyleTags || []).slice(0, 3),
              contactButtonText: item.contactActionText
            })
          );
          this.setData({
            recommendations,
            recommendationStats: {
              total: list.length,
              available: list.length,
              hiddenCount: 0
            },
            list,
            visibleCount: list.length,
            dataSourceText: '云端资料',
            loading: false
          });
        })
        .catch((err) => {
          console.warn('cloud list profiles failed, fallback to mock', err);
          this.loadLocalList(nextFilters, viewerMode, keyword);
        });
      return;
    }
    this.loadLocalList(nextFilters, viewerMode, keyword);
  },

  loadLocalList(nextFilters, viewerMode, keyword) {
    const recommendationStats = service.getRecommendationStats();
    const recommendations = service.getRecommendedProfiles(3).map((item) =>
      Object.assign({}, item, {
        summary: format.profileSummary(item),
        lifestyleTags: (item.lifestyleTags || []).slice(0, 3),
        contactButtonText: item.contactActionText
      })
    );
    const list = service.listProfiles(nextFilters).map((item) =>
      Object.assign({}, item, {
        summary: format.profileSummary(item),
        bioShort: format.truncate(item.bio, 42),
        introShort: format.truncate(item.introSnippet, 36),
        lifestyleTags: (item.lifestyleTags || []).slice(0, 4),
        contactButtonText: item.contactActionText
      })
    );
    this.setData({
      keyword,
      filters: nextFilters,
      filterSummary: format.filterSummary(nextFilters),
      viewerMode,
      viewerModeText: viewerMode === 'parent' ? '家长代看' : '本人模式',
      recommendations,
      recommendationStats,
      list,
      visibleCount: list.length,
      dataSourceText: '本地演示',
      loading: false
    });
  },

  onKeywordInput(event) {
    this.setData({
      keyword: event.detail.value
    });
  },

  onSearch() {
    const nextFilters = Object.assign({}, service.getSavedFilters(), {
      keyword: this.data.keyword
    });
    service.saveFilters(nextFilters);
    this.loadList();
  },

  goFilter() {
    wx.navigateTo({
      url: '/pages/filter/filter'
    });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  goEdit() {
    wx.navigateTo({
      url: '/pages/edit/edit'
    });
  },

  goMe() {
    wx.switchTab({
      url: '/pages/me/me'
    });
  },

  findDisplayedProfile(userId) {
    const list = (this.data.list || []).concat(this.data.recommendations || []);
    return list.find((item) => item.userId === userId) || null;
  },

  toggleFavorite(event) {
    const userId = event.currentTarget.dataset.userid;
    const profile = this.findDisplayedProfile(userId);
    if (profile && profile.isCloud) {
      cloudService
        .toggleFavorite(userId)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadList();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '收藏失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.toggleFavorite(userId);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadList();
  },

  nextRecommendations() {
    const result = service.nextRecommendationBatch(3);
    wx.showToast({
      title: result.message,
      icon: 'none'
    });
    this.loadList();
  },

  dismissRecommendation(event) {
    const userId = event.currentTarget.dataset.userid;
    const result = service.dismissRecommendation(userId);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadList();
  },

  resetRecommendations() {
    const result = service.resetRecommendationPreferences();
    wx.showToast({
      title: result.message,
      icon: 'success'
    });
    this.loadList();
  },

  contact(event) {
    const userId = event.currentTarget.dataset.userid;
    const profile = this.findDisplayedProfile(userId);
    if (profile && profile.isCloud) {
      const viewerMode = service.getViewerMode();
      cloudService
        .createContactRequest({
          toUserId: userId,
          channel: profile.contactChannel,
          viewerMode,
          message:
            viewerMode === 'parent'
              ? '你好，我是家长，想帮成年子女先了解一下双方基本情况。'
              : '你好，看到你的资料，想认识一下。'
        })
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadList();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '申请失败',
            icon: 'none'
          });
        });
      return;
    }
    const viewerMode = service.getViewerMode();
    const result = service.createContactRequest({
      toUserId: userId,
      message:
        viewerMode === 'parent'
          ? '你好，我是家长，想帮成年子女先了解一下双方基本情况。'
          : '你好，看到你的资料，想认识一下。'
    });
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadList();
  }
});
