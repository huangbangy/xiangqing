const service = require('../../utils/service');
const format = require('../../utils/format');

Page({
  data: {
    list: []
  },

  onShow() {
    this.loadFavorites();
  },

  loadFavorites() {
    const list = service.getFavorites().map((item) =>
      Object.assign({}, item, {
        summary: format.profileSummary(item),
        bioShort: format.truncate(item.bio, 36)
      })
    );
    this.setData({ list });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  removeFavorite(event) {
    const userId = event.currentTarget.dataset.userid;
    const result = service.toggleFavorite(userId);
    wx.showToast({
      title: result.message,
      icon: result.ok ? 'success' : 'none'
    });
    this.loadFavorites();
  }
});

