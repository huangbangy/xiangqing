# 云开发接入说明

当前项目已配置云开发环境：

```text
cloud1-d1gpuptkh7143c8ab
```

## 1. 已完成

- `miniprogram/utils/config.js` 已开启 `useCloud`
- `miniprogram/app.js` 启动时会执行 `wx.cloud.init`
- 已新增测试云函数 `cloudfunctions/cloudPing`
- 已新增数据库云函数 `cloudfunctions/xiangqinApi`
- “我的”页已新增“云开发自检”按钮
- 资料编辑页已接入云存储上传头像和相册

## 2. 上传云函数

1. 打开微信开发者工具
2. 确认项目 AppID 是真实 AppID
3. 左侧资源管理器找到 `cloudfunctions/cloudPing`
4. 右键 `cloudPing`
5. 选择“上传并部署：云端安装依赖”
6. 同样右键 `cloudfunctions/xiangqinApi`
7. 选择“上传并部署：云端安装依赖”
8. 两个云函数都部署成功后，重新编译小程序
9. 进入“我的”页，点击“检测云函数和 OPENID”

如果弹窗显示环境 ID 和 OPENID，说明云开发链路已通。

## 3. 初始化真实数据库

在“我的”页点击“初始化真实数据库”。

这个按钮会调用 `xiangqinApi`：

- 创建/确认数据库集合
- 写入当前用户的基础用户记录
- 当资料库为空时写入一批演示资料
- 返回各集合的数据数量

这个初始化可以重复点击；已有数据不会被清空。

## 4. 当前真实数据库集合

建议先建这些集合：

- `users`
- `profiles`
- `favorites`
- `contactRequests`
- `conversations`
- `messages`
- `reports`
- `reviewLogs`

核心写操作后续会放到云函数里，避免手机号、微信号、聊天消息被前端直接乱写。

## 5. 下一步迁移

数据库初始化成功后，再逐步把页面从本地 mock 切到 `xiangqinApi`：

1. 首页资料列表读取云端 `profiles`：已接入，失败时回退本地 mock
2. 资料详情读取云端 `profiles`：已接入，失败时回退本地 mock
3. 云端收藏写入 `favorites`：已接入
4. 云端联系申请写入 `contactRequests`：已接入
5. 云端同意申请后创建 `conversations`：已接入
6. 云端聊天消息写入 `messages`：已接入
7. 我的资料保存到云端 `profiles`：已接入
8. 我的资料提交审核：已接入
9. 管理后台资料审核：已接入

当前首页、详情、申请、消息、聊天、资料编辑和资料审核已经优先读取/写入云数据库；云端调用失败时会回退到本地 mock，方便开发阶段继续预览。

## 6. 云存储图片上传

资料编辑页现在已经接入云存储：

- 选择头像后，会上传到云存储并把 `cloud://` 文件 ID 保存到 `profiles.avatarUrl`
- 添加相册后，会上传到云存储并把 `cloud://` 文件 ID 保存到 `profiles.photos`
- 图片上传中不能保存草稿或提交审核，避免数据库写入本地临时路径
- 如果云开发不可用，开发阶段仍会回退到本地临时图片，方便继续预览

测试方式：

1. 打开微信开发者工具并重新编译
2. 进入“我的”页，点“编辑资料”
3. 选择头像或添加相册图片
4. 上传成功后保存草稿
5. 到云开发控制台的“存储”里确认出现 `xiangqin/avatars/` 或 `xiangqin/photos/` 文件
6. 到数据库 `profiles` 集合里确认 `avatarUrl` / `photos` 是 `cloud://` 开头

正式上线前还需要继续增加图片内容审核，避免用户上传不合规图片。
