const config = require('./utils/config');
const service = require('./utils/service');

App({
  onLaunch() {
    this.globalData = {
      cloudReady: false,
      user: null,
      filters: null
    };

    if (config.useCloud && wx.cloud) {
      try {
        wx.cloud.init({
          env: config.cloudEnv || 'cloud1-xxxx',
          traceUser: true
        });
        this.globalData.cloudReady = true;
      } catch (err) {
        console.warn('cloud init failed', err);
      }
    }

    this.globalData.user = service.getCurrentUser();
    this.globalData.filters = service.getSavedFilters();
  }
});

