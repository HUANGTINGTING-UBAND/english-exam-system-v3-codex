# Import File Format Specification

This document defines the import format and parsing boundaries.

The import workflow must be practical and testable. It must not simply claim to support TXT, DOCX, and PDF without reliable parsing rules and warning behavior.

## Supported Input Types

## 1. TXT

TXT files should be read as UTF-8 plain text.

Rules:

1. Preserve line breaks.
2. Do not collapse the entire file into one line.
3. Normalize Windows, macOS, and Linux line endings.
4. Preserve Chinese punctuation when meaningful.
5. Support strict Chinese field format.
6. Support multiline stems, explanations, and materials.

## 2. DOCX

DOCX files should be converted to raw text.

Rules:

1. Use raw text extraction.
2. Preserve paragraph breaks where possible.
3. Do not rely on visual styling.
4. After raw text extraction, pass the text to the same parser used for TXT.
5. If extracted text is empty, generate a warning.

## 3. PDF

Only text-based PDF is supported in the basic version.

Rules:

1. Extract text from PDF.
2. If extracted text is empty or too short, return a warning.
3. Do not pretend to parse scanned image PDF.
4. Scanned PDF requires OCR, which is outside the basic parser scope.
5. User-facing warning should say: Please upload a text-based PDF, DOCX, or TXT file.

## Strict Chinese Question Format

The parser must support this format:

```text
【题目开始】
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
【题目结束】
```

Each field may span multiple lines until the next known field appears.

## Field Meanings

## 题型标题

A human-readable section title.

Example:

```text
题型标题：听力选择题-短篇新闻
```

## 题号

Internal order number.

Example:

```text
题号：2
```

## 原试卷题号

Original exam question number.

Example:

```text
原试卷题号：1
```

## 题型

Machine-readable type.

Examples:

```text
WRITING
CHOICE
LISTENING_CHOICE
CLOZE
BANKED_CLOZE
MATCHING
READING_CHOICE
TRANSLATION
```

## 题干

Question stem or prompt.

May span multiple lines.

Examples:

```text
题干：1. Where was the cat found?
```

```text
题干：
Directions: For this part, you are allowed 30 minutes to write an essay.
```

## 选项

Options may be A-D or A-O.

Example A-D:

```text
选项：
A. At the gate of a grade school in Kent.
B. Under the engine cover of a man's car.
C. Inside the car of David King's neighbour.
D. Outside the office of a charity foundation.
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

Writing and translation questions may have no options.

## 答案

Answer may be a single option label:

```text
答案：B
```

Answer may be an A-O label:

```text
答案：M
```

For subjective questions, answer may be a reference answer.

Example:

```text
答案：参考译文：近年来，中国越来越重视环境保护。
```

## 解析

Explanation. May span multiple lines.

Example:

```text
解析：解析依据：原文提到 the cat was found under the engine cover, 因此答案为 B。
```

## 知识点

Knowledge point or skill tag.

Example:

```text
知识点：Listening - News Report / 听力短篇新闻
```

## 分值

Score value.

Examples:

```text
分值：7.1
分值：3.55
分值：106.5
```

The parser should support decimal score values.

## Normalization Rules

Before parsing, normalize:

1. Windows / macOS / Linux line endings.
2. Full-width and half-width colons.
3. Extra blank lines.
4. Full-width option letters when possible.
5. Field labels with or without spaces.
6. Option labels such as `A.`, `A、`, `A．`, `A:`.

Do not remove meaningful line breaks before block parsing.

## Warning Rules

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
10. Shared material cannot be linked.

## Never Do This

The parser must not:

1. Silently return zero questions when markers exist.
2. Treat all questions as A-D choice.
3. Drop E-O options.
4. Force writing or translation into choice format.
5. Claim scanned PDF support without OCR.
6. Ignore missing answers without warning.
7. Destroy line breaks before parsing.
8. Hard-code only one CET-4 question type.
9. Save malformed options without warning.
10. Confirm import into formal exam when serious parsing errors exist.

## Minimal Strict Format Example

```text
【题目开始】
题型标题：听力选择题-短篇新闻
题号：2
原试卷题号：1
题型：CHOICE
题干：1. Where was the cat found?
选项：
A. At the gate of a grade school in Kent.
B. Under the engine cover of a man's car.
C. Inside the car of David King's neighbour.
D. Outside the office of a charity foundation.
答案：B
解析：解析依据：原文提到 the cat was found under the engine cover, 因此答案为 B。
知识点：Listening - News Report / 听力短篇新闻
分值：7.1
【题目结束】
```

## Minimal A-O Cloze Example

```text
【题目开始】
题型标题：选词填空
题号：20
原试卷题号：26
题型：BANKED_CLOZE
题干：Choose the best word from A to O to fill in the blank.
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
答案：M
解析：根据上下文，此处需要动词 reduce。
知识点：Banked Cloze / 选词填空
分值：3.55
【题目结束】
```

## Minimal Writing Example

```text
【题目开始】
题型标题：写作
题号：1
原试卷题号：Writing
题型：WRITING
题干：Directions: For this part, you are allowed 30 minutes to write an essay on the importance of developing healthy habits.
选项：
答案：
解析：主观题，需要人工评分。
知识点：Writing / Essay
分值：106.5
【题目结束】
```

## Minimal Translation Example

```text
【题目开始】
题型标题：翻译
题号：50
原试卷题号：Translation
题型：TRANSLATION
题干：请将下面这段中文翻译成英文：近年来，中国越来越重视环境保护。
选项：
答案：参考译文：In recent years, China has attached increasing importance to environmental protection.
解析：主观题，需要人工评分。
知识点：Translation / 中译英
分值：106.5
【题目结束】
```
