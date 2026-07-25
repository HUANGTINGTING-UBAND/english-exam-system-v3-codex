# 试卷导入测试要求与用例

## 1. 文档目的

本文档用于定义后续导入功能的测试范围、测试数据和验收标准。

当前仓库尚未建立自动化测试框架；本文档先作为开发前测试上下文，正式开发导入模块时应补充脚本化测试。

## 2. 当前仓库测试现状

- 后端 `package.json` 只有 `dev`、`start`、`test:db`、`seed` 脚本。
- 前端 `package.json` 只有 `dev`、`build`、`preview` 脚本。
- 当前没有发现 Jest / Vitest / Playwright 等自动化测试配置。
- `backend/scripts/test-db.js` 可用于数据库连接测试，但依赖环境变量和真实数据库连接。

## 3. 导入功能验收原则

1. 解析结果必须先进入“导入草稿”，不能直接进入正式题库。
2. 每次导入必须保留原始文本、源文件信息和解析警告。
3. 所有阻断性错误必须阻止入库。
4. 所有警告性问题必须展示给人工校对者。
5. 人工校对后再写入正式 `Exam` / `Question` 或未来扩展表。
6. 导入结果必须可追溯：知道来自哪个文件、哪次导入、哪些字段是自动解析、哪些字段经过人工修改。

## 4. 最小测试矩阵

| 编号 | 类型 | 输入 | 预期 |
| --- | --- | --- | --- |
| T01 | TXT 标准选择题 | 字段标签格式 2 道选择题 | 成功解析为 2 道题，答案 A/B 转 0/1，生成草稿。 |
| T02 | DOCX 标准选择题 | 与 T01 内容相同的 DOCX | 成功提取文本并生成相同草稿。 |
| T03 | PDF 文字版 | 可复制文字的 PDF | 成功提取文本；如解析不完整，应给 warnings。 |
| T04 | PDF 扫描版 | 图片扫描 PDF | 返回 OCR 未支持或文本过短警告，不得编造题目。 |
| T05 | 缺少答案 | 选择题无答案 | 生成草稿但标记阻断性错误，不能入库。 |
| T06 | 答案越界 | 4 个选项但答案为 E | 标记阻断性错误。 |
| T07 | 缺少分值 | 无分值且无预设 | 标记阻断性错误或应用明确预设；必须可解释。 |
| T08 | 阅读材料 + 多小题 | 1 篇阅读 + 3 个小题 | 材料与小题关联；当前 schema 不支持处标记 `NEEDS_VERIFICATION`。 |
| T09 | 听力文件 + 原文 | paper + audio + transcript | 草稿记录音频文件名、原文预览和听力 Section；当前持久化需后续实现。 |
| T10 | 图片题 | 题干引用图片 | 当前应标记 `NEEDS_VERIFICATION`，不得丢失图片引用。 |
| T11 | 主观题 | 翻译 / 写作带参考答案和评分规则 | 解析为主观题，提示需要人工 / AI 评分策略。 |
| T12 | 重复题号 | 两道题号均为 1 | 标记阻断性错误。 |
| T13 | 重复路由回归 | `/admin/import/parse-file` | 验证实际命中的 router，避免重复实现导致行为不一致。 |
| T14 | CET4 57 题 | 四级真题结构 | 应用 CET4 预设前必须验证题号、分值、总分和时长。 |

## 5. 标准 TXT 测试样例

```text
试卷标题: 初中英语导入冒烟测试
考试类型: JUNIOR
总分: 4
时长: 30

[QUESTION]
题号: 1
题型: CHOICE
题干: Which word means “苹果”?
选项:
A. apple
B. banana
C. pear
D. orange
答案: A
解析: apple 表示苹果。
知识点: 词汇-水果
分值: 2

[QUESTION]
题号: 2
题型: CHOICE
题干: Choose the correct sentence.
选项:
A. He are a student.
B. He is a student.
C. He am a student.
D. He be a student.
答案: B
解析: 主语 He 后使用 is。
知识点: 语法-be 动词
分值: 2
```

## 6. 旧格式兼容测试样例

当前仓库已有解析器支持以下格式，后续重构不能无意破坏，除非明确迁移：

```text
题号: 1
题型: 单选题
题干: Which word means “book”?
选项:
A. pen
B. book
C. desk
D. chair
答案: B
解析: book 表示书。
知识点: 词汇
分值: 2
```

另一个旧格式：

```text
【选择题】
1. Which word means “book”?
A. pen
B. book
C. desk
D. chair
答案: B
解析: book 表示书。
知识点: 词汇
分值: 2
```

## 7. API 手工测试建议

> 以下命令为后续正式开发时的建议，当前环境未配置真实数据库 / 管理员 Token 时可能无法直接运行。

```bash
curl -X POST http://localhost:3000/api/admin/import/parse-file \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "file=@sample.txt"
```

```bash
curl -X POST http://localhost:3000/api/admin/import/prepare \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "paperFile=@paper.docx" \
  -F "analysisFile=@analysis.docx" \
  -F "transcriptFile=@transcript.txt" \
  -F "audioFile=@listening.mp3"
```

## 8. 后续自动化测试建议

### 8.1 解析器单元测试

建议将导入解析逻辑从 Express route 中抽出到纯函数模块，例如：

```text
backend/src/services/importParser.js
backend/src/services/importValidator.js
```

然后为以下函数补测试：

- `extractTextFromFile`
- `parseQuestionsFromText`
- `normalizeQuestionType`
- `normalizeChoiceAnswer`
- `validateImportDraft`
- `applyExamImportPreset`

### 8.2 API 集成测试

建议覆盖：

- 未登录访问导入接口返回 401。
- 学生访问导入接口返回 403。
- 管理员上传合法文件返回草稿。
- 管理员确认草稿后入库。
- 错误文件类型返回 400。
- 超过大小限制返回 413 或明确错误。

### 8.3 数据一致性测试

- 导入成功后，试卷总分等于题目分值之和。
- 题号顺序稳定。
- 重新导入同一试卷时不会留下孤儿题目或错误结果。
- 不同管理员 / 不同导入草稿之间数据隔离。

## 9. 风险回归清单

- 重复导入路由导致同一个请求行为不一致。
- PDF 解析库对某些 PDF 抛错或返回空文本。
- DOCX 表格题目顺序错乱。
- AI 解析返回 JSON 字段不完整。
- CET4 预设误判普通 57 题试卷。
- 主观题被错误当作选择题。
- 答案解析文本被误切进题干。
- 删除 / 覆盖试卷题目时影响已有考试记录。

## 10. 本轮手工验收补充

1. 使用标准 TXT 样例调用 `POST /api/import/jobs`，应生成 `ImportJob`、2 道 `ImportDraftQuestion` 和至少源文件 / 校对相关 warning。
2. 在 `/import-drafts` 页面选择草稿，编辑题干、选项、答案、解析、题型、分值后保存。
3. 编辑材料标题和正文后保存，并将 warning 标记为已处理。
4. 点击“确认入库”后，应生成正式 `Exam`、`Question`、`QuestionMaterial`，导入任务状态变为 `IMPORTED`。
5. 学生从普通试卷列表打开导入生成的试卷时，不携带 `assignmentId` 也应可正常开始和提交考试。

## 11. 本轮 PDF 文本解析回归样例

```text
1．What is Bill’s favorite subject?
A. Music.  B. History.  C. English.
2．Where is the man going?
A. To the hospital.  B. To the library.  C. To the hotel.
```

预期：生成 2 道 `CHOICE` 草稿题，每题 3 个选项；无答案时生成 `MISSING_CHOICE_ANSWER` warning；任务状态保持 `NEEDS_REVIEW`。

## 12. 本轮真实 PDF 噪声过滤验收补充

- 输入包含“答题卡上不得使用涂改液”“B、C 三个选项中选出最佳选项”等说明文字时，不应将这些内容作为第 1 题题干或选项。
- 输入包含例题 `How much is T-shirt? A. ¥30 B. ¥50 C. ¥70 答案是 B。` 时，不应生成正式草稿题。
- 输入重复题号时，应跳过重复草稿题并生成 `DUPLICATE_QUESTION_NUMBER` warning。
- 输入 `1-5 ABCDA` 或 `1. A 2. B` 答案区时，应回填对应选择题 answer。

## 13. 本轮整卷结构解析验收补充

- 阅读理解长文章应只生成一个草稿材料，多道阅读选择题通过 `materialLocalId` 关联该材料。
- 完形填空短文应只生成一个草稿材料，空号题记录 `typeHint: cloze`。
- 翻译题、写作题、填空题应记录真实 `typeHint`，不得作为普通选择题强制要求 A/B/C 选项。
- 答案与解析区能匹配题号时应回填选择题 answer 或主观题参考答案；无法稳定匹配时应保留 warning。

## 10. PDF rawText 解析回归 smoke 用例

真实中考试卷 PDF 文本抽取后，解析器必须先截断“英语参考答案 / 参考答案 / 答案与解析”之后的内容，答案区只能用于回填 `answer` / `explanation`，不得生成新草稿题。以下片段是 0 题回退的最小回归样例：

```text
第一部分 听力理解
1．What is Bill’s favorite subject?
A. Music. B. History. C. English.
2．Where is the man going?
A. To the hospital. B. To the library. C. To the hotel.
...
20．What’s the speaker’s purpose?
A. To give advice. B. To ask for help. C. To send wishes
英语参考答案
1．B 2．A 3．C 4．A 5．C
6．B 7．A 8．A 9．C 10．C
```

自动化 smoke 命令：

```bash
cd backend
DATABASE_URL='postgresql://user:pass@localhost:5432/db' npx prisma generate
node scripts/smoke-import-parser.js
```

验收：`questions.length >= 20`，1—20 均为 `CHOICE`，每题有题干和 A/B/C 三个选项；“英语参考答案”之后的题号只回填答案，不生成新题；只有 rawText 确实没有任何可识别题号时才允许 `RAW_TEXT_UNRECOGNIZED`。

## 11. PDF parser 调试输出要求

当 PDF `rawText` 非空但解析结果为 0 题时，解析器 smoke test 必须输出以下中间信息，避免只看到 `RAW_TEXT_UNRECOGNIZED`：

- `formalQuestionTextFound` 与 `formalQuestionTextLength`：确认是否成功截取正式试题区。
- `formalQuestionTextPreview`：展示正式试题区前 500 字，用于判断是否被“答案是 B”等例题文本提前截断。
- `matchedQuestionNumbers`：至少验证 1、2、3 题号是否被题号正则识别。
- `firstQuestionOptions`：验证第 1 题 A/B/C 选项是否进入 choice parser。
- `questionCount`、`warningCodes`、`zeroQuestionReason`：定位最终 0 题原因。

兜底规则：如果 section / material parser 失败，只要正式试题区存在 `数字 + ．/. / ) + 英文题干 + A. + B. + C.`，必须生成可人工校对的 `CHOICE` 草稿题；所有 parser 和 fallback 都失败时才允许 `RAW_TEXT_UNRECOGNIZED`。

## 12. 材料边界 smoke 用例

真实 PDF rawText 中，阅读/七选五/完形/语法填空材料不能从上一题题干或选项开始。`backend/scripts/smoke-import-parser.js` 增加了材料边界断言：

- B 篇阅读材料必须包含 `The Tan family`，且不能包含 `23．Where can we read...`。
- C 篇阅读材料必须包含 `What are insects`，且不能包含 `27．What is the writer’s main purpose...`。
- 完形材料必须包含 `Oh, no? How silly I was`，且不能包含七选五标题或 A-E 候选项。
- 语法填空材料必须包含 `Long, long ago`，类型不能保存为 `CLOZE_TEXT`，关联题目应记录 `metadata.typeHint: fill_blank`。

## 13. 整卷题目完整性 smoke 用例

`backend/scripts/smoke-import-parser.js` 还包含一个合成整卷片段，用于防止真实湖南中考 PDF 再次漏题或拆散题组：

- 断言 `questions.length >= 60`，当前合成样例应达到 61 题。
- 必须包含关键题号：1、20、21、31、32、35、36、45、46、55、56、60、61。
- 七选五 32—35 必须绑定同一个 `seven_choice-*` material，且材料包含 A-E 候选项。
- 完形 36—45 必须绑定同一个 `cloze-*` material。
- 语法填空 46—55 必须绑定同一个 `fill_blank-*` material。
- 综合技能 56—60 必须绑定 `My name is Jeff...` 对应的 `subjective-*` material。
- 写作 61 必须保留，`metadata.typeHint` 为 `writing`，不得识别为普通选择题。

## 14. 图片材料占位与整卷顺序回归

后续 PDF 导入 smoke 必须继续验证：

- 草稿题目按 `metadata.questionNo` 升序展示，不能出现完形/填空题跑到第 1 题前面。
- 听力 1—20 不绑定阅读材料，保持 `typeHint: listening` 和 A/B/C 选项。
- 阅读 A 若图片/图表文本未被 PDF 抽取，必须创建 `阅读材料 A（图片/图表题，需人工补图）` 占位材料并关联 21—23，同时产生 `MATERIAL_IMAGE_NOT_EXTRACTED` warning。
- 七选五材料必须包含 32—35 上下文段落和 A-E 候选项，完形材料不得包含七选五内容。
- 完形材料必须尽量合并后续短文片段，第 40 题应保留 sleeping / crying / running 等 A/B/C 选项。
- 答案区仅回填答案，不能产生逐题 `DUPLICATE_QUESTION_NUMBER` warning；如需提示，应使用汇总型 `ANSWER_SECTION_SKIPPED_FOR_QUESTION_CREATION`。

## 15. 字段污染与题型识别回归

湖南中考 PDF 解析 smoke 还必须防止字段污染：

- 21—23 必须共用阅读 A 图片/图表占位材料；第 23 题选项不得包含 `The Tan family`。
- 七选五 32—35 的 `metadata.typeHint` 必须是 `seven_choice`，题型不能保存为 `CLOZE`，题干应为短空号文本。
- 完形 36—45 必须保留 A/B/C 选项；第 36 题应能解析 `cup / bowl / spoon`。
- 语法填空 46—55 的 `metadata.typeHint` 必须是 `fill_blank`，题型不能保存为 `CLOZE`，题干不能塞入整篇材料。
- 综合技能材料不能包含 56—60 的题干；这些题干必须作为独立草稿题。
- 没有明确 `解析：/答案解析：/解题思路：/原因：` 标记时，`explanation` 应为空，section 说明不得进入 explanation。
- `answer` 和 `options` 不得包含 section heading 或下一篇材料开头。

## 13. 湖南中考 PDF 字段污染回归用例

本轮真实 PDF 导入 smoke 需同时验证“61 题完整性”和字段质量，不能只按题目数量验收：

- 题目必须按 1—61 升序写入和展示，不得把作文要求中的“80 个左右”识别为第 80 题。
- 1—20 为 `listening` 选择题，三选项完整且不绑定阅读材料。
- 21—23 归入 `reading_image-1` 占位材料，提示图片/图表需人工补充；第 23 题选项不得包含 `The Tan family` 等下一篇材料正文。
- 32—35 为 `seven_choice` 共享候选项题组，四道题可显示为“第32空”等短题干；A-E 候选项属于题组材料或共享选项，不得复用到完形填空。
- 36—45 为 `cloze`，每题独立解析 A/B/C 三个选项，例如第 36 题为 `cup / bowl / spoon`，第 40 题为 `sleeping / crying / running`。
- 46—55 为 `fill_blank`，当前 schema 无 `FILL_BLANK` 枚举时使用兼容题型保存，但 `metadata.typeHint` 必须为 `fill_blank`，不得映射为 `TRANSLATION` 或 `CLOZE`，且不得显示选择题选项。
- 56—59 为综合技能回答问题，60 为翻译，61 为写作；这些非选择题不得显示“选择题填 0/1/2/3”提示。
- 没有明确“解析：/答案解析：/解题思路：/原因：”时，`explanation` 应为空；section 说明、题型说明不得进入 `questionText`、`options`、`answer` 或 `explanation`。

## 16. 多学段代表性样例回归测试集

后续 smoke / regression test 应逐步纳入以下代表性样例。样例中的具体题干、答案、选项只能写在测试 fixture 或断言中，不能写入 parser 主逻辑。

### 16.1 湖南中考英语 PDF

验证目标：听力选择、阅读图片/图表题、阅读选择、五选四、完形填空、语法填空、回答问题、翻译、写作、跨页清洗。

必须覆盖：

- 题目总数 61，不生成作文词数要求导致的第 80 题。
- 五选四识别为共享候选项题组，候选项数量为 5，不包含正文句子或完形内容。
- 完形 36—45 为逐题独立 A/B/C 选项，不复用五选四候选项。
- 46—55 为 `fill_blank`，不是 `translation` 或 `cloze`。
- 答案区只回填 answer，不生成新题，不产生大量 duplicate warning。

### 16.2 2025 年 6 月大学英语四级真题第 1 套 PDF

验证目标：Writing、Listening Section A/B/C、Reading Section A 选词填空、Reading Section B 长篇匹配、Reading Section C 仔细阅读、Translation。

必须覆盖：

- Writing 独立为 `writing`，题干完整，options 为空。
- Reading Section A 为 `word_bank`，共享词库不等同于普通 fill_blank。
- Reading Section B 为 `matching`，段落匹配答案不按普通 choice 处理。
- Translation 独立为 `translation`，不吞并 Reading 题组。

### 16.3 高考英语全国卷 PDF

验证目标：听力选择、阅读 A-D、七选五、语言运用、写作、页眉水印清洗、跨页材料合并。

必须覆盖：

- 阅读 A-D 各自形成独立 material，关联连续题号。
- 七选五为 `seven_choose_five`，共享 A-G 候选项，候选项达到 7 个后停止。
- 写作题中的“80/100 词左右”不生成额外题号。
- 页眉、水印、分页符不得进入材料、选项、答案或解析。

### 16.4 小升初英语 PDF

验证目标：听音选单词、听音选图片、听音判断、问句选答句、抄写句子、找不同类、方框选词、单选、看图选词、阅读任务。

必须覆盖：

- 听音选图片 / 看图选词在 PDF rawText 缺图时创建图片占位 material 并生成 `MATERIAL_IMAGE_NOT_EXTRACTED`。
- 抄写句子为 `copy_sentence`，不显示 choice options。
- 找不同类为 `odd_one_out`，可兼容 `CHOICE`，但保留真实 typeHint。
- 方框选词为 `word_box_fill`，共享词库不误识别为完形。

## 17. Full-paper 切片顺序和字段清洗回归

新增整卷 PDF 回归时，必须覆盖以下失败点：

- 五选四 / 七选五材料不得包含上一篇阅读最后一题题干、选项、页眉或 OCR 残片。
- 完形材料不得包含五选四 / 七选五空号正文，跨页重复段落应去重。
- 听力和阅读选项不得包含 `英语试题`、页码、分页符或下一篇材料开头。
- 完形 36—45 每题只出现一次，逐题独立提取 A/B/C 或 A/B/C/D 选项，不能漏 A 选项。
- 语法填空 / 短文填空必须保留 `typeHint/displayType = fill_blank`，绑定 fill_blank material，不得绑定 cloze material。
- 回答问题 56—59 必须显示为 reading_answer / subjective，只有明确翻译题才显示 translation。
- 所有 answer 必须在 section heading 前截断，例如 `shows第四部分...` 应清洗为 `shows`。
