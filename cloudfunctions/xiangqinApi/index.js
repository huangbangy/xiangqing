const cloud = require('wx-server-sdk');
const { createCloudSeed } = require('./seed');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const collectionNames = [
  'users',
  'profiles',
  'favorites',
  'contactRequests',
  'conversations',
  'messages',
  'reports',
  'reviewLogs'
];

const adminCode = '123456';
const maxAuditImageSize = 1024 * 1024;
const maxAuditTextLength = 2000;

function cloudUserId(openid) {
  const safeOpenid = String(openid || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return `wx_${safeOpenid.slice(-12) || Date.now()}`;
}

function publicUserFromContext(wxContext) {
  const id = cloudUserId(wxContext.OPENID);
  const timestamp = new Date().toISOString();
  return {
    id,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
    nickname: '新化用户',
    avatarText: '我',
    avatarColor: '#c63d2f',
    role: 'user',
    status: 'normal',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function isCloudFileID(value) {
  return String(value || '').indexOf('cloud://') === 0;
}

function contentTypeForFile(fileID) {
  const cleanPath = String(fileID || '').split('?')[0].split('#')[0].toLowerCase();
  if (cleanPath.indexOf('.png') >= 0) {
    return 'image/png';
  }
  if (cleanPath.indexOf('.webp') >= 0) {
    return 'image/webp';
  }
  if (cleanPath.indexOf('.gif') >= 0) {
    return 'image/gif';
  }
  return 'image/jpeg';
}

function auditCode(result) {
  if (!result) {
    return -1;
  }
  if (result.errCode !== undefined) {
    return Number(result.errCode);
  }
  if (result.errcode !== undefined) {
    return Number(result.errcode);
  }
  return 0;
}

function auditFailMessage(err) {
  const code = Number((err && (err.errCode || err.errcode || err.code)) || 0);
  if (code === 87014) {
    return '图片可能包含违规内容，请更换后再上传';
  }
  return (err && (err.errMsg || err.message)) || '图片内容安全检测失败';
}

function textAuditFailMessage(err, label) {
  const code = Number((err && (err.errCode || err.errcode || err.code)) || 0);
  if (code === 87014) {
    return `${label || '内容'}可能包含违规信息，请修改后再提交`;
  }
  return (err && (err.errMsg || err.message)) || `${label || '内容'}安全检测失败`;
}

function auditTextScene(scene) {
  if (scene === 'profile') {
    return 1;
  }
  if (scene === 'chat' || scene === 'request' || scene === 'report') {
    return 2;
  }
  return 1;
}

function auditTextPassed(result) {
  if (auditCode(result) !== 0) {
    return false;
  }
  const checkResult = (result && result.result) || {};
  const suggest = String(checkResult.suggest || result.suggest || 'pass');
  return !suggest || suggest === 'pass';
}

function splitAuditText(content) {
  const text = String(content || '').trim();
  const chunks = [];
  if (!text) {
    return chunks;
  }
  for (let i = 0; i < text.length; i += maxAuditTextLength) {
    chunks.push(text.slice(i, i + maxAuditTextLength));
  }
  return chunks;
}

async function auditTextContent(content, wxContext, scene, label) {
  const chunks = splitAuditText(content);
  if (!chunks.length) {
    return { ok: true };
  }
  if (!cloud.openapi || !cloud.openapi.security || !cloud.openapi.security.msgSecCheck) {
    return { ok: false, message: '当前云函数未开通文字内容安全接口' };
  }
  for (let i = 0; i < chunks.length; i += 1) {
    try {
      const result = await cloud.openapi.security.msgSecCheck({
        content: chunks[i],
        version: 2,
        scene: auditTextScene(scene),
        openid: wxContext.OPENID
      });
      if (!auditTextPassed(result)) {
        return { ok: false, message: textAuditFailMessage(result, label) };
      }
    } catch (err) {
      return { ok: false, message: textAuditFailMessage(err, label) };
    }
  }
  return { ok: true };
}

async function auditTextItems(items, wxContext, scene) {
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {};
    const result = await auditTextContent(item.content, wxContext, scene, item.label);
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true };
}

function isCollectionExistsError(err) {
  const message = `${(err && err.errMsg) || ''}${(err && err.message) || ''}`.toLowerCase();
  return message.indexOf('already exist') >= 0 || message.indexOf('collection exists') >= 0 || message.indexOf('exists') >= 0;
}

async function ensureCollection(name) {
  try {
    if (typeof db.createCollection === 'function') {
      await db.createCollection(name);
      return { name, created: true };
    }
    await db.collection(name).limit(1).get();
    return { name, created: false };
  } catch (err) {
    if (isCollectionExistsError(err)) {
      return { name, created: false };
    }
    return { name, created: false, error: (err && err.errMsg) || (err && err.message) || 'unknown error' };
  }
}

async function ensureCollections() {
  const result = [];
  for (let i = 0; i < collectionNames.length; i += 1) {
    result.push(await ensureCollection(collectionNames[i]));
  }
  return result;
}

async function countCollection(name) {
  try {
    const result = await db.collection(name).count();
    return result.total || 0;
  } catch (err) {
    return -1;
  }
}

async function getCounts() {
  const counts = {};
  for (let i = 0; i < collectionNames.length; i += 1) {
    counts[collectionNames[i]] = await countCollection(collectionNames[i]);
  }
  return counts;
}

async function existsDoc(collectionName, id) {
  try {
    const result = await db.collection(collectionName).doc(id).get();
    return !!(result && result.data);
  } catch (err) {
    return false;
  }
}

async function getDoc(collectionName, docId) {
  try {
    const result = await db.collection(collectionName).doc(docId).get();
    return result && result.data ? result.data : null;
  } catch (err) {
    return null;
  }
}

function stripDbId(doc) {
  const next = Object.assign({}, doc || {});
  delete next._id;
  return next;
}

async function ensureCurrentUser(wxContext) {
  const user = publicUserFromContext(wxContext);
  const existing = await getDoc('users', user.id);
  if (existing) {
    return existing;
  }
  await db.collection('users').doc(user.id).set({
    data: user
  });
  return user;
}

function defaultProfileForUser(user) {
  const timestamp = now();
  return {
    id: `p_${user.id}`,
    userId: user.id,
    nickname: user.nickname || '新化用户',
    avatarText: user.avatarText || '我',
    avatarColor: user.avatarColor || '#c63d2f',
    avatarUrl: '',
    gender: '',
    age: '',
    hometown: '新化县城区',
    currentCity: '新化县城区',
    height: '',
    education: '',
    occupation: '',
    incomeRange: '',
    maritalStatus: '',
    hasChildren: false,
    houseStatus: '',
    carStatus: '',
    phone: '',
    wechatId: '',
    contactNote: '',
    publisherType: 'self',
    childConsentStatus: 'self',
    parentName: '',
    parentRelation: '',
    parentPhone: '',
    parentWechatId: '',
    parentContactNote: '',
    lifeRhythm: '',
    relationshipView: '',
    weekendPlan: '',
    lifestyleTags: [],
    matchAnswers: {},
    bio: '',
    expectation: '',
    photos: [],
    reviewStatus: 'draft',
    isPublic: false,
    submittedAt: '',
    reviewedAt: '',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function ensureMyProfile(wxContext) {
  const user = await ensureCurrentUser(wxContext);
  const existing = await profileByIdOrUserId(user.id);
  if (existing) {
    return existing;
  }
  const profile = defaultProfileForUser(user);
  await db.collection('profiles').doc(profile.id).set({
    data: profile
  });
  return profile;
}

function normalizeProfileInput(payload) {
  const source = payload || {};
  const allowedFields = [
    'nickname',
    'avatarText',
    'avatarColor',
    'avatarUrl',
    'gender',
    'age',
    'hometown',
    'currentCity',
    'height',
    'education',
    'occupation',
    'incomeRange',
    'maritalStatus',
    'hasChildren',
    'houseStatus',
    'carStatus',
    'phone',
    'wechatId',
    'contactNote',
    'publisherType',
    'childConsentStatus',
    'parentName',
    'parentRelation',
    'parentPhone',
    'parentWechatId',
    'parentContactNote',
    'lifeRhythm',
    'relationshipView',
    'weekendPlan',
    'lifestyleTags',
    'matchAnswers',
    'bio',
    'expectation',
    'photos'
  ];
  const next = {};
  allowedFields.forEach((field) => {
    if (source[field] !== undefined) {
      next[field] = source[field];
    }
  });
  next.age = next.age === '' || next.age === null || next.age === undefined ? '' : Number(next.age);
  next.height = next.height === '' || next.height === null || next.height === undefined ? '' : Number(next.height);
  next.hasChildren = !!next.hasChildren;
  next.photos = Array.isArray(next.photos) ? next.photos : [];
  next.lifestyleTags = Array.isArray(next.lifestyleTags) ? next.lifestyleTags : [];
  next.matchAnswers = next.matchAnswers && typeof next.matchAnswers === 'object' ? next.matchAnswers : {};
  next.publisherType = next.publisherType || 'self';
  next.childConsentStatus = next.publisherType === 'parent' ? next.childConsentStatus || 'confirmed' : 'self';
  if (!next.avatarUrl && !next.avatarText && next.nickname) {
    next.avatarText = String(next.nickname).slice(0, 1);
  }
  return next;
}

function profileAuditItems(profile) {
  const source = profile || {};
  const fields = [
    { key: 'nickname', label: '昵称' },
    { key: 'occupation', label: '职业' },
    { key: 'wechatId', label: '微信号' },
    { key: 'contactNote', label: '联系备注' },
    { key: 'parentName', label: '家长姓名' },
    { key: 'parentRelation', label: '家长关系' },
    { key: 'parentWechatId', label: '家长微信号' },
    { key: 'parentContactNote', label: '家长联系备注' },
    { key: 'lifeRhythm', label: '生活节奏' },
    { key: 'relationshipView', label: '关系期待' },
    { key: 'weekendPlan', label: '周末安排' },
    { key: 'matchAnswers', label: '缘分问答' },
    { key: 'bio', label: '自我介绍' },
    { key: 'expectation', label: '择偶要求' }
  ];
  return fields
    .map((field) => {
      if (field.key === 'matchAnswers') {
        const answers = source.matchAnswers && typeof source.matchAnswers === 'object' ? source.matchAnswers : {};
        return {
          label: field.label,
          content: Object.keys(answers)
            .map((key) => answers[key])
            .filter(Boolean)
            .join(' ')
        };
      }
      return {
        label: field.label,
        content: source[field.key]
      };
    })
    .filter((item) => String(item.content || '').trim());
}

function validateProfile(profile) {
  const missing = [];
  if (!profile.nickname) missing.push('昵称');
  if (!profile.gender) missing.push('性别');
  if (!profile.age) missing.push('年龄');
  if (!profile.currentCity) missing.push('所在地');
  if (!profile.bio) missing.push('自我介绍');
  return missing;
}

async function addMissingDocs(collectionName, docs) {
  let added = 0;
  for (let i = 0; i < docs.length; i += 1) {
    const doc = Object.assign({}, docs[i]);
    const exists = await existsDoc(collectionName, doc.id);
    if (!exists) {
      await db.collection(collectionName).doc(doc.id).set({
        data: doc
      });
      added += 1;
    }
  }
  return added;
}

async function seedIfNeeded(wxContext) {
  const currentUser = publicUserFromContext(wxContext);
  const seed = createCloudSeed(currentUser);
  const countsBefore = await getCounts();
  const added = {};

  if (countsBefore.users <= 0) {
    added.users = await addMissingDocs('users', seed.users);
  } else if (!(await existsDoc('users', currentUser.id))) {
    added.users = await addMissingDocs('users', [currentUser]);
  } else {
    added.users = 0;
  }

  if (countsBefore.profiles <= 0) {
    added.profiles = await addMissingDocs('profiles', seed.profiles);
  } else {
    const myProfileId = `p_${currentUser.id}`;
    const myProfile = seed.profiles.find((item) => item.id === myProfileId);
    added.profiles = myProfile && !(await existsDoc('profiles', myProfileId)) ? await addMissingDocs('profiles', [myProfile]) : 0;
  }

  added.favorites = countsBefore.favorites <= 0 ? await addMissingDocs('favorites', seed.favorites) : 0;
  added.contactRequests = countsBefore.contactRequests <= 0 ? await addMissingDocs('contactRequests', seed.contactRequests) : 0;
  added.conversations = countsBefore.conversations <= 0 ? await addMissingDocs('conversations', seed.conversations) : 0;
  added.messages = countsBefore.messages <= 0 ? await addMissingDocs('messages', seed.messages) : 0;
  added.reports = countsBefore.reports <= 0 ? await addMissingDocs('reports', seed.reports) : 0;
  added.reviewLogs = countsBefore.reviewLogs <= 0 ? await addMissingDocs('reviewLogs', seed.reviewLogs) : 0;

  return {
    added,
    currentUserId: currentUser.id
  };
}

async function initDatabase(wxContext) {
  const collections = await ensureCollections();
  const seedResult = await seedIfNeeded(wxContext);
  const counts = await getCounts();
  return {
    ok: true,
    action: 'initDatabase',
    collections,
    seed: seedResult,
    counts
  };
}

async function getCloudSummary(wxContext) {
  await ensureCollections();
  const counts = await getCounts();
  return {
    ok: true,
    action: 'getCloudSummary',
    currentUserId: cloudUserId(wxContext.OPENID),
    counts
  };
}

function channelText(channel) {
  return channel === 'parent' ? '家长沟通' : '本人联系';
}

function contactChannelFor(viewerMode, profile) {
  if (viewerMode === 'parent' || (profile && profile.publisherType === 'parent')) {
    return 'parent';
  }
  return 'self';
}

async function acceptedRequestForProfile(currentUserId, profileUserId, channel) {
  const result = await db
    .collection('contactRequests')
    .where({
      status: 'accepted',
      channel
    })
    .limit(100)
    .get();
  const list = result.data || [];
  return (
    list.find(
      (item) =>
        (item.fromUserId === currentUserId && item.toUserId === profileUserId) ||
        (item.fromUserId === profileUserId && item.toUserId === currentUserId)
    ) || null
  );
}

async function latestRequestStatusForProfile(currentUserId, profileUserId, channel) {
  const result = await db
    .collection('contactRequests')
    .where({
      channel
    })
    .limit(100)
    .get();
  const list = result.data || [];
  const matched = list
    .filter(
      (item) =>
        (item.fromUserId === currentUserId && item.toUserId === profileUserId) ||
        (item.fromUserId === profileUserId && item.toUserId === currentUserId)
    )
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  return matched.length ? matched[0].status : '';
}

async function conversationForRequest(request) {
  if (!request || request.status !== 'accepted') {
    return null;
  }
  const result = await db
    .collection('conversations')
    .where({
      requestId: request.id
    })
    .limit(1)
    .get();
  return result.data && result.data.length ? result.data[0] : null;
}

async function profileByIdOrUserId(profileId) {
  if (!profileId) {
    return null;
  }
  const byDoc = await getDoc('profiles', profileId);
  if (byDoc) {
    return byDoc;
  }
  const byUser = await db
    .collection('profiles')
    .where({
      userId: profileId
    })
    .limit(1)
    .get();
  return byUser.data && byUser.data.length ? byUser.data[0] : null;
}

async function userProfile(userId) {
  return await profileByIdOrUserId(userId);
}

async function favoriteForProfile(currentUserId, targetUserId) {
  const result = await db
    .collection('favorites')
    .where({
      userId: currentUserId,
      targetUserId
    })
    .limit(1)
    .get();
  return result.data && result.data.length ? result.data[0] : null;
}

function requestMatchesPair(item, currentUserId, targetUserId, channel) {
  return (
    (item.channel || 'self') === channel &&
    ((item.fromUserId === currentUserId && item.toUserId === targetUserId) ||
      (item.fromUserId === targetUserId && item.toUserId === currentUserId))
  );
}

async function latestRequestForPair(currentUserId, targetUserId, channel) {
  const result = await db
    .collection('contactRequests')
    .where({
      channel
    })
    .limit(100)
    .get();
  const list = result.data || [];
  const matched = list
    .filter((item) => requestMatchesPair(item, currentUserId, targetUserId, channel))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  return matched.length ? matched[0] : null;
}

async function ensureConversationForRequest(request) {
  if (!request || request.status !== 'accepted') {
    return null;
  }
  const existing = await conversationForRequest(request);
  if (existing) {
    return existing;
  }
  const timestamp = request.updatedAt || request.createdAt || now();
  const channel = request.channel || 'self';
  const systemText = channel === 'parent' ? '家长沟通申请已通过，可以开始聊天了。' : '联系申请已通过，可以开始聊天了。';
  const conversation = {
    id: id('conv'),
    requestId: request.id,
    memberIds: [request.fromUserId, request.toUserId],
    channel,
    lastMessage: systemText,
    lastMessageAt: timestamp,
    unreadBy: {},
    createdAt: timestamp,
    updatedAt: timestamp
  };
  conversation.unreadBy[request.fromUserId] = 0;
  conversation.unreadBy[request.toUserId] = 1;
  await db.collection('conversations').doc(conversation.id).set({
    data: conversation
  });
  const initialMessage = request.message ? String(request.message).trim() : '';
  if (initialMessage) {
    const requestMessage = {
      id: id('msg'),
      conversationId: conversation.id,
      senderId: request.fromUserId,
      text: initialMessage,
      type: 'text',
      createdAt: request.createdAt || timestamp
    };
    await db.collection('messages').doc(requestMessage.id).set({
      data: requestMessage
    });
  }
  const systemMessage = {
    id: id('msg'),
    conversationId: conversation.id,
    senderId: 'system',
    text: systemText,
    type: 'system',
    createdAt: timestamp
  };
  await db.collection('messages').doc(systemMessage.id).set({
    data: systemMessage
  });
  return conversation;
}

function applyRequestContact(profile, channel, status) {
  if (!profile) {
    return null;
  }
  const result = Object.assign({}, profile, {
    contactChannel: channel,
    contactChannelText: channelText(channel),
    canViewContact: status === 'accepted'
  });
  result.phone = '';
  result.wechatId = '';
  result.contactNote = '';
  result.parentName = '';
  result.parentRelation = '';
  result.parentPhone = '';
  result.parentWechatId = '';
  result.parentContactNote = '';
  if (status === 'accepted' && channel === 'parent') {
    result.parentName = profile.parentName || '';
    result.parentRelation = profile.parentRelation || '';
    result.parentPhone = profile.parentPhone || '';
    result.parentWechatId = profile.parentWechatId || '';
    result.parentContactNote = profile.parentContactNote || '';
  } else if (status === 'accepted') {
    result.phone = profile.phone || '';
    result.wechatId = profile.wechatId || '';
    result.contactNote = profile.contactNote || '';
  }
  delete result.openid;
  return result;
}

function formatRequestStatus(status) {
  const map = {
    pending: '待处理',
    accepted: '已同意',
    rejected: '已拒绝',
    closed: '已关闭'
  };
  return map[status] || status || '未知';
}

function formatProfileStatus(status) {
  const map = {
    draft: '草稿',
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    hidden: '已隐藏',
    banned: '已封禁'
  };
  return map[status] || status || '未知';
}

function formatReportStatus(status) {
  const map = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已处理',
    rejected: '已驳回'
  };
  return map[status] || status || '未知';
}

async function sanitizeProfileForUser(profile, wxContext, viewerMode) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const channel = contactChannelFor(viewerMode, profile);
  const isMine = profile.userId === currentUserId;
  const acceptedRequest = isMine ? null : await acceptedRequestForProfile(currentUserId, profile.userId, channel);
  const canViewContact = isMine || !!acceptedRequest;
  const contactStatus = isMine ? 'accepted' : acceptedRequest ? 'accepted' : await latestRequestStatusForProfile(currentUserId, profile.userId, channel);
  const conversation = acceptedRequest ? await conversationForRequest(acceptedRequest) : null;
  const favorite = isMine ? null : await favoriteForProfile(currentUserId, profile.userId);
  const result = Object.assign({}, profile, {
    contactChannel: channel,
    contactChannelText: channelText(channel),
    canViewContact,
    contactStatus,
    conversationId: conversation ? conversation.id : '',
    isFavorited: !!favorite
  });

  if (!canViewContact || channel === 'parent') {
    result.phone = '';
    result.wechatId = '';
    result.contactNote = '';
  }
  if (!canViewContact || channel !== 'parent') {
    result.parentName = '';
    result.parentRelation = '';
    result.parentPhone = '';
    result.parentWechatId = '';
    result.parentContactNote = '';
  }
  delete result.openid;
  return result;
}

function matchesKeyword(profile, keyword) {
  if (!keyword) {
    return true;
  }
  const text = [
    profile.nickname,
    profile.occupation,
    profile.bio,
    profile.hometown,
    profile.currentCity,
    profile.expectation,
    profile.lifeRhythm,
    profile.relationshipView,
    profile.weekendPlan,
    profile.contactNote,
    profile.parentName,
    profile.parentRelation,
    profile.parentContactNote,
    ...(Array.isArray(profile.lifestyleTags) ? profile.lifestyleTags : []),
    ...Object.keys(profile.matchAnswers || {}).map((key) => profile.matchAnswers[key])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text.indexOf(String(keyword).trim().toLowerCase()) >= 0;
}

function matchesFilters(profile, filters) {
  const nextFilters = filters || {};
  if (nextFilters.gender && nextFilters.gender !== 'all' && profile.gender !== nextFilters.gender) {
    return false;
  }
  if (nextFilters.ageMin && Number(profile.age) < Number(nextFilters.ageMin)) {
    return false;
  }
  if (nextFilters.ageMax && Number(profile.age) > Number(nextFilters.ageMax)) {
    return false;
  }
  if (nextFilters.region && nextFilters.region !== 'all') {
    const regionText = `${profile.hometown || ''}${profile.currentCity || ''}`;
    if (regionText.indexOf(nextFilters.region) < 0) {
      return false;
    }
  }
  if (nextFilters.maritalStatus && nextFilters.maritalStatus !== 'all' && profile.maritalStatus !== nextFilters.maritalStatus) {
    return false;
  }
  if (nextFilters.education && nextFilters.education !== 'all' && profile.education !== nextFilters.education) {
    return false;
  }
  return true;
}

async function listProfiles(event) {
  const limit = Math.max(1, Math.min(Number(event.limit) || 20, 50));
  const filters = event.filters || {};
  const keyword = filters.keyword || '';
  const viewerMode = event.viewerMode || 'self';
  const result = await db
    .collection('profiles')
    .where({
      reviewStatus: 'approved',
      isPublic: true
    })
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();

  const rawList = (result.data || []).filter((item) => matchesKeyword(item, keyword)).filter((item) => matchesFilters(item, filters));
  const data = [];
  for (let i = 0; i < rawList.length; i += 1) {
    data.push(await sanitizeProfileForUser(rawList[i], cloud.getWXContext(), viewerMode));
  }

  return {
    ok: true,
    action: 'listProfiles',
    data
  };
}

async function getProfile(event, wxContext) {
  const profileId = event.id || event.profileId || event.userId;
  const viewerMode = event.viewerMode || 'self';
  if (!profileId) {
    return {
      ok: false,
      message: '缺少资料 ID'
    };
  }
  let profile = null;
  try {
    const byDoc = await db.collection('profiles').doc(profileId).get();
    profile = byDoc && byDoc.data ? byDoc.data : null;
  } catch (err) {
    profile = null;
  }
  if (!profile) {
    const byUser = await db
      .collection('profiles')
      .where({
        userId: profileId
      })
      .limit(1)
      .get();
    profile = byUser.data && byUser.data.length ? byUser.data[0] : null;
  }
  if (!profile) {
    return {
      ok: false,
      message: '资料不存在'
    };
  }
  return {
    ok: true,
    action: 'getProfile',
    data: await sanitizeProfileForUser(profile, wxContext, viewerMode)
  };
}

async function getMyProfile(event, wxContext) {
  const profile = await ensureMyProfile(wxContext);
  return {
    ok: true,
    action: 'getMyProfile',
    data: await sanitizeProfileForUser(profile, wxContext, event.viewerMode || 'self')
  };
}

async function saveMyProfile(event, wxContext) {
  const user = await ensureCurrentUser(wxContext);
  const existing = await ensureMyProfile(wxContext);
  const input = normalizeProfileInput(event.profile || event.payload || {});
  const auditResult = await auditTextItems(profileAuditItems(input), wxContext, 'profile');
  if (!auditResult.ok) {
    return auditResult;
  }
  const timestamp = now();
  const profile = Object.assign({}, stripDbId(existing), input, {
    id: existing.id || `p_${user.id}`,
    userId: user.id,
    updatedAt: timestamp
  });
  if (profile.reviewStatus === 'approved') {
    profile.reviewStatus = 'draft';
    profile.isPublic = false;
  } else if (!profile.reviewStatus || profile.reviewStatus === 'rejected') {
    profile.reviewStatus = 'draft';
    profile.isPublic = false;
  }
  await db.collection('profiles').doc(profile.id).set({
    data: profile
  });
  return {
    ok: true,
    message: '已保存草稿',
    action: 'saveMyProfile',
    data: await sanitizeProfileForUser(profile, wxContext, 'self')
  };
}

async function submitMyProfile(event, wxContext) {
  const saveResult = await saveMyProfile(event, wxContext);
  if (!saveResult.ok) {
    return saveResult;
  }
  const profile = await ensureMyProfile(wxContext);
  const missing = validateProfile(profile);
  if (missing.length) {
    return {
      ok: false,
      message: `请先补全：${missing.join('、')}`
    };
  }
  const timestamp = now();
  const nextProfile = Object.assign({}, stripDbId(profile), {
    reviewStatus: 'pending',
    isPublic: false,
    submittedAt: timestamp,
    updatedAt: timestamp
  });
  await db.collection('profiles').doc(nextProfile.id).set({
    data: nextProfile
  });
  const log = {
    id: id('log'),
    subjectType: 'profile',
    subjectId: nextProfile.id,
    action: 'submit',
    reviewerId: nextProfile.userId,
    remark: '用户提交审核',
    createdAt: timestamp
  };
  await db.collection('reviewLogs').doc(log.id).set({
    data: log
  });
  return {
    ok: true,
    message: '资料已提交审核',
    action: 'submitMyProfile',
    data: await sanitizeProfileForUser(nextProfile, wxContext, 'self')
  };
}

async function auditImage(event, wxContext) {
  await ensureCurrentUser(wxContext);
  const fileID = String(event.fileID || event.fileId || '').trim();
  if (!fileID) {
    return { ok: false, message: '缺少图片文件' };
  }
  if (!isCloudFileID(fileID)) {
    return { ok: false, message: '请先上传到云存储后再审核' };
  }
  if (!cloud.openapi || !cloud.openapi.security || !cloud.openapi.security.imgSecCheck) {
    return { ok: false, message: '当前云函数未开通图片内容安全接口' };
  }

  let fileContent;
  try {
    const downloadResult = await cloud.downloadFile({ fileID });
    fileContent = downloadResult && downloadResult.fileContent;
  } catch (err) {
    return { ok: false, message: '读取云存储图片失败' };
  }

  if (!fileContent || !fileContent.length) {
    return { ok: false, message: '图片文件为空' };
  }
  if (fileContent.length > maxAuditImageSize) {
    return { ok: false, message: '图片过大，请换一张压缩后的图片' };
  }

  try {
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: contentTypeForFile(fileID),
        value: fileContent
      }
    });
    const code = auditCode(result);
    if (code === 0) {
      return {
        ok: true,
        action: 'auditImage',
        message: '图片审核通过',
        data: {
          fileID,
          scene: event.scene || '',
          passed: true
        }
      };
    }
    if (code === 87014) {
      try {
        await cloud.deleteFile({ fileList: [fileID] });
      } catch (deleteErr) {
        console.warn('delete unsafe image failed', deleteErr);
      }
    }
    return { ok: false, message: auditFailMessage(result) };
  } catch (err) {
    if (Number(err && (err.errCode || err.errcode || err.code)) === 87014) {
      try {
        await cloud.deleteFile({ fileList: [fileID] });
      } catch (deleteErr) {
        console.warn('delete unsafe image failed', deleteErr);
      }
    }
    return { ok: false, message: auditFailMessage(err) };
  }
}

async function toggleFavorite(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const profile = await profileByIdOrUserId(event.targetUserId || event.userId || event.profileId);
  if (!profile || profile.reviewStatus !== 'approved' || !profile.isPublic) {
    return { ok: false, message: '资料不存在或暂不可收藏' };
  }
  if (profile.userId === currentUserId) {
    return { ok: false, message: '不能收藏自己' };
  }
  const existing = await favoriteForProfile(currentUserId, profile.userId);
  if (existing) {
    await db.collection('favorites').doc(existing._id || existing.id).remove();
    return { ok: true, message: '已取消收藏', data: { favorited: false } };
  }
  const timestamp = now();
  const favorite = {
    id: id('fav'),
    userId: currentUserId,
    targetUserId: profile.userId,
    createdAt: timestamp
  };
  await db.collection('favorites').doc(favorite.id).set({
    data: favorite
  });
  return { ok: true, message: '已收藏', data: { favorited: true } };
}

async function createContactRequest(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const profile = await profileByIdOrUserId(event.toUserId || event.targetUserId || event.profileId);
  if (!profile || profile.reviewStatus !== 'approved' || !profile.isPublic) {
    return { ok: false, message: '该资料暂时无法联系' };
  }
  if (profile.userId === currentUserId) {
    return { ok: false, message: '不能联系自己' };
  }
  const viewerMode = event.viewerMode || 'self';
  const channel = event.channel || contactChannelFor(viewerMode, profile);
  const existing = await latestRequestForPair(currentUserId, profile.userId, channel);
  if (existing && existing.status === 'accepted') {
    const conversation = await ensureConversationForRequest(existing);
    return {
      ok: true,
      message: channel === 'parent' ? '对方已同意，可进入家长沟通' : '对方已同意，可进入聊天',
      data: { status: 'accepted', conversationId: conversation ? conversation.id : '' }
    };
  }
  if (existing && existing.status === 'pending') {
    return { ok: false, message: channel === 'parent' ? '已经发起过家长沟通申请' : '已经发起过联系申请' };
  }
  const requestMessage = String(event.message || '').trim();
  const auditResult = await auditTextContent(requestMessage, wxContext, 'request', '联系申请留言');
  if (!auditResult.ok) {
    return auditResult;
  }
  const timestamp = now();
  const request = {
    id: id('req'),
    fromUserId: currentUserId,
    toUserId: profile.userId,
    message: requestMessage,
    channel,
    fromMode: viewerMode,
    toPublisherType: profile.publisherType || 'self',
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.collection('contactRequests').doc(request.id).set({
    data: request
  });
  return { ok: true, message: channel === 'parent' ? '家长沟通申请已发送' : '联系申请已发送', data: request };
}

async function createReport(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  await ensureCurrentUser(wxContext);
  const profile = await profileByIdOrUserId(event.targetUserId || event.profileId || event.userId);
  if (!profile) {
    return { ok: false, message: '举报对象不存在' };
  }
  if (profile.userId === currentUserId) {
    return { ok: false, message: '不能举报自己' };
  }
  const category = String(event.category || '其他违规').trim();
  const reason = String(event.reason || '').trim();
  if (!reason) {
    return { ok: false, message: '请填写举报说明' };
  }
  const auditResult = await auditTextItems(
    [
      { label: '举报类型', content: category },
      { label: '举报说明', content: reason }
    ],
    wxContext,
    'report'
  );
  if (!auditResult.ok) {
    return auditResult;
  }
  const evidenceUrls = Array.isArray(event.evidenceUrls) ? event.evidenceUrls.filter(Boolean).slice(0, 3) : [];
  const timestamp = now();
  const report = {
    id: id('report'),
    reporterId: currentUserId,
    targetUserId: profile.userId,
    category,
    reason,
    evidenceUrls,
    status: 'pending',
    handlerId: '',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.collection('reports').doc(report.id).set({
    data: report
  });
  return { ok: true, message: '举报已提交', action: 'createReport', data: report };
}

async function getContactRequests(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const scope = event.scope || 'inbox';
  const result = await db.collection('contactRequests').limit(100).get();
  const rawList = (result.data || [])
    .filter((item) => {
      if (scope === 'inbox') {
        return item.toUserId === currentUserId;
      }
      if (scope === 'outbox') {
        return item.fromUserId === currentUserId;
      }
      return item.toUserId === currentUserId || item.fromUserId === currentUserId;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const data = [];
  for (let i = 0; i < rawList.length; i += 1) {
    const item = rawList[i];
    const channel = item.channel || 'self';
    const fromProfile = await userProfile(item.fromUserId);
    const toProfile = await userProfile(item.toUserId);
    const conversation = item.status === 'accepted' ? await ensureConversationForRequest(item) : null;
    data.push(
      Object.assign({}, item, {
        fromProfile: applyRequestContact(fromProfile, channel, item.status),
        toProfile: applyRequestContact(toProfile, channel, item.status),
        conversationId: conversation ? conversation.id : '',
        channel,
        channelText: channelText(channel),
        statusText: formatRequestStatus(item.status)
      })
    );
  }
  return { ok: true, action: 'getContactRequests', data };
}

async function respondContactRequest(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const requestId = event.requestId || event.id;
  const decision = event.decision;
  const request = await getDoc('contactRequests', requestId);
  if (!request || request.toUserId !== currentUserId) {
    return { ok: false, message: '申请不存在' };
  }
  if (request.status !== 'pending') {
    return { ok: false, message: '该申请已处理' };
  }
  const status = decision === 'accept' ? 'accepted' : 'rejected';
  request.status = status;
  request.updatedAt = now();
  await db.collection('contactRequests').doc(request.id).update({
    data: {
      status: request.status,
      updatedAt: request.updatedAt
    }
  });
  const conversation = status === 'accepted' ? await ensureConversationForRequest(request) : null;
  return {
    ok: true,
    message: status === 'accepted' ? '已同意' : '已拒绝',
    data: Object.assign({}, request, {
      conversationId: conversation ? conversation.id : ''
    })
  };
}

function peerUserIdForConversation(currentUserId, conversation) {
  const memberIds = Array.isArray(conversation.memberIds) ? conversation.memberIds : [];
  return memberIds.find((item) => item !== currentUserId) || memberIds[0] || '';
}

async function enrichMessage(message, currentUserId) {
  const isSystem = message.type === 'system' || message.senderId === 'system';
  const profile = isSystem ? null : await userProfile(message.senderId);
  return Object.assign({}, message, {
    isMine: message.senderId === currentUserId,
    isSystem,
    senderName: isSystem ? '系统提醒' : profile ? profile.nickname : '对方',
    senderAvatarText: isSystem ? '喜' : profile ? profile.avatarText : '?',
    senderAvatarColor: isSystem ? '#c63d2f' : profile ? profile.avatarColor : '#94a3b8',
    senderAvatarUrl: profile ? profile.avatarUrl : ''
  });
}

async function enrichConversation(conversation, wxContext, includeMessages) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const peerUserId = peerUserIdForConversation(currentUserId, conversation);
  const peerRawProfile = await userProfile(peerUserId);
  const peerProfile = peerRawProfile ? await sanitizeProfileForUser(peerRawProfile, wxContext, conversation.channel || 'self') : null;
  const unreadBy = conversation.unreadBy || {};
  const result = Object.assign({}, conversation, {
    peerUserId,
    peerProfile,
    channel: conversation.channel || 'self',
    channelText: channelText(conversation.channel || 'self'),
    lastMessageText: conversation.lastMessage || '可以开始聊天了',
    unreadCount: Number(unreadBy[currentUserId] || 0)
  });
  if (includeMessages) {
    const messagesResult = await db
      .collection('messages')
      .where({
        conversationId: conversation.id
      })
      .limit(100)
      .get();
    const rawMessages = (messagesResult.data || []).sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const messages = [];
    for (let i = 0; i < rawMessages.length; i += 1) {
      messages.push(await enrichMessage(rawMessages[i], currentUserId));
    }
    result.messages = messages;
  }
  return result;
}

async function getConversations(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const result = await db.collection('conversations').limit(100).get();
  const rawList = (result.data || [])
    .filter((item) => Array.isArray(item.memberIds) && item.memberIds.indexOf(currentUserId) >= 0)
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
    );
  const data = [];
  for (let i = 0; i < rawList.length; i += 1) {
    data.push(await enrichConversation(rawList[i], wxContext, false));
  }
  return { ok: true, action: 'getConversations', data };
}

async function getConversation(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const conversationId = event.conversationId || event.id;
  const conversation = await getDoc('conversations', conversationId);
  if (!conversation || !Array.isArray(conversation.memberIds) || conversation.memberIds.indexOf(currentUserId) < 0) {
    return { ok: false, message: '会话不存在' };
  }
  const unreadBy = Object.assign({}, conversation.unreadBy || {});
  if (unreadBy[currentUserId]) {
    unreadBy[currentUserId] = 0;
    await db.collection('conversations').doc(conversation.id).update({
      data: {
        unreadBy
      }
    });
    conversation.unreadBy = unreadBy;
  }
  return { ok: true, action: 'getConversation', data: await enrichConversation(conversation, wxContext, true) };
}

async function sendMessage(event, wxContext) {
  const currentUserId = cloudUserId(wxContext.OPENID);
  const conversationId = event.conversationId || event.id;
  const text = String(event.text || '').trim();
  if (!text) {
    return { ok: false, message: '先写一点内容' };
  }
  const auditResult = await auditTextContent(text, wxContext, 'chat', '聊天消息');
  if (!auditResult.ok) {
    return auditResult;
  }
  const conversation = await getDoc('conversations', conversationId);
  if (!conversation || !Array.isArray(conversation.memberIds) || conversation.memberIds.indexOf(currentUserId) < 0) {
    return { ok: false, message: '会话不存在' };
  }
  const timestamp = now();
  const message = {
    id: id('msg'),
    conversationId: conversation.id,
    senderId: currentUserId,
    text,
    type: 'text',
    createdAt: timestamp
  };
  await db.collection('messages').doc(message.id).set({
    data: message
  });
  const unreadBy = Object.assign({}, conversation.unreadBy || {});
  const memberIds = Array.isArray(conversation.memberIds) ? conversation.memberIds : [];
  memberIds.forEach((userId) => {
    if (userId === currentUserId) {
      unreadBy[userId] = 0;
    } else {
      unreadBy[userId] = Number(unreadBy[userId] || 0) + 1;
    }
  });
  await db.collection('conversations').doc(conversation.id).update({
    data: {
      lastMessage: text,
      lastMessageAt: timestamp,
      updatedAt: timestamp,
      unreadBy
    }
  });
  return { ok: true, message: '已发送', data: await enrichMessage(message, currentUserId) };
}

async function canAdminOperate(wxContext) {
  const user = await ensureCurrentUser(wxContext);
  return !!(user && (user.role === 'admin' || user.isAdmin));
}

async function setAdminByCode(event, wxContext) {
  if (String(event.code || '') !== adminCode) {
    return { ok: false, message: '口令不正确' };
  }
  const user = await ensureCurrentUser(wxContext);
  const nextUser = Object.assign({}, stripDbId(user), {
    role: 'admin',
    updatedAt: now()
  });
  await db.collection('users').doc(nextUser.id).set({
    data: nextUser
  });
  return { ok: true, message: '已进入管理员模式', data: nextUser };
}

async function getAdminSummary(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const profilesResult = await db.collection('profiles').limit(200).get();
  const reportsResult = await db.collection('reports').limit(200).get();
  const usersResult = await db.collection('users').limit(200).get();
  const profiles = profilesResult.data || [];
  const reports = reportsResult.data || [];
  const users = usersResult.data || [];
  return {
    ok: true,
    action: 'getAdminSummary',
    data: {
      pendingProfiles: profiles.filter((item) => item.reviewStatus === 'pending').length,
      reports: reports.filter((item) => item.status === 'pending').length,
      bannedUsers: users.filter((item) => item.status === 'banned').length,
      approvedProfiles: profiles.filter((item) => item.reviewStatus === 'approved' && item.isPublic).length
    }
  };
}

async function getAdminPendingProfiles(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const result = await db
    .collection('profiles')
    .where({
      reviewStatus: 'pending'
    })
    .limit(100)
    .get();
  const data = (result.data || []).sort(
    (a, b) => new Date(b.updatedAt || b.submittedAt || 0).getTime() - new Date(a.updatedAt || a.submittedAt || 0).getTime()
  );
  return { ok: true, action: 'getAdminPendingProfiles', data };
}

async function reviewProfile(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const profileId = event.profileId || event.id;
  const action = event.reviewAction || event.actionName || event.review || event.decision || event.nextAction;
  const profile = await getDoc('profiles', profileId);
  if (!profile) {
    return { ok: false, message: '资料不存在' };
  }
  const timestamp = now();
  const nextProfile = Object.assign({}, stripDbId(profile));
  if (action === 'approve') {
    nextProfile.reviewStatus = 'approved';
    nextProfile.isPublic = true;
    nextProfile.reviewedAt = timestamp;
  } else if (action === 'reject') {
    nextProfile.reviewStatus = 'rejected';
    nextProfile.isPublic = false;
    nextProfile.reviewedAt = timestamp;
  } else if (action === 'hide') {
    nextProfile.reviewStatus = 'hidden';
    nextProfile.isPublic = false;
    nextProfile.reviewedAt = timestamp;
  } else {
    return { ok: false, message: '未知审核动作' };
  }
  nextProfile.updatedAt = timestamp;
  await db.collection('profiles').doc(nextProfile.id).set({
    data: nextProfile
  });
  const adminUser = await ensureCurrentUser(wxContext);
  const log = {
    id: id('log'),
    subjectType: 'profile',
    subjectId: nextProfile.id,
    action,
    reviewerId: adminUser.id,
    remark: event.remark || '',
    createdAt: timestamp
  };
  await db.collection('reviewLogs').doc(log.id).set({
    data: log
  });
  return { ok: true, message: '已处理', action: 'reviewProfile', data: nextProfile };
}

async function getAdminReviewLogs(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const result = await db.collection('reviewLogs').limit(100).get();
  const logs = result.data || [];
  const data = [];
  for (let i = 0; i < logs.length; i += 1) {
    const log = logs[i];
    let subjectName = log.subjectId || '';
    if (log.subjectType === 'profile') {
      const profile = await getDoc('profiles', log.subjectId);
      subjectName = profile ? profile.nickname || profile.id : log.subjectId;
    } else if (log.subjectType === 'report') {
      const report = await getDoc('reports', log.subjectId);
      subjectName = report ? report.category || report.id : log.subjectId;
    } else if (log.subjectType === 'user') {
      const user = await getDoc('users', log.subjectId);
      subjectName = user ? user.nickname || user.id : log.subjectId;
    }
    const reviewer = await getDoc('users', log.reviewerId);
    data.push(
      Object.assign({}, log, {
        subjectName,
        reviewerName: reviewer ? reviewer.nickname || reviewer.id : log.reviewerId
      })
    );
  }
  data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return { ok: true, action: 'getAdminReviewLogs', data };
}

async function getAdminReports(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const result = await db.collection('reports').limit(100).get();
  const reports = result.data || [];
  const data = [];
  for (let i = 0; i < reports.length; i += 1) {
    const report = reports[i];
    const targetProfile = await userProfile(report.targetUserId);
    const reporterProfile = await userProfile(report.reporterId);
    data.push(
      Object.assign({}, report, {
        targetProfile,
        reporterProfile,
        targetName: targetProfile ? targetProfile.nickname : report.targetUserId,
        reporterName: reporterProfile ? reporterProfile.nickname : report.reporterId,
        statusText: formatReportStatus(report.status)
      })
    );
  }
  data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return { ok: true, action: 'getAdminReports', data };
}

async function resolveReport(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const reportId = event.reportId || event.id;
  const payload = event.payload || event;
  const report = await getDoc('reports', reportId);
  if (!report) {
    return { ok: false, message: '举报不存在' };
  }
  const timestamp = now();
  const nextReport = Object.assign({}, stripDbId(report), {
    status: 'resolved',
    handlerId: cloudUserId(wxContext.OPENID),
    updatedAt: timestamp
  });
  await db.collection('reports').doc(nextReport.id).set({
    data: nextReport
  });
  if (payload.hideTarget) {
    const targetProfile = await userProfile(nextReport.targetUserId);
    if (targetProfile) {
      await db.collection('profiles').doc(targetProfile.id).update({
        data: {
          reviewStatus: 'hidden',
          isPublic: false,
          updatedAt: timestamp
        }
      });
    }
  }
  if (payload.banTarget) {
    await banUser({ userId: nextReport.targetUserId, reason: payload.remark || '举报处理：封禁用户' }, wxContext);
  }
  return { ok: true, message: '举报已处理', action: 'resolveReport', data: nextReport };
}

async function listUsers(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const currentUserId = cloudUserId(wxContext.OPENID);
  const result = await db.collection('users').limit(200).get();
  const users = result.data || [];
  const data = [];
  for (let i = 0; i < users.length; i += 1) {
    const item = users[i];
    const profile = await userProfile(item.id);
    data.push({
      id: item.id,
      nickname: item.nickname,
      avatarText: item.avatarText,
      avatarColor: item.avatarColor,
      role: item.role,
      status: item.status,
      profileStatus: profile ? formatProfileStatus(profile.reviewStatus) : '未建档',
      profileId: profile ? profile.id : '',
      isCurrent: item.id === currentUserId
    });
  }
  return { ok: true, action: 'listUsers', data };
}

async function banUser(event, wxContext) {
  if (!(await canAdminOperate(wxContext))) {
    return { ok: false, message: '没有管理员权限' };
  }
  const userId = event.userId;
  const user = await getDoc('users', userId);
  if (!user) {
    return { ok: false, message: '用户不存在' };
  }
  const timestamp = now();
  await db.collection('users').doc(user.id).update({
    data: {
      status: 'banned',
      updatedAt: timestamp
    }
  });
  const profile = await userProfile(user.id);
  if (profile) {
    await db.collection('profiles').doc(profile.id).update({
      data: {
        reviewStatus: 'hidden',
        isPublic: false,
        updatedAt: timestamp
      }
    });
  }
  const log = {
    id: id('log'),
    subjectType: 'user',
    subjectId: user.id,
    action: 'ban',
    reviewerId: cloudUserId(wxContext.OPENID),
    remark: event.reason || '',
    createdAt: timestamp
  };
  await db.collection('reviewLogs').doc(log.id).set({
    data: log
  });
  return { ok: true, message: '已封禁用户' };
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const action = event.action || 'getCloudSummary';

  try {
    if (action === 'initDatabase') {
      return await initDatabase(wxContext);
    }
    if (action === 'getCloudSummary') {
      return await getCloudSummary(wxContext);
    }
    if (action === 'listProfiles') {
      return await listProfiles(event);
    }
    if (action === 'getProfile') {
      return await getProfile(event, wxContext);
    }
    if (action === 'getMyProfile') {
      return await getMyProfile(event, wxContext);
    }
    if (action === 'saveMyProfile') {
      return await saveMyProfile(event, wxContext);
    }
    if (action === 'submitMyProfile') {
      return await submitMyProfile(event, wxContext);
    }
    if (action === 'auditImage') {
      return await auditImage(event, wxContext);
    }
    if (action === 'toggleFavorite') {
      return await toggleFavorite(event, wxContext);
    }
    if (action === 'createContactRequest') {
      return await createContactRequest(event, wxContext);
    }
    if (action === 'createReport') {
      return await createReport(event, wxContext);
    }
    if (action === 'getContactRequests') {
      return await getContactRequests(event, wxContext);
    }
    if (action === 'respondContactRequest') {
      return await respondContactRequest(event, wxContext);
    }
    if (action === 'getConversations') {
      return await getConversations(event, wxContext);
    }
    if (action === 'getConversation') {
      return await getConversation(event, wxContext);
    }
    if (action === 'sendMessage') {
      return await sendMessage(event, wxContext);
    }
    if (action === 'setAdminByCode') {
      return await setAdminByCode(event, wxContext);
    }
    if (action === 'getAdminSummary') {
      return await getAdminSummary(event, wxContext);
    }
    if (action === 'getAdminPendingProfiles') {
      return await getAdminPendingProfiles(event, wxContext);
    }
    if (action === 'reviewProfile') {
      return await reviewProfile(event, wxContext);
    }
    if (action === 'getAdminReports') {
      return await getAdminReports(event, wxContext);
    }
    if (action === 'getAdminReviewLogs') {
      return await getAdminReviewLogs(event, wxContext);
    }
    if (action === 'resolveReport') {
      return await resolveReport(event, wxContext);
    }
    if (action === 'listUsers') {
      return await listUsers(event, wxContext);
    }
    if (action === 'banUser') {
      return await banUser(event, wxContext);
    }
    return {
      ok: false,
      message: `未知操作：${action}`
    };
  } catch (err) {
    return {
      ok: false,
      action,
      message: (err && err.errMsg) || (err && err.message) || '云函数执行失败'
    };
  }
};
