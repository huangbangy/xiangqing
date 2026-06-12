const STORAGE_KEY = 'xiangqin_state_v1';
const FILTERS_KEY = 'xiangqin_filters_v1';
const CURRENT_USER_KEY = 'xiangqin_current_user_v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasWxStorage() {
  return typeof wx !== 'undefined' && wx.getStorageSync && wx.setStorageSync;
}

function getMemoryStore() {
  if (!global.__xiangqinMemoryStore) {
    global.__xiangqinMemoryStore = {};
  }
  return global.__xiangqinMemoryStore;
}

function read(key, fallback) {
  if (hasWxStorage()) {
    try {
      const value = wx.getStorageSync(key);
      return value === '' || value === undefined || value === null ? clone(fallback) : clone(value);
    } catch (err) {
      return clone(fallback);
    }
  }
  const memory = getMemoryStore();
  return memory[key] === undefined ? clone(fallback) : clone(memory[key]);
}

function write(key, value) {
  const nextValue = clone(value);
  if (hasWxStorage()) {
    wx.setStorageSync(key, nextValue);
  } else {
    getMemoryStore()[key] = nextValue;
  }
  return clone(nextValue);
}

function readState(fallback) {
  return read(STORAGE_KEY, fallback);
}

function writeState(state) {
  return write(STORAGE_KEY, state);
}

function readFilters(fallback) {
  return read(FILTERS_KEY, fallback);
}

function writeFilters(filters) {
  return write(FILTERS_KEY, filters);
}

function readCurrentUserId(fallback) {
  return read(CURRENT_USER_KEY, fallback);
}

function writeCurrentUserId(userId) {
  return write(CURRENT_USER_KEY, userId);
}

module.exports = {
  clone,
  readState,
  writeState,
  readFilters,
  writeFilters,
  readCurrentUserId,
  writeCurrentUserId
};

