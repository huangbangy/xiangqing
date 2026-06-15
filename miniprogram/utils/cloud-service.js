const config = require('./config');
const format = require('./format');
const match = require('./match');

function isReady() {
  return !!(config.useCloud && typeof wx !== 'undefined' && wx.cloud && wx.cloud.callFunction);
}

function canUploadFile() {
  return !!(config.useCloud && typeof wx !== 'undefined' && wx.cloud && wx.cloud.uploadFile);
}

function isStoredFilePath(path) {
  const text = String(path || '');
  return text.indexOf('cloud://') === 0 || text.indexOf('https://') === 0;
}

function fileExtension(path) {
  const cleanPath = String(path || '').split('?')[0].split('#')[0];
  const match = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (allowed.indexOf(ext) < 0) {
    return 'jpg';
  }
  return ext === 'jpeg' ? 'jpg' : ext;
}

function padDate(value) {
  return value < 10 ? `0${value}` : String(value);
}

function safeFolderName(value) {
  return String(value || 'profiles').replace(/[^a-zA-Z0-9_-]/g, '') || 'profiles';
}

function buildCloudPath(localPath, folder) {
  const date = new Date();
  const day = `${date.getFullYear()}${padDate(date.getMonth() + 1)}${padDate(date.getDate())}`;
  const random = Math.floor(Math.random() * 1000000);
  return `xiangqin/${safeFolderName(folder)}/${day}/${Date.now()}_${random}.${fileExtension(localPath)}`;
}

function uploadToCloud(localPath, folder) {
  const cloudPath = buildCloudPath(localPath, folder);
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: localPath,
      success: (res) => {
        if (res && res.fileID) {
          resolve({
            fileID: res.fileID,
            cloudPath
          });
        } else {
          reject(new Error('上传图片失败'));
        }
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '上传图片失败'));
      }
    });
  });
}

function auditImage(fileID, scene) {
  return callApi('auditImage', {
    fileID,
    scene: scene || 'profile_image'
  });
}

function uploadImage(localPath, folder) {
  if (!localPath) {
    return Promise.reject(new Error('请选择图片'));
  }
  if (isStoredFilePath(localPath)) {
    return Promise.resolve({
      fileID: localPath,
      cloudPath: ''
    });
  }
  if (!canUploadFile()) {
    return Promise.reject(new Error('云存储未就绪'));
  }
  return uploadToCloud(localPath, folder).then((uploaded) =>
    auditImage(uploaded.fileID, folder).then((auditResult) =>
      Object.assign({}, uploaded, {
        audit: (auditResult && auditResult.data) || {}
      })
    )
  );
}

function uploadImages(paths, folder) {
  const list = Array.isArray(paths) ? paths.filter(Boolean) : [];
  let queue = Promise.resolve([]);
  list.forEach((path) => {
    queue = queue.then((result) =>
      uploadImage(path, folder).then((item) => {
        result.push(item.fileID);
        return result;
      })
    );
  });
  return queue;
}

function callApi(action, data) {
  if (!isReady()) {
    return Promise.reject(new Error('云开发未初始化'));
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'xiangqinApi',
      data: Object.assign({}, data || {}, { action }),
      success: (res) => {
        const result = (res && res.result) || {};
        if (result.ok) {
          resolve(result);
        } else {
          reject(new Error(result.message || '云函数执行失败'));
        }
      },
      fail: (err) => {
        reject(new Error((err && err.errMsg) || '云函数调用失败'));
      }
    });
  });
}

function hasContent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

const completionRules = [
  { label: '昵称', weight: 8, check: (profile) => hasContent(profile.nickname) },
  { label: '性别', weight: 4, check: (profile) => hasContent(profile.gender) },
  { label: '年龄', weight: 4, check: (profile) => hasContent(profile.age) },
  { label: '家乡', weight: 5, check: (profile) => hasContent(profile.hometown) },
  { label: '所在地', weight: 6, check: (profile) => hasContent(profile.currentCity) },
  { label: '身高', weight: 4, check: (profile) => hasContent(profile.height) },
  { label: '学历', weight: 5, check: (profile) => hasContent(profile.education) },
  { label: '职业', weight: 5, check: (profile) => hasContent(profile.occupation) },
  { label: '婚姻状态', weight: 5, check: (profile) => hasContent(profile.maritalStatus) },
  { label: '自我介绍', weight: 12, check: (profile) => hasContent(profile.bio) },
  { label: '择偶要求', weight: 9, check: (profile) => hasContent(profile.expectation) },
  { label: '生活节奏', weight: 8, check: (profile) => hasContent(profile.lifeRhythm) },
  { label: '关系期待', weight: 8, check: (profile) => hasContent(profile.relationshipView) },
  { label: '周末安排', weight: 5, check: (profile) => hasContent(profile.weekendPlan) },
  {
    label: '生活标签',
    weight: 6,
    check: (profile) => Array.isArray(profile.lifestyleTags) && profile.lifestyleTags.length > 0
  },
  {
    label: '缘分问答',
    weight: 6,
    check: (profile) => match.buildAnswerCards(profile.matchAnswers).length > 0
  },
  {
    label: '联系方式',
    weight: 5,
    check: (profile) =>
      hasContent(profile.phone) || hasContent(profile.wechatId) || hasContent(profile.parentPhone) || hasContent(profile.parentWechatId)
  },
  {
    label: '相册',
    weight: 4,
    check: (profile) => Array.isArray(profile.photos) && profile.photos.length > 0
  }
];

function calculateProfileCompletion(profile) {
  const totalWeight = completionRules.reduce((sum, item) => sum + item.weight, 0);
  let filledWeight = 0;
  const missing = [];
  completionRules.forEach((item) => {
    if (item.check(profile || {})) {
      filledWeight += item.weight;
    } else {
      missing.push(item.label);
    }
  });
  return {
    score: Math.max(0, Math.min(100, Math.round((filledWeight / totalWeight) * 100))),
    missing
  };
}

function publisherText(profile) {
  if (!profile || profile.publisherType !== 'parent') {
    return '本人发布';
  }
  if (profile.childConsentStatus === 'confirmed') {
    return '家长代看 · 本人已授权';
  }
  return '家长代看 · 待本人确认';
}

function contactActionText(profile) {
  if (profile.canViewContact) {
    return '去聊天';
  }
  if (profile.contactStatus === 'pending') {
    return '已申请';
  }
  return profile.contactChannel === 'parent' ? '家长沟通' : '发起联系';
}

function trustBadges(profile, completion) {
  const source = profile || {};
  const badges = [];
  if (source.reviewStatus === 'approved' && source.isPublic) {
    badges.push({ label: '已审核', tone: 'primary' });
  }
  if (completion.score >= 85) {
    badges.push({ label: '资料完整', tone: 'warm' });
  }
  if (Array.isArray(source.photos) && source.photos.length) {
    badges.push({ label: '有生活照', tone: 'soft' });
  }
  if (match.buildAnswerCards(source.matchAnswers).length >= 3) {
    badges.push({ label: '问答清楚', tone: 'soft' });
  }
  if (source.canViewContact) {
    badges.push({ label: '已开放联系', tone: 'warm' });
  } else {
    badges.push({ label: '联系保护', tone: 'soft' });
  }
  return badges.slice(0, 4);
}

function enrichProfile(profile) {
  const next = Object.assign({}, profile || {});
  const completion = calculateProfileCompletion(next);
  const introCards = [
    { label: '生活节奏', value: next.lifeRhythm || '还没写' },
    { label: '关系期待', value: next.relationshipView || '还没写' },
    { label: '周末怎么过', value: next.weekendPlan || '还没写' }
  ];
  const matchQuestionCards = match.buildAnswerCards(next.matchAnswers);
  return Object.assign({}, next, {
    id: next.id || next._id || '',
    userId: next.userId || '',
    avatarText: next.avatarText || (next.nickname ? next.nickname.slice(0, 1) : '?'),
    avatarColor: next.avatarColor || '#c63d2f',
    tags: format.profileTags(next),
    lifestyleTags: Array.isArray(next.lifestyleTags) ? next.lifestyleTags : [],
    matchAnswers: match.normalizeMatchAnswers(next.matchAnswers),
    matchQuestionCards,
    matchAnswerCount: matchQuestionCards.length,
    trustBadges: trustBadges(next, completion),
    introCards,
    introSnippet: [next.lifeRhythm, next.relationshipView, next.weekendPlan].find(Boolean) || next.bio || '',
    publisherText: publisherText(next),
    profileCompletionScore: completion.score,
    profileCompletionText: `完整度 ${completion.score}%`,
    profileCompletionMissing: completion.missing,
    contactChannel: next.contactChannel || 'self',
    contactChannelText: next.contactChannelText || '本人联系',
    contactActionText: contactActionText(next),
    isFavorited: !!next.isFavorited,
    hasContactRequest: !!next.contactStatus,
    canViewContact: !!next.canViewContact,
    isCloud: true
  });
}

function addRecommendationMeta(profile, index) {
  const score = Math.max(70, Math.min(96, 90 - index * 3));
  const reasons = [];
  if (profile.currentCity) {
    reasons.push(`${profile.currentCity}生活圈`);
  }
  if (profile.profileCompletionScore >= 80) {
    reasons.push('资料较完整');
  }
  if (Array.isArray(profile.lifestyleTags) && profile.lifestyleTags.length) {
    reasons.push(`生活标签：${profile.lifestyleTags[0]}`);
  }
  if (profile.matchAnswerCount >= 3) {
    reasons.push('缘分问答清楚');
  }
  if (profile.contactChannel === 'parent') {
    reasons.push('可先家长沟通');
  }
  return Object.assign({}, profile, {
    matchScore: score,
    matchScoreText: `缘分值 ${score}`,
    matchReasons: reasons,
    matchReasonText: reasons.length ? reasons.slice(0, 3).join(' · ') : '系统按资料完整度推荐'
  });
}

function padTime(value) {
  return value < 10 ? `0${value}` : String(value);
}

function formatChatTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

function enrichMessage(message) {
  const next = Object.assign({}, message || {});
  return Object.assign({}, next, {
    timeText: formatChatTime(next.createdAt)
  });
}

function enrichConversation(conversation) {
  const next = Object.assign({}, conversation || {});
  const peerProfile = next.peerProfile ? enrichProfile(next.peerProfile) : null;
  const messages = Array.isArray(next.messages) ? next.messages.map((item) => enrichMessage(item)) : [];
  return Object.assign({}, next, {
    isCloud: true,
    peerProfile: peerProfile
      ? Object.assign({}, peerProfile, {
          summary: format.profileSummary(peerProfile)
        })
      : null,
    lastMessageText: next.lastMessageText || next.lastMessage || '可以开始聊天了',
    channelText: next.channelText || (next.channel === 'parent' ? '家长沟通' : '本人联系'),
    timeText: formatChatTime(next.lastMessageAt || next.updatedAt || next.createdAt),
    unreadCount: Number(next.unreadCount || 0),
    messages
  });
}

function enrichContactRequest(item) {
  const next = Object.assign({}, item || {});
  return Object.assign({}, next, {
    isCloud: true,
    fromProfile: next.fromProfile ? enrichProfile(next.fromProfile) : null,
    toProfile: next.toProfile ? enrichProfile(next.toProfile) : null,
    channelText: next.channelText || (next.channel === 'parent' ? '家长沟通' : '本人联系')
  });
}

function listProfiles(filters, viewerMode) {
  return callApi('listProfiles', {
    filters: filters || {},
    viewerMode: viewerMode || 'self',
    limit: 50
  }).then((result) => (result.data || []).map((item) => enrichProfile(item)));
}

function getProfile(id, viewerMode) {
  return callApi('getProfile', {
    id,
    viewerMode: viewerMode || 'self'
  }).then((result) => enrichProfile(result.data));
}

function getMyProfile() {
  return callApi('getMyProfile', {}).then((result) => enrichProfile(result.data));
}

function saveMyProfile(profile) {
  return callApi('saveMyProfile', {
    profile
  }).then((result) =>
    Object.assign({}, result, {
      data: enrichProfile(result.data)
    })
  );
}

function submitMyProfile(profile) {
  return callApi('submitMyProfile', {
    profile
  }).then((result) =>
    Object.assign({}, result, {
      data: enrichProfile(result.data)
    })
  );
}

function toggleFavorite(targetUserId) {
  return callApi('toggleFavorite', {
    targetUserId
  });
}

function createContactRequest(payload) {
  return callApi('createContactRequest', payload || {});
}

function createReport(payload) {
  return callApi('createReport', payload || {});
}

function getContactRequests(scope) {
  return callApi('getContactRequests', {
    scope
  }).then((result) => (result.data || []).map((item) => enrichContactRequest(item)));
}

function respondContactRequest(requestId, decision) {
  return callApi('respondContactRequest', {
    requestId,
    decision
  });
}

function getConversations() {
  return callApi('getConversations', {}).then((result) => (result.data || []).map((item) => enrichConversation(item)));
}

function getConversation(conversationId) {
  return callApi('getConversation', {
    conversationId
  }).then((result) => enrichConversation(result.data));
}

function sendMessage(conversationId, text) {
  return callApi('sendMessage', {
    conversationId,
    text
  });
}

function setAdminByCode(code) {
  return callApi('setAdminByCode', {
    code
  });
}

function getAdminSummary() {
  return callApi('getAdminSummary', {});
}

function getAdminPendingProfiles() {
  return callApi('getAdminPendingProfiles', {});
}

function reviewProfile(profileId, reviewAction, remark) {
  return callApi('reviewProfile', {
    profileId,
    reviewAction,
    remark
  });
}

function getAdminReports() {
  return callApi('getAdminReports', {});
}

function resolveReport(reportId, payload) {
  return callApi('resolveReport', {
    reportId,
    payload: payload || {}
  });
}

function listUsers() {
  return callApi('listUsers', {});
}

function banUser(userId, reason) {
  return callApi('banUser', {
    userId,
    reason
  });
}

module.exports = {
  isReady,
  canUploadFile,
  isStoredFilePath,
  auditImage,
  uploadImage,
  uploadImages,
  callApi,
  listProfiles,
  getProfile,
  getMyProfile,
  saveMyProfile,
  submitMyProfile,
  toggleFavorite,
  createContactRequest,
  createReport,
  getContactRequests,
  respondContactRequest,
  getConversations,
  getConversation,
  sendMessage,
  setAdminByCode,
  getAdminSummary,
  getAdminPendingProfiles,
  reviewProfile,
  getAdminReports,
  resolveReport,
  listUsers,
  banUser,
  addRecommendationMeta
};
