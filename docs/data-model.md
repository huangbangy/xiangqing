# 数据结构

## 1. User 用户表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| openid | string | 微信登录标识 |
| nickname | string | 微信昵称 |
| avatar | string | 微信头像 |
| phone | string | 手机号，可选 |
| status | string | normal / banned / deleted |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 2. Profile 资料表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| user_id | string | 用户ID |
| gender | string | 性别 |
| birthday | date | 生日 |
| age | int | 年龄 |
| hometown | string | 家乡 |
| current_city | string | 当前所在地 |
| height | int | 身高 |
| education | string | 学历 |
| occupation | string | 职业 |
| income_range | string | 收入区间 |
| marital_status | string | 婚姻状态 |
| has_children | bool | 是否有小孩 |
| house_status | string | 住房情况 |
| car_status | string | 车辆情况 |
| phone | string | 手机号，仅同意联系后展示 |
| wechat_id | string | 微信号，仅同意联系后展示 |
| contact_note | string | 联系备注 |
| publisher_type | string | self / parent |
| child_consent_status | string | 子女授权状态 |
| parent_name | string | 家长姓名 |
| parent_relation | string | 家长关系 |
| parent_phone | string | 家长手机号 |
| parent_wechat_id | string | 家长微信号 |
| parent_contact_note | string | 家长联系备注 |
| life_rhythm | string | 生活节奏，一句话 |
| relationship_view | string | 关系期待，一句话 |
| weekend_plan | string | 周末习惯，一句话 |
| lifestyle_tags | json | 生活标签 |
| bio | text | 自我介绍 |
| expectation | text | 择偶要求 |
| review_status | string | draft / pending / approved / rejected / hidden |
| is_public | bool | 是否公开 |
| submitted_at | datetime | 提交时间 |

派生字段（由前端或服务层计算，不一定入库）：

| 字段 | 类型 | 说明 |
|---|---|---|
| profile_completion_score | int | 资料完整度百分比 |
| profile_completion_missing | json | 待补充字段列表 |
| match_score | int | 首页今日推荐的缘分值 |
| match_reasons | json | 推荐理由，如同城、年龄接近、共同生活标签 |

## 3. Photo 照片表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| user_id | string | 用户ID |
| url | string | 图片地址 |
| is_avatar | bool | 是否头像 |
| sort | int | 排序 |
| review_status | string | pending / approved / rejected |
| created_at | datetime | 创建时间 |

## 4. Preference 择偶条件表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| user_id | string | 用户ID |
| gender_preference | string | 偏好性别 |
| age_min | int | 最小年龄 |
| age_max | int | 最大年龄 |
| height_min | int | 最小身高 |
| height_max | int | 最大身高 |
| education_min | string | 最低学历 |
| marital_status | string | 偏好婚姻状态 |
| region_scope | string | 地区范围 |

## 5. Favorite 收藏表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| user_id | string | 收藏人 |
| target_user_id | string | 被收藏人 |
| created_at | datetime | 收藏时间 |

## 6. ContactRequest 联系申请表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| from_user_id | string | 发起人 |
| to_user_id | string | 接收人 |
| message | string | 留言 |
| channel | string | self / parent |
| status | string | pending / accepted / rejected / closed |
| created_at | datetime | 创建时间 |
| decided_at | datetime | 处理时间 |

说明：当申请状态变为 accepted 时，系统生成或复用一条 Conversation 会话。

## 7. Report 举报表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| reporter_id | string | 举报人 |
| target_user_id | string | 被举报人 |
| category | string | 举报类型 |
| reason | text | 详细说明 |
| evidence_urls | json | 证据图片 |
| status | string | pending / processing / resolved / rejected |
| handler_id | string | 处理人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 8. ReviewLog 审核日志表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| subject_type | string | profile / photo / report / user |
| subject_id | string | 对象ID |
| action | string | approve / reject / hide / ban |
| reviewer_id | string | 审核人 |
| remark | string | 备注 |
| created_at | datetime | 创建时间 |

## 9. BrowseHistory 浏览记录（本地）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| profile_id | string | 浏览过的资料 |
| viewed_at | datetime | 浏览时间 |

说明：当前 MVP 阶段先放在本地状态里，用于“最近浏览”和回看，不作为正式后端表。

## 10. RecommendationPreference 推荐偏好（本地）

| 字段 | 类型 | 说明 |
|---|---|---|
| not_interested_profiles | json | 用户标记不感兴趣的资料 ID |
| recommendation_offset | int | 今日推荐换一批的本地游标 |

说明：当前 MVP 阶段先放在本地状态里，用于“换一批”和“不感兴趣”。正式上线后建议迁移到后端，按用户维度保存。

## 11. Conversation 会话表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| request_id | string | 来源联系申请 ID |
| member_ids | json | 会话成员用户 ID |
| channel | string | self / parent |
| last_message | string | 最近一条消息摘要 |
| last_message_at | datetime | 最近消息时间 |
| unread_by | json | 按用户记录未读数 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

说明：当前本地 mock 只做一对一文字会话。正式上线后建议增加消息内容安全审核、屏蔽词和举报联动。

## 12. Message 消息表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主键 |
| conversation_id | string | 所属会话 |
| sender_id | string | 发送人，system 表示系统提醒 |
| type | string | text / system |
| text | string | 消息内容 |
| created_at | datetime | 发送时间 |
