const service = require('../../utils/service');
const cloudService = require('../../utils/cloud-service');

const approveRemark = '资料真实完整，审核通过';
const rejectReasons = ['资料信息太少', '照片不清楚或不合适', '联系方式异常', '疑似未获本人授权', '内容含广告或引流'];
const hideReasons = ['资料内容需重新核验', '收到举报需先下架', '疑似虚假资料', '存在安全风险'];

function actionText(action) {
  const map = {
    approve: '通过资料',
    reject: '驳回资料',
    hide: '下架资料',
    resolve: '处理举报',
    ban: '封禁用户'
  };
  return map[action] || action || '处理';
}

function padTime(value) {
  return value < 10 ? `0${value}` : String(value);
}

function formatTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

function normalizeLogs(logs) {
  return (logs || []).map((item) =>
    Object.assign({}, item, {
      actionText: item.actionText || actionText(item.action),
      timeText: item.timeText || formatTime(item.createdAt)
    })
  );
}

Page({
  data: {
    error: '',
    tab: 'pending',
    tabs: [
      { label: '待审核', value: 'pending' },
      { label: '举报', value: 'reports' },
      { label: '用户', value: 'users' },
      { label: '日志', value: 'logs' }
    ],
    summary: {
      pendingProfiles: 0,
      reports: 0,
      bannedUsers: 0,
      approvedProfiles: 0
    },
    pendingProfiles: [],
    reports: [],
    users: [],
    logs: []
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
      if (this.data.tab === 'logs') {
        cloudService
          .getAdminReviewLogs()
          .then((result) => {
            this.setData({
              logs: normalizeLogs(result.data || [])
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
    if (this.data.tab === 'logs') {
      const result = service.getAdminReviewLogs();
      this.setData({
        logs: result.ok ? normalizeLogs(result.data) : []
      });
      return;
    }
    const result = service.listUsers();
    this.setData({
      users: result.ok ? result.data : []
    });
  },

  doReviewProfile(profileId, action, remark) {
    if (cloudService.isReady()) {
      cloudService
        .reviewProfile(profileId, action, remark)
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
    const result = service.reviewProfile(profileId, action, remark);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadAdmin();
  },

  confirmApprove(profileId) {
    wx.showModal({
      title: '确认通过资料',
      content: '请确认该资料真实、成年人、照片合适、无广告和违规内容。',
      confirmText: '通过',
      success: (res) => {
        if (res.confirm) {
          this.doReviewProfile(profileId, 'approve', approveRemark);
        }
      }
    });
  },

  chooseReviewReason(profileId, action) {
    const reasons = action === 'hide' ? hideReasons : rejectReasons;
    wx.showActionSheet({
      itemList: reasons,
      success: (res) => {
        const reason = reasons[res.tapIndex] || '管理员处理';
        const actionText = action === 'hide' ? '下架' : '驳回';
        wx.showModal({
          title: `确认${actionText}资料`,
          content: `原因：${reason}`,
          confirmText: actionText,
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.doReviewProfile(profileId, action, `${actionText}：${reason}`);
            }
          }
        });
      }
    });
  },

  reviewProfile(event) {
    const profileId = event.currentTarget.dataset.id;
    const action = event.currentTarget.dataset.action;
    if (action === 'approve') {
      this.confirmApprove(profileId);
      return;
    }
    this.chooseReviewReason(profileId, action);
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
