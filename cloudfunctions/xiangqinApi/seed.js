function now() {
  return new Date().toISOString();
}

function makeUser(payload) {
  const timestamp = now();
  return Object.assign(
    {
      role: 'user',
      status: 'normal',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    payload
  );
}

function makeProfile(payload) {
  const timestamp = now();
  const publisherType = payload.publisherType || 'self';
  return Object.assign(
    {
      avatarUrl: '',
      phone: '',
      wechatId: '',
      contactNote: '',
      publisherType,
      childConsentStatus: publisherType === 'parent' ? 'confirmed' : 'self',
      parentName: '',
      parentRelation: '',
      parentPhone: '',
      parentWechatId: '',
      parentContactNote: '',
      photos: [],
      reviewStatus: 'approved',
      isPublic: true,
      submittedAt: '',
      reviewedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    payload
  );
}

function createCloudSeed(currentUser) {
  const timestamp = now();
  const users = [
    currentUser,
    makeUser({ id: 'u_admin', nickname: '系统管理员', avatarText: '管', avatarColor: '#7f1d1d', role: 'admin' }),
    makeUser({ id: 'u_1001', nickname: '陈雨', avatarText: '陈', avatarColor: '#dc2626' }),
    makeUser({ id: 'u_1002', nickname: '罗敏', avatarText: '罗', avatarColor: '#db2777' }),
    makeUser({ id: 'u_1003', nickname: '唐浩', avatarText: '唐', avatarColor: '#be123c' }),
    makeUser({ id: 'u_1004', nickname: '刘婷', avatarText: '刘', avatarColor: '#f59e0b' })
  ];

  const profiles = [
    makeProfile({
      id: `p_${currentUser.id}`,
      userId: currentUser.id,
      nickname: currentUser.nickname,
      avatarText: currentUser.avatarText,
      avatarColor: currentUser.avatarColor,
      gender: '',
      age: '',
      hometown: '新化县',
      currentCity: '新化县',
      height: '',
      education: '',
      occupation: '',
      incomeRange: '',
      maritalStatus: '',
      hasChildren: false,
      houseStatus: '',
      carStatus: '',
      lifeRhythm: '',
      relationshipView: '',
      weekendPlan: '',
      lifestyleTags: [],
      bio: '',
      expectation: '',
      reviewStatus: 'draft',
      isPublic: false,
      reviewedAt: '',
      createdAt: timestamp,
      updatedAt: timestamp
    }),
    makeProfile({
      id: 'p_1001',
      userId: 'u_1001',
      nickname: '陈雨',
      avatarText: '陈',
      avatarColor: '#dc2626',
      gender: '女',
      age: 28,
      hometown: '新化县上梅街道',
      currentCity: '新化县城区',
      height: 162,
      education: '大专',
      occupation: '幼教老师',
      incomeRange: '6-10万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '有房贷',
      carStatus: '有车',
      phone: '13800001001',
      wechatId: 'chenyu_xh',
      contactNote: '同意后可微信联系。',
      publisherType: 'parent',
      childConsentStatus: 'confirmed',
      parentName: '陈妈妈',
      parentRelation: '母亲',
      parentPhone: '13900001001',
      parentWechatId: 'chen_mama_xh',
      parentContactNote: '家长可先沟通基本情况，孩子本人已知情。',
      lifeRhythm: '白天在幼儿园，晚上喜欢安静一点的生活。',
      relationshipView: '比起轰轰烈烈，更看重稳定、耐心和边界感。',
      weekendPlan: '周末喜欢做饭、徒步，天气好会去资江边走走。',
      lifestyleTags: ['幼教', '做饭', '徒步', '情绪稳定'],
      bio: '性格温和，喜欢做饭、徒步和看书。',
      expectation: '希望对方靠谱，有稳定工作，情绪稳定。'
    }),
    makeProfile({
      id: 'p_1002',
      userId: 'u_1002',
      nickname: '罗敏',
      avatarText: '罗',
      avatarColor: '#db2777',
      gender: '女',
      age: 31,
      hometown: '新化县洋溪镇',
      currentCity: '新化县城区',
      height: 158,
      education: '本科',
      occupation: '护士',
      incomeRange: '8-12万',
      maritalStatus: '离异',
      hasChildren: false,
      houseStatus: '有房',
      carStatus: '有车',
      phone: '13800001002',
      wechatId: 'luomin_xh',
      contactNote: '工作日晚上回复较快。',
      lifeRhythm: '排班制工作，休息时会把家里收拾得舒服一点。',
      relationshipView: '希望关系里有回应，不冷处理，不让人猜。',
      weekendPlan: '休息日会去菜市场、咖啡店，偶尔和朋友吃饭。',
      lifestyleTags: ['护士', '会沟通', '咖啡', '干净生活'],
      bio: '工作规律，周末喜欢去菜市场和咖啡店。',
      expectation: '希望对方有责任感，沟通顺畅，不冷暴力。'
    }),
    makeProfile({
      id: 'p_1003',
      userId: 'u_1003',
      nickname: '唐浩',
      avatarText: '唐',
      avatarColor: '#be123c',
      gender: '男',
      age: 30,
      hometown: '新化县桑梓镇',
      currentCity: '新化县城区',
      height: 173,
      education: '本科',
      occupation: '工程师',
      incomeRange: '10-15万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '有房',
      carStatus: '有车',
      phone: '13800001003',
      wechatId: 'tanghao_xh',
      contactNote: '可先微信简单了解。',
      publisherType: 'parent',
      childConsentStatus: 'confirmed',
      parentName: '唐叔叔',
      parentRelation: '父亲',
      parentPhone: '13900001003',
      parentWechatId: 'tang_baba_xh',
      parentContactNote: '可先和家长了解家庭情况，孩子本人已确认。',
      lifeRhythm: '工程项目忙的时候会加班，空下来会规律运动。',
      relationshipView: '希望两个人能一起解决问题，而不是互相消耗。',
      weekendPlan: '周末回家陪父母，或者约朋友打球。',
      lifestyleTags: ['工程师', '打球', '顾家', '稳定工作'],
      bio: '平时比较安静，周末会回家陪父母，偶尔打球。',
      expectation: '希望找一个性格合拍、愿意一起经营生活的人。'
    }),
    makeProfile({
      id: 'p_1004',
      userId: 'u_1004',
      nickname: '刘婷',
      avatarText: '刘',
      avatarColor: '#f59e0b',
      gender: '女',
      age: 26,
      hometown: '新化县白溪镇',
      currentCity: '新化县城区',
      height: 165,
      education: '本科',
      occupation: '会计',
      incomeRange: '8-12万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '租房',
      carStatus: '无车',
      phone: '13800001004',
      wechatId: 'liuting_xh',
      contactNote: '希望先线上沟通。',
      lifeRhythm: '工作比较规律，喜欢把日程安排得清楚一点。',
      relationshipView: '希望对方讲道理，也愿意照顾彼此感受。',
      weekendPlan: '周末常在城区买菜、整理房间，偶尔看电影。',
      lifestyleTags: ['会计', '电影', '整洁', '少抽烟'],
      bio: '做事细致，喜欢整洁的生活环境。',
      expectation: '希望对方顾家、讲道理，不抽烟或少抽烟。'
    })
  ];

  const favorites = [
    {
      id: `fav_${currentUser.id}_1002`,
      userId: currentUser.id,
      targetUserId: 'u_1002',
      createdAt: timestamp
    }
  ];

  const contactRequests = [
    {
      id: `req_${currentUser.id}_1002`,
      fromUserId: currentUser.id,
      toUserId: 'u_1002',
      message: '你好，看到你的资料，感觉沟通方式挺真诚，想先简单认识一下。',
      channel: 'self',
      fromMode: 'self',
      toPublisherType: 'self',
      status: 'accepted',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: `req_1003_${currentUser.id}`,
      fromUserId: 'u_1003',
      toUserId: currentUser.id,
      message: '你好，看到你的资料，想认识一下。',
      channel: 'self',
      fromMode: 'self',
      toPublisherType: 'self',
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const conversations = [
    {
      id: `conv_${currentUser.id}_1002`,
      requestId: `req_${currentUser.id}_1002`,
      memberIds: [currentUser.id, 'u_1002'],
      channel: 'self',
      lastMessage: '那我们先从生活节奏聊起吧。',
      lastMessageAt: timestamp,
      unreadBy: {
        [currentUser.id]: 1,
        u_1002: 0
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const messages = [
    {
      id: `msg_${currentUser.id}_1002_1`,
      conversationId: `conv_${currentUser.id}_1002`,
      senderId: currentUser.id,
      text: '你好，看到你的资料，感觉沟通方式挺真诚，想先简单认识一下。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: `msg_${currentUser.id}_1002_2`,
      conversationId: `conv_${currentUser.id}_1002`,
      senderId: 'u_1002',
      text: '你好呀，可以先聊聊，了解一下平时生活和择偶想法。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: `msg_${currentUser.id}_1002_3`,
      conversationId: `conv_${currentUser.id}_1002`,
      senderId: 'system',
      text: '双方已通过联系申请，请注意保护隐私，线下见面建议选择公共场所。',
      type: 'system',
      createdAt: timestamp
    },
    {
      id: `msg_${currentUser.id}_1002_4`,
      conversationId: `conv_${currentUser.id}_1002`,
      senderId: 'u_1002',
      text: '那我们先从生活节奏聊起吧。',
      type: 'text',
      createdAt: timestamp
    }
  ];

  return {
    users,
    profiles,
    favorites,
    contactRequests,
    conversations,
    messages,
    reports: [],
    reviewLogs: []
  };
}

module.exports = {
  createCloudSeed
};
