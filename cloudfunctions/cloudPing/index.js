const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async () => {
  const wxContext = cloud.getWXContext();

  return {
    ok: true,
    message: 'cloud ready',
    env: wxContext.ENV,
    appid: wxContext.APPID,
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || '',
    timestamp: new Date().toISOString()
  };
};
