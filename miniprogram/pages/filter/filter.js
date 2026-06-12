const service = require('../../utils/service');
const format = require('../../utils/format');

const defaultFilters = {
  keyword: '',
  gender: 'all',
  ageMin: '',
  ageMax: '',
  region: 'all',
  maritalStatus: 'all',
  education: 'all'
};

const pickerConfig = {
  gender: [
    { label: '全部', value: 'all' },
    { label: '男', value: '男' },
    { label: '女', value: '女' }
  ],
  region: [
    { label: '全部', value: 'all' },
    { label: '新化县城区', value: '新化县城区' },
    { label: '上梅街道', value: '上梅街道' },
    { label: '洋溪镇', value: '洋溪镇' },
    { label: '桑梓镇', value: '桑梓镇' },
    { label: '白溪镇', value: '白溪镇' },
    { label: '奉家镇', value: '奉家镇' },
    { label: '圳上镇', value: '圳上镇' },
    { label: '水车镇', value: '水车镇' },
    { label: '炉观镇', value: '炉观镇' }
  ],
  maritalStatus: [
    { label: '全部', value: 'all' },
    { label: '未婚', value: '未婚' },
    { label: '离异', value: '离异' },
    { label: '离异带孩', value: '离异带孩' }
  ],
  education: [
    { label: '全部', value: 'all' },
    { label: '高中', value: '高中' },
    { label: '中专', value: '中专' },
    { label: '大专', value: '大专' },
    { label: '本科', value: '本科' },
    { label: '硕士', value: '硕士' }
  ]
};

function optionIndex(options, value) {
  const index = options.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

Page({
  data: {
    filters: defaultFilters,
    summary: '全部',
    genderOptions: pickerConfig.gender,
    regionOptions: pickerConfig.region,
    maritalStatusOptions: pickerConfig.maritalStatus,
    educationOptions: pickerConfig.education,
    genderIndex: 0,
    regionIndex: 0,
    maritalStatusIndex: 0,
    educationIndex: 0
  },

  onLoad() {
    this.syncFilters(service.getSavedFilters());
  },

  syncFilters(filters) {
    const nextFilters = Object.assign({}, defaultFilters, filters || {});
    this.setData({
      filters: nextFilters,
      summary: format.filterSummary(nextFilters),
      genderIndex: optionIndex(pickerConfig.gender, nextFilters.gender),
      regionIndex: optionIndex(pickerConfig.region, nextFilters.region),
      maritalStatusIndex: optionIndex(pickerConfig.maritalStatus, nextFilters.maritalStatus),
      educationIndex: optionIndex(pickerConfig.education, nextFilters.education)
    });
  },

  onPickerChange(event) {
    const field = event.currentTarget.dataset.field;
    const index = Number(event.detail.value);
    const options = pickerConfig[field];
    const value = options[index].value;
    const nextFilters = Object.assign({}, this.data.filters, {
      [field]: value
    });
    this.syncFilters(nextFilters);
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const nextFilters = Object.assign({}, this.data.filters, {
      [field]: value ? Number(value) : ''
    });
    this.syncFilters(nextFilters);
  },

  reset() {
    service.saveFilters(defaultFilters);
    this.syncFilters(defaultFilters);
  },

  save() {
    service.saveFilters(this.data.filters);
    wx.navigateBack();
  }
});

