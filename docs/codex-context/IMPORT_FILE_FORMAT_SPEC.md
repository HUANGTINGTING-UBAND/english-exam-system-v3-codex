# 试卷导入文件格式与解析规则

## 1. 文档目的

本文档定义后续试卷导入功能的文件格式、解析边界、草稿结构和校验规则。

本轮仅沉淀上下文，不修改业务代码、数据库 schema 或部署配置。

## 2. 当前仓库导入能力事实

### 2.1 已安装解析依赖

当前后端依赖中已有：

- `multer`：上传文件处理。
- `mammoth`：DOCX 文本提取。
- `pdf-parse`：PDF 文本提取。

### 2.2 当前导入相关接口

仓库当前存在多条管理员导入接口：

| 接口 | 位置 | 当前作用 |
| --- | --- | --- |
| `POST /api/admin/import/parse-file` | `backend/src/routes/adminRoutes.js` | 上传单个文件并解析题目；当前主路径支持 TXT / DOCX，部分代码路径支持 PDF 文本提取。 |
| `POST /api/admin/import/parse-file` | `backend/src/routes/adminImportRoutes.js` | 另一个同路径路由，支持 TXT / DOCX；因为 `backend/index.js` 同时挂载两个 router，实际命中顺序需重点验证。 |
| `POST /api/admin/import/prepare` | `backend/src/routes/adminRoutes.js` | 上传试卷文件、解析文件、音频文件、听力原文文件，生成预处理结果；当前返回结果仍是内存响应，不是持久化导入草稿。 |
| `POST /api/admin/ai/parse-questions` | `backend/src/routes/adminRoutes.js` | 调 OpenAI Chat Completions 将文本解析为题目 JSON；需要环境变量 `OPENAI_API_KEY`。 |
| `POST /api/admin/exams/:examId/import-questions` | `backend/src/routes/adminRoutes.js` / `adminImportRoutes.js` | 将题目写入正式题库；当前存在同路径重复实现，实际命中顺序需验证。 |

### 2.3 当前解析格式

当前 `adminRoutes.js` 中主要解析器偏向字段标签格式：

```text
题号: 1
题型: 单选题
题干: Which word is correct?
选项:
A. apple
B. banana
C. orange
D. pear
答案: A
解析: ...
知识点: 词汇
分值: 2
```

当前 `adminImportRoutes.js` 中另一个解析器偏向“题型标题 + 编号题目”的格式：

```text
【选择题】
1. Which word is correct?
A. apple
B. banana
C. orange
D. pear
答案: A
解析: ...
知识点: 词汇
分值: 2
```

## 3. 目标导入原则

后续导入链路必须按以下顺序设计：

```text
上传文件
↓
文本 / 素材提取
↓
结构化解析
↓
生成导入草稿
↓
人工校对与补全
↓
校验通过
↓
写入正式试卷 / 题库
```

禁止把不可信解析结果直接写入正式题库。

## 4. 支持文件类型目标

| 文件类型 | 当前事实 | 目标规则 |
| --- | --- | --- |
| TXT | 已有解析路径 | UTF-8 文本优先；必须保留原始文本。 |
| DOCX | 已有 `mammoth` 文本提取路径 | 先提取纯文本；图片、表格、公式提取能力需后续验证。 |
| PDF | `adminRoutes.js` 有 `pdf-parse` 路径，部分接口限制为 TXT / DOCX | 只保证文字版 PDF；扫描版 PDF 需 OCR，当前为 `NEEDS_VERIFICATION`。 |
| 音频 | `prepare` 接口接收 `audioFile`，但不解析内容 | 需保存音频资源并关联听力 Section。 |
| 图片 | NEEDS_VERIFICATION | 当前 schema 无图片素材模型。 |

## 5. 推荐标准导入文本格式 v1

为了可测试和可人工校对，推荐先支持一种稳定的文本格式。

### 5.1 文件级元数据

```text
试卷标题: 2025 学年第一学期初中英语期末测试
考试类型: JUNIOR
年级: 八年级
总分: 100
时长: 90
来源: 校内期末
```

### 5.2 Section 格式

```text
[SECTION]
标题: 听力理解
类型: LISTENING
说明: 听录音，选择正确答案。
材料ID: audio-001
```

### 5.3 材料格式

```text
[MATERIAL]
材料ID: audio-001
材料类型: AUDIO
文件名: listening.mp3
听力原文:
W: What time is it now?
M: It is seven thirty.
```

阅读材料示例：

```text
[MATERIAL]
材料ID: reading-001
材料类型: TEXT
正文:
Tom is a middle school student. He likes English very much...
```

### 5.4 题目格式

```text
[QUESTION]
题号: 1
题型: CHOICE
所属SECTION: 听力理解
材料ID: audio-001
题干: What time is it now?
选项:
A. 7:00
B. 7:30
C. 8:00
D. 8:30
答案: B
解析: seven thirty 表示 7:30。
知识点: 听力-时间表达
分值: 2
```

### 5.5 主观题格式

```text
[QUESTION]
题号: 56
题型: WRITING
题干: Write a short passage about your favorite teacher.
参考答案: NEEDS_VERIFICATION
评分规则:
1. 内容完整 5 分
2. 语言准确 5 分
3. 结构清晰 5 分
解析: 写作题需人工或 AI 辅助评分。
知识点: 写作-人物描写
分值: 15
```

## 6. 题型归一化建议

| 输入别名 | 建议标准类型 | 当前是否可直接入库 |
| --- | --- | --- |
| 单选题 / 选择题 / SINGLE_CHOICE | `CHOICE` | 是。 |
| 阅读理解 | `READING` 或 `CHOICE` + 阅读材料 | 当前可入库但材料结构不足。 |
| 完形填空 | `CLOZE` | 是，但空位结构不足。 |
| 翻译题 | `TRANSLATION` | 是。 |
| 写作题 | `WRITING` | 是。 |
| 改错题 | `ERROR_CORRECTION` | 是。 |
| 听力题 | `LISTENING` | NEEDS_VERIFICATION：当前枚举无该类型。 |
| 填空题 | `FILL_BLANK` | NEEDS_VERIFICATION：当前枚举无该类型。 |
| 图片题 | `IMAGE_BASED` | NEEDS_VERIFICATION：当前枚举无该类型。 |
| 匹配题 / 段落匹配 | `MATCHING` | NEEDS_VERIFICATION：当前枚举无该类型。 |

## 7. 导入草稿建议结构

> 目标设计建议，当前 schema 未实现。

```json
{
  "draftId": "draft_xxx",
  "status": "PARSING | NEEDS_REVIEW | REVIEWED | IMPORTED | FAILED",
  "sourceFiles": [
    {
      "kind": "PAPER | ANSWER | EXPLANATION | AUDIO | TRANSCRIPT | IMAGE",
      "fileName": "paper.docx",
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "storageKey": "..."
    }
  ],
  "exam": {
    "title": "...",
    "gradeLevel": "JUNIOR",
    "timeLimit": 5400,
    "totalScore": 100
  },
  "sections": [],
  "materials": [],
  "questions": [],
  "warnings": [],
  "rawText": "..."
}
```

## 8. 校验规则

### 8.1 阻断性错误

- 无试卷标题。
- 无考试类型 / 学段，且无法自动识别。
- 无任何有效题目。
- 选择题没有选项。
- 选择题答案不在选项范围内。
- 分值为空且没有可用预设。
- 题号重复。
- 需要的素材文件缺失，例如听力 Section 引用了不存在的音频。

### 8.2 警告性问题

- 缺少解析。
- 缺少知识点。
- 主观题缺少评分规则。
- PDF 提取文本异常短，疑似扫描版。
- DOCX 表格 / 图片中可能存在未提取内容。
- 自动识别出的学段与用户选择不一致。

## 9. 与当前实现的风险

1. `adminRoutes.js` 和 `adminImportRoutes.js` 存在重复路径，后续必须先统一导入入口。
2. 当前部分导入接口直接写正式题库，不符合目标“草稿校对后入库”。
3. 当前 schema 无草稿、素材、Section、题组模型。
4. PDF / DOCX 的图片、表格、扫描件支持不足，需要明确边界。
5. AI 解析接口依赖环境变量和外部网络，必须提供非 AI 兜底解析与人工校对。

## 8. 本轮基础实现说明

- `POST /api/import/jobs` 支持 JSON 原始文本和 multipart `file` 上传创建导入草稿，文件优先支持 TXT / DOCX / 文字型 PDF。
- 解析器会尝试识别试卷标题、考试类型、总分、时长、`[MATERIAL]`、`[QUESTION]`、题号、题型、题干、A/B/C/D 选项、答案、解析、知识点、分值、材料ID。
- 无法判断题型时默认 `CHOICE`，并生成 `UNKNOWN_QUESTION_TYPE` warning；选择题缺少答案、选项不足、材料绑定不确定等均生成 warning。
- `POST /api/import/jobs/:id/confirm` 是唯一从草稿进入正式试卷的入口。

## 9. 本轮 PDF 中考试卷兼容增强

- 基础解析器增加真实中考试卷 PDF 文本兼容：题号支持 `1.`、`1．`、`1、`、`1)`、`第 1 题`，题号后可无空格。
- 选择题选项支持 `A.`、`A．`、`A、`、`A)`，并允许 A/B/C/D 或 A/B/C 在同一行排列。
- 听力选择题允许只有 A/B/C 三个选项；少于 3 个选项才生成选项不完整 warning。
- 已提取 rawText 但未识别题目时，导入任务保持 `NEEDS_REVIEW`，生成 `RAW_TEXT_UNRECOGNIZED` warning，便于人工编辑 rawText 后重新解析。

## 10. 本轮真实 PDF 说明过滤与答案区增强

- PDF rawText 解析前会过滤常见考试说明、注意事项、答题说明、页码、听力说明、例题和 `答案是 B` 等示例内容，避免污染正式草稿题。
- 未带选项的题块不再强制按完整选择题校验；系统保留安全草稿并生成 `NON_CHOICE_LIKE_QUESTION` warning，后续需人工确认题型。
- 重复题号会跳过重复草稿题，并生成 `DUPLICATE_QUESTION_NUMBER` warning。
- 答案区支持 `1-5 ABCDA`、`1. A 2. B`、`1 A` 等基础格式，并回填选择题答案。
