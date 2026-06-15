# 接口草案

下面是最小可用版本的接口方向，后端可以按这个思路落地。

## 1. 登录

### `POST /auth/wechat-login`

请求：
```json
{
  "code": "wechat_login_code"
}
```

返回：
```json
{
  "token": "jwt_or_session_token",
  "user": {
    "id": "u_001",
    "nickname": "张三"
  }
}
```

## 2. 资料

### `POST /profiles`

创建或保存资料草稿。

### `PUT /profiles/me`

修改我的资料。

云函数动作：

```json
{
  "action": "saveMyProfile",
  "profile": {
    "nickname": "新化小溪",
    "gender": "女",
    "age": 27
  }
}
```

### `POST /profiles/me/submit`

提交审核。

云函数动作：

```json
{
  "action": "submitMyProfile",
  "profile": {
    "nickname": "新化小溪",
    "gender": "女",
    "age": 27,
    "currentCity": "新化县城区",
    "bio": "认真生活，想找一个踏实的人。"
  }
}
```

### `GET /profiles`

获取公开列表，支持筛选。

### `GET /profiles/{id}`

获取资料详情。

云开发 MVP 当前通过 `xiangqinApi` 云函数承载：

```json
{
  "action": "listProfiles",
  "filters": {
    "keyword": "",
    "gender": "all"
  },
  "viewerMode": "self"
}
```

```json
{
  "action": "getProfile",
  "id": "p_1001",
  "viewerMode": "parent"
}
```

返回资料默认会脱敏手机号、微信号；只有联系申请已同意后才返回对应联系方式。

## 3. 照片

### `POST /photos`

小程序端通过 `wx.cloud.uploadFile` 上传照片，返回的 `cloud://` 文件 ID 保存到资料字段：

- 头像：`profiles.avatarUrl`
- 相册：`profiles.photos`

上传后会调用云函数动作：

```json
{
  "action": "auditImage",
  "fileID": "cloud://xxx",
  "scene": "avatars"
}
```

审核通过后才把图片写入资料；审核不通过时提示用户更换图片。

### `DELETE /photos/{id}`

删除照片。当前最简版先从资料字段移除图片引用，云存储文件清理可以在后续管理后台里补充。

## 4. 收藏

### `POST /favorites/{target_user_id}`

收藏/喜欢一个用户。

云函数动作：

```json
{
  "action": "toggleFavorite",
  "targetUserId": "u_1002"
}
```

### `DELETE /favorites/{target_user_id}`

取消收藏。

### `GET /favorites`

我的收藏列表。

## 5. 联系申请

### `POST /contact-requests`

发起联系申请。

请求：
```json
{
  "to_user_id": "u_002",
  "message": "你好，想认识一下。"
}
```

云函数动作：

```json
{
  "action": "createContactRequest",
  "toUserId": "u_1002",
  "channel": "self",
  "viewerMode": "self",
  "message": "你好，想认识一下。"
}
```

### `GET /contact-requests/inbox`

我收到的申请。

云函数动作：

```json
{
  "action": "getContactRequests",
  "scope": "inbox"
}
```

### `GET /contact-requests/outbox`

我发出的申请。

### `POST /contact-requests/{id}/accept`

同意申请。

云函数动作：

```json
{
  "action": "respondContactRequest",
  "requestId": "req_xxx",
  "decision": "accept"
}
```

### `POST /contact-requests/{id}/reject`

拒绝申请。

## 6. 消息/聊天

### `GET /conversations`

获取我的会话列表。只返回联系申请已同意后生成的会话。

云函数动作：

```json
{
  "action": "getConversations"
}
```

### `GET /conversations/{id}`

获取单个会话详情和消息列表。

云函数动作：

```json
{
  "action": "getConversation",
  "conversationId": "conv_xxx"
}
```

### `POST /conversations/{id}/messages`

发送文字消息。

请求：
```json
{
  "text": "你好，可以先聊聊生活节奏吗？"
}
```

云函数动作：

```json
{
  "action": "sendMessage",
  "conversationId": "conv_xxx",
  "text": "你好，可以先聊聊生活节奏吗？"
}
```

发送前会调用微信文字内容安全审核；审核不通过时不会写入 `messages`。

## 7. 举报

### `POST /reports`

提交举报。

云函数动作：

```json
{
  "action": "createReport",
  "targetUserId": "u_1002",
  "profileId": "p_1002",
  "category": "资料造假",
  "reason": "说明具体问题",
  "evidenceUrls": ["cloud://xxx"]
}
```

举报说明会先做微信文字内容安全审核；证据图片在上传时会做图片内容安全审核。

## 8. 管理后台

### `GET /admin/reviews/pending`

待审核资料列表。

云函数动作：

```json
{
  "action": "getAdminPendingProfiles"
}
```

### `POST /admin/reviews/{id}/approve`

通过审核。

云函数动作：

```json
{
  "action": "reviewProfile",
  "profileId": "p_xxx",
  "reviewAction": "approve",
  "remark": "资料完整，通过"
}
```

### `POST /admin/reviews/{id}/reject`

驳回审核。

### `POST /admin/users/{id}/ban`

封禁用户。

### `GET /admin/reports`

举报列表。

### `POST /admin/reports/{id}/resolve`

处理举报。
