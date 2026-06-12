function text(value, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function formatAge(age) {
  return age ? `${age}岁` : '年龄待补充';
}

function formatHeight(height) {
  return height ? `${height}cm` : '身高待补充';
}

function formatRange(min, max, unit = '') {
  if (min && max) {
    return `${min}-${max}${unit}`;
  }
  if (min) {
    return `${min}${unit}以上`;
  }
  if (max) {
    return `${max}${unit}以下`;
  }
  return '不限';
}

function formatStatus(status) {
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

function formatRequestStatus(status) {
  const map = {
    pending: '待处理',
    accepted: '已同意',
    rejected: '已拒绝',
    closed: '已关闭'
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

function truncate(value, max = 48) {
  const str = text(value);
  if (!str) {
    return '';
  }
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function profileSummary(profile) {
  if (!profile) {
    return '';
  }
  const parts = [profile.currentCity, formatAge(profile.age), profile.education, profile.occupation];
  return parts.filter(Boolean).join(' · ');
}

function profileTags(profile) {
  if (!profile) {
    return [];
  }
  const tags = [];
  if (profile.maritalStatus) tags.push(profile.maritalStatus);
  if (profile.hasChildren !== undefined && profile.hasChildren !== null) tags.push(profile.hasChildren ? '有孩子' : '无孩子');
  if (profile.houseStatus) tags.push(profile.houseStatus);
  if (profile.carStatus) tags.push(profile.carStatus);
  if (profile.incomeRange) tags.push(profile.incomeRange);
  return tags.slice(0, 4);
}

function filterSummary(filters) {
  if (!filters) {
    return '全部';
  }
  const parts = [];
  if (filters.gender && filters.gender !== 'all') parts.push(filters.gender);
  if (filters.region && filters.region !== 'all') parts.push(filters.region);
  if (filters.maritalStatus && filters.maritalStatus !== 'all') parts.push(filters.maritalStatus);
  if (filters.education && filters.education !== 'all') parts.push(filters.education);
  if (filters.ageMin || filters.ageMax) parts.push(formatRange(filters.ageMin, filters.ageMax, '岁'));
  return parts.length ? parts.join(' · ') : '全部';
}

module.exports = {
  text,
  formatAge,
  formatHeight,
  formatRange,
  formatStatus,
  formatRequestStatus,
  formatReportStatus,
  truncate,
  profileSummary,
  profileTags,
  filterSummary
};

