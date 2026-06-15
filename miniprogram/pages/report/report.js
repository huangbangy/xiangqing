const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    targetUserId: '',
    profileId: '',
    profile: null,
    categoryOptions: ['资料造假', '骗子/广告', '骚扰', '色情内容', '其他违规'],
    categoryIndex: 0,
    reason: '',
    evidenceUrls: [],
    uploading: false,
    uploadingText: ''
  },

  onLoad(options) {
    const profileId = options.profileId || options.targetUserId || '';
    const profile = service.getProfile(profileId);
    this.setData({
      profileId,
      targetUserId: options.targetUserId || (profile ? profile.userId : ''),
      profile
    });
    if (cloudService.isReady() && profileId) {
      cloudService
        .getProfile(profileId)
        .then((cloudProfile) => {
          this.setData({
            profile: cloudProfile,
            targetUserId: cloudProfile.userId || this.data.targetUserId
          });
        })
        .catch((err) => {
          console.warn('cloud report profile failed, fallback to mock', err);
        });
    }
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
    if (this.data.uploading) {
      wx.showToast({
        title: '图片上传中，请稍等',
        icon: 'none'
      });
      return;
    }
    const evidenceUrls = this.data.evidenceUrls || [];
    if (evidenceUrls.length >= 3) {
      wx.showToast({
        title: '最多上传 3 张',
        icon: 'none'
      });
      return;
    }
    const remaining = 3 - evidenceUrls.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const selectedPaths = (res.tempFilePaths || []).slice(0, remaining);
        if (!selectedPaths.length) {
          return;
        }
        if (cloudService.canUploadFile()) {
          this.uploadEvidence(selectedPaths, evidenceUrls);
          return;
        }
        this.setData({
          evidenceUrls: evidenceUrls.concat(selectedPaths).slice(0, 3)
        });
      }
    });
  },

  uploadEvidence(localPaths, existingEvidence) {
    this.setUploading('证据上传审核中');
    cloudService
      .uploadImages(localPaths, 'reports')
      .then((fileIDs) => {
        this.clearUploading();
        this.setData({
          evidenceUrls: (existingEvidence || []).concat(fileIDs).slice(0, 3)
        });
        wx.showToast({
          title: `已通过 ${fileIDs.length} 张`,
          icon: 'success'
        });
      })
      .catch((err) => {
        this.clearUploading();
        wx.showToast({
          title: err.message || '证据上传失败',
          icon: 'none'
        });
      });
  },

  setUploading(text) {
    this.setData({
      uploading: true,
      uploadingText: text || '图片上传中'
    });
    wx.showLoading({
      title: text || '图片上传中',
      mask: true
    });
  },

  clearUploading() {
    this.setData({
      uploading: false,
      uploadingText: ''
    });
    wx.hideLoading();
  },

  removeEvidence(event) {
    const index = Number(event.currentTarget.dataset.index);
    const evidenceUrls = this.data.evidenceUrls.slice();
    evidenceUrls.splice(index, 1);
    this.setData({ evidenceUrls });
  },

  submit() {
    if (this.data.uploading) {
      wx.showToast({
        title: '图片上传中，请稍等',
        icon: 'none'
      });
      return;
    }
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
    const payload = {
      targetUserId: this.data.targetUserId,
      profileId: this.data.profileId,
      category: this.data.categoryOptions[this.data.categoryIndex],
      reason: this.data.reason,
      evidenceUrls: this.data.evidenceUrls
    };
    if (cloudService.isReady()) {
      cloudService
        .createReport(payload)
        .then((result) => {
          wx.showToast({
            title: result.message || '举报已提交',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 800);
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '举报提交失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.createReport(payload);
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
