const config = require('./config');
const store = require('./store');
const { createSeedState, id, now, clone } = require('./mock-data');
const {
  formatStatus,
  formatRequestStatus,
  formatReportStatus,
  profileTags
} = require('./format');
const match = require('./match');

const legacyThemeColors = {
  '#0f766e': '#c63d2f',
  '#2563eb': '#dc2626',
  '#7c3aed': '#be123c',
  '#0ea5e9': '#f59e0b',
  '#059669': '#fb7185',
  '#14b8a6': '#9f1239'
};

function migrateThemeColors(state) {
  if (!state) {
    return false;
  }
  let changed = false;
  state.users = Array.isArray(state.users)
    ? state.users.map((item) => {
        const nextColor = legacyThemeColors[item.avatarColor];
        if (!nextColor) {
          return item;
        }
        changed = true;
        return Object.assign({}, item, {
          avatarColor: nextColor,
          updatedAt: now()
        });
      })
    : [];
  state.profiles = Array.isArray(state.profiles)
    ? state.profiles.map((item) => {
        const nextColor = legacyThemeColors[item.avatarColor];
        if (!nextColor) {
          return item;
        }
        changed = true;
        return Object.assign({}, item, {
          avatarColor: nextColor,
          updatedAt: now()
        });
      })
    : [];
  if (!state.themeVersion || state.themeVersion < 2) {
    state.themeVersion = 2;
    changed = true;
  }
  return changed;
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

function normalizeMemberIds(conversation) {
  return Array.isArray(conversation && conversation.memberIds) ? conversation.memberIds : [];
}

function hasConversationMembers(conversation, leftUserId, rightUserId) {
  const memberIds = normalizeMemberIds(conversation);
  return memberIds.indexOf(leftUserId) >= 0 && memberIds.indexOf(rightUserId) >= 0;
}

function findConversationForRequest(state, request) {
  if (!state || !request || !Array.isArray(state.conversations)) {
    return null;
  }
  const channel = request.channel || 'self';
  return (
    state.conversations.find((item) => {
      if (request.id && item.requestId === request.id) {
        return true;
      }
      return (item.channel || 'self') === channel && hasConversationMembers(item, request.fromUserId, request.toUserId);
    }) || null
  );
}

function findAcceptedRequestForProfile(state, profileUserId, channel) {
  if (!state || !Array.isArray(state.contactRequests)) {
    return null;
  }
  const list = state.contactRequests
    .filter(
      (item) =>
        item.status === 'accepted' &&
        (item.channel || 'self') === channel &&
        ((item.fromUserId === state.currentUserId && item.toUserId === profileUserId) ||
          (item.fromUserId === profileUserId && item.toUserId === state.currentUserId))
    )
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  return list.length ? list[0] : null;
}

function findConversationForProfile(state, profileUserId, channel) {
  const request = findAcceptedRequestForProfile(state, profileUserId, channel);
  return request ? findConversationForRequest(state, request) : null;
}

function ensureConversationForRequest(state, request) {
  if (!state || !request || request.status !== 'accepted') {
    return null;
  }
  if (!Array.isArray(state.conversations)) {
    state.conversations = [];
  }
  if (!Array.isArray(state.messages)) {
    state.messages = [];
  }
  const existing = findConversationForRequest(state, request);
  if (existing) {
    if (!existing.requestId && request.id) {
      existing.requestId = request.id;
    }
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
  conversation.unreadBy[request.fromUserId] = request.fromUserId === state.currentUserId ? 0 : 1;
  conversation.unreadBy[request.toUserId] = request.toUserId === state.currentUserId ? 0 : 1;

  const requestMessage = request.message ? String(request.message).trim() : '';
  if (requestMessage) {
    state.messages.push({
      id: id('msg'),
      conversationId: conversation.id,
      senderId: request.fromUserId,
      text: requestMessage,
      type: 'text',
      createdAt: request.createdAt || timestamp
    });
  }
  state.messages.push({
    id: id('msg'),
    conversationId: conversation.id,
    senderId: 'system',
    text: systemText,
    type: 'system',
    createdAt: timestamp
  });
  state.conversations.unshift(conversation);
  return conversation;
}

function seedDemoConversation(state) {
  if (!state || !Array.isArray(state.profiles)) {
    return false;
  }
  const hasDemo = Array.isArray(state.conversations)
    ? state.conversations.some((item) => item.id === 'conv_1002' || ((item.channel || 'self') === 'self' && hasConversationMembers(item, 'u_me', 'u_1002')))
    : false;
  if (hasDemo) {
    return false;
  }
  const meProfile = state.profiles.find((item) => item.userId === 'u_me');
  const targetProfile = state.profiles.find((item) => item.userId === 'u_1002');
  if (!meProfile || !targetProfile) {
    return false;
  }

  const timestamp = now();
  let changed = false;
  let request = state.contactRequests.find(
    (item) =>
      (item.channel || 'self') === 'self' &&
      ((item.fromUserId === 'u_me' && item.toUserId === 'u_1002') || (item.fromUserId === 'u_1002' && item.toUserId === 'u_me'))
  );
  if (!request) {
    request = {
      id: 'req_2',
      fromUserId: 'u_me',
      toUserId: 'u_1002',
      message: '你好，看到你的资料，感觉沟通方式挺真诚，想先简单认识一下。',
      channel: 'self',
      fromMode: 'self',
      toPublisherType: 'self',
      status: 'accepted',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    state.contactRequests.unshift(request);
    changed = true;
  }
  if (request.status !== 'accepted') {
    return changed;
  }

  const conversation = {
    id: 'conv_1002',
    requestId: request.id,
    memberIds: [request.fromUserId, request.toUserId],
    channel: 'self',
    lastMessage: '那我们先从生活节奏聊起吧。',
    lastMessageAt: timestamp,
    unreadBy: {
      u_me: 1,
      u_1002: 0
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.conversations.unshift(conversation);
  state.messages.push(
    {
      id: 'msg_1002_1',
      conversationId: conversation.id,
      senderId: 'u_me',
      text: '你好，看到你的资料，感觉沟通方式挺真诚，想先简单认识一下。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_2',
      conversationId: conversation.id,
      senderId: 'u_1002',
      text: '你好呀，可以先聊聊，了解一下平时生活和择偶想法。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_3',
      conversationId: conversation.id,
      senderId: 'system',
      text: '双方已通过联系申请，请注意保护隐私，线下见面建议选择公共场所。',
      type: 'system',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_4',
      conversationId: conversation.id,
      senderId: 'u_1002',
      text: '那我们先从生活节奏聊起吧。',
      type: 'text',
      createdAt: timestamp
    }
  );
  return true;
}

function ensureChatState(state) {
  let changed = false;
  if (!Array.isArray(state.contactRequests)) {
    state.contactRequests = [];
    changed = true;
  }
  if (!Array.isArray(state.conversations)) {
    state.conversations = [];
    changed = true;
  }
  if (!Array.isArray(state.messages)) {
    state.messages = [];
    changed = true;
  }
  if (!state.chatVersion || state.chatVersion < 1) {
    if (seedDemoConversation(state)) {
      changed = true;
    }
    state.chatVersion = 1;
    changed = true;
  }
  state.contactRequests.forEach((item) => {
    if (item.status === 'accepted' && !findConversationForRequest(state, item)) {
      ensureConversationForRequest(state, item);
      changed = true;
    }
  });
  return changed;
}

function ensureState() {
  let state = store.readState(null);
  if (!state || !Array.isArray(state.users) || !Array.isArray(state.profiles)) {
    state = createSeedState();
    store.writeState(state);
  }
  if (migrateThemeColors(state)) {
    store.writeState(state);
  }
  if (!state.currentUserId) {
    state.currentUserId = store.readCurrentUserId('u_me') || 'u_me';
    store.writeState(state);
  }
  if (!state.viewerMode) {
    state.viewerMode = 'self';
    store.writeState(state);
  }
  if (!Array.isArray(state.notInterestedProfiles)) {
    state.notInterestedProfiles = [];
    store.writeState(state);
  }
  if (state.recommendationOffset === undefined || state.recommendationOffset === null) {
    state.recommendationOffset = 0;
    store.writeState(state);
  }
  if (!Array.isArray(state.browseHistory)) {
    state.browseHistory = [];
    store.writeState(state);
  }
  if (ensureChatState(state)) {
    store.writeState(state);
  }
  if (!state.filters) {
    state.filters = store.readFilters({
      keyword: '',
      gender: 'all',
      ageMin: 22,
      ageMax: 35,
      region: 'all',
      maritalStatus: 'all',
      education: 'all'
    });
    store.writeState(state);
  }
  return state;
}

function saveState(state) {
  store.writeState(state);
  return state;
}

function saveFilters(filters) {
  const state = ensureState();
  state.filters = Object.assign({}, filters);
  store.writeFilters(state.filters);
  saveState(state);
  return clone(state.filters);
}

function getSavedFilters() {
  const state = ensureState();
  return clone(state.filters || {});
}

function getCurrentUser() {
  const state = ensureState();
  const user = state.users.find((item) => item.id === state.currentUserId) || state.users[0];
  return clone(user);
}

function getViewerMode() {
  const state = ensureState();
  return state.viewerMode || 'self';
}

function setViewerMode(mode) {
  const state = ensureState();
  state.viewerMode = mode === 'parent' ? 'parent' : 'self';
  saveState(state);
  return clone({
    mode: state.viewerMode,
    label: state.viewerMode === 'parent' ? '家长代看' : '本人模式'
  });
}

function getCurrentUserProfile() {
  const state = ensureState();
  const profile = state.profiles.find((item) => item.userId === state.currentUserId);
  return profile ? clone(profile) : null;
}

function ensureProfileForCurrentUser(stateArg) {
  const state = stateArg || ensureState();
  let profile = state.profiles.find((item) => item.userId === state.currentUserId);
  if (!profile) {
    const user = state.users.find((item) => item.id === state.currentUserId) || {};
    profile = {
      id: id('profile'),
      userId: state.currentUserId,
      nickname: user.nickname || '新用户',
      avatarText: user.avatarText || '我',
      avatarColor: user.avatarColor || '#c63d2f',
      avatarUrl: '',
      gender: '',
      age: '',
      hometown: '',
      currentCity: '',
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
      createdAt: now(),
      updatedAt: now()
    };
    state.profiles.unshift(profile);
    if (!stateArg) {
      saveState(state);
    }
  }
  return profile;
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
  return text.includes(String(keyword).trim().toLowerCase());
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
    if (!regionText.includes(nextFilters.region)) {
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

function isFavorite(state, profileId) {
  return state.favorites.some((item) => item.userId === state.currentUserId && item.targetUserId === profileId);
}

function contactChannelFor(state, profile) {
  if ((state.viewerMode || 'self') === 'parent' || (profile && profile.publisherType === 'parent')) {
    return 'parent';
  }
  return 'self';
}

function channelText(channel) {
  return channel === 'parent' ? '家长沟通' : '本人联系';
}

function recordProfileView(profileId) {
  const state = ensureState();
  const profile = state.profiles.find((item) => item.userId === profileId || item.id === profileId);
  if (!profile || profile.userId === state.currentUserId) {
    return { ok: false, message: '忽略自身资料' };
  }
  const targetId = profile.userId;
  const history = Array.isArray(state.browseHistory) ? state.browseHistory.slice() : [];
  const nextHistory = history.filter((item) => item.profileId !== targetId);
  nextHistory.unshift({
    id: id('view'),
    profileId: targetId,
    viewedAt: now()
  });
  state.browseHistory = nextHistory.slice(0, 20);
  saveState(state);
  return { ok: true, data: clone(profile) };
}

function getRecentViews(limit = 4) {
  const state = ensureState();
  const safeLimit = Math.max(1, Number(limit) || 4);
  const result = [];
  (state.browseHistory || []).forEach((entry) => {
    if (result.length >= safeLimit) {
      return;
    }
    const profile = state.profiles.find((item) => item.userId === entry.profileId || item.id === entry.profileId);
    if (!profile || profile.userId === state.currentUserId) {
      return;
    }
    if (result.some((item) => item.userId === profile.userId)) {
      return;
    }
    result.push(
      Object.assign({}, enrichProfile(state, profile), {
        viewedAt: entry.viewedAt
      })
    );
  });
  return clone(result);
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
  if (!profile) {
    return {
      score: 0,
      filled: 0,
      total: completionRules.length,
      missing: completionRules.map((item) => item.label)
    };
  }
  const totalWeight = completionRules.reduce((sum, item) => sum + item.weight, 0);
  let filledWeight = 0;
  const missing = [];
  completionRules.forEach((item) => {
    if (item.check(profile)) {
      filledWeight += item.weight;
    } else {
      missing.push(item.label);
    }
  });
  const score = Math.max(0, Math.min(100, Math.round((filledWeight / totalWeight) * 100)));
  return {
    score,
    filled: completionRules.length - missing.length,
    total: completionRules.length,
    missing
  };
}

function sharedLifestyleTags(leftProfile, rightProfile) {
  const leftTags = Array.isArray(leftProfile && leftProfile.lifestyleTags) ? leftProfile.lifestyleTags : [];
  const rightTags = Array.isArray(rightProfile && rightProfile.lifestyleTags) ? rightProfile.lifestyleTags : [];
  const result = [];
  rightTags.forEach((tag) => {
    if (tag && leftTags.indexOf(tag) >= 0 && result.indexOf(tag) < 0) {
      result.push(tag);
    }
  });
  return result;
}

function recommendationReasons(profile, meProfile, state) {
  const reasons = [];
  const sharedAnswers = match.sharedAnswerLabels(meProfile.matchAnswers, profile.matchAnswers);
  if (profile.currentCity && meProfile.currentCity && profile.currentCity === meProfile.currentCity) {
    reasons.push('同城生活圈');
  }
  if (profile.hometown && meProfile.hometown && profile.hometown === meProfile.hometown && reasons.indexOf('同城生活圈') < 0) {
    reasons.push('同乡更好聊');
  }
  const age = Number(profile.age);
  const myAge = Number(meProfile.age);
  if (age && myAge) {
    const gap = Math.abs(age - myAge);
    if (gap <= 2) {
      reasons.push('年龄很接近');
    } else if (gap <= 5) {
      reasons.push('年龄区间合适');
    }
  }
  const sharedTags = sharedLifestyleTags(meProfile, profile);
  if (sharedTags.length) {
    reasons.push(`都喜欢${sharedTags[0]}`);
    if (sharedTags.length > 1) {
      reasons.push(`${sharedTags.length}个共同生活标签`);
    }
  }
  if (sharedAnswers.length) {
    reasons.push(`问答匹配：${sharedAnswers.slice(0, 2).join('、')}`);
  }
  if (contactChannelFor(state, profile) === 'parent') {
    reasons.push('可先家长沟通');
  }
  const completion = calculateProfileCompletion(profile);
  if (completion.score >= 85) {
    reasons.push('资料很完整');
  } else if (completion.score >= 70) {
    reasons.push('信息比较清楚');
  }
  return reasons.slice(0, 5);
}

function recommendationScore(profile, meProfile, state) {
  let score = 36;
  if (profile.currentCity && meProfile.currentCity && profile.currentCity === meProfile.currentCity) {
    score += 20;
  }
  if (profile.hometown && meProfile.hometown && profile.hometown === meProfile.hometown) {
    score += 10;
  }
  const age = Number(profile.age);
  const myAge = Number(meProfile.age);
  if (age && myAge) {
    const gap = Math.abs(age - myAge);
    if (gap <= 2) {
      score += 15;
    } else if (gap <= 5) {
      score += 10;
    } else if (gap <= 8) {
      score += 5;
    }
  }
  score += Math.min(sharedLifestyleTags(meProfile, profile).length * 6, 18);
  if (profile.maritalStatus && meProfile.maritalStatus && profile.maritalStatus === meProfile.maritalStatus) {
    score += 5;
  }
  if (profile.education && meProfile.education && profile.education === meProfile.education) {
    score += 3;
  }
  if ((state.viewerMode || 'self') === 'parent' && contactChannelFor(state, profile) === 'parent') {
    score += 4;
  }
  score += Math.round(calculateProfileCompletion(profile).score * 0.18);
  return Math.max(60, Math.min(99, Math.round(score)));
}

function isRecommendationCandidate(state, profile, filters) {
  const nextFilters = filters || {};
  const keyword = nextFilters.keyword || '';
  if (!profile || profile.userId === state.currentUserId) {
    return false;
  }
  if (profile.reviewStatus !== 'approved' || !profile.isPublic) {
    return false;
  }
  if (!matchesKeyword(profile, keyword)) {
    return false;
  }
  return matchesFilters(profile, nextFilters);
}

function buildRecommendationPool(state, filters = {}) {
  const meProfile = ensureProfileForCurrentUser(state);
  const ignoredIds = Array.isArray(state.notInterestedProfiles) ? state.notInterestedProfiles : [];
  return state.profiles
    .filter((item) => isRecommendationCandidate(state, item, filters))
    .filter((item) => ignoredIds.indexOf(item.userId) < 0)
    .map((item) => {
      const reasons = recommendationReasons(item, meProfile, state);
      const score = recommendationScore(item, meProfile, state);
      return Object.assign({}, enrichProfile(state, item), {
        matchScore: score,
        matchScoreText: `缘分值 ${score}`,
        matchReasons: reasons,
        matchReasonText: reasons.length ? reasons.join(' · ') : '系统按资料完整度推荐'
      });
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
}

function takeRecommendationBatch(pool, limit, offset) {
  if (!pool.length) {
    return [];
  }
  const safeOffset = Math.max(0, Number(offset) || 0) % pool.length;
  const rotated = pool.slice(safeOffset).concat(pool.slice(0, safeOffset));
  return rotated.slice(0, limit);
}

function getRecommendationStats(filters = {}) {
  const state = ensureState();
  const ignoredIds = Array.isArray(state.notInterestedProfiles) ? state.notInterestedProfiles : [];
  const total = state.profiles.filter((item) => isRecommendationCandidate(state, item, filters)).length;
  const hiddenCount = state.profiles.filter((item) => isRecommendationCandidate(state, item, filters) && ignoredIds.indexOf(item.userId) >= 0).length;
  return clone({
    total,
    available: Math.max(0, total - hiddenCount),
    hiddenCount,
    offset: Number(state.recommendationOffset) || 0
  });
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

function isContacted(state, profileId, channel) {
  return state.contactRequests.some(
    (item) =>
      (item.channel || 'self') === channel &&
      ((item.fromUserId === state.currentUserId && item.toUserId === profileId) ||
        (item.fromUserId === profileId && item.toUserId === state.currentUserId))
  );
}

function getContactStatus(state, profileId, channel) {
  const requests = state.contactRequests
    .filter(
      (item) =>
        (item.channel || 'self') === channel &&
        ((item.fromUserId === state.currentUserId && item.toUserId === profileId) ||
          (item.fromUserId === profileId && item.toUserId === state.currentUserId))
    )
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  return requests.length ? requests[0].status : '';
}

function hasAcceptedContact(state, profileId, channel) {
  if (profileId === state.currentUserId) {
    return true;
  }
  return state.contactRequests.some(
    (item) =>
      item.status === 'accepted' &&
      (item.channel || 'self') === channel &&
      ((item.fromUserId === state.currentUserId && item.toUserId === profileId) ||
        (item.fromUserId === profileId && item.toUserId === state.currentUserId))
  );
}

function trustBadges(profile, profileCompletion, canViewContact) {
  const badges = [];
  if (profile.reviewStatus === 'approved' && profile.isPublic) {
    badges.push({ label: '已审核', tone: 'primary' });
  }
  if (profileCompletion.score >= 85) {
    badges.push({ label: '资料完整', tone: 'warm' });
  }
  if (Array.isArray(profile.photos) && profile.photos.length) {
    badges.push({ label: '有生活照', tone: 'soft' });
  }
  if (match.buildAnswerCards(profile.matchAnswers).length >= 3) {
    badges.push({ label: '问答清楚', tone: 'soft' });
  }
  if (hasContent(profile.phone) || hasContent(profile.wechatId) || hasContent(profile.parentPhone) || hasContent(profile.parentWechatId)) {
    badges.push({ label: canViewContact ? '已开放联系' : '联系保护', tone: canViewContact ? 'warm' : 'soft' });
  }
  return badges.slice(0, 4);
}

function enrichProfile(state, profile) {
  if (!profile) {
    return null;
  }
  const nextProfile = clone(profile);
  const channel = contactChannelFor(state, profile);
  const canViewContact = hasAcceptedContact(state, profile.userId, channel);
  const conversation = canViewContact ? findConversationForProfile(state, profile.userId, channel) : null;
  const profileCompletion = calculateProfileCompletion(profile);
  const introCards = [
    { label: '生活节奏', value: profile.lifeRhythm || '还没写' },
    { label: '关系期待', value: profile.relationshipView || '还没写' },
    { label: '周末怎么过', value: profile.weekendPlan || '还没写' }
  ];
  const matchQuestionCards = match.buildAnswerCards(profile.matchAnswers);
  if (!canViewContact || channel === 'parent') {
    nextProfile.phone = '';
    nextProfile.wechatId = '';
    nextProfile.contactNote = '';
  }
  if (!canViewContact || channel !== 'parent') {
    nextProfile.parentName = '';
    nextProfile.parentRelation = '';
    nextProfile.parentPhone = '';
    nextProfile.parentWechatId = '';
    nextProfile.parentContactNote = '';
  }
  return Object.assign({}, nextProfile, {
    tags: profileTags(profile),
    lifestyleTags: Array.isArray(profile.lifestyleTags) ? profile.lifestyleTags : [],
    matchAnswers: match.normalizeMatchAnswers(profile.matchAnswers),
    matchQuestionCards,
    matchAnswerCount: matchQuestionCards.length,
    trustBadges: trustBadges(profile, profileCompletion, canViewContact),
    introCards,
    introSnippet: [profile.lifeRhythm, profile.relationshipView, profile.weekendPlan].find(Boolean) || profile.bio || '',
    publisherText: publisherText(profile),
    profileCompletionScore: profileCompletion.score,
    profileCompletionText: `完整度 ${profileCompletion.score}%`,
    profileCompletionMissing: profileCompletion.missing,
    profileCompletionMissingText: profileCompletion.missing.slice(0, 3).join('、'),
    contactChannel: channel,
    contactChannelText: channelText(channel),
    contactActionText: canViewContact ? '去聊天' : isContacted(state, profile.userId, channel) ? '已申请' : channel === 'parent' ? '家长沟通' : '发起联系',
    isFavorited: isFavorite(state, profile.userId),
    hasContactRequest: isContacted(state, profile.userId, channel),
    contactStatus: getContactStatus(state, profile.userId, channel),
    conversationId: conversation ? conversation.id : '',
    canViewContact
  });
}

function listProfiles(filters = {}) {
  const state = ensureState();
  const nextFilters = Object.assign({}, state.filters || {}, filters || {});
  const keyword = nextFilters.keyword || '';
  const profiles = state.profiles
    .filter((item) => item.userId !== state.currentUserId)
    .filter((item) => item.reviewStatus === 'approved' && item.isPublic)
    .filter((item) => matchesKeyword(item, keyword))
    .filter((item) => matchesFilters(item, nextFilters))
    .sort((a, b) => {
      const at = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const bt = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return at - bt;
    })
    .map((item) => enrichProfile(state, item));
  return clone(profiles);
}

function getRecommendedProfiles(limit = 3, filters = {}) {
  const state = ensureState();
  const safeLimit = Math.max(1, Number(limit) || 3);
  const pool = buildRecommendationPool(state, filters);
  const profiles = takeRecommendationBatch(pool, safeLimit, state.recommendationOffset);
  return clone(profiles);
}

function nextRecommendationBatch(limit = 3, filters = {}) {
  const state = ensureState();
  const safeLimit = Math.max(1, Number(limit) || 3);
  const pool = buildRecommendationPool(state, filters);
  if (!pool.length) {
    state.recommendationOffset = 0;
    saveState(state);
    return { ok: false, message: '暂无新的推荐' };
  }
  state.recommendationOffset = ((Number(state.recommendationOffset) || 0) + safeLimit) % pool.length;
  saveState(state);
  return {
    ok: true,
    message: pool.length > safeLimit ? '已换一批' : '推荐数量有限，已刷新',
    data: {
      offset: state.recommendationOffset,
      total: pool.length
    }
  };
}

function dismissRecommendation(targetUserId) {
  const state = ensureState();
  const profile = state.profiles.find((item) => item.userId === targetUserId || item.id === targetUserId);
  if (!profile || profile.userId === state.currentUserId) {
    return { ok: false, message: '资料不存在' };
  }
  const ignoredIds = Array.isArray(state.notInterestedProfiles) ? state.notInterestedProfiles.slice() : [];
  if (ignoredIds.indexOf(profile.userId) < 0) {
    ignoredIds.unshift(profile.userId);
  }
  state.notInterestedProfiles = ignoredIds.slice(0, 100);
  state.recommendationOffset = 0;
  saveState(state);
  return { ok: true, message: '已减少此类推荐' };
}

function resetRecommendationPreferences() {
  const state = ensureState();
  state.notInterestedProfiles = [];
  state.recommendationOffset = 0;
  saveState(state);
  return { ok: true, message: '已恢复推荐池' };
}

function getProfile(profileId) {
  const state = ensureState();
  const profile = state.profiles.find((item) => item.id === profileId || item.userId === profileId);
  return profile ? enrichProfile(state, profile) : null;
}

function normalizeProfileInput(payload) {
  const next = Object.assign({}, payload);
  next.age = next.age === '' || next.age === null || next.age === undefined ? '' : Number(next.age);
  next.height = next.height === '' || next.height === null || next.height === undefined ? '' : Number(next.height);
  next.hasChildren = !!next.hasChildren;
  next.photos = Array.isArray(next.photos) ? next.photos : [];
  next.lifestyleTags = Array.isArray(next.lifestyleTags) ? next.lifestyleTags : [];
  next.matchAnswers = match.normalizeMatchAnswers(next.matchAnswers);
  next.publisherType = next.publisherType || 'self';
  next.childConsentStatus = next.publisherType === 'parent' ? next.childConsentStatus || 'confirmed' : 'self';
  if (!next.avatarUrl && !next.avatarText && next.nickname) {
    next.avatarText = next.nickname.slice(0, 1);
  }
  return next;
}

function saveMyProfile(payload) {
  const state = ensureState();
  const profile = ensureProfileForCurrentUser(state);
  const next = normalizeProfileInput(payload || {});
  Object.assign(profile, next, {
    userId: state.currentUserId,
    updatedAt: now()
  });
  if (profile.reviewStatus === 'approved') {
    profile.reviewStatus = 'draft';
    profile.isPublic = false;
  } else if (!profile.reviewStatus || profile.reviewStatus === 'rejected') {
    profile.reviewStatus = 'draft';
  }
  saveState(state);
  return clone(profile);
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

function submitMyProfile() {
  const state = ensureState();
  const profile = ensureProfileForCurrentUser(state);
  const missing = validateProfile(profile);
  if (missing.length) {
    return {
      ok: false,
      message: `请先补全：${missing.join('、')}`
    };
  }
  profile.reviewStatus = 'pending';
  profile.isPublic = false;
  profile.submittedAt = now();
  profile.updatedAt = now();
  state.reviewLogs.unshift({
    id: id('log'),
    subjectType: 'profile',
    subjectId: profile.id,
    action: 'submit',
    reviewerId: state.currentUserId,
    remark: '用户提交审核',
    createdAt: now()
  });
  saveState(state);
  return {
    ok: true,
    message: '资料已提交审核',
    data: clone(profile)
  };
}

function getMyProfile() {
  const state = ensureState();
  return clone(ensureProfileForCurrentUser(state));
}

function getFavorites() {
  const state = ensureState();
  return clone(
    state.favorites
      .filter((item) => item.userId === state.currentUserId)
      .map((item) => {
        const profile = state.profiles.find((p) => p.userId === item.targetUserId || p.id === item.targetUserId);
        return profile ? enrichProfile(state, profile) : null;
      })
      .filter(Boolean)
  );
}

function toggleFavorite(targetUserId) {
  const state = ensureState();
  const profile = state.profiles.find((item) => item.userId === targetUserId || item.id === targetUserId);
  if (!profile) {
    return { ok: false, message: '资料不存在' };
  }
  const index = state.favorites.findIndex((item) => item.userId === state.currentUserId && item.targetUserId === profile.userId);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    saveState(state);
    return { ok: true, message: '已取消收藏', data: { favorited: false } };
  }
  state.favorites.unshift({
    id: id('fav'),
    userId: state.currentUserId,
    targetUserId: profile.userId,
    createdAt: now()
  });
  saveState(state);
  return { ok: true, message: '已收藏', data: { favorited: true } };
}

function createContactRequest(payload) {
  const state = ensureState();
  const toUserId = payload && payload.toUserId;
  const message = (payload && payload.message) || '';
  const profile = state.profiles.find((item) => item.userId === toUserId || item.id === toUserId);
  if (!profile || profile.reviewStatus !== 'approved' || !profile.isPublic) {
    return { ok: false, message: '该资料暂时无法联系' };
  }
  if (profile.userId === state.currentUserId) {
    return { ok: false, message: '不能联系自己' };
  }
  const channel = payload && payload.channel ? payload.channel : contactChannelFor(state, profile);
  const existing = state.contactRequests.find(
    (item) =>
      (item.channel || 'self') === channel &&
      ((item.fromUserId === state.currentUserId && item.toUserId === profile.userId) ||
        (item.fromUserId === profile.userId && item.toUserId === state.currentUserId))
  );
  if (existing && existing.status === 'accepted') {
    return { ok: false, message: channel === 'parent' ? '对方已同意，可查看家长联系方式' : '对方已同意，可查看联系方式' };
  }
  if (existing && existing.status === 'pending') {
    return { ok: false, message: channel === 'parent' ? '已经发起过家长沟通申请' : '已经发起过联系申请' };
  }
  const request = {
    id: id('req'),
    fromUserId: state.currentUserId,
    toUserId: profile.userId,
    message: message.trim(),
    channel,
    fromMode: state.viewerMode || 'self',
    toPublisherType: profile.publisherType || 'self',
    status: 'pending',
    createdAt: now(),
    updatedAt: now()
  };
  state.contactRequests.unshift(request);
  saveState(state);
  return { ok: true, message: channel === 'parent' ? '家长沟通申请已发送' : '联系申请已发送', data: clone(request) };
}

function applyRequestContact(profile, rawProfile, channel, status) {
  if (!profile || !rawProfile) {
    return profile;
  }
  const nextProfile = Object.assign({}, profile, {
    contactChannel: channel,
    contactChannelText: channelText(channel),
    canViewContact: status === 'accepted'
  });
  nextProfile.phone = '';
  nextProfile.wechatId = '';
  nextProfile.contactNote = '';
  nextProfile.parentName = '';
  nextProfile.parentRelation = '';
  nextProfile.parentPhone = '';
  nextProfile.parentWechatId = '';
  nextProfile.parentContactNote = '';
  if (status !== 'accepted') {
    return nextProfile;
  }
  if (channel === 'parent') {
    nextProfile.parentName = rawProfile.parentName || '';
    nextProfile.parentRelation = rawProfile.parentRelation || '';
    nextProfile.parentPhone = rawProfile.parentPhone || '';
    nextProfile.parentWechatId = rawProfile.parentWechatId || '';
    nextProfile.parentContactNote = rawProfile.parentContactNote || '';
  } else {
    nextProfile.phone = rawProfile.phone || '';
    nextProfile.wechatId = rawProfile.wechatId || '';
    nextProfile.contactNote = rawProfile.contactNote || '';
  }
  return nextProfile;
}

function getContactRequests(scope) {
  const state = ensureState();
  const list = state.contactRequests
    .filter((item) => {
      if (scope === 'inbox') {
        return item.toUserId === state.currentUserId;
      }
      if (scope === 'outbox') {
        return item.fromUserId === state.currentUserId;
      }
      return true;
    })
    .map((item) => {
      const fromProfile = state.profiles.find((p) => p.userId === item.fromUserId || p.id === item.fromUserId);
      const toProfile = state.profiles.find((p) => p.userId === item.toUserId || p.id === item.toUserId);
      const channel = item.channel || 'self';
      const fromEnriched = fromProfile ? applyRequestContact(enrichProfile(state, fromProfile), fromProfile, channel, item.status) : null;
      const toEnriched = toProfile ? applyRequestContact(enrichProfile(state, toProfile), toProfile, channel, item.status) : null;
      const conversation = item.status === 'accepted' ? findConversationForRequest(state, item) : null;
      return Object.assign({}, clone(item), {
        fromProfile: fromEnriched,
        toProfile: toEnriched,
        conversationId: conversation ? conversation.id : '',
        channel,
        channelText: channelText(channel),
        statusText: formatRequestStatus(item.status)
      });
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return clone(list);
}

function respondContactRequest(requestId, decision) {
  const state = ensureState();
  const request = state.contactRequests.find((item) => item.id === requestId);
  if (!request || request.toUserId !== state.currentUserId) {
    return { ok: false, message: '申请不存在' };
  }
  if (request.status !== 'pending') {
    return { ok: false, message: '该申请已处理' };
  }
  request.status = decision === 'accept' ? 'accepted' : 'rejected';
  request.updatedAt = now();
  const conversation = request.status === 'accepted' ? ensureConversationForRequest(state, request) : null;
  saveState(state);
  return {
    ok: true,
    message: request.status === 'accepted' ? '已同意' : '已拒绝',
    data: Object.assign({}, clone(request), {
      conversationId: conversation ? conversation.id : ''
    })
  };
}

function rawProfileForUser(state, userId) {
  return state.profiles.find((item) => item.userId === userId || item.id === userId) || null;
}

function rawUserForId(state, userId) {
  return state.users.find((item) => item.id === userId) || null;
}

function peerUserIdForConversation(state, conversation) {
  const memberIds = normalizeMemberIds(conversation);
  return memberIds.find((item) => item !== state.currentUserId) || memberIds[0] || '';
}

function fallbackPeerProfile(state, userId) {
  const user = rawUserForId(state, userId) || {};
  return {
    id: '',
    userId,
    nickname: user.nickname || '已隐藏用户',
    avatarText: user.avatarText || '?',
    avatarColor: user.avatarColor || '#94a3b8',
    avatarUrl: '',
    gender: '',
    age: '',
    currentCity: '',
    summary: ''
  };
}

function shortProfileSummary(profile) {
  if (!profile) {
    return '';
  }
  return [profile.currentCity, profile.age ? `${profile.age}岁` : '', profile.education, profile.occupation].filter(Boolean).join(' · ');
}

function enrichMessage(state, message) {
  const isSystem = message.type === 'system' || message.senderId === 'system';
  const profile = isSystem ? null : rawProfileForUser(state, message.senderId);
  const user = isSystem ? null : rawUserForId(state, message.senderId);
  return Object.assign({}, clone(message), {
    isMine: message.senderId === state.currentUserId,
    isSystem,
    senderName: isSystem ? '系统提醒' : profile ? profile.nickname : user && user.nickname ? user.nickname : '对方',
    senderAvatarText: isSystem ? '喜' : profile ? profile.avatarText : user && user.avatarText ? user.avatarText : '?',
    senderAvatarColor: isSystem ? '#c63d2f' : profile ? profile.avatarColor : user && user.avatarColor ? user.avatarColor : '#94a3b8',
    senderAvatarUrl: profile ? profile.avatarUrl : '',
    timeText: formatChatTime(message.createdAt)
  });
}

function enrichConversation(state, conversation) {
  if (!conversation || normalizeMemberIds(conversation).indexOf(state.currentUserId) < 0) {
    return null;
  }
  const peerUserId = peerUserIdForConversation(state, conversation);
  const rawProfile = rawProfileForUser(state, peerUserId);
  const peerProfile = rawProfile ? enrichProfile(state, rawProfile) : fallbackPeerProfile(state, peerUserId);
  const unreadBy = conversation.unreadBy || {};
  return Object.assign({}, clone(conversation), {
    peerUserId,
    peerProfile: Object.assign({}, peerProfile, {
      summary: shortProfileSummary(peerProfile)
    }),
    channel: conversation.channel || 'self',
    channelText: channelText(conversation.channel || 'self'),
    lastMessageText: conversation.lastMessage || '可以开始聊天了',
    timeText: formatChatTime(conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt),
    unreadCount: Number(unreadBy[state.currentUserId] || 0)
  });
}

function getConversations() {
  const state = ensureState();
  const list = (state.conversations || [])
    .filter((item) => normalizeMemberIds(item).indexOf(state.currentUserId) >= 0)
    .map((item) => enrichConversation(state, item))
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
    );
  return clone(list);
}

function getConversation(conversationId) {
  const state = ensureState();
  const conversation = (state.conversations || []).find((item) => item.id === conversationId);
  if (!conversation || normalizeMemberIds(conversation).indexOf(state.currentUserId) < 0) {
    return null;
  }
  if (!conversation.unreadBy) {
    conversation.unreadBy = {};
  }
  if (conversation.unreadBy[state.currentUserId]) {
    conversation.unreadBy[state.currentUserId] = 0;
    saveState(state);
  }
  const messages = (state.messages || [])
    .filter((item) => item.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .map((item) => enrichMessage(state, item));
  return clone(
    Object.assign({}, enrichConversation(state, conversation), {
      messages
    })
  );
}

function getConversationByProfile(profileUserId, channelArg) {
  const state = ensureState();
  const profile = rawProfileForUser(state, profileUserId);
  if (!profile) {
    return null;
  }
  const channel = channelArg || contactChannelFor(state, profile);
  const request = findAcceptedRequestForProfile(state, profile.userId, channel);
  if (!request) {
    return null;
  }
  const conversation = ensureConversationForRequest(state, request);
  saveState(state);
  return conversation ? clone(enrichConversation(state, conversation)) : null;
}

function sendMessage(conversationId, text) {
  const state = ensureState();
  const conversation = (state.conversations || []).find((item) => item.id === conversationId);
  const content = text ? String(text).trim() : '';
  if (!conversation || normalizeMemberIds(conversation).indexOf(state.currentUserId) < 0) {
    return { ok: false, message: '会话不存在' };
  }
  if (!content) {
    return { ok: false, message: '先写一点内容' };
  }
  const timestamp = now();
  const message = {
    id: id('msg'),
    conversationId: conversation.id,
    senderId: state.currentUserId,
    text: content,
    type: 'text',
    createdAt: timestamp
  };
  state.messages.push(message);
  conversation.lastMessage = content;
  conversation.lastMessageAt = timestamp;
  conversation.updatedAt = timestamp;
  if (!conversation.unreadBy) {
    conversation.unreadBy = {};
  }
  normalizeMemberIds(conversation).forEach((userId) => {
    if (userId === state.currentUserId) {
      conversation.unreadBy[userId] = 0;
    } else {
      conversation.unreadBy[userId] = Number(conversation.unreadBy[userId] || 0) + 1;
    }
  });
  saveState(state);
  return {
    ok: true,
    message: '已发送',
    data: clone(enrichMessage(state, message))
  };
}

function createReport(payload) {
  const state = ensureState();
  const targetUserId = payload && payload.targetUserId;
  const profile = state.profiles.find((item) => item.userId === targetUserId || item.id === targetUserId);
  if (!profile) {
    return { ok: false, message: '举报对象不存在' };
  }
  const report = {
    id: id('report'),
    reporterId: state.currentUserId,
    targetUserId: profile.userId,
    category: (payload && payload.category) || '其他',
    reason: (payload && payload.reason) || '',
    evidenceUrls: Array.isArray(payload && payload.evidenceUrls) ? payload.evidenceUrls : [],
    status: 'pending',
    handlerId: '',
    createdAt: now(),
    updatedAt: now()
  };
  state.reports.unshift(report);
  saveState(state);
  return { ok: true, message: '举报已提交', data: clone(report) };
}

function canAdminOperate(state) {
  const user = state.users.find((item) => item.id === state.currentUserId);
  return !!(user && (user.role === 'admin' || user.isAdmin));
}

function setAdminByCode(code) {
  const state = ensureState();
  if (code !== config.adminCode) {
    return { ok: false, message: '口令不正确' };
  }
  const user = state.users.find((item) => item.id === state.currentUserId);
  if (user) {
    user.role = 'admin';
    user.updatedAt = now();
  }
  saveState(state);
  return { ok: true, message: '已进入管理员模式' };
}

function getAdminSummary() {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  return {
    ok: true,
    data: {
      pendingProfiles: listPendingProfilesRaw(state).length,
      reports: state.reports.filter((item) => item.status === 'pending').length,
      bannedUsers: state.users.filter((item) => item.status === 'banned').length,
      approvedProfiles: state.profiles.filter((item) => item.reviewStatus === 'approved' && item.isPublic).length
    }
  };
}

function listPendingProfilesRaw(state) {
  return state.profiles.filter((item) => item.reviewStatus === 'pending');
}

function getAdminPendingProfiles() {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const data = listPendingProfilesRaw(state)
    .map((item) => {
      const user = state.users.find((u) => u.id === item.userId);
      return Object.assign({}, clone(item), {
        user: user ? clone(user) : null,
        tags: profileTags(item)
      });
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return { ok: true, data };
}

function reviewProfile(profileId, action, remark) {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) {
    return { ok: false, message: '资料不存在' };
  }
  if (action === 'approve') {
    profile.reviewStatus = 'approved';
    profile.isPublic = true;
    profile.reviewedAt = now();
  } else if (action === 'reject') {
    profile.reviewStatus = 'rejected';
    profile.isPublic = false;
    profile.reviewedAt = now();
  } else if (action === 'hide') {
    profile.reviewStatus = 'hidden';
    profile.isPublic = false;
    profile.reviewedAt = now();
  }
  profile.updatedAt = now();
  state.reviewLogs.unshift({
    id: id('log'),
    subjectType: 'profile',
    subjectId: profile.id,
    action,
    reviewerId: state.currentUserId,
    remark: remark || '',
    createdAt: now()
  });
  saveState(state);
  return { ok: true, message: '已处理', data: clone(profile) };
}

function getAdminReports() {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const data = state.reports
    .map((item) => {
      const targetProfile = state.profiles.find((p) => p.userId === item.targetUserId || p.id === item.targetUserId);
      const reporter = state.profiles.find((p) => p.userId === item.reporterId || p.id === item.reporterId);
      return Object.assign({}, clone(item), {
        targetProfile: targetProfile ? clone(targetProfile) : null,
        reporterProfile: reporter ? clone(reporter) : null,
        targetName: targetProfile ? targetProfile.nickname : item.targetUserId,
        reporterName: reporter ? reporter.nickname : item.reporterId,
        statusText: formatReportStatus(item.status)
      });
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { ok: true, data };
}

function resolveReport(reportId, payload) {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) {
    return { ok: false, message: '举报不存在' };
  }
  report.status = 'resolved';
  report.handlerId = state.currentUserId;
  report.updatedAt = now();
  state.reviewLogs.unshift({
    id: id('log'),
    subjectType: 'report',
    subjectId: report.id,
    action: 'resolve',
    reviewerId: state.currentUserId,
    remark: (payload && payload.remark) || '',
    createdAt: now()
  });
  if (payload && payload.hideTarget) {
    const targetProfile = state.profiles.find((item) => item.userId === report.targetUserId);
    if (targetProfile) {
      targetProfile.reviewStatus = 'hidden';
      targetProfile.isPublic = false;
      targetProfile.updatedAt = now();
    }
  }
  if (payload && payload.banTarget) {
    const targetUser = state.users.find((item) => item.id === report.targetUserId);
    if (targetUser) {
      targetUser.status = 'banned';
      targetUser.updatedAt = now();
    }
  }
  saveState(state);
  return { ok: true, message: '举报已处理', data: clone(report) };
}

function listUsers() {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const data = state.users.map((item) => {
    const profile = state.profiles.find((p) => p.userId === item.id);
    return {
      id: item.id,
      nickname: item.nickname,
      avatarText: item.avatarText,
      avatarColor: item.avatarColor,
      role: item.role,
      status: item.status,
      profileStatus: profile ? formatStatus(profile.reviewStatus) : '未建档',
      profileId: profile ? profile.id : '',
      isCurrent: item.id === state.currentUserId
    };
  });
  return { ok: true, data };
}

function banUser(userId, reason) {
  const state = ensureState();
  if (!canAdminOperate(state)) {
    return { ok: false, message: '没有管理员权限' };
  }
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return { ok: false, message: '用户不存在' };
  }
  user.status = 'banned';
  user.updatedAt = now();
  const profile = state.profiles.find((item) => item.userId === userId);
  if (profile) {
    profile.reviewStatus = 'hidden';
    profile.isPublic = false;
    profile.updatedAt = now();
  }
  state.reviewLogs.unshift({
    id: id('log'),
    subjectType: 'user',
    subjectId: userId,
    action: 'ban',
    reviewerId: state.currentUserId,
    remark: reason || '',
    createdAt: now()
  });
  saveState(state);
  return { ok: true, message: '已封禁用户' };
}

module.exports = {
  ensureState,
  saveFilters,
  getSavedFilters,
  getViewerMode,
  setViewerMode,
  getCurrentUser,
  getCurrentUserProfile,
  calculateProfileCompletion,
  getRecommendedProfiles,
  getRecommendationStats,
  nextRecommendationBatch,
  dismissRecommendation,
  resetRecommendationPreferences,
  recordProfileView,
  getRecentViews,
  getMyProfile,
  saveMyProfile,
  submitMyProfile,
  listProfiles,
  getProfile,
  getFavorites,
  toggleFavorite,
  createContactRequest,
  getContactRequests,
  respondContactRequest,
  getConversations,
  getConversation,
  getConversationByProfile,
  sendMessage,
  createReport,
  setAdminByCode,
  getAdminSummary,
  getAdminPendingProfiles,
  reviewProfile,
  getAdminReports,
  resolveReport,
  listUsers,
  banUser
};
