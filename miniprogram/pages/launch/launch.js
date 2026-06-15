const service = require('../../utils/service');
const config = require('../../utils/config');
const cloudService = require('../../utils/cloud-service');

function checkItem(key, label, desc, status, detail) {
  return {
    key,
    label,
    desc,
    status,
    statusText: status === 'pass' ? '通过' : status === 'warn' ? '待确认' : '需处理',
    detail: detail || ''
  };
}

function callCloudPing() {
  return new Promise((resolve) => {
    if (!config.useCloud || !wx.cloud) {
      resolve({
        ok: false,
        message: '云开发未初始化'
      });
      return;
    }
    wx.cloud.callFunction({
      name: 'cloudPing',
      data: {},
      success: (res) => {
        resolve((res && res.result) || {});
      },
      fail: (err) => {
        resolve({
          ok: false,
          message: (err && err.errMsg) || 'cloudPing 调用失败'
        });
      }
    });
  });
}

Page({
  data: {
    loading: false,
    updatedAt: '',
    summary: {
      pass: 0,
      warn: 0,
      fail: 0
    },
    checks: [],
    manualItems: [
      '准备小程序名称、头像、简介、服务类目',
      '准备首页、资料详情、编辑资料、聊天、管理后台截图',
      '在真机预览中完整测试上传图片、提交审核、联系申请和聊天',
      '确认云开发套餐、数据库权限、云存储权限和内容安全能力',
      '准备好用户协议、隐私政策和线下见面安全提示'
    ],
    adminSteps: [
      {
        title: '1. 进入后台',
        text: '在“我的”页面输入管理员口令，进入管理后台。当前 MVP 口令写在 README 中，正式运营前建议改为管理员账号权限。'
      },
      {
        title: '2. 审核资料',
        text: '先看头像、基本资料、自我介绍、择偶要求和联系方式。真实、完整、无违规内容就通过；信息太少、联系方式异常或内容不合适就驳回。'
      },
      {
        title: '3. 处理举报',
        text: '先看举报理由和对象资料。轻微问题可标记处理；资料明显违规先下架；恶意骚扰、虚假资料、诈骗风险直接封禁。'
      },
      {
        title: '4. 日常巡检',
        text: '每天看待审核、举报、封禁用户和公开资料数量。资料质量比数量重要，宁可慢一点，也不要让假资料上首页。'
      }
    ]
  },

  onShow() {
    this.runCheck();
  },

  setResult(checks) {
    const summary = {
      pass: checks.filter((item) => item.status === 'pass').length,
      warn: checks.filter((item) => item.status === 'warn').length,
      fail: checks.filter((item) => item.status === 'fail').length
    };
    this.setData({
      checks,
      summary,
      updatedAt: this.formatNow(),
      loading: false
    });
  },

  formatNow() {
    const date = new Date();
    const pad = (value) => (value < 10 ? `0${value}` : String(value));
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  buildLocalChecks() {
    const checks = [];
    const profile = service.getMyProfile();
    const completion = service.calculateProfileCompletion(profile);
    const favorites = service.getFavorites();
    const inbox = service.getContactRequests('inbox');
    const outbox = service.getContactRequests('outbox');
    const conversations = service.getConversations();
    const admin = service.getAdminSummary();

    checks.push(
      checkItem(
        'appid',
        'AppID 与项目配置',
        '项目已配置真实 AppID，能在微信开发者工具里预览。',
        config.cloudEnv ? 'pass' : 'fail',
        `云环境：${config.cloudEnv || '未配置'}`
      )
    );
    checks.push(
      checkItem(
        'profile',
        '当前账号资料',
        '上线前至少要有一份完整资料用于提审和真机测试。',
        completion.score >= 80 ? 'pass' : 'warn',
        `完整度 ${completion.score}%${completion.missing.length ? `，还差：${completion.missing.slice(0, 3).join('、')}` : ''}`
      )
    );
    checks.push(
      checkItem(
        'legal',
        '协议与隐私入口',
        '用户协议、隐私政策页面已经放在“我的”页面。',
        'pass',
        '提审前仍需确认文字与实际运营方式一致。'
      )
    );
    checks.push(
      checkItem(
        'flow',
        '核心流程数据',
        '收藏、申请、消息会话都有对应入口，方便做完整流程测试。',
        conversations.length || inbox.length || outbox.length || favorites.length ? 'pass' : 'warn',
        `收藏 ${favorites.length}，收到申请 ${inbox.length}，发出申请 ${outbox.length}，会话 ${conversations.length}`
      )
    );
    checks.push(
      checkItem(
        'adminLocal',
        '管理员后台',
        '后台可以审核资料、处理举报、封禁用户。',
        admin.ok ? 'pass' : 'warn',
        admin.ok
          ? `待审核 ${admin.data.pendingProfiles}，待处理举报 ${admin.data.reports}`
          : '请先在“我的”页面输入管理员口令。'
      )
    );
    return checks;
  },

  runCheck() {
    const checks = this.buildLocalChecks();
    this.setData({
      loading: true,
      checks
    });

    if (!cloudService.isReady()) {
      checks.push(
        checkItem(
          'cloudReady',
          '云开发初始化',
          '小程序端需要能调用 wx.cloud。',
          'fail',
          '请确认 app.js 已初始化云环境，并在微信开发者工具中使用真实 AppID。'
        )
      );
      this.setResult(checks);
      return;
    }

    callCloudPing()
      .then((ping) => {
        checks.push(
          checkItem(
            'cloudPing',
            'cloudPing 云函数',
            '用于确认云函数、OPENID、环境 ID 是否可用。',
            ping.ok ? 'pass' : 'fail',
            ping.ok ? `环境 ${ping.env || config.cloudEnv}，OPENID 已获取` : ping.message
          )
        );
        return cloudService.callApi('getCloudSummary', {});
      })
      .then((summary) => {
        const counts = summary.counts || {};
        checks.push(
          checkItem(
            'cloudData',
            '云数据库集合',
            '真实数据库应至少有用户和公开资料，方便完整预览。',
            counts.users && counts.profiles ? 'pass' : 'warn',
            `用户 ${counts.users || 0}，资料 ${counts.profiles || 0}，申请 ${counts.contactRequests || 0}，消息 ${counts.messages || 0}`
          )
        );
        return cloudService.getAdminSummary();
      })
      .then((adminSummary) => {
        const data = adminSummary.data || {};
        checks.push(
          checkItem(
            'adminCloud',
            '云端管理员权限',
            '管理员账号应能查看待审核资料和举报。',
            'pass',
            `待审核 ${data.pendingProfiles || 0}，举报 ${data.reports || 0}，公开资料 ${data.approvedProfiles || 0}`
          )
        );
        this.setResult(checks);
      })
      .catch((err) => {
        checks.push(
          checkItem(
            'cloudApi',
            'xiangqinApi 云函数',
            '用于资料、申请、聊天、举报和后台管理。',
            'warn',
            err.message || '请确认 xiangqinApi 已上传部署，管理员口令已输入。'
          )
        );
        this.setResult(checks);
      });
  },

  goAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  goMe() {
    wx.switchTab({
      url: '/pages/me/me'
    });
  }
});
