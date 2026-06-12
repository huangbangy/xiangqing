# 开发说明

## 1. 当前技术方案

当前采用微信小程序原生开发方式，不依赖 npm、Node、脚手架或构建工具。

这样做的原因：

- 初期最容易导入微信开发者工具
- 不需要先安装复杂环境
- 页面结构和小程序审核形态更接近真实上线版本

## 2. 项目入口

- `project.config.json`：微信开发者工具导入配置
- `miniprogram/app.json`：页面路由配置
- `miniprogram/app.wxss`：全局样式
- `miniprogram/utils/service.js`：当前本地数据服务
- `miniprogram/utils/mock-data.js`：演示数据

## 3. 页面说明

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `pages/index/index` | 公开资料列表、搜索、收藏、联系 |
| 筛选 | `pages/filter/filter` | 性别、年龄、地区、学历、婚姻状态筛选 |
| 详情 | `pages/detail/detail` | 完整个人资料、三句话认识我、收藏、联系、举报、受保护联系方式、发布身份 |
| 编辑资料 | `pages/edit/edit` | 用户资料填写、三句话认识我、标签、相册、联系方式、提交审核 |
| 我的 | `pages/me/me` | 资料状态、收藏、联系申请、管理入口 |
| 收藏 | `pages/favorites/favorites` | 已收藏用户 |
| 联系申请 | `pages/requests/requests` | 收到和发出的联系申请 |
| 举报 | `pages/report/report` | 提交举报 |
| 管理后台 | `pages/admin/admin` | 审核资料、处理举报、封禁用户 |

## 4. 本地演示模式

当前数据保存在小程序本地缓存里，适合演示流程。

注意：

- 不同手机之间数据不会互通
- 清理缓存后数据会恢复为种子数据
- 相册图片目前保存的是本地临时路径
- 微信号和手机号只在联系申请同意后展示
- 家长代看只面向成年子女，正式上线时要补本人授权确认
- 管理员口令是 `123456`

## 5. 正式上线必须替换

上线前需要把下面几项接成真实服务：

- 微信登录 openid
- 用户资料数据库
- 图片上传与审核
- 联系申请通知
- 举报处理记录
- 管理员账号权限
- 操作日志
- 数据备份

## 6. 推荐上线技术路线

最省事路线：

1. 使用微信云开发
2. 建立 `users`、`profiles`、`favorites`、`contact_requests`、`reports`、`review_logs` 集合
3. 把 `utils/service.js` 从本地缓存改成云函数调用
4. 图片使用云存储
5. 管理员权限存到 `users.role`

更灵活路线：

1. 使用独立后端
2. 后端提供 `docs/api-spec.md` 里的接口
3. 小程序通过 HTTPS 域名访问接口
4. 管理后台可以做成单独 Web 页面
