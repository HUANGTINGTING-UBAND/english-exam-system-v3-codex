# English Exam Structure

This document defines the expected structure of English exam materials across multiple school stages.

The platform is not only for CET-4. It must support English exams from primary school, junior high school, senior high school, and college-level exams such as CET-4.

The import parser must not assume that every question is a simple A-D multiple-choice question.

Supported stages:

* `PRIMARY`
* `XIAOSHENGCHU`
* `JUNIOR_HIGH`
* `SENIOR_HIGH`
* `CET4`
* `CUSTOM`

Supported source types:

* exam paper
* answer sheet
* answer explanation
* listening transcript
* mixed paper with answers
* teacher-made worksheet

## 1. Primary School / Xiaoshengchu English Exams

Suggested stage values:

* `PRIMARY`
* `XIAOSHENGCHU`

Common sections:

1. Listening word selection
2. Listening picture selection
3. Listening true or false
4. Listening response selection
5. Correct sentence copying
6. Odd-one-out vocabulary classification
7. Word bank completion
8. Single-choice grammar or vocabulary questions
9. Picture-word matching
10. Reading true or false
11. Reading short-answer questions
12. Short writing

Common question types:

* `LISTENING_WORD_CHOICE`
* `LISTENING_PICTURE_CHOICE`
* `LISTENING_TRUE_FALSE`
* `LISTENING_RESPONSE_CHOICE`
* `COPY_SENTENCE`
* `ODD_ONE_OUT`
* `WORD_BANK`
* `CHOICE`
* `PICTURE_WORD_CHOICE`
* `READING_TRUE_FALSE`
* `READING_SHORT_ANSWER`
* `SHORT_WRITING`

Important parser requirements:

1. Some questions rely on images.
2. Some questions have A-C options, not A-D.
3. Some listening questions may require audio or teacher script.
4. Copying questions have no options and are not choice questions.
5. Picture-based questions may be impossible to fully parse from text-only PDF.
6. When image content is needed but not extractable, generate a warning.
7. Short writing should be treated as subjective.
8. Reading tasks may include mixed sub-questions such as true/false, short answer, and writing.

## 2. Junior High School / Zhongkao English Exams

Suggested stage value:

* `JUNIOR_HIGH`

Common sections:

1. Listening comprehension
2. Reading comprehension
3. Reading passage with option restoration
4. Cloze
5. Grammar filling
6. Integrated skills
7. Reading and answering questions
8. Sentence translation
9. Writing

Common question types:

* `LISTENING_CHOICE`
* `READING_CHOICE`
* `READING_RESTORE`
* `CLOZE`
* `GRAMMAR_FILL`
* `SHORT_ANSWER`
* `TRANSLATION`
* `WRITING`

Important parser requirements:

1. Listening questions may use A-C options.
2. Reading questions may use A-C options.
3. Reading restoration may use extra options, such as A-E with one extra option.
4. Cloze may be A-C or A-D depending on the paper.
5. Grammar filling may require one word or correct form of a word in brackets.
6. Integrated skills may mix short answer and translation.
7. Writing is subjective and should not be forced into choice format.
8. Some answer keys are embedded at the end of the same PDF.
9. Parser should separate exam paper content from answer key content when possible.

## 3. Senior High School / Gaokao English Exams

Suggested stage value:

* `SENIOR_HIGH`

Common sections:

1. Listening comprehension
2. Reading comprehension
3. Seven-option reading restoration
4. Cloze
5. Grammar filling
6. Application writing
7. Continuation writing
8. Listening transcript
9. Answer explanation

Common question types:

* `LISTENING_CHOICE`
* `READING_CHOICE`
* `SEVEN_FIVE_READING`
* `CLOZE`
* `GRAMMAR_FILL`
* `APPLICATION_WRITING`
* `CONTINUATION_WRITING`
* `LISTENING_TRANSCRIPT`

Important parser requirements:

1. Listening materials may be provided in a separate transcript file.
2. Listening questions usually use A-C or A-D options depending on source.
3. Reading comprehension usually has passages shared by several questions.
4. Seven-option reading uses options such as A-G.
5. Cloze normally contains multiple numbered blanks.
6. Grammar filling contains blanks with or without bracketed word prompts.
7. Application writing and continuation writing are subjective.
8. Answer explanation PDFs may contain answers, analysis, topic type, and listening transcript.
9. Parser must distinguish original questions from answer explanations.
10. If only listening transcript is uploaded, parser should save it as material rather than treating it as questions.

## 4. CET-4 English Exams

Suggested stage value:

* `CET4`

Common sections:

1. Writing
2. Listening comprehension
3. Banked cloze
4. Information matching
5. Reading comprehension
6. Translation

Common question types:

* `WRITING`
* `LISTENING_CHOICE`
* `BANKED_CLOZE`
* `MATCHING`
* `READING_CHOICE`
* `TRANSLATION`

Important parser requirements:

1. Writing has no options and is subjective.
2. Listening questions usually use A-D options.
3. Banked cloze uses A-O word bank options.
4. Information matching uses paragraph labels.
5. Reading comprehension uses passages shared by several questions.
6. Translation is subjective and has no options.
7. Parser must not truncate A-O options after D.
8. Parser must support shared materials.

## 5. Common Question Type Definitions

## Choice

Possible labels:

* A-C
* A-D
* A-E
* A-G
* A-O

Do not hard-code only A-D.

Question type examples:

* `CHOICE`
* `LISTENING_CHOICE`
* `READING_CHOICE`
* `PICTURE_WORD_CHOICE`

Expected fields:

* section title
* question number
* stem
* options
* answer
* explanation if available
* score
* knowledge point
* material id if shared material exists

## True or False

Question type examples:

* `TRUE_FALSE`
* `LISTENING_TRUE_FALSE`
* `READING_TRUE_FALSE`

Expected answer values:

* `T`
* `F`
* `True`
* `False`
* `√`
* `×`

The parser should normalize `√` and `×` when appropriate.

## Word Bank

Question type examples:

* `WORD_BANK`
* `BANKED_CLOZE`

Characteristics:

* May use a small word bank in primary exams.
* May use A-O options in CET-4 banked cloze.
* Multiple blanks may share one word bank.

Expected fields:

* word bank
* blank number
* answer
* score
* explanation if available

## Odd One Out

Question type:

* `ODD_ONE_OUT`

Characteristics:

* Common in primary or Xiaoshengchu exams.
* Usually tests vocabulary category or part of speech.
* Often uses A-C options.

Expected fields:

* stem or instruction
* options
* answer
* category explanation if available

## Copy Sentence

Question type:

* `COPY_SENTENCE`

Characteristics:

* Common in primary or Xiaoshengchu exams.
* No options.
* Usually tests handwriting, capitalization, and punctuation.
* May not be suitable for automatic grading.

Expected fields:

* sentence to copy
* score
* grading note

## Picture-Based Questions

Question type examples:

* `LISTENING_PICTURE_CHOICE`
* `PICTURE_WORD_CHOICE`

Characteristics:

* Question depends on an image.
* PDF text extraction may not capture the image content.
* Parser should keep image-dependent question text and generate warning if image content is needed.

Warning example:

* `IMAGE_REQUIRED_FOR_FULL_PARSING`

## Reading Shared Material

Question type examples:

* `READING_CHOICE`
* `READING_TRUE_FALSE`
* `READING_SHORT_ANSWER`
* `MATCHING`
* `SEVEN_FIVE_READING`

Rules:

1. A passage may be shared by several questions.
2. Parser should create one material block when possible.
3. Questions should link to the shared material.
4. Do not duplicate the same passage into every question unless no material model exists.

## Subjective Questions

Question type examples:

* `WRITING`
* `SHORT_WRITING`
* `APPLICATION_WRITING`
* `CONTINUATION_WRITING`
* `TRANSLATION`
* `SHORT_ANSWER`
* `COPY_SENTENCE`

Rules:

1. Subjective questions may have no options.
2. They may have reference answers.
3. They may require manual grading.
4. Do not force them into choice format.
5. If automatic grading is not supported, mark as `manual_or_subjective`.

## 6. Recommended Stage and Type Mapping

| Stage                  | Section | Suggested Type           | Options          | Grading               |
| ---------------------- | ------- | ------------------------ | ---------------- | --------------------- |
| PRIMARY / XIAOSHENGCHU | 听音选择单词  | LISTENING_WORD_CHOICE    | A-C              | Auto if answer exists |
| PRIMARY / XIAOSHENGCHU | 听音选择图片  | LISTENING_PICTURE_CHOICE | A-B / A-C        | Semi-auto             |
| PRIMARY / XIAOSHENGCHU | 听音判断正误  | LISTENING_TRUE_FALSE     | √ / ×            | Auto                  |
| PRIMARY / XIAOSHENGCHU | 正确抄写句子  | COPY_SENTENCE            | None             | Manual                |
| PRIMARY / XIAOSHENGCHU | 找出不同类单词 | ODD_ONE_OUT              | A-C              | Auto                  |
| PRIMARY / XIAOSHENGCHU | 方框选词    | WORD_BANK                | word bank        | Auto / Semi-auto      |
| PRIMARY / XIAOSHENGCHU | 单项选择    | CHOICE                   | A-C              | Auto                  |
| PRIMARY / XIAOSHENGCHU | 看图选择单词  | PICTURE_WORD_CHOICE      | A-C              | Semi-auto             |
| PRIMARY / XIAOSHENGCHU | 阅读判断    | READING_TRUE_FALSE       | T / F            | Auto                  |
| PRIMARY / XIAOSHENGCHU | 阅读回答    | READING_SHORT_ANSWER     | None             | Manual / Semi-auto    |
| PRIMARY / XIAOSHENGCHU | 小作文     | SHORT_WRITING            | None             | Manual                |
| JUNIOR_HIGH            | 听力理解    | LISTENING_CHOICE         | A-C              | Auto                  |
| JUNIOR_HIGH            | 阅读理解    | READING_CHOICE           | A-C              | Auto                  |
| JUNIOR_HIGH            | 阅读还原    | READING_RESTORE          | A-E              | Auto                  |
| JUNIOR_HIGH            | 完形填空    | CLOZE                    | A-C / A-D        | Auto                  |
| JUNIOR_HIGH            | 语法填空    | GRAMMAR_FILL             | None             | Semi-auto             |
| JUNIOR_HIGH            | 回答问题    | SHORT_ANSWER             | None             | Manual / Semi-auto    |
| JUNIOR_HIGH            | 翻译      | TRANSLATION              | None             | Manual                |
| JUNIOR_HIGH            | 写作      | WRITING                  | None             | Manual                |
| SENIOR_HIGH            | 听力      | LISTENING_CHOICE         | A-C / A-D        | Auto                  |
| SENIOR_HIGH            | 阅读理解    | READING_CHOICE           | A-D              | Auto                  |
| SENIOR_HIGH            | 七选五     | SEVEN_FIVE_READING       | A-G              | Auto                  |
| SENIOR_HIGH            | 完形填空    | CLOZE                    | A-D              | Auto                  |
| SENIOR_HIGH            | 语法填空    | GRAMMAR_FILL             | None             | Semi-auto             |
| SENIOR_HIGH            | 应用文写作   | APPLICATION_WRITING      | None             | Manual                |
| SENIOR_HIGH            | 读后续写    | CONTINUATION_WRITING     | None             | Manual                |
| CET4                   | 写作      | WRITING                  | None             | Manual                |
| CET4                   | 听力      | LISTENING_CHOICE         | A-D              | Auto                  |
| CET4                   | 选词填空    | BANKED_CLOZE             | A-O              | Auto                  |
| CET4                   | 长篇匹配    | MATCHING                 | paragraph labels | Auto                  |
| CET4                   | 仔细阅读    | READING_CHOICE           | A-D              | Auto                  |
| CET4                   | 翻译      | TRANSLATION              | None             | Manual                |

## 7. General Parser Warnings

The parser should generate warnings when:

1. No questions are detected.
2. A question block is detected but no question type is found.
3. An objective question has no answer.
4. A choice question has no options.
5. A-O options are truncated.
6. A subjective question is forced into choice format.
7. A shared passage cannot be linked.
8. A PDF produces empty text.
9. A scanned PDF is suspected.
10. A picture-based question cannot be fully parsed from text.
11. An answer explanation is mixed with original questions and cannot be separated.
12. A listening transcript is uploaded without matching question numbers.
