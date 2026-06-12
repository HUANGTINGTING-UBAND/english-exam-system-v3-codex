# Import Test Cases

This document defines required import test cases.

Every time the import parser is changed, these cases must be considered.

The goal is to prevent the parser from only looking structurally complete while failing on real exam files.

## 1. Primary / Xiaoshengchu Exam Paper

Test file type:

* PDF
* TXT converted from PDF
* DOCX if available

Must support:

1. Listening word choice.
2. Listening picture choice.
3. Listening true or false.
4. Listening response choice.
5. Copy sentence.
6. Odd-one-out vocabulary classification.
7. Word bank completion.
8. Single choice.
9. Picture-word choice.
10. Reading true or false.
11. Reading short answer.
12. Short writing.

Expected behavior:

1. A-C options should be parsed correctly.
2. Picture-based questions should be preserved.
3. If image content is required, generate `IMAGE_REQUIRED_FOR_FULL_PARSING`.
4. Copy sentence questions should not be forced into choice format.
5. Short writing should be marked as subjective.

## 2. Primary / Xiaoshengchu Answer Explanation

Must support:

1. Answer key extraction.
2. Explanation extraction.
3. Linking answer to original question number.
4. Filtering copyright notice, user information, email, account ID, and platform statements.
5. Not treating explanation labels such as `【分析】`, `【解答】`, `【点评】` as question stems.

Expected warnings:

```text
COPYRIGHT_NOTICE_DETECTED
ANSWER_EXPLANATION_FILE_DETECTED
```

## 3. Junior High / Zhongkao Exam Paper

Must support:

1. Listening choice with A-C options.
2. Reading choice with A-C options.
3. Reading restoration with A-E options and one extra option.
4. Cloze with A-C options.
5. Grammar fill with bracketed prompts.
6. Short answer.
7. Sentence translation.
8. Writing.

Expected behavior:

1. A-C options should not be expanded to A-D.
2. Grammar fill should not be treated as choice.
3. Writing should be marked as subjective.
4. Answer key at the end of the same PDF should be detected and separated.

## 4. Senior High / Gaokao Listening Transcript

Must support:

1. Text 1, Text 2, Text 3 style listening scripts.
2. Question ranges such as `Q6&7`, `Q8~10`, `Q18~20`.
3. Speaker labels such as M and W.
4. Time stamps if present.
5. Saving the transcript as material, not as questions.

Expected behavior:

1. Do not treat every transcript sentence as a question.
2. Do not treat speaker labels as options.
3. Link transcript to question ranges when possible.
4. Filter repeated watermark and header/footer text.

Expected warnings:

```text
LISTENING_TRANSCRIPT_FILE_DETECTED
WATERMARK_DETECTED
REPEATED_HEADER_FOOTER_DETECTED
```

## 5. Senior High / Gaokao Answer Explanation

Must support:

1. Answer list extraction.
2. Reading passage explanation.
3. Cloze explanation.
4. Grammar fill explanation.
5. Writing sample.
6. Continuation writing sample.
7. Listening transcript at the end if included.

Expected behavior:

1. Do not treat answer explanation as original exam questions.
2. Do not treat watermark text as content.
3. Do not treat page headers as section titles.
4. Preserve useful answer and explanation content.
5. Mark the file role as `ANSWER_EXPLANATION`.

Expected warnings:

```text
ANSWER_EXPLANATION_FILE_DETECTED
WATERMARK_DETECTED
COPYRIGHT_NOTICE_DETECTED
```

## 6. CET-4 Exam Paper

Must support:

1. Writing.
2. Listening choice.
3. Banked cloze with A-O options.
4. Information matching with paragraph labels.
5. Reading comprehension.
6. Translation.

Expected behavior:

1. Writing has no options.
2. Listening uses A-D options.
3. Banked cloze must preserve A-O options.
4. Matching questions must preserve paragraph labels.
5. Translation should be subjective.
6. Do not truncate options after D.

## 7. Watermark and Noise Test

The parser must be tested against files containing repeated watermark or header/footer text.

Noise examples:

```text
锦宏教育微信公众号：jh985211
锦宏教育客服微信：18117901643
英语试题 第 1 页（共 10 页）
2025 年新课标Ⅰ卷·英语听力材料·第1页
声明：试题解析著作权...
发布日期：
用户：
邮箱：
学号：
```

Expected behavior:

1. These lines should be ignored during question parsing.
2. They should not become question stems.
3. They should not become answer options.
4. They should not become answer explanations.
5. They should not become materials unless the user explicitly wants source metadata.
6. The original file should remain unchanged.
7. A warning should be generated when watermark or repeated noise is detected.

Expected warning codes:

```text
WATERMARK_DETECTED
REPEATED_HEADER_FOOTER_DETECTED
COPYRIGHT_NOTICE_DETECTED
QR_CODE_OR_PUBLIC_ACCOUNT_TEXT_DETECTED
NOISE_FILTERING_REVIEW_REQUIRED
```

## 8. Scanned PDF Test

If a PDF has little or no extractable text:

Expected behavior:

1. Do not return zero questions silently.
2. Return a clear warning.
3. Tell the user to upload a text-based PDF, DOCX, or TXT.
4. Do not claim OCR support if OCR is not implemented.

Expected warning code:

```text
SCANNED_PDF_OR_EMPTY_TEXT_DETECTED
```

## 9. Minimal Acceptance Criteria

An import parser change is acceptable only if:

1. It does not break TXT parsing.
2. It does not break DOCX raw text parsing.
3. It handles text-based PDF.
4. It gives warning for scanned PDF.
5. It supports A-C options.
6. It supports A-D options.
7. It supports A-G options.
8. It supports A-O options.
9. It supports subjective questions without options.
10. It filters repeated watermark/header/footer noise.
11. It preserves shared materials.
12. It separates answer keys from original questions when possible.
13. It does not silently return zero questions when content exists.
14. It reports warnings for uncertain parsing.
15. It does not modify the original uploaded file.

## 10. Required Parser Report

After parsing a file, the system should report:

1. Detected document role.
2. Detected stage.
3. Number of materials.
4. Number of questions.
5. Number of objective questions.
6. Number of subjective questions.
7. Number of warnings.
8. Whether watermark or repeated noise was detected.
9. Whether image-based questions were detected.
10. Whether answers were detected.
11. Whether manual review is required.
