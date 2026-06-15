const { clone, writeCurrentUserId, writeFilters } = require('./store');

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function makeUser({ id, nickname, role = 'user', avatarText, avatarColor, status = 'normal' }) {
  const timestamp = now();
  return {
    id,
    nickname,
    avatarText,
    avatarColor,
    role,
    status,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function makeProfile(payload) {
  const timestamp = payload.createdAt || now();
  const publisherType = payload.publisherType || 'self';
  return {
    id: payload.id,
    userId: payload.userId,
    nickname: payload.nickname,
    avatarText: payload.avatarText || payload.nickname.slice(0, 1),
    avatarColor: payload.avatarColor || '#c63d2f',
    avatarUrl: payload.avatarUrl || '',
    gender: payload.gender || '',
    age: payload.age || '',
    hometown: payload.hometown || '',
    currentCity: payload.currentCity || '',
    height: payload.height || '',
    education: payload.education || '',
    occupation: payload.occupation || '',
    incomeRange: payload.incomeRange || '',
    maritalStatus: payload.maritalStatus || '',
    hasChildren: payload.hasChildren || false,
    houseStatus: payload.houseStatus || '',
    carStatus: payload.carStatus || '',
    phone: payload.phone || '',
    wechatId: payload.wechatId || '',
    contactNote: payload.contactNote || '',
    publisherType,
    childConsentStatus: payload.childConsentStatus || (publisherType === 'parent' ? 'confirmed' : 'self'),
    parentName: payload.parentName || '',
    parentRelation: payload.parentRelation || '',
    parentPhone: payload.parentPhone || '',
    parentWechatId: payload.parentWechatId || '',
    parentContactNote: payload.parentContactNote || '',
    lifeRhythm: payload.lifeRhythm || '',
    relationshipView: payload.relationshipView || '',
    weekendPlan: payload.weekendPlan || '',
    lifestyleTags: payload.lifestyleTags || [],
    matchAnswers: payload.matchAnswers || {},
    bio: payload.bio || '',
    expectation: payload.expectation || '',
    photos: payload.photos || [],
    reviewStatus: payload.reviewStatus || 'draft',
    isPublic: payload.isPublic || false,
    submittedAt: payload.submittedAt || '',
    reviewedAt: payload.reviewedAt || '',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createSeedState() {
  const timestamp = now();
  const users = [
    makeUser({ id: 'u_me', nickname: '新化小溪', avatarText: '我', avatarColor: '#c63d2f' }),
    makeUser({ id: 'u_admin', nickname: '系统管理员', avatarText: '管', avatarColor: '#7f1d1d', role: 'admin' }),
    makeUser({ id: 'u_1001', nickname: '陈雨', avatarText: '陈', avatarColor: '#dc2626' }),
    makeUser({ id: 'u_1002', nickname: '罗敏', avatarText: '罗', avatarColor: '#db2777' }),
    makeUser({ id: 'u_1003', nickname: '唐浩', avatarText: '唐', avatarColor: '#be123c' }),
    makeUser({ id: 'u_1004', nickname: '刘婷', avatarText: '刘', avatarColor: '#f59e0b' }),
    makeUser({ id: 'u_1005', nickname: '杨帆', avatarText: '杨', avatarColor: '#ea580c' }),
    makeUser({ id: 'u_1006', nickname: '胡颖', avatarText: '胡', avatarColor: '#fb7185' }),
    makeUser({ id: 'u_1007', nickname: '曾涛', avatarText: '曾', avatarColor: '#9f1239' }),
    makeUser({ id: 'u_1008', nickname: '周倩', avatarText: '周', avatarColor: '#f97316' })
  ];

  const profiles = [
    makeProfile({
      id: 'p_me',
      userId: 'u_me',
      nickname: '新化小溪',
      avatarText: '我',
      avatarColor: '#c63d2f',
      gender: '女',
      age: 27,
      hometown: '新化县',
      currentCity: '新化县',
      height: 160,
      education: '本科',
      occupation: '文员',
      incomeRange: '5-8万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '租房',
      carStatus: '无车',
      phone: '13800000000',
      wechatId: 'xinhua_demo',
      contactNote: '通过后可先加微信沟通。',
      lifeRhythm: '工作日规律上班，下班后会散步或做饭。',
      relationshipView: '希望两个人能好好说话，也能一起把日子过稳。',
      weekendPlan: '周末常在城区逛逛，偶尔回家陪父母。',
      lifestyleTags: ['做饭', '散步', '顾家', '慢热'],
      matchAnswers: {
        weekendStyle: '陪家人',
        homePlan: '新化稳定',
        marriagePace: '一到两年',
        familyView: '多走动',
        conflictStyle: '冷静再聊'
      },
      bio: '认真工作，认真生活，想找一个在新化能踏实过日子的人。',
      expectation: '希望对方真诚、稳定、尊重家庭。',
      reviewStatus: 'draft',
      isPublic: false,
      createdAt: timestamp
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
      matchAnswers: {
        weekendStyle: '出去走走',
        homePlan: '新化稳定',
        marriagePace: '一到两年',
        familyView: '多走动',
        conflictStyle: '先听对方'
      },
      bio: '性格温和，喜欢做饭、徒步和看书。',
      expectation: '希望对方靠谱，有稳定工作，情绪稳定。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
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
      matchAnswers: {
        weekendStyle: '安静休息',
        homePlan: '两边都可',
        marriagePace: '慢慢了解',
        familyView: '互相尊重',
        conflictStyle: '当天说开'
      },
      bio: '工作规律，周末喜欢去菜市场和咖啡店。',
      expectation: '希望对方有责任感，沟通顺畅，不冷暴力。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
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
      matchAnswers: {
        weekendStyle: '出去走走',
        homePlan: '长沙发展',
        marriagePace: '一到两年',
        familyView: '互相尊重',
        conflictStyle: '一起商量'
      },
      bio: '平时比较安静，周末会回家陪父母，偶尔打球。',
      expectation: '希望找一个性格合拍、愿意一起经营生活的人。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
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
      expectation: '希望对方顾家、讲道理，不抽烟或少抽烟。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
    }),
    makeProfile({
      id: 'p_1005',
      userId: 'u_1005',
      nickname: '杨帆',
      avatarText: '杨',
      avatarColor: '#ea580c',
      gender: '男',
      age: 33,
      hometown: '新化县奉家镇',
      currentCity: '新化县城区',
      height: 176,
      education: '大专',
      occupation: '个体经营',
      incomeRange: '12-20万',
      maritalStatus: '离异带孩',
      hasChildren: true,
      houseStatus: '有房',
      carStatus: '有车',
      phone: '13800001005',
      wechatId: 'yangfan_xh',
      contactNote: '同意后可电话或微信联系。',
      lifeRhythm: '自己做点小生意，时间弹性但责任也多。',
      relationshipView: '希望彼此坦诚，能接受真实的家庭情况。',
      weekendPlan: '周末多陪孩子，也会开车去周边转转。',
      lifestyleTags: ['个体经营', '带孩', '开车', '顾家'],
      bio: '平常比较顾家，也愿意花时间陪伴孩子。',
      expectation: '希望对方温和、真诚、能接受家庭情况。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
    }),
    makeProfile({
      id: 'p_1006',
      userId: 'u_1006',
      nickname: '胡颖',
      avatarText: '胡',
      avatarColor: '#fb7185',
      gender: '女',
      age: 29,
      hometown: '新化县圳上镇',
      currentCity: '新化县城区',
      height: 163,
      education: '硕士',
      occupation: '教师',
      incomeRange: '10-15万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '有房',
      carStatus: '有车',
      phone: '13800001006',
      wechatId: 'huying_xh',
      contactNote: '下班后回复。',
      lifeRhythm: '上课日节奏稳定，晚上会运动或做烘焙。',
      relationshipView: '希望双方都有耐心，能认真听对方说话。',
      weekendPlan: '周末做点甜品，或者去山里走一走。',
      lifestyleTags: ['教师', '烘焙', '运动', '耐心'],
      bio: '平时喜欢运动和烘焙，生活比较规律。',
      expectation: '希望对方有耐心，三观正常，愿意沟通。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
    }),
    makeProfile({
      id: 'p_1007',
      userId: 'u_1007',
      nickname: '曾涛',
      avatarText: '曾',
      avatarColor: '#9f1239',
      gender: '男',
      age: 35,
      hometown: '新化县水车镇',
      currentCity: '新化县城区',
      height: 178,
      education: '本科',
      occupation: '公务员',
      incomeRange: '12-20万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '有房',
      carStatus: '有车',
      phone: '13800001007',
      wechatId: 'zengtao_xh',
      contactNote: '可先加微信。',
      lifeRhythm: '工作稳定，平时比较自律，不太熬夜。',
      relationshipView: '希望先从朋友式相处开始，慢慢确认合不合适。',
      weekendPlan: '周末喜欢爬山、钓鱼，也会回家吃饭。',
      lifestyleTags: ['公务员', '爬山', '钓鱼', '不熬夜'],
      bio: '工作稳定，生活简单，周末喜欢爬山和钓鱼。',
      expectation: '希望找一个踏实、善良、能长期相处的人。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
    }),
    makeProfile({
      id: 'p_1008',
      userId: 'u_1008',
      nickname: '周倩',
      avatarText: '周',
      avatarColor: '#f97316',
      gender: '女',
      age: 24,
      hometown: '新化县炉观镇',
      currentCity: '新化县城区',
      height: 159,
      education: '大专',
      occupation: '电商客服',
      incomeRange: '5-8万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '租房',
      carStatus: '无车',
      phone: '13800001008',
      wechatId: 'zhouqian_xh',
      contactNote: '同意后微信联系。',
      lifeRhythm: '客服工作需要耐心，下班后喜欢轻松一点。',
      relationshipView: '喜欢真诚直接，不喜欢试探和忽冷忽热。',
      weekendPlan: '周末会和朋友吃饭，或者宅家追剧。',
      lifestyleTags: ['电商', '追剧', '直接', '开朗'],
      bio: '性格开朗，说话直接，做事不拖拉。',
      expectation: '希望对方诚实、有担当，彼此能互相支持。',
      reviewStatus: 'approved',
      isPublic: true,
      createdAt: timestamp
    })
  ];

  const favorites = [
    {
      id: 'fav_1',
      userId: 'u_me',
      targetUserId: 'u_1002',
      createdAt: timestamp
    }
  ];

  const contactRequests = [
    {
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
    },
    {
      id: 'req_1',
      fromUserId: 'u_1003',
      toUserId: 'u_me',
      message: '你好，看到你的资料，想认识一下。',
      channel: 'self',
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const conversations = [
    {
      id: 'conv_1002',
      requestId: 'req_2',
      memberIds: ['u_me', 'u_1002'],
      channel: 'self',
      lastMessage: '那我们先从生活节奏聊起吧。',
      lastMessageAt: timestamp,
      unreadBy: {
        u_me: 1,
        u_1002: 0
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const messages = [
    {
      id: 'msg_1002_1',
      conversationId: 'conv_1002',
      senderId: 'u_me',
      text: '你好，看到你的资料，感觉沟通方式挺真诚，想先简单认识一下。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_2',
      conversationId: 'conv_1002',
      senderId: 'u_1002',
      text: '你好呀，可以先聊聊，了解一下平时生活和择偶想法。',
      type: 'text',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_3',
      conversationId: 'conv_1002',
      senderId: 'system',
      text: '双方已通过联系申请，请注意保护隐私，线下见面建议选择公共场所。',
      type: 'system',
      createdAt: timestamp
    },
    {
      id: 'msg_1002_4',
      conversationId: 'conv_1002',
      senderId: 'u_1002',
      text: '那我们先从生活节奏聊起吧。',
      type: 'text',
      createdAt: timestamp
    }
  ];

  const reports = [];
  const reviewLogs = [];

  const filters = {
    keyword: '',
    gender: 'all',
    ageMin: 22,
    ageMax: 35,
    region: 'all',
    maritalStatus: 'all',
    education: 'all'
  };

  writeCurrentUserId('u_me');
  writeFilters(filters);

  return {
    users,
    profiles,
    favorites,
    contactRequests,
    conversations,
    messages,
    browseHistory: [],
    notInterestedProfiles: [],
    recommendationOffset: 0,
    reports,
    reviewLogs,
    currentUserId: 'u_me',
    chatVersion: 1,
    filters
  };
}

module.exports = {
  id,
  now,
  makeUser,
  makeProfile,
  createSeedState,
  clone
};
