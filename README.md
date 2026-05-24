# English Exam System

英语在线模拟考试系统，一个基于 Vue + Node.js + PostgreSQL 的全栈项目。

本项目支持用户注册登录、选择试卷、在线答题、倒计时考试、提交评分、考试历史记录、错题本保存与个人中心查看。

---

## 一、项目在线地址

前端地址：

```text
https://english-exam-system-delta.vercel.app/
```

后端地址：

```text
https://english-exam-system.onrender.com
```

后端健康检查：

```text
https://english-exam-system.onrender.com/api/health
```

后端试卷接口：

```text
https://english-exam-system.onrender.com/api/exams
```

---

## 二、主要功能

### 1. 用户功能

- 用户注册
- 用户登录
- token 登录状态保存
- 个人中心显示当前用户
- 退出登录
- 不同用户之间的数据隔离

### 2. 考试功能

- 按学段查看试卷
- 查看试卷说明
- 查看题目预览
- 开始考试
- 上一题 / 下一题切换
- 题号导航
- 单选题作答
- 主观题输入
- 暂停 / 继续考试
- 倒计时
- 时间到自动提交
- 手动提交确认
- 未答题提交提醒
- 重新考试

### 3. 评分与分析

- 选择题自动评分
- 主观题自评分
- 总分统计
- 正确率统计
- 客观题得分统计
- 主观题得分统计
- 薄弱项分析
- 学习建议展示
- 每题结果查看

### 4. 数据保存

- 考试结果保存到数据库
- 用户答案保存到数据库
- 个人中心读取考试历史
- 错题保存到数据库
- 错题本按用户读取
- 本地 localStorage 作为部分备用存储

### 5. 部署

- 前端部署到 Vercel
- 后端部署到 Render
- 数据库使用 Neon PostgreSQL

---

## 三、技术栈

### 前端

- Vue 3
- Vite
- Vue Router
- JavaScript
- CSS
- localStorage
- Fetch API

### 后端

- Node.js
- Express
- Prisma
- PostgreSQL
- bcryptjs
- jsonwebtoken
- cors
- dotenv

### 数据库

- Neon PostgreSQL

### 部署平台

- Vercel
- Render
- GitHub

---

## 四、项目结构

```text
english-exam-system
├── frontend
│   ├── src
│   │   ├── api
│   │   │   ├── authApi.js
│   │   │   └── examApi.js
│   │   ├── data
│   │   ├── router
│   │   ├── views
│   │   │   ├── AdminView.vue
│   │   │   ├── ExamListView.vue
│   │   │   ├── ExamView.vue
│   │   │   ├── HomeView.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── ProfileView.vue
│   │   │   └── RegisterView.vue
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js
│
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   ├── scripts
│   │   ├── seed.js
│   │   └── test-db.js
│   ├── src
│   │   ├── lib
│   │   │   └── prisma.js
│   │   ├── middlewares
│   │   │   └── authMiddleware.js
│   │   └── routes
│   │       ├── authRoutes.js
│   │       └── examRoutes.js
│   ├── index.js
│   └── package.json
│
├── README.md
└── ONLINE_TEST_CHECKLIST.md
```

---

## 五、本地运行方式

### 1. 克隆项目

```bash
git clone <你的仓库地址>
cd english-exam-system
```

---

### 2. 启动后端

进入后端目录：

```bash
cd backend
```

安装依赖：

```bash
npm install
```

启动后端：

```bash
npm run dev
```

后端默认运行在：

```text
http://localhost:3000
```

本地后端健康检查：

```text
http://localhost:3000/api/health
```

本地试卷接口：

```text
http://localhost:3000/api/exams
```

---

### 3. 启动前端

新开一个终端，进入前端目录：

```bash
cd frontend
```

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev
```

前端默认运行在：

```text
http://localhost:5173
```

---

## 六、后端环境变量

后端需要在 `backend/.env` 中配置：

```env
DATABASE_URL="你的 PostgreSQL 数据库连接地址"
JWT_SECRET="你的 JWT 密钥"
FRONTEND_URL="你的前端线上地址"
NODE_ENV="development"
```

示例：

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
JWT_SECRET="your_secret_key"
FRONTEND_URL="https://english-exam-system-delta.vercel.app"
NODE_ENV="development"
```

注意：

```text
.env 文件不能提交到 GitHub。
```

---

## 七、前端环境变量

前端线上部署时，需要在 Vercel 中配置：

```env
VITE_API_BASE_URL="https://english-exam-system.onrender.com/api"
```

本地开发时，如果未配置该变量，前端会默认使用：

```text
/api
```

并通过 Vite proxy 转发到本地后端。

---

## 八、常用命令

### 前端命令

```bash
cd frontend
npm run dev
npm run build
```

### 后端命令

```bash
cd backend
npm run dev
npm start
npm run test:db
npm run seed
```

### Git 命令

```bash
git status
git add .
git commit -m "message"
git push
```

---

## 九、数据库说明

本项目使用 Neon PostgreSQL 作为线上数据库。

主要数据表包括：

- `User`：用户表
- `Exam`：试卷表
- `Question`：题目表
- `ExamAttempt`：考试记录表
- `UserAnswer`：用户答案表
- `WrongQuestion`：错题表

---

## 十、核心接口

### 1. 健康检查

```text
GET /api/health
```

### 2. 用户认证

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### 3. 试卷与题目

```text
GET /api/exams
GET /api/exams?grade=JUNIOR
GET /api/exams/:examId
GET /api/exams/:examId/questions
```

### 4. 考试记录

```text
POST /api/attempts/submit
GET  /api/attempts/history
```

### 5. 错题本

```text
POST /api/wrong-questions
GET  /api/wrong-questions
```

---

## 十一、当前阶段

当前项目已经完成公开测试版核心功能：

- 前端已上线
- 后端已上线
- 数据库已连接
- 用户注册登录可用
- 试卷列表可用
- 考试页可用
- 考试提交可用
- 历史记录可用
- 错题本可用
- 按用户隔离数据可用
- Vercel 前端、Render 后端、Neon 数据库已完成线上联调

---

## 十二、线上测试清单

上线后建议测试以下路径：

```text
/
#/exams
#/exams?grade=junior
#/exam/junior_mock_2026_001
#/register
#/login
#/profile
```

重点测试：

- 是否能打开首页
- 是否能加载试卷列表
- 是否能注册新用户
- 是否能登录
- 是否能进入考试页
- 是否能提交考试
- 是否能保存错题
- 是否能在个人中心看到历史记录
- 是否能在个人中心看到错题本
- 不同账号是否能隔离数据

---

## 十三、已完成的项目能力

本项目目前已经实现：

```text
前端页面
↓
前端路由
↓
后端 API
↓
用户认证
↓
数据库读写
↓
线上部署
```

完整链路为：

```text
Vercel 前端
↓
Render 后端
↓
Neon PostgreSQL 数据库
```

---

## 十四、后续计划

下一阶段将继续完善：

- 管理员后台
- 管理员权限控制
- 试卷管理
- 题目管理
- 题目批量导入
- 阅读理解多小题
- 完形填空
- 结果详情页
- 错题专项训练
- 更完善的错误处理
- 更完整的移动端适配
- 更清晰的用户操作引导

---

## 十五、项目说明

本项目目前是一个学习型全栈项目，主要用于练习：

- 前端开发
- 后端开发
- 数据库建模
- 用户认证
- 前后端联调
- 项目部署
- 软件工程项目流程

项目当前已经达到公开测试版水平，可以供不同用户注册、登录、考试和查看个人记录。