# CET-4 Exam Structure

This document defines the expected structure of College English Test Band 4 style exam materials.

The import parser must not assume that every question is a simple A-D multiple-choice question.

CET-4 exam materials may contain subjective questions, objective questions, shared passages, shared listening materials, A-D options, A-O word bank options, and translation prompts.

## 1. Writing

Suggested question type:

* `WRITING`

Characteristics:

* Usually subjective.
* Usually has no options.
* Has a writing prompt.
* Has a score value.
* May include Chinese or English instructions.
* Should not be forced into A-D choice format.

Expected fields:

* question title
* stem / prompt
* score
* knowledge point or task type if available

Parser requirement:

The parser must allow writing questions without options and without objective answers.

## 2. Listening

Suggested question types:

* `CHOICE`
* `LISTENING_CHOICE`

Characteristics:

* Usually objective.
* Usually uses A-D options.
* May have shared listening material.
* May include transcript.
* Multiple questions may share one audio transcript, news report, conversation, or passage.

Expected fields:

* material title if available
* transcript if available
* question stem
* A-D options
* answer
* explanation
* score
* knowledge point

Parser requirement:

The parser should support several listening questions sharing the same material.

## 3. Banked Cloze / Word Selection

Suggested question types:

* `CLOZE`
* `BANKED_CLOZE`

Characteristics:

* May have A-O options.
* One word bank may correspond to multiple blanks.
* Options are often vocabulary items.
* Parser must support option labels beyond D.

Expected option labels:

* A
* B
* C
* D
* E
* F
* G
* H
* I
* J
* K
* L
* M
* N
* O

Parser requirement:

The parser must not truncate options after D.

The parser must not assume that a cloze question has only four options.

## 4. Information Matching

Suggested question type:

* `MATCHING`

Characteristics:

* Usually has a long passage with paragraphs.
* Questions may require matching statements to paragraphs.
* Multiple questions share the same material.
* Options may be paragraph letters rather than standard choices.

Expected fields:

* passage material
* paragraph labels
* question statements
* answer
* explanation if available
* score

Parser requirement:

The parser should support shared material and paragraph labels.

## 5. Reading Comprehension

Suggested question type:

* `READING_CHOICE`

Characteristics:

* Usually has one passage shared by several questions.
* Usually uses A-D options.
* Requires support for shared material.
* Each question should be linked to the passage material if possible.

Expected fields:

* reading passage
* question stem
* A-D options
* answer
* explanation
* knowledge point
* score

Parser requirement:

The parser should not duplicate the same passage unnecessarily for every question if a shared material structure exists.

## 6. Translation

Suggested question type:

* `TRANSLATION`

Characteristics:

* Subjective.
* Usually has no options.
* May provide Chinese source text.
* Should not be parsed as a choice question.
* May require manual grading.

Expected fields:

* source text / prompt
* reference answer if available
* score
* knowledge point or task type

Parser requirement:

Translation questions must be allowed to have no options.

## General Parser Requirements

The parser must support:

1. Subjective questions without options.
2. A-D choice questions.
3. A-O banked cloze options.
4. Multiple questions sharing one material.
5. Questions with missing answers should generate warnings.
6. Text-based PDF only.
7. Scanned PDF should generate a warning instead of silently returning zero questions.
8. DOCX should be extracted as raw text before parsing.
9. TXT should preserve line breaks.
10. Field-based strict Chinese format should be supported.

## Common Question Type Mapping

| CET-4 Section         | Suggested questionType    | Has Options             | Option Range      | Shared Material | Grading          |
| --------------------- | ------------------------- | ----------------------- | ----------------- | --------------- | ---------------- |
| Writing               | WRITING                   | No                      | None              | Usually no      | Manual           |
| Listening             | LISTENING_CHOICE / CHOICE | Yes                     | A-D               | Often yes       | Auto             |
| Banked Cloze          | BANKED_CLOZE / CLOZE      | Yes                     | A-O               | Usually yes     | Auto             |
| Information Matching  | MATCHING                  | Yes or paragraph labels | Paragraph letters | Yes             | Auto / Semi-auto |
| Reading Comprehension | READING_CHOICE            | Yes                     | A-D               | Yes             | Auto             |
| Translation           | TRANSLATION               | No                      | None              | Usually no      | Manual           |

## Warnings That Should Be Generated

The parser should generate warnings when:

1. A question block is detected but no question type is found.
2. An objective question has no answer.
3. A choice question has no options.
4. A banked cloze question loses E-O options.
5. A subjective question is incorrectly forced into A-D format.
6. A shared passage cannot be linked.
7. A PDF produces empty text.
8. A scanned PDF is suspected.
9. A score is missing.
10. Strict field markers are present but cannot be parsed.
