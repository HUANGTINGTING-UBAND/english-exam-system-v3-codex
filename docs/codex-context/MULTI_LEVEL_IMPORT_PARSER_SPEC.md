# 多学段英语试卷导入解析规范

## 1. 文档目的与边界

本文档沉淀 TXT / DOCX / 文字型 PDF 英语试卷导入的通用解析规范，用于指导后续 parser、smoke test、人工校对页和正式入库流程演进。

- **仓库已实现事实**：当前导入主链路已经支持创建 `ImportJob`，把解析结果保存为 `ImportDraftQuestion`、`ImportDraftMaterial`、`ImportWarning`，人工校对后再确认入库。
- **目标需求 / 规划建议**：本规范中的多学段题型注册表、Section / QuestionGroup 更细模型、听力音频和图片素材持久化仍有部分为 `NEEDS_VERIFICATION`，后续开发不得在未验证 schema / 接口前当作已实现功能描述。
- **禁止硬编码原则**：不得把某一套试卷的具体题干、答案、选项、材料正文硬编码进 parser 主逻辑。具体 PDF 只能作为 smoke test / regression fixture，用来防止通用规则退化。

## 2. 支持的试卷层级

| 层级 / 考试 | 当前归类建议 | 解析重点 |
| --- | --- | --- |
| 小升初英语 | `PRIMARY` 或 `JUNIOR`，独立枚举为 `NEEDS_VERIFICATION` | 听音、图片、抄写、找不同类、方框选词、阅读任务等低龄题型。 |
| 初中 / 中考英语 | `JUNIOR` | 听力选择、图片/图表阅读、阅读选择、五选四、完形、语法/短文填空、回答问题、翻译、写作。 |
| 高中 / 高考英语 | `SENIOR` | 听力选择、阅读 A-D、七选五、语言运用、应用文写作、读后续写等。 |
| 大学英语四级 | `CET4` | Writing、Listening Section A/B/C、Reading Section A/B/C、Translation。 |
| 六级 / 考研等扩展 | `CET6` / `POSTGRADUATE` | 结构与题型需按样例补 detector 与 regression test，当前为 `NEEDS_VERIFICATION`。 |

## 3. 通用解析流程

1. **文件文本提取**：TXT 直接读取；DOCX 提取 raw text；文字型 PDF 用 PDF text extractor；扫描版 / 图片型 PDF 进入 warning 与人工校对，OCR 为 `NEEDS_VERIFICATION`。
2. **统一清洗**：清洗页眉、页脚、页码、水印、分页符、分页横线、重复空白行。清洗结果必须作用于 material、questionText、options、answer、explanation。
3. **识别答案区边界**：遇到“参考答案 / 英语参考答案 / 答案与解析 / 解析 / 详解”等标题后，后续文本只用于 answer / explanation 回填，不再生成新题。
4. **识别 part / section / 题型说明**：说明文字只用于判断题型、题号范围、分值、材料边界，不得写入 questionText、options、answer、explanation。
5. **判断题型和题号范围**：综合 section 标题、题型说明、题号模式、选项模式、共享候选项、答案形式判断真实 `typeHint` / `displayType`。
6. **识别材料边界**：阅读、五选四/七选五、完形、语法填空、回答问题等题组应先识别材料，再关联连续题号。
7. **识别题号、题干、选项**：题号支持 `1.`、`1．`、`1、`、`1)`、`第 1 题` 等；选项支持 `A.`、`A．`、`A、`、`A)` 及同行多选项。
8. **回填答案**：支持 `1-5 ABCDA`、`1—5 ABCDA`、`1. A 2. B`、`1 A`、主观题按题号分段等格式；无法稳定匹配时生成 warning，不乱填。
9. **生成 warning**：所有不确定结构必须生成 warning 并保留可校对草稿；warning 不能替代题目本身。
10. **进入导入草稿**：解析结果必须先进入草稿，经过人工校对后才能确认入库。

## 4. 通用题型体系与兼容保存

当前 Prisma `QuestionType` 未覆盖全部细分题型，因此 parser 应保存两个层次：

- `type`：当前 schema 兼容枚举，如 `CHOICE`、`CLOZE`、`TRANSLATION`、`WRITING`、`READING`、`ERROR_CORRECTION`。
- `metadata.typeHint` / `displayType`：真实题型，供前端展示和后续迁移使用。

| typeHint / displayType | 中文名称 | 兼容 enum 建议 | 是否有材料 | 选项模式 |
| --- | --- | --- | --- | --- |
| `listening_choice` | 听力选择题 | `CHOICE` | 可无材料，音频材料为 `NEEDS_VERIFICATION` | 逐题独立选项 |
| `listening_word_choice` | 听音选单词 | `CHOICE` | 可无材料 | 逐题独立选项 |
| `listening_image_choice` | 听音选图片 | `CHOICE` | 图片/音频素材为 `NEEDS_VERIFICATION` | 逐题独立选项 |
| `listening_true_false` | 听音判断正误 | `CHOICE` | 可无材料 | T/F 或对错选项 |
| `reading_choice` | 阅读选择题 | `CHOICE` | 是 | 逐题独立选项 |
| `image_based_question` | 图片/图表题 | `CHOICE` 或 `READING` | 是 | 逐题独立选项 / 文本答案 |
| `five_choose_four` | 五选四 | `CHOICE` | 是 | 共享候选项 |
| `seven_choose_five` | 七选五 | `CHOICE` | 是 | 共享候选项 |
| `cloze` | 完形填空 | `CLOZE` | 是 | 逐题独立选项 |
| `word_bank` | 选词填空 | `ERROR_CORRECTION` 或 `READING` | 是 | 共享词库 |
| `fill_blank` / `grammar_fill` / `short_blank` | 语法填空 / 短文填空 | `ERROR_CORRECTION` 兼容 | 是 | 无选项 |
| `error_correction` | 短文改错 | `ERROR_CORRECTION` | 是 | 无选项 |
| `matching` | 长篇匹配 / 段落匹配 / 信息匹配 | `READING` 兼容 | 是 | 共享匹配项 |
| `reading_answer` / `short_answer` / `subjective` | 回答问题 / 任务型阅读 | `READING` 兼容，确认为翻译题时才使用 `TRANSLATION` | 是 | 无选项 |
| `copy_sentence` | 正确抄写句子 | `WRITING` 兼容 | 可无材料 | 无选项 |
| `odd_one_out` | 找出不同类单词 | `CHOICE` | 可无材料 | 逐题独立选项 |
| `word_box_fill` | 方框选词 | `ERROR_CORRECTION` 兼容 | 是 | 共享词库 |
| `picture_word_choice` | 看图选词 | `CHOICE` | 是 | 逐题独立选项 |
| `translation` | 翻译 | `TRANSLATION` | 可有关联材料 | 无选项 |
| `writing` | 写作 | `WRITING` | 通常独立 | 无选项 |

## 5. 不同学段典型结构

### 5.1 小升初英语

典型结构包括：听音选单词、听音选图片、听音判断、根据问句选答句、抄写句子、找不同类、方框选词、单项选择、看图选词、阅读任务。小升初 PDF 常包含图片、听力材料和低龄题型，图片/OCR 解析不足时必须生成 `MATERIAL_IMAGE_NOT_EXTRACTED` 或等价 warning，并保留草稿占位。

### 5.2 初中 / 中考英语

典型结构包括：听力选择、阅读图片/图表题、阅读选择、五选四、完形填空、语法填空/短文填空、回答问题、翻译、写作。中考试卷经常出现跨页材料和答案区，需要严格区分正式试题区与参考答案区。

### 5.3 高中 / 高考英语

典型结构包括：听力选择、阅读 A-D、七选五、语言运用、写作。写作可能包含应用文、读后续写等不同形式。高考 PDF 常有页眉水印和跨页材料，材料合并与页眉页脚清洗必须进入 regression test。

### 5.4 大学英语四级

典型结构包括：Writing、Listening Section A/B/C、Reading Section A 选词填空、Reading Section B 长篇匹配、Reading Section C 仔细阅读、Translation。四级 Reading Section B 是 matching，不是普通 reading_choice；Reading Section A 是 word_bank，不是 fill_blank。

## 6. 共享选项题组 vs 独立选项题组

### 6.1 共享候选项题组

五选四、七选五、选句还原、部分选词填空属于共享候选项题组。

- 五选四通常是 4 个空 + 5 个候选项。
- 七选五通常是 5 个空 + 7 个候选项。
- 候选项必须从明确的 A/B/C/D/E/F/G 标记中提取。
- 候选项达到预期数量后必须停止收集。
- 没有选项字母标记的正文句子不能当成候选项。
- 下一 section、下一篇材料、完形正文不能并入共享候选项。
- 每个空号题可显示为“第 X 空”。
- 共享选项可以保存在 material 中，也可以复制到每道题，但必须保持一致。

### 6.2 独立选项题组

完形填空不是共享选项题组。

- 每个空都有独立 A/B/C 或 A/B/C/D 选项。
- 选项可能与题号同行，也可能跨行集中出现。
- parser 必须逐题提取，不得复用同一组选项。
- 不能漏掉 A 选项，不能把上一题或下一题选项混入本题。
- 完形材料只保存短文正文，不应包含选项区或下一 section 说明。

## 7. 非选择题规则

- 语法填空 / 短文填空 / 用所给词适当形式填空是 `fill_blank` 类，不是 `translation`，也不是 `error_correction`。
- 回答问题是 `reading_answer` / `subjective` / `short_answer`，不是 `translation`。
- 只有明确“翻译画线句子”“将……翻译成中文/英文”的题才是 `translation`。
- 写作题中的“80 词左右”“100 词左右”等字数要求不是题号，不得生成第 80 / 100 题。
- 题型说明不能进入 explanation。
- 没有明确“解析：”“答案解析：”“解题思路：”“原因：”等解析标记时，explanation 应为空字符串或 null。

## 8. Parser 扩展机制建议

后续 parser 应演进为题型注册表 / rule registry / detector 结构，而不是在主函数中持续堆叠 if-else。每个 detector 至少声明：

1. `typeHint` / `displayType`；
2. 兼容保存 enum；
3. 触发关键词；
4. 题号模式；
5. 是否有材料；
6. 是否有选项；
7. 选项是共享还是逐题独立；
8. 答案格式；
9. 常见 warning；
10. 必须配套的 regression test。

当前代码已经开始提供轻量规则注册表作为过渡；后续新增六级、考研、小升初图片/听力等题型时，应新增 detector 和 regression fixture，而不是硬编码具体试卷文本。

## 9. Warning 规范

推荐 warning 方向：

- `RAW_TEXT_UNRECOGNIZED`：rawText 非空但所有 parser 和 fallback 都无法识别任何题目。
- `MATERIAL_GROUP_UNCERTAIN`：材料边界由规则推断，需要人工确认。
- `MATERIAL_IMAGE_NOT_EXTRACTED`：图片/图表材料在 PDF rawText 中缺失，需要人工补图。
- `SHARED_OPTIONS_UNCERTAIN`：五选四 / 七选五 / 选词填空共享候选项数量或边界不稳定。
- `CLOZE_OPTIONS_UNCERTAIN`：完形逐题选项缺失或边界不稳定。
- `ANSWER_MATCH_UNCERTAIN`：答案无法稳定匹配到题号。
- `EXPLANATION_MATCH_UNCERTAIN`：解析无法稳定匹配到题号。
- `ANSWER_SECTION_SKIPPED_FOR_QUESTION_CREATION`：答案区已跳过题目生成，仅用于回填答案。

## 10. Regression test 原则

代表性 PDF 可写入 smoke test / regression test：湖南中考、四级真题、高考全国卷、小升初试卷等。测试可以断言具体样例的关键结构，但 parser 主逻辑不得出现“如果文本包含某具体题干则……”的分支。
