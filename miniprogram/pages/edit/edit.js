const service = require('../../utils/service');
const format = require('../../utils/format');
const cloudService = require('../../utils/cloud-service');
const match = require('../../utils/match');

const cityOptions = [
  '新化县城区',
  '上梅街道',
  '洋溪镇',
  '桑梓镇',
  '白溪镇',
  '奉家镇',
  '圳上镇',
  '水车镇',
  '炉观镇',
  '其他新化乡镇'
];

const pickerFields = [
  'gender',
  'hometown',
  'currentCity',
  'education',
  'incomeRange',
  'maritalStatus',
  'houseStatus',
  'carStatus'
];

const textInputFields = [
  'nickname',
  'age',
  'height',
  'occupation',
  'lifeRhythm',
  'relationshipView',
  'weekendPlan',
  'wechatId',
  'phone',
  'contactNote',
  'bio',
  'expectation'
];

function optionIndex(options, value) {
  const index = options.findIndex((item) => item === value);
  return index >= 0 ? index : 0;
}

function normalizeForm(profile) {
  return Object.assign(
    {
      nickname: '',
      avatarText: '',
      avatarColor: '#c63d2f',
      avatarUrl: '',
      gender: '女',
      age: '',
      hometown: '新化县城区',
      currentCity: '新化县城区',
      height: '',
      education: '大专',
      occupation: '',
      incomeRange: '5-8万',
      maritalStatus: '未婚',
      hasChildren: false,
      houseStatus: '租房',
      carStatus: '无车',
      phone: '',
      wechatId: '',
      contactNote: '',
      lifeRhythm: '',
      relationshipView: '',
      weekendPlan: '',
      lifestyleTags: [],
      matchAnswers: {},
      bio: '',
      expectation: '',
      photos: []
    },
    profile || {}
  );
}

function isUnuploadedImagePath(path) {
  return !!(path && !cloudService.isStoredFilePath(path));
}

function hasUnuploadedImages(form) {
  const profile = form || {};
  if (isUnuploadedImagePath(profile.avatarUrl)) {
    return true;
  }
  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  return photos.some((item) => isUnuploadedImagePath(item));
}

const tagOptions = [
  '做饭',
  '运动',
  '爬山',
  '看书',
  '追剧',
  '咖啡',
  '旅行',
  '宠物',
  '顾家',
  '慢热',
  '开朗',
  '稳定',
  '会沟通',
  '干净生活',
  '不熬夜',
  '带孩',
  '周末回新化',
  '在长沙发展',
  '父母在本地',
  '想近两年结婚',
  '能接受县城生活'
];

Page({
  data: {
    form: normalizeForm({}),
    inputValues: {},
    statusText: '草稿',
    loadingProfile: false,
    draftDirty: false,
    uploading: false,
    uploadingText: '',
    acceptedLegal: false,
    genderOptions: ['男', '女'],
    hometownOptions: cityOptions,
    currentCityOptions: cityOptions,
    educationOptions: ['高中', '中专', '大专', '本科', '硕士', '博士'],
    incomeRangeOptions: ['5万以下', '5-8万', '8-12万', '12-20万', '20万以上'],
    maritalStatusOptions: ['未婚', '离异', '离异带孩'],
    houseStatusOptions: ['租房', '有房', '有房贷', '与父母同住'],
    carStatusOptions: ['无车', '有车'],
    hasChildrenOptions: ['无孩子', '有孩子'],
    tagOptions,
    matchQuestions: match.buildEditQuestions({}),
    genderIndex: 1,
    hometownIndex: 0,
    currentCityIndex: 0,
    educationIndex: 2,
    incomeRangeIndex: 1,
    maritalStatusIndex: 0,
    houseStatusIndex: 0,
    carStatusIndex: 0,
    hasChildrenIndex: 0
  },

  onLoad() {
    this.setData({
      acceptedLegal: !!wx.getStorageSync('acceptedLegal')
    });
    this.loadProfile();
  },

  loadProfile() {
    if (cloudService.isReady()) {
      this.setData({
        loadingProfile: true
      });
      cloudService
        .getMyProfile()
        .then((profile) => {
          if (!this.data.draftDirty) {
            this.syncForm(normalizeForm(profile));
          }
          this.setData({
            loadingProfile: false
          });
        })
        .catch((err) => {
          console.warn('cloud get my profile failed, fallback to mock', err);
          if (!this.data.draftDirty) {
            const profile = service.getMyProfile();
            this.syncForm(normalizeForm(profile));
          }
          this.setData({
            loadingProfile: false
          });
        });
      return;
    }
    const profile = service.getMyProfile();
    this.syncForm(normalizeForm(profile));
  },

  syncForm(form) {
    const inputValues = {};
    textInputFields.forEach((field) => {
      const value = form[field];
      inputValues[field] = value === undefined || value === null ? '' : String(value);
    });
    const nextData = {
      form,
      inputValues,
      matchQuestions: match.buildEditQuestions(form.matchAnswers),
      statusText: format.formatStatus(form.reviewStatus || 'draft'),
      hasChildrenIndex: form.hasChildren ? 1 : 0
    };
    pickerFields.forEach((field) => {
      nextData[`${field}Index`] = optionIndex(this.data[`${field}Options`], form[field]);
    });
    this.setData(nextData);
  },

  updateFormFields(fields) {
    const form = Object.assign({}, this.data.form || {}, fields || {});
    this.setData({
      draftDirty: true,
      form
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) {
      return;
    }
    const rawValue = event.detail.value;
    const numberFields = ['age', 'height'];
    const value = numberFields.indexOf(field) >= 0 && rawValue !== '' ? Number(rawValue) : rawValue;
    const form = Object.assign({}, this.data.form || {}, {
      [field]: value
    });
    const inputValues = Object.assign({}, this.data.inputValues || {}, {
      [field]: rawValue
    });
    if (field === 'nickname' && !this.data.form.avatarUrl) {
      form.avatarText = rawValue ? rawValue.slice(0, 1) : '我';
    }
    this.setData({
      draftDirty: true,
      form,
      inputValues
    });
    return rawValue;
  },

  onPickerChange(event) {
    const field = event.currentTarget.dataset.field;
    const index = Number(event.detail.value);
    const options = this.data[`${field}Options`];
    this.updateFormFields({
      [field]: options[index]
    });
    this.setData({
      [`${field}Index`]: index
    });
  },

  onChildrenChange(event) {
    const index = Number(event.detail.value);
    this.updateFormFields({
      hasChildren: index === 1
    });
    this.setData({
      hasChildrenIndex: index
    });
  },

  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag;
    const tags = (this.data.form.lifestyleTags || []).slice();
    const index = tags.indexOf(tag);
    if (index >= 0) {
      tags.splice(index, 1);
    } else if (tags.length < 6) {
      tags.push(tag);
    } else {
      wx.showToast({
        title: '最多选择 6 个标签',
        icon: 'none'
      });
      return;
    }
    this.updateFormFields({
      lifestyleTags: tags
    });
  },

  chooseMatchAnswer(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.currentTarget.dataset.value;
    const answers = Object.assign({}, this.data.form.matchAnswers || {});
    if (answers[key] === value) {
      delete answers[key];
    } else {
      answers[key] = value;
    }
    this.updateFormFields({
      matchAnswers: answers
    });
    this.setData({
      matchQuestions: match.buildEditQuestions(answers)
    });
  },

  chooseAvatar() {
    if (this.data.uploading) {
      wx.showToast({
        title: '图片上传中，请稍等',
        icon: 'none'
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const localPath = res.tempFilePaths && res.tempFilePaths[0];
        if (!localPath) {
          return;
        }
        if (cloudService.canUploadFile()) {
          this.uploadAvatar(localPath);
          return;
        }
        this.updateFormFields({
          avatarUrl: localPath,
          avatarText: ''
        });
      }
    });
  },

  uploadAvatar(localPath) {
    this.setUploading('头像上传审核中');
    cloudService
      .uploadImage(localPath, 'avatars')
      .then((result) => {
        this.clearUploading();
        this.updateFormFields({
          avatarUrl: result.fileID,
          avatarText: ''
        });
        wx.showToast({
          title: '头像审核通过',
          icon: 'success'
        });
      })
      .catch((err) => {
        this.clearUploading();
        wx.showToast({
          title: err.message || '头像上传失败',
          icon: 'none'
        });
      });
  },

  choosePhotos() {
    if (this.data.uploading) {
      wx.showToast({
        title: '图片上传中，请稍等',
        icon: 'none'
      });
      return;
    }
    const photos = this.data.form.photos || [];
    if (photos.length >= 6) {
      wx.showToast({
        title: '最多上传 6 张',
        icon: 'none'
      });
      return;
    }
    const remaining = 6 - photos.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const selectedPaths = (res.tempFilePaths || []).slice(0, remaining);
        if (!selectedPaths.length) {
          return;
        }
        if (cloudService.canUploadFile()) {
          this.uploadPhotos(selectedPaths, photos);
          return;
        }
        this.updateFormFields({
          photos: photos.concat(selectedPaths).slice(0, 6)
        });
      }
    });
  },

  uploadPhotos(localPaths, existingPhotos) {
    this.setUploading('相册上传审核中');
    cloudService
      .uploadImages(localPaths, 'photos')
      .then((fileIDs) => {
        this.clearUploading();
        this.updateFormFields({
          photos: (existingPhotos || []).concat(fileIDs).slice(0, 6)
        });
        wx.showToast({
          title: `已通过 ${fileIDs.length} 张`,
          icon: 'success'
        });
      })
      .catch((err) => {
        this.clearUploading();
        wx.showToast({
          title: err.message || '相册上传失败',
          icon: 'none'
        });
      });
  },

  setUploading(text) {
    this.setData({
      uploading: true,
      uploadingText: text || '图片上传中'
    });
    wx.showLoading({
      title: text || '图片上传中',
      mask: true
    });
  },

  clearUploading() {
    this.setData({
      uploading: false,
      uploadingText: ''
    });
    wx.hideLoading();
  },

  ensureCanSave() {
    if (this.data.uploading) {
      wx.showToast({
        title: '图片上传中，请稍等',
        icon: 'none'
      });
      return false;
    }
    if (cloudService.isReady() && hasUnuploadedImages(this.data.form)) {
      wx.showToast({
        title: '有图片未上传成功',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  previewPhoto(event) {
    const index = Number(event.currentTarget.dataset.index);
    const photos = this.data.form.photos || [];
    wx.previewImage({
      current: photos[index],
      urls: photos
    });
  },

  removePhoto(event) {
    const index = Number(event.currentTarget.dataset.index);
    const photos = (this.data.form.photos || []).slice();
    photos.splice(index, 1);
    this.updateFormFields({
      photos
    });
  },

  onLegalChange(event) {
    const checked = event.detail.value.indexOf('accepted') >= 0;
    this.setData({
      acceptedLegal: checked
    });
    wx.setStorageSync('acceptedLegal', checked);
  },

  goLegal(event) {
    const type = event.currentTarget.dataset.type || 'terms';
    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`
    });
  },

  saveDraft() {
    if (!this.ensureCanSave()) {
      return;
    }
    if (cloudService.isReady()) {
      cloudService
        .saveMyProfile(this.data.form)
        .then((result) => {
          this.setData({
            draftDirty: false
          });
          this.syncForm(normalizeForm(result.data));
          wx.showToast({
            title: result.message || '已保存草稿',
            icon: 'success'
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '保存失败',
            icon: 'none'
          });
        });
      return;
    }
    const profile = service.saveMyProfile(this.data.form);
    this.setData({
      draftDirty: false
    });
    this.syncForm(normalizeForm(profile));
    wx.showToast({
      title: '已保存草稿',
      icon: 'success'
    });
  },

  submitReview() {
    if (!this.ensureCanSave()) {
      return;
    }
    if (!this.data.acceptedLegal) {
      wx.showToast({
        title: '请先同意协议',
        icon: 'none'
      });
      return;
    }
    if (cloudService.isReady()) {
      cloudService
        .submitMyProfile(this.data.form)
        .then((result) => {
          this.setData({
            draftDirty: false
          });
          this.syncForm(normalizeForm(result.data));
          wx.showToast({
            title: result.message,
            icon: 'success'
          });
        })
        .catch((err) => {
          wx.showToast({
            title: err.message || '提交失败',
            icon: 'none'
          });
        });
      return;
    }
    service.saveMyProfile(this.data.form);
    const result = service.submitMyProfile();
    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      });
      return;
    }
    this.setData({
      draftDirty: false
    });
    this.syncForm(normalizeForm(result.data));
    wx.showToast({
      title: result.message,
      icon: 'success'
    });
  }
});
