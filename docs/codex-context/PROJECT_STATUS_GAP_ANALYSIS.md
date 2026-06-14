# 项目现状体检与目标差距分析

## 1. 文档目的

本文档记录本轮开发前对仓库的只读分析结果，并对照目标平台识别差距、风险和后续优先级。

本轮没有修改前端业务代码、后端业务代码、数据库 schema、`.env`、`package.json` 或部署配置。

## 2. 当前技术栈

### 2.1 前端

仓库当前前端为：

- Vue 3。
- Vite。
- Vue Router。
- JavaScript。
- CSS。
- Fetch API。
- localStorage 保存登录态。

### 2.2 后端

仓库当前后端为：

- Node.js。
- Express。
- Prisma。
- PostgreSQL。
- `@prisma/adapter-pg` / `pg`。
- `bcryptjs`。
- `jsonwebtoken`。
- `cors`。
- `dotenv`。
- `multer`。
- `mammoth`。
- `pdf-parse`。

### 2.3 数据库

当前 schema 使用 PostgreSQL，并通过 Prisma 定义：

- `User`。
- `Exam`。
- `Question`。
- `ExamAttempt`。
- `UserAnswer`。
- `WrongQuestion`。

枚举包含：

- `Role`：`STUDENT`、`ADMIN`。
- `GradeLevel`：覆盖小学、初中、高中、大学、四级、六级、考研、雅思、托福等。
- `QuestionType`：选择、翻译、改错、写作、阅读、完形。
- `SubmitType`：`MANUAL`、`AUTO`。

## 3. 当前前端结构

```text
frontend/src
├── api
│   ├── authApi.js
│   └── examApi.js
├── router
│   └── index.js
├── utils
│   └── examCategories.js
├── views
│   ├── AdminAttemptsView.vue
│   ├── AdminView.vue
│   ├── AttemptDetailView.vue
│   ├── ExamListView.vue
│   ├── ExamView.vue
│   ├── HomeView.vue
│   ├── LoginView.vue
│   ├── ProfileView.vue
│   ├── RegisterView.vue
│   └── WrongPracticeView.vue
├── data
│   ├── mockExams.js
│   └── mockQuestions.js
├── App.vue
├── main.js
└── style.css
```

关键位置：

- 登录 / 注册：`LoginView.vue`、`RegisterView.vue`、`authApi.js`。
- 路由与角色保护：`router/index.js`。
- 试卷列表：`ExamListView.vue`。
- 在线考试：`ExamView.vue`。
- 结果详情：`AttemptDetailView.vue`。
- 个人中心 / 历史记录 / 错题入口：`ProfileView.vue`。
- 错题重练：`WrongPracticeView.vue`。
- 管理员试卷、题目、导入入口：`AdminView.vue`。
- 管理员考试记录：`AdminAttemptsView.vue`。
- API 封装：`examApi.js`。

## 4. 当前后端结构

```text
backend
├── index.js
├── prisma
│   └── schema.prisma
├── scripts
│   ├── seed.js
│   └── test-db.js
└── src
    ├── lib
    │   └── prisma.js
    ├── middlewares
    │   └── authMiddleware.js
    └── routes
        ├── adminAttemptRoutes.js
        ├── adminImportRoutes.js
        ├── adminRoutes.js
        ├── authRoutes.js
        ├── examRoutes.js
        ├── resultRoutes.js
        └── wrongPracticeRoutes.js
```

关键位置：

- 应用入口与 router 挂载：`backend/index.js`。
- Prisma Client：`backend/src/lib/prisma.js`。
- JWT 鉴权 / 管理员鉴权：`backend/src/middlewares/authMiddleware.js`。
- 注册、登录、当前用户：`backend/src/routes/authRoutes.js`。
- 试卷列表、考试提交、考试历史、错题保存与列表：`backend/src/routes/examRoutes.js`。
- 考试结果详情：`backend/src/routes/resultRoutes.js`。
- 错题练习和标记掌握：`backend/src/routes/wrongPracticeRoutes.js`。
- 管理员试卷 / 题目 / 导入 / AI 解析：`backend/src/routes/adminRoutes.js`。
- 另一套管理员导入路由：`backend/src/routes/adminImportRoutes.js`。
- 管理员查看学生考试记录：`backend/src/routes/adminAttemptRoutes.js`。

## 5. 当前已实现功能

### 5.1 用户与角色

- 学生注册。
- 用户登录。
- 密码哈希存储。
- JWT 7 天有效期。
- `STUDENT` / `ADMIN` 角色。
- 前端根据 localStorage 中的用户信息做路由保护。
- 后端通过 Bearer Token 鉴权，并支持管理员接口保护。

### 5.2 试卷与题目

- 学生端读取已发布试卷。
- 按学段或分组筛选试卷。
- 读取试卷详情。
- 读取试卷题目。
- 管理员创建、编辑、删除、发布 / 下架试卷。
- 管理员查看、创建、编辑、删除题目。
- 试卷总分可按题目分值重新计算。

### 5.3 考试与结果

- 学生提交考试。
- 后端保存 `ExamAttempt` 和 `UserAnswer`。
- 选择题自动评分。
- 记录客观题得分、主观题得分、总分、正确率、提交方式、用时、暂停次数。
- 学生查看考试历史。
- 学生或管理员查看考试结果详情。
- 删除考试记录时同步删除相关答案和错题。

### 5.4 错题本

- 保存错题。
- 获取当前用户错题列表。
- 获取错题练习详情。
- 标记错题已掌握，即删除错题记录。

### 5.5 管理员统计

- 管理员可查看学生考试记录。
- 前端管理员考试记录页可筛选、统计、导出 CSV。

### 5.6 导入相关

- 管理员上传 TXT / DOCX 解析题目。
- 部分路径具备 PDF 文本提取能力。
- 管理员上传试卷文件、解析文件、音频文件、听力原文文件做预处理。
- 管理员可调用 AI 解析接口，将原始文本解析为 JSON 题目。
- 管理员可批量导入题目到某张试卷。

## 6. 当前系统与目标平台的差距

| 目标能力 | 当前状态 | 差距 |
| --- | --- | --- |
| 多学段试卷 | 基础枚举和筛选已存在 | 小升初是否独立分类待确认；学段专属结构和规则不足。 |
| TXT / DOCX / PDF 上传 | 部分已存在 | 路由重复；PDF 支持不一致；扫描版 OCR 未实现。 |
| 试卷、答案、解析、听力材料 | 部分已存在 | 答案 / 解析在题目字段中；听力材料缺少持久化模型。 |
| 听力题 | 上传接口可接收音频 | schema 无听力材料与题组关联。 |
| 图片题 | NEEDS_VERIFICATION | schema 无图片资源。 |
| 选择题 | 已支持 | 多选、匹配、选词填空等变体不足。 |
| 填空题 | NEEDS_VERIFICATION | 无 `FILL_BLANK` 枚举。 |
| 阅读题 | 部分支持 | 缺少阅读材料 + 多小题结构。 |
| 翻译题 / 写作题 | 已有题型 | 缺少评分规则、人工评分流程、AI 反馈策略。 |
| 上传后导入草稿 | 未实现持久化草稿 | 当前多为解析后直接响应或直接入库。 |
| 人工校对后入库 | 部分前端可能有编辑导入结果 | 缺少持久化草稿状态机和审计。 |
| 自动评分 | 选择题支持 | 主观题、填空题、多答案题评分不足。 |
| 错题本 | 已支持 | 缺少错因分类、掌握度、复习计划。 |
| 学情报告 | 结果详情和知识点统计基础 | 缺少持久化报告、趋势分析、班级维度。 |
| 教师班级统计 | 管理员考试记录基础 | 缺少教师、班级、学生归属、班级报告。 |
| 讲评建议 / 补充练习 | NEEDS_VERIFICATION | 需要诊断和内容生成模块。 |

## 7. 后续开发风险点

1. **导入路由重复**：`adminRoutes.js` 与 `adminImportRoutes.js` 存在同路径接口，后续必须先统一，否则调试和测试结果不可靠。
2. **schema 扁平化限制**：当前 `Question` 无法自然表达 Section、材料、题组、小题、附件。
3. **直接入库风险**：现有导入题目接口会写正式题库，不符合“草稿校对后入库”的目标流程。
4. **评分能力不足**：当前选择题自动评分较明确，主观题和复杂题型评分未形成后端闭环。
5. **历史数据兼容**：未来改题型和表结构时，要兼容已有 `ExamAttempt`、`UserAnswer`、`WrongQuestion`。
6. **PDF / DOCX 解析边界**：表格、图片、扫描件、复杂排版可能解析失败。
7. **AI 解析稳定性**：AI 返回可能缺字段或误判题型，必须保留人工校对和非 AI 兜底。
8. **角色模型不足**：当前只有 `STUDENT` / `ADMIN`，目标教师场景可能需要 `TEACHER`、班级、学校等模型。
9. **文件存储缺失**：当前上传文件多为临时处理，缺少对象存储、素材表和访问控制。
10. **部署环境变量风险**：AI、数据库、文件存储、OCR 等能力会引入更多环境变量，需要避免密钥入库。

## 8. 建议的正式开发起点

建议下一轮从 **导入草稿模块** 开始，而不是先改考试 UI。

原因：

1. 导入草稿是多学段、多文件、多题型进入系统的入口。
2. 草稿模型会倒逼明确 Section、Material、QuestionGroup、Question 的边界。
3. 先解决导入入口，可以避免后续每种试卷都手工录题。
4. 草稿校对后入库可降低 AI / PDF / DOCX 解析不稳定带来的数据污染。

建议拆分为：

1. 合并 / 清理导入路由。
2. 抽出纯解析服务和校验服务。
3. 设计并迁移 `ImportDraft`、`ImportDraftFile`、`ImportDraftQuestion` 等表。
4. 做管理员导入草稿列表和校对页面。
5. 校对通过后写入当前 `Exam` / `Question`，并为未来材料模型预留字段。

## 9. 本轮导入草稿主链路更新

- 已新增基础导入草稿主链路：教师 / 管理员可创建 `ImportJob`，解析结果进入 `ImportDraftQuestion`、`ImportDraftMaterial`、`ImportWarning`，不直接写入正式 `Exam` / `Question`。
- 已新增校对后确认入库接口，将草稿生成正式 `Exam`、`Question`、`QuestionMaterial`，并保留 `ImportJob.examId` 追溯关系。
- 基础解析覆盖 TXT / DOCX / 文字型 PDF 的文本提取；扫描版 PDF、OCR、图片题、音频持久化仍为 `NEEDS_VERIFICATION`。
- 教师仅能查看和确认自己创建的导入任务；管理员可查看全部导入任务；学生不能访问导入草稿接口。
