const service = require('../../utils/service');

Page({
  data: {
    targetUserId: '',
    profile: null,
    categoryOptions: ['资料造假', '骗子/广告', '骚扰', '色情内容', '其他违规'],
    categoryIndex: 0,
    reason: '',
    evidenceUrls: []
  },

  onLoad(options) {
    const profile = service.getProfile(options.profileId || options.targetUserId);
    this.setData({
      targetUserId: options.targetUserId || (profile ? profile.userId : ''),
      profile
    });
  },

  onCategoryChange(event) {
    this.setData({
      categoryIndex: Number(event.detail.value)
    });
  },

  onReasonInput(event) {
    this.setData({
      reason: event.detail.value
    });
  },

  chooseEvidence() {
    const evidenceUrls = this.data.evidenceUrls || [];
    wx.chooseImage({
      count: Math.max(1, 3 - evidenceUrls.length),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          evidenceUrls: evidenceUrls.concat(res.tempFilePaths).slice(0, 3)
        });
      }
    });
  },

  removeEvidence(event) {
    const index = Number(event.currentTarget.dataset.index);
    const evidenceUrls = this.data.evidenceUrls.slice();
    evidenceUrls.splice(index, 1);
    this.setData({ evidenceUrls });
  },

  submit() {
    if (!this.data.targetUserId) {
      wx.showToast({
        title: '举报对象不存在',
        icon: 'none'
      });
      return;
    }
    if (!this.data.reason.trim()) {
      wx.showToast({
        title: '请填写举报说明',
        icon: 'none'
      });
      return;
    }
    const result = service.createReport({
      targetUserId: this.data.targetUserId,
      category: this.data.categoryOptions[this.data.categoryIndex],
      reason: this.data.reason,
      evidenceUrls: this.data.evidenceUrls
    });
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    if (result.ok) {
      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    }
  }
});

