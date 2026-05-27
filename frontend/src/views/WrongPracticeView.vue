<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getWrongQuestionPractice } from '../api/examApi'

const route = useRoute()

const detail = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const userChoice = ref(null)
const userTextAnswer = ref('')
const hasSubmitted = ref(false)
const isCorrect = ref(false)

const typeNameMap = {
  CHOICE: '单选题',
  TRANSLATION: '翻译题',
  ERROR_CORRECTION: '改错题',
  WRITING: '写作题',
  READING: '阅读理解',
  CLOZE: '完形填空',
}

const question = computed(() => {
  return detail.value?.question || null
})

const isChoiceQuestion = computed(() => {
  return question.value?.type === 'CHOICE'
})

const correctAnswerText = computed(() => {
  return question.value?.correctAnswerDisplay || question.value?.referenceAnswer || '暂无'
})

const loadPracticeDetail = async () => {
  const wrongQuestionId = route.params.wrongQuestionId

  if (!wrongQuestionId) {
    errorMessage.value = '缺少错题 ID'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    detail.value = await getWrongQuestionPractice(wrongQuestionId)
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '错题练习加载失败'
  } finally {
    isLoading.value = false
  }
}

const handleSubmitPractice = () => {
  if (!question.value) {
    return
  }

  hasSubmitted.value = true

  if (isChoiceQuestion.value) {
    isCorrect.value = Number(userChoice.value) === Number(question.value.answer)
    return
  }

  const userAnswer = String(userTextAnswer.value || '').trim().toLowerCase()
  const referenceAnswer = String(
    question.value.referenceAnswer || question.value.answer || ''
  ).trim().toLowerCase()

  isCorrect.value = Boolean(userAnswer && referenceAnswer && userAnswer === referenceAnswer)
}

const resetPractice = () => {
  userChoice.value = null
  userTextAnswer.value = ''
  hasSubmitted.value = false
  isCorrect.value = false
}

onMounted(() => {
  loadPracticeDetail()
})
</script>

<template>
  <div class="wrong-practice-page">
    <div class="page-header">
      <p class="tag">Wrong Question Practice</p>
      <h1>错题重练</h1>
      <p class="desc">
        重新练习错题，查看正确答案、解析和知识点。
      </p>
    </div>

    <div class="attempt-detail-actions">
      <RouterLink class="secondary-btn" to="/profile">
        返回个人中心
      </RouterLink>

      <RouterLink class="secondary-btn" to="/exams">
        返回试卷列表
      </RouterLink>
    </div>

    <div v-if="isLoading" class="loading-box">
      正在加载错题练习……
    </div>

    <div v-else-if="errorMessage" class="api-warning">
      {{ errorMessage }}
    </div>

    <section v-else-if="detail && question" class="wrong-practice-section">
      <div class="wrong-practice-card">
        <div class="wrong-practice-meta">
          <span>{{ typeNameMap[question.type] || question.type }}</span>
          <span>{{ question.score }} 分</span>
          <span>{{ question.knowledgePoint || '未分类' }}</span>
          <span>{{ detail.exam?.title || '未知试卷' }}</span>
        </div>

        <h2>{{ question.text }}</h2>

        <div v-if="isChoiceQuestion" class="wrong-choice-list">
          <label
            v-for="(option, index) in question.options || []"
            :key="option"
            class="wrong-choice-option"
            :class="{
              selected: Number(userChoice) === index,
            }"
          >
            <input
              v-model="userChoice"
              type="radio"
              name="wrong-practice-choice"
              :value="index"
              :disabled="hasSubmitted"
            />
            <span>{{ String.fromCharCode(65 + index) }}. {{ option }}</span>
          </label>
        </div>

        <div v-else class="wrong-text-answer">
          <label>
            你的答案
            <textarea
              v-model="userTextAnswer"
              rows="5"
              :disabled="hasSubmitted"
              placeholder="请输入你的答案"
            ></textarea>
          </label>
        </div>

        <div class="wrong-practice-actions">
          <button
            v-if="!hasSubmitted"
            class="primary-btn"
            @click="handleSubmitPractice"
          >
            提交练习
          </button>

          <button
            v-else
            class="secondary-btn"
            @click="resetPractice"
          >
            再练一次
          </button>
        </div>
      </div>

      <div v-if="hasSubmitted" class="wrong-practice-result-card">
        <h2>
          {{ isCorrect ? '回答正确' : '需要复习' }}
        </h2>

        <p v-if="isChoiceQuestion">
          <strong>你的答案：</strong>
          <span v-if="userChoice !== null">
            {{ String.fromCharCode(65 + Number(userChoice)) }}.
            {{ question.options?.[Number(userChoice)] }}
          </span>
          <span v-else>未作答</span>
        </p>

        <p v-else>
          <strong>你的答案：</strong>
          {{ userTextAnswer || '未作答' }}
        </p>

        <p>
          <strong>正确答案：</strong>
          {{ correctAnswerText }}
        </p>

        <p v-if="question.referenceAnswer">
          <strong>参考答案：</strong>
          {{ question.referenceAnswer }}
        </p>

        <p>
          <strong>知识点：</strong>
          {{ question.knowledgePoint || '未分类' }}
        </p>

        <p v-if="question.explanation">
          <strong>解析：</strong>
          {{ question.explanation }}
        </p>
      </div>
    </section>

    <p v-else class="empty-text">
      暂无错题练习内容。
    </p>
  </div>
</template>
