const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

Page({
  data: {
    error: '',
    tab: 'pending',
    tabs: [
      { label: '待审核', value: 'pending' },
      { label: '举报', value: 'reports' },
      { label: '用户', value: 'users' }
    ],
    summary: {
      pendingProfiles: 0,
      reports: 0,
      bannedUsers: 0,
      approvedProfiles: 0
    },
    pendingProfiles: [],
    reports: [],
    users: []
  },

  onShow() {
    this.loadAdmin();
  },

  loadAdmin() {
    if (cloudService.isReady()) {
      cloudService
        .getAdminSummary()
        .then((summary) => {
          this.setData({
            error: '',
            summary: summary.data
          });
          this.loadTab();
        })
        .catch((err) => {
          this.setData({
            error: err.message || '没有管理员权限'
          });
        });
      return;
    }
    const summary = service.getAdminSummary();
    if (!summary.ok) {
      this.setData({
        error: summary.message
      });
      return;
    }
    this.setData({
      error: '',
      summary: summary.data
    });
    this.loadTab();
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this.setData({ tab }, () => {
      this.loadTab();
    });
  },

  goLaunchGuide() {
    wx.navigateTo({
      url: '/pages/launch/launch'
    });
  },

  loadTab() {
    if (cloudService.isReady()) {
      if (this.data.tab === 'pending') {
        cloudService
          .getAdminPendingProfiles()
          .then((result) => {
            this.setData({
              pendingProfiles: result.data || []
            });
          })
          .catch((err) => {
            wx.showToast({
              title: err.message || '加载失败',
              icon: 'none'
            });
          });
        return;
      }
      if (this.data.tab === 'reports') {
        cloudService
          .getAdminReports()
          .then((result) => {
            this.setData({
              reports: result.data || []
            });
          })
          .catch((err) => {
            wx.showToast({
              title: err.message || '加载失败',
              icon: 'none'
            });
          });
        return;
      }
      cloudService
        .listUsers()
        .then((result) => {
          this.setData({
            users: result.data || []
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '加载失败',
            icon: 'none'
          });
        });
      return;
    }
    if (this.data.tab === 'pending') {
      const result = service.getAdminPendingProfiles();
      this.setData({
        pendingProfiles: result.ok ? result.data : []
      });
      return;
    }
    if (this.data.tab === 'reports') {
      const result = service.getAdminReports();
      this.setData({
        reports: result.ok ? result.data : []
      });
      return;
    }
    const result = service.listUsers();
    this.setData({
      users: result.ok ? result.data : []
    });
  },

  reviewProfile(event) {
    const profileId = event.currentTarget.dataset.id;
    const action = event.currentTarget.dataset.action;
    if (cloudService.isReady()) {
      cloudService
        .reviewProfile(profileId, action, `管理员${action}`)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadAdmin();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '处理失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.reviewProfile(profileId, action, `管理员${action}`);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadAdmin();
  },

  resolveReport(event) {
    const reportId = event.currentTarget.dataset.id;
    const mode = event.currentTarget.dataset.mode;
    const payload = {
      remark: '举报处理'
    };
    if (mode === 'hide') {
      payload.hideTarget = true;
      payload.remark = '举报处理：下架资料';
    }
    if (mode === 'ban') {
      payload.hideTarget = true;
      payload.banTarget = true;
      payload.remark = '举报处理：封禁用户';
    }
    if (cloudService.isReady()) {
      cloudService
        .resolveReport(reportId, payload)
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadAdmin();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '处理失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.resolveReport(reportId, payload);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadAdmin();
  },

  banUser(event) {
    const userId = event.currentTarget.dataset.userid;
    if (cloudService.isReady()) {
      cloudService
        .banUser(userId, '管理员后台封禁')
        .then((result) => {
          wx.showToast({
            title: result.message,
            icon: result.ok ? 'success' : 'none'
          });
          this.loadAdmin();
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '封禁失败',
            icon: 'none'
          });
        });
      return;
    }
    const result = service.banUser(userId, '管理员后台封禁');
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadAdmin();
  }
});
