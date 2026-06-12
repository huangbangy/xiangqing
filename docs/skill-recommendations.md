# 推荐安装的 Codex Skills

当前项目是微信相亲小程序，重点不是 React/Next.js，而是“移动端体验、信任流程、上线质量、文档和架构”。基于 skills.sh 榜单和具体 skill 页面，建议优先考虑下面这些。

## 首选

### 1. frontend-design

- 来源：anthropics/skills
- 适合场景：继续优化朱砂红喜庆主题、首页卡片、详情页、我的页、年轻化 UI 质感
- 安装量：约 529K
- GitHub stars：约 149K
- 安装命令：

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

### 2. webapp-testing

- 来源：anthropics/skills
- 适合场景：后续如果加 H5 管理后台、落地页、或者本地 Web 预览，可以做截图、DOM、交互验证
- 安装量：约 93K
- GitHub stars：约 149K
- 安装命令：

```bash
npx skills add https://github.com/anthropics/skills --skill webapp-testing
```

### 3. improve-codebase-architecture

- 来源：mattpocock/skills
- 适合场景：当项目从 mock 数据迁移到微信云开发或真实后端时，拆清服务层、数据层、审核流程、联系申请流程
- 安装量：约 242K
- GitHub stars：约 125K
- 安装命令：

```bash
npx skills add https://github.com/mattpocock/skills --skill improve-codebase-architecture
```

## 可选

### 4. tdd

- 来源：mattpocock/skills
- 适合场景：给联系申请、家长模式、推荐算法、举报审核流程补测试
- 安装量：约 229K
- GitHub stars：约 125K
- 安装命令：

```bash
npx skills add https://github.com/mattpocock/skills --skill tdd
```

### 5. to-prd

- 来源：mattpocock/skills
- 适合场景：把后续“真人认证、家长授权、红娘牵线、活动报名”等功能整理成正式需求文档
- 安装量：约 211K
- GitHub stars：约 125K
- 安装命令：

```bash
npx skills add https://github.com/mattpocock/skills --skill to-prd
```

### 6. diagnose

- 来源：mattpocock/skills
- 适合场景：后续遇到微信开发者工具编译报错、页面状态错乱、联系申请数据异常时系统化排查
- 安装量：约 202K
- GitHub stars：约 125K
- 安装命令：

```bash
npx skills add https://github.com/mattpocock/skills --skill diagnose
```

## 暂不建议

- sleek-design-mobile-apps：偏移动 App 设计工具，还需要 Sleek API Key 和 Pro+ 计划，不适合当前微信小程序原生项目。
- vercel-react-best-practices / next-best-practices：项目不是 React/Next.js，暂时价值不高。
- firebase / supabase 类 skill：正式上线微信小程序更建议优先考虑微信云开发或国内后端方案。

## 建议安装顺序

1. frontend-design
2. improve-codebase-architecture
3. tdd
4. diagnose
5. to-prd

最推荐先装前三个：一个管界面，一个管架构，一个管测试。
