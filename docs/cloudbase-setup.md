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
- 头像和相册上传后会调用微信图片内容安全审核
- 资料文本、联系申请、聊天消息、举报说明会调用微信文字内容安全审核
- 举报页已接入云端 `reports` 集合

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

注意：`xiangqinApi` 新增了图片和文字内容安全审核权限配置，修改后必须重新上传并部署这个云函数。

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
10. 用户举报提交到云端 `reports`：已接入

当前首页、详情、申请、消息、聊天、资料编辑和资料审核已经优先读取/写入云数据库；云端调用失败时会回退到本地 mock，方便开发阶段继续预览。

## 6. 云存储图片上传

资料编辑页现在已经接入云存储：

- 选择头像后，会上传到云存储并把 `cloud://` 文件 ID 保存到 `profiles.avatarUrl`
- 添加相册后，会上传到云存储并把 `cloud://` 文件 ID 保存到 `profiles.photos`
- 上传成功后会调用 `xiangqinApi.auditImage` 做微信内容安全审核
- 审核不通过的图片不会写入资料，并会提示用户更换图片
- 图片上传中不能保存草稿或提交审核，避免数据库写入本地临时路径
- 如果云开发不可用，开发阶段仍会回退到本地临时图片，方便继续预览

测试方式：

1. 打开微信开发者工具并重新编译
2. 进入“我的”页，点“编辑资料”
3. 选择头像或添加相册图片
4. 看到“头像审核通过”或“已通过 x 张”后保存草稿
5. 到云开发控制台的“存储”里确认出现 `xiangqin/avatars/` 或 `xiangqin/photos/` 文件
6. 到数据库 `profiles` 集合里确认 `avatarUrl` / `photos` 是 `cloud://` 开头

如果提示“当前云函数未开通图片内容安全接口”，通常是 `cloudfunctions/xiangqinApi/config.json` 没有随云函数一起部署成功，重新上传 `xiangqinApi` 即可。

## 7. 文字内容安全审核

`xiangqinApi` 现在会在这些写入前调用微信文字内容安全审核：

- 保存/提交资料：昵称、职业、微信号、联系备注、自我介绍、择偶要求等文本
- 发起联系申请：申请留言
- 发送聊天：聊天消息正文
- 提交举报：举报类型和举报说明

如果提示“当前云函数未开通文字内容安全接口”，通常是 `cloudfunctions/xiangqinApi/config.json` 没有随云函数一起部署成功，重新上传 `xiangqinApi` 即可。

测试方式：

1. 重新部署 `xiangqinApi`
2. 正常填写资料并保存草稿
3. 正常发送一条聊天消息
4. 在详情页进入举报，填写说明并提交
5. 到数据库 `reports` 集合里确认出现新举报记录
