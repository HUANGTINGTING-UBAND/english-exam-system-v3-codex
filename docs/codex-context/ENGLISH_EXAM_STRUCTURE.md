# 多学段英语考试结构上下文

## 1. 文档目的

本文档用于沉淀英语在线考试平台的领域结构，为后续“多学段英语试卷导入、在线考试、学情诊断与教学支持”开发提供统一上下文。

本文档内容分为两类：

- **仓库分析事实**：当前代码和 schema 中已存在的结构。
- **目标需求上下文**：本轮需求提出、但仓库未必已实现的结构。

如无法从仓库确认，统一标记为 `NEEDS_VERIFICATION`。

## 2. 当前仓库已实现的考试分类

### 2.1 数据库枚举

仓库当前在 `backend/prisma/schema.prisma` 中定义了 `GradeLevel` 枚举，覆盖：

- `PRIMARY`：小学英语。
- `JUNIOR`：初中英语。
- `SENIOR`：高中英语。
- `COLLEGE`：大学英语综合。
- `CET4`：大学英语四级。
- `CET6`：大学英语六级。
- `POSTGRADUATE`：考研英语。
- `IELTS`：雅思。
- `TOEFL`：托福。
- `BUSINESS`：商务英语。
- `ADULT`：成人英语。
- `PROFESSIONAL`：职称英语。
- `GENERAL`：综合练习。
- `OTHER`：其他 / 未分类。

### 2.2 前端分类分组

当前前端 `frontend/src/utils/examCategories.js` 将考试方向分为：

- K12 校内英语：`PRIMARY`、`JUNIOR`、`SENIOR`。
- 大学英语：`CET4`、`CET6`、`POSTGRADUATE`、`COLLEGE`。
- 出国英语考试：`IELTS`、`TOEFL`。
- 其他英语考试：`BUSINESS`、`ADULT`、`PROFESSIONAL`。
- 其他：`GENERAL`、`OTHER`。

### 2.3 后端查询分组

当前后端 `backend/src/routes/examRoutes.js` 也有同名分组，用于 `/api/exams?group=...` 的筛选。

## 3. 当前仓库已实现的题型

### 3.1 数据库题型枚举

当前 `QuestionType` 仅包含：

- `CHOICE`：选择题。
- `TRANSLATION`：翻译题。
- `ERROR_CORRECTION`：改错题。
- `WRITING`：写作题。
- `READING`：阅读题。
- `CLOZE`：完形填空。

### 3.2 当前评分支持

当前考试提交逻辑的核心特点：

- 选择题按 `selectedIndex` 与题目 `answer` 对比自动评分。
- 非选择题保存学生答案，但当前后端默认主观题得分为 0；前端可能存在自评分体验，最终入库仍需以后端逻辑为准。
- `ExamAttempt` 保存客观题得分、主观题得分、总分、正确率、用时、暂停次数、提交类型。
- `UserAnswer` 保存每题作答、得分、是否正确。
- `WrongQuestion` 保存错题、知识点、题型和来源考试。

## 4. 目标平台需要支持的学段

以下来自目标需求，部分已经有枚举，部分需要后续确认或新增：

| 学段 / 考试 | 当前枚举支持 | 备注 |
| --- | --- | --- |
| 小学英语 | 已支持 `PRIMARY` | 已有基础分类。 |
| 小升初英语 | NEEDS_VERIFICATION | 当前没有独立 `XIAOSHENGCHU` / `PRIMARY_TO_JUNIOR` 枚举，可先归入 `PRIMARY` 或 `JUNIOR`，正式开发前需确认是否新增枚举。 |
| 初中英语 | 已支持 `JUNIOR` | 已有基础分类。 |
| 高中英语 | 已支持 `SENIOR` | 已有基础分类。 |
| 大学英语四级 | 已支持 `CET4` | 当前导入逻辑存在 CET4 题量 / 分值预设线索。 |
| 大学英语六级 | 已支持 `CET6` | 枚举已有，但导入预设是否完整需验证。 |
| 大学英语综合 | 已支持 `COLLEGE` | 已有基础分类。 |

## 5. 目标平台需要支持的题型结构

目标题型应采用“通用题型 + 材料 + 子题”的结构演进，而不是只依赖当前扁平 `Question` 表。

| 目标题型 | 当前支持情况 | 建议建模方向 |
| --- | --- | --- |
| 听力题 | NEEDS_VERIFICATION | 当前 schema 没有音频材料表、听力原文、材料与题目关系。建议引入 `ExamMaterial` / `QuestionGroup`。 |
| 图片题 | NEEDS_VERIFICATION | 当前 schema 没有图片资源字段。建议引入素材表或题目附件表。 |
| 选择题 | 已支持 `CHOICE` | 需要扩展到多选、选词填空、段落匹配等变体。 |
| 填空题 | NEEDS_VERIFICATION | 当前没有 `FILL_BLANK` 枚举；可先作为 `CLOZE` 或后续新增。 |
| 阅读题 | 部分支持 `READING` | 当前缺少阅读材料与多小题分组结构。 |
| 翻译题 | 已支持 `TRANSLATION` | 需要评分 rubrics / 人工评分 / AI 辅助评分策略。 |
| 写作题 | 已支持 `WRITING` | 需要评分 rubrics / 范文 / AI 辅助反馈策略。 |
| 改错题 | 已支持 `ERROR_CORRECTION` | 当前为扁平题目，细分规则需后续确认。 |
| 完形填空 | 已支持 `CLOZE` | 当前为扁平题目，材料和空位结构需后续确认。 |

## 6. 推荐的通用试卷结构（目标模型）

> 这是目标需求上下文，不代表当前 schema 已实现。

```text
Exam
├── PaperMetadata
│   ├── 学段 / 考试类型
│   ├── 年级 / 学期 / 来源 / 年份
│   ├── 总分 / 时长 / 发布状态
│   └── 导入来源与版本
├── Section[]
│   ├── sectionType: LISTENING | READING | WRITING | TRANSLATION | CLOZE | OTHER
│   ├── title / directions / scoreRule
│   ├── Material[]: 音频、图片、阅读文本、听力原文
│   └── Question[]
├── AnswerKey
├── Explanation
└── Rubric
```

## 7. 与当前 schema 的主要差距

1. 当前 `Question` 是扁平结构，缺少 `Section`、`Material`、`QuestionGroup`、`SubQuestion`。
2. 当前 `QuestionType` 不覆盖听力题、图片题、填空题、多选题、匹配题等目标题型。
3. 当前没有导入草稿表，无法保存“解析后待校对”的中间状态。
4. 当前没有班级、教师、班级成员、作业 / 考试安排等教学组织结构。
5. 当前学情诊断主要依赖考试结果和错题知识点，尚未形成可持久化的诊断报告、班级统计、讲评建议和补充练习。

## 8. 后续开发建议

优先从“导入草稿与结构化试卷模型”开始，而不是直接改考试页面：

1. 先设计导入草稿数据结构。
2. 明确题型与材料的最小可用模型。
3. 实现 TXT / DOCX / PDF 解析到草稿。
4. 增加人工校对 UI。
5. 校对通过后再写入正式 `Exam` / `Question`，并保留向旧考试流程兼容的字段。

## 9. 本轮材料展示兼容策略

- 正式入库时，草稿材料写入现有 `QuestionMaterial`，题目通过 `Question.materialId` 关联材料。
- 后端试卷详情返回 `materials`，题目列表返回每题的 `materialId` 和 `material`。
- 前端考试页在题目关联材料时显示材料卡片；无材料题目保持原有显示和作答逻辑。
- 更复杂的 Section、听力音频、图片题和材料多级分组仍为 `NEEDS_VERIFICATION`。
