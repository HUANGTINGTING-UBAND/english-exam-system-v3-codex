# Import File Format Specification

This document defines import formats and parsing boundaries for English exam materials across multiple school stages.

The platform must support primary school, Xiaoshengchu, junior high school, senior high school, and CET-4 style English exams.

The import workflow must be practical and testable. It must not simply claim to support TXT, DOCX, and PDF without reliable parsing rules and warning behavior.

## 1. Supported Input Types

## TXT

TXT files should be read as UTF-8 plain text.

Rules:

1. Preserve line breaks.
2. Do not collapse the entire file into one line.
3. Normalize Windows, macOS, and Linux line endings.
4. Preserve Chinese punctuation when meaningful.
5. Support strict Chinese field format.
6. Support multiline stems, explanations, and materials.
7. Support answer-only files.
8. Support listening transcript files.

## DOCX

DOCX files should be converted to raw text.

Rules:

1. Use raw text extraction.
2. Preserve paragraph breaks where possible.
3. Do not rely on visual styling.
4. After raw text extraction, pass the text to the same parser used for TXT.
5. If extracted text is empty, generate a warning.
6. If images are important but not extracted, generate an image-related warning.

## PDF

Only text-based PDF is supported in the basic version.

Rules:

1. Extract text from PDF.
2. If extracted text is empty or too short, return a warning.
3. Do not pretend to parse scanned image PDF.
4. Scanned PDF requires OCR, which is outside the basic parser scope.
5. User-facing warning should say: Please upload a text-based PDF, DOCX, or TXT file.
6. Picture-based questions may require manual review.
7. If the PDF contains answer explanation pages, parser should try to separate exam questions from answers.

## Images Inside PDF

Some primary and junior high exams contain picture-based questions.

Rules:

1. If images are needed to answer a question, preserve the question text.
2. Add warning `IMAGE_REQUIRED_FOR_FULL_PARSING`.
3. Do not invent image descriptions.
4. Do not silently drop picture-based questions.
5. If OCR or image extraction is unavailable, mark the question for manual review.

## 2. Supported Document Roles

A file may be one of the following:

* `EXAM_PAPER`
* `ANSWER_KEY`
* `ANSWER_EXPLANATION`
* `LISTENING_TRANSCRIPT`
* `MIXED_EXAM_AND_ANSWER`
* `TEACHER_WORKSHEET`
* `UNKNOWN`

Parser should try to detect the role.

Examples:

1. A paper containing questions only should be treated as `EXAM_PAPER`.
2. A file containing only answers should be treated as `ANSWER_KEY`.
3. A file containing detailed analysis should be treated as `ANSWER_EXPLANATION`.
4. A file containing Text 1, Text 2, Text 3 listening scripts should be treated as `LISTENING_TRANSCRIPT`.
5. A PDF containing questions and answers together should be treated as `MIXED_EXAM_AND_ANSWER`.

## 3. Strict Chinese Question Format

The parser must support this format:

```text
【题目开始】
学段：
考试类型：
题型标题：
题号：
原试卷题号：
题型：
题干：
选项：
答案：
解析：
知识点：
分值：
材料标题：
材料内容：
【题目结束】
```

The following fields are optional:

* `学段`
* `考试类型`
* `原试卷题号`
* `解析`
* `知识点`
* `材料标题`
* `材料内容`

The following fields are strongly recommended:

* `题号`
* `题型`
* `题干`
* `分值`

For objective questions, `答案` is required.

Each field may span multiple lines until the next known field appears.

## 4. Stage Values

Supported stage values:

```text
PRIMARY
XIAOSHENGCHU
JUNIOR_HIGH
SENIOR_HIGH
CET4
CUSTOM
```

Chinese aliases should be normalized:

```text
小学 -> PRIMARY
小升初 -> XIAOSHENGCHU
初中 -> JUNIOR_HIGH
中考 -> JUNIOR_HIGH
高中 -> SENIOR_HIGH
高考 -> SENIOR_HIGH
四级 -> CET4
大学英语四级 -> CET4
```

## 5. Question Type Values

Recommended question type values:

```text
LISTENING_WORD_CHOICE
LISTENING_PICTURE_CHOICE
LISTENING_TRUE_FALSE
LISTENING_RESPONSE_CHOICE
LISTENING_CHOICE
COPY_SENTENCE
ODD_ONE_OUT
WORD_BANK
CHOICE
PICTURE_WORD_CHOICE
READING_TRUE_FALSE
READING_SHORT_ANSWER
SHORT_WRITING
READING_CHOICE
READING_RESTORE
CLOZE
BANKED_CLOZE
MATCHING
SEVEN_FIVE_READING
GRAMMAR_FILL
TRANSLATION
WRITING
APPLICATION_WRITING
CONTINUATION_WRITING
LISTENING_TRANSCRIPT
```

The parser may map unknown types to:

```text
UNKNOWN
```

but should generate a warning.

## 6. Field Meanings

## 学段

Stage of the exam.

Examples:

```text
学段：小升初
学段：中考
学段：高考
学段：四级
```

## 考试类型

Human-readable exam type.

Examples:

```text
考试类型：2025年长沙市芙蓉区小升初英语试卷
考试类型：2025年湖南省初中学业水平考试英语
考试类型：2025年普通高等学校招生全国统一考试英语
考试类型：大学英语四级考试
```

## 题型标题

Human-readable section title.

Examples:

```text
题型标题：听音选择单词
题型标题：阅读理解
题型标题：完形填空
题型标题：Part I Writing
题型标题：Section A Banked Cloze
```

## 题号

Internal order number.

Example:

```text
题号：2
```

## 原试卷题号

Original question number in the source paper.

Example:

```text
原试卷题号：1
```

## 题型

Machine-readable type.

Example:

```text
题型：CHOICE
```

## 题干

Question stem or prompt.

May span multiple lines.

Examples:

```text
题干：What is Bill’s favorite subject?
```

```text
题干：正确抄写句子，注意大小写及标点符号。
There was a big lake and there were lots of ducks.
```

```text
题干：Directions: Suppose your university is seeking students' opinions on the necessity of making College Chinese a compulsory course.
```

## 选项

Options may be A-B, A-C, A-D, A-E, A-G, or A-O.

Example A-C:

```text
选项：
A. Music.
B. History.
C. English.
```

Example A-D:

```text
选项：
A. At the gate.
B. In a car.
C. In a classroom.
D. In an office.
```

Example A-G:

```text
选项：
A. Be friendly to others.
B. Here's how to get started.
C. They help you meet more people.
D. Work hard and make yourself better.
E. Think about things you enjoy at school.
F. ...
G. ...
```

Example A-O:

```text
选项：
A. access
B. benefit
C. challenge
D. decline
E. essential
F. expand
G. feature
H. generate
I. identify
J. maintain
K. observe
L. previous
M. reduce
N. strategy
O. transfer
```

Do not stop parsing options after D.

Subjective questions may have no options.

## 答案

Answer may be:

```text
答案：B
答案：T
答案：F
答案：√
答案：×
答案：M
答案：In March 2019.
```

For subjective questions, answer may be a reference answer.

Example:

```text
答案：参考译文：In recent years, China has attached increasing importance to environmental protection.
```

If a subjective question has no reference answer, it may be blank but should be marked as manual grading.

## 解析

Explanation. May span multiple lines.

Example:

```text
解析：根据原文 I went to Beijing with my family 可知，题干说 with his friends 错误。
```

## 知识点

Knowledge point or skill tag.

Examples:

```text
知识点：Listening / 听力理解
知识点：Vocabulary Classification / 词汇分类
知识点：Reading Detail / 阅读细节理解
知识点：Grammar Fill / 语法填空
知识点：Writing / 应用文写作
```

## 分值

Score value.

Examples:

```text
分值：1
分值：2
分值：3.55
分值：7.1
分值：15
分值：106.5
```

The parser should support integer and decimal score values.

## 材料标题

Title for shared material.

Examples:

```text
材料标题：阅读理解 Passage B
材料标题：听力 Text 7
材料标题：Part III Reading Section B
```

## 材料内容

Shared passage, listening transcript, word bank, or reading material.

May span multiple paragraphs.

## 7. Normalization Rules

Before parsing, normalize:

1. Windows / macOS / Linux line endings.
2. Full-width and half-width colons.
3. Extra blank lines.
4. Full-width option letters when possible.
5. Field labels with or without spaces.
6. Option labels such as `A.`, `A、`, `A．`, `A:`, `A)`.
7. True or false labels such as `T/F`, `True/False`, `√/×`.
8. Chinese and English section titles.
9. Question number formats such as `1.`, `1．`, `1、`, `（1）`, `(1)`.
10. Score expressions such as `每小题 1 分`, `满分 15 分`.

Do not remove meaningful line breaks before block parsing.

## 8. Parsing Boundaries by Source Type

## Exam Paper

For original exam papers:

1. Extract sections.
2. Extract materials.
3. Extract questions.
4. Extract options.
5. Do not invent answers if answers are not present.
6. If answers are not present, leave answer blank and generate warning for objective questions.

## Answer Key

For answer keys:

1. Extract question number and answer.
2. Do not treat answer key entries as questions.
3. Try to link answers to existing imported questions by original question number.
4. If no matching question exists, save as unresolved answer entry or warning.

## Answer Explanation

For answer explanations:

1. Extract answer.
2. Extract explanation.
3. Extract knowledge point if possible.
4. Do not duplicate original questions unless present.
5. Try to link explanation to existing questions.

## Listening Transcript

For listening transcripts:

1. Extract Text 1, Text 2, Text 3, etc.
2. Preserve speaker labels such as M, W, Man, Woman.
3. Preserve question number range such as Q8-Q10.
4. Save as material.
5. Do not treat each transcript sentence as a question.

## Mixed Exam and Answer

For mixed files:

1. Detect question sections.
2. Detect answer sections.
3. Separate questions from answers when possible.
4. If separation is uncertain, generate warning.
5. Do not confirm import automatically when serious ambiguity exists.

## 9. Warning Rules

The parser must generate warnings for:

1. No questions detected.
2. Strict markers detected but fields cannot be parsed.
3. Missing answer in objective questions.
4. Missing score.
5. Missing question type.
6. Empty extracted text from PDF.
7. Scanned PDF suspected.
8. Options detected but malformed.
9. A-O options truncated.
10. A-G options truncated.
11. A-C options incorrectly expanded to A-D.
12. Shared material cannot be linked.
13. Picture-based question requires image interpretation.
14. Listening transcript cannot be linked to question numbers.
15. Answer key cannot be linked to questions.
16. Answer explanation is mixed with original paper.
17. Subjective question incorrectly treated as objective.
18. Objective question has no options.
19. Question numbers are duplicated.
20. Stage cannot be detected.

## 10. Never Do This

The parser must not:

1. Silently return zero questions when markers exist.
2. Treat all questions as A-D choice.
3. Drop E-O options.
4. Drop F-G options in seven-option reading.
5. Force writing or translation into choice format.
6. Claim scanned PDF support without OCR.
7. Ignore missing answers without warning.
8. Destroy line breaks before parsing.
9. Hard-code only one exam stage.
10. Save malformed options without warning.
11. Confirm import into formal exam when serious parsing errors exist.
12. Treat answer explanations as original questions.
13. Treat listening transcripts as exam questions.
14. Invent image descriptions.
15. Invent answers that are not in the file.

## 11. Minimal Strict Format Examples

## Primary / Xiaoshengchu Listening Word Choice

```text
【题目开始】
学段：小升初
考试类型：2025年长沙市芙蓉区小升初英语试卷
题型标题：听音选择单词
题号：1
原试卷题号：（1）
题型：LISTENING_WORD_CHOICE
题干：听音选择单词。
选项：
A. wear
B. water
C. want
答案：
解析：
知识点：Listening / Word Recognition
分值：1
【题目结束】
```

## Primary / Xiaoshengchu Copy Sentence

```text
【题目开始】
学段：小升初
考试类型：2025年长沙市芙蓉区小升初英语试卷
题型标题：正确抄写句子
题号：5
原试卷题号：5
题型：COPY_SENTENCE
题干：正确抄写句子，注意大小写及标点符号。
There was a big lake and there were lots of ducks.
选项：
答案：
解析：主观题或人工评分题，重点检查大小写、标点和书写规范。
知识点：Copying / Capitalization / Punctuation
分值：5
【题目结束】
```

## Junior High Listening Choice

```text
【题目开始】
学段：中考
考试类型：2025年湖南省初中学业水平考试英语
题型标题：听力理解
题号：1
原试卷题号：1
题型：LISTENING_CHOICE
题干：What is Bill's favorite subject?
选项：
A. Music.
B. History.
C. English.
答案：B
解析：
知识点：Listening / Detail
分值：1
【题目结束】
```

## Junior High Grammar Fill

```text
【题目开始】
学段：中考
考试类型：2025年湖南省初中学业水平考试英语
题型标题：语法填空
题号：46
原试卷题号：46
题型：GRAMMAR_FILL
题干：_____ city was on the rich Liyang Plain.
选项：
答案：The
解析：句首特指前文提到的 city，应填 The。
知识点：Grammar / Article
分值：1
【题目结束】
```

## Senior High Listening Transcript Material

```text
【题目开始】
学段：高考
考试类型：2025年普通高等学校招生全国统一考试英语
题型标题：听力材料
题号：M1
原试卷题号：Text 1
题型：LISTENING_TRANSCRIPT
材料标题：Text 1 - Q1 行李丢失登记
材料内容：
M: Excuse me. I just arrived on the flight from Melbourne, and my suitcase is missing.
W: We're very sorry Sir. Could you put down your information in this form?
M: Okay.
选项：
答案：
解析：这是听力材料，不是题目。
知识点：Listening Transcript
分值：0
【题目结束】
```

## CET-4 Banked Cloze

```text
【题目开始】
学段：四级
考试类型：大学英语四级考试
题型标题：Part III Reading Comprehension Section A
题号：26
原试卷题号：26
题型：BANKED_CLOZE
题干：Select one word from the word bank to fill in blank 26.
选项：
A. accepted
B. audiences
C. building
D. complex
E. constitutes
F. deputies
G. previously
H. revolving
I. samples
J. selected
K. solemn
L. struggle
M. suddenly
N. understand
O. vary
答案：
解析：
知识点：Banked Cloze / Vocabulary in Context
分值：3.55
【题目结束】
```

## CET-4 Writing

```text
【题目开始】
学段：四级
考试类型：大学英语四级考试
题型标题：Part I Writing
题号：1
原试卷题号：Writing
题型：WRITING
题干：Directions: Suppose your university is seeking students' opinions on the necessity of making College Chinese a compulsory course. You are now to write an essay to express your view.
选项：
答案：
解析：主观题，需要人工评分。
知识点：Writing / Argumentative Essay
分值：106.5
【题目结束】
```

