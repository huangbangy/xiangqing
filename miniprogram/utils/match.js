const matchQuestions = [
  {
    key: 'weekendStyle',
    label: '周末节奏',
    shortLabel: '周末',
    options: ['安静休息', '出去走走', '陪家人', '看情况']
  },
  {
    key: 'homePlan',
    label: '以后更想在哪里生活',
    shortLabel: '生活地',
    options: ['新化稳定', '长沙发展', '两边都可', '看对方']
  },
  {
    key: 'marriagePace',
    label: '期待多久进入婚姻',
    shortLabel: '婚恋节奏',
    options: ['一年内', '一到两年', '慢慢了解', '顺其自然']
  },
  {
    key: 'familyView',
    label: '怎么看待双方家庭',
    shortLabel: '家庭观',
    options: ['多走动', '边界清楚', '互相尊重', '顺其自然']
  },
  {
    key: 'conflictStyle',
    label: '发生分歧时更希望',
    shortLabel: '沟通方式',
    options: ['当天说开', '冷静再聊', '先听对方', '一起商量']
  }
];

function normalizeMatchAnswers(value) {
  const source = value && typeof value === 'object' ? value : {};
  const result = {};
  matchQuestions.forEach((question) => {
    const answer = String(source[question.key] || '').trim();
    if (question.options.indexOf(answer) >= 0) {
      result[question.key] = answer;
    }
  });
  return result;
}

function buildEditQuestions(answers) {
  const nextAnswers = normalizeMatchAnswers(answers);
  return matchQuestions.map((question) =>
    Object.assign({}, question, {
      selected: nextAnswers[question.key] || ''
    })
  );
}

function buildAnswerCards(answers) {
  const nextAnswers = normalizeMatchAnswers(answers);
  return matchQuestions
    .map((question) => ({
      key: question.key,
      label: question.shortLabel,
      title: question.label,
      value: nextAnswers[question.key] || ''
    }))
    .filter((item) => item.value);
}

function firstAnswer(answers, key) {
  const nextAnswers = normalizeMatchAnswers(answers);
  return nextAnswers[key] || '';
}

function buildIcebreakers(profile, channel) {
  const target = profile || {};
  const answers = normalizeMatchAnswers(target.matchAnswers);
  const replies = [];
  const weekend = firstAnswer(answers, 'weekendStyle');
  const homePlan = firstAnswer(answers, 'homePlan');
  const marriagePace = firstAnswer(answers, 'marriagePace');
  const conflictStyle = firstAnswer(answers, 'conflictStyle');
  const name = target.nickname || '你';

  if (channel === 'parent') {
    replies.push({
      label: '家长开场',
      text: `你好，我是家长，看到${name}的资料，想先了解一下双方基本情况。`
    });
    if (homePlan) {
      replies.push({
        label: '生活地',
        text: `你好，看到资料里提到更倾向“${homePlan}”，我们也想先聊聊以后生活安排。`
      });
    }
    replies.push({
      label: '本人确认',
      text: '如果孩子本人也愿意，我们可以先让双方简单沟通一下。'
    });
  } else {
    if (weekend) {
      replies.push({
        label: '周末',
        text: `你好，看到你周末更偏向“${weekend}”，感觉可以从生活节奏聊起。`
      });
    }
    if (marriagePace) {
      replies.push({
        label: '节奏',
        text: `你好，我看到你对婚恋节奏的想法是“${marriagePace}”，想认真了解一下。`
      });
    }
    if (conflictStyle) {
      replies.push({
        label: '沟通',
        text: `你好，看到你遇到分歧时更希望“${conflictStyle}”，这点我也挺看重。`
      });
    }
  }

  if (!replies.length) {
    replies.push({
      label: '生活节奏',
      text: '你好，看到你的资料，感觉我们的生活节奏挺接近，想简单认识一下。'
    });
  }
  replies.push({
    label: '真诚了解',
    text: '你好，我认真看了你的资料，想先从生活和择偶想法聊起。'
  });

  return replies.slice(0, 3);
}

module.exports = {
  matchQuestions,
  normalizeMatchAnswers,
  buildEditQuestions,
  buildAnswerCards,
  buildIcebreakers
};
