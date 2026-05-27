<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAttemptDetail } from '../api/examApi'

const route = useRoute()

const detail = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const typeNameMap = {
  CHOICE: '单选题',
  TRANSLATION: '翻译题',
  ERROR_CORRECTION: '改错题',
  WRITING: '写作题',
  READING: '阅读理解',
  CLOZE: '完形填空',
}

const totalQuestionCount = computed(() => {
  return detail.value?.answers?.length || 0
})

const correctCount = computed(() => {
  return detail.value?.answers?.filter((item) => item.isCorrect).length || 0
})

const wrongCount = computed(() => {
  return detail.value?.answers?.filter((item) => item.isCorrect === false).length || 0
})

const fullScore = computed(() => {
  const answers = detail.value?.answers || []

  const realTotalScore = answers.reduce((sum, item) => {
    return sum + Number(item.score || 0)
  }, 0)

  return realTotalScore || Number(detail.value?.exam?.totalScore || 0)
})

const actualScore = computed(() => {
  return Number(detail.value?.attempt?.totalScore || 0)
})

const scoreRate = computed(() => {
  if (!fullScore.value) {
    return 0
  }

  return Math.round((actualScore.value / fullScore.value) * 100)
})


const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return '暂无'
  }

  return new Date(dateValue).toLocaleString()
}

const formatUsedTime = (seconds) => {
  const totalSeconds = Number(seconds || 0)
  const minutes = Math.floor(totalSeconds / 60)
  const restSeconds = totalSeconds % 60

  return `${minutes} 分 ${restSeconds} 秒`
}

const formatScore = (score) => {
  if (score === null || score === undefined) {
    return 0
  }

  return Number(score)
}

const loadAttemptDetail = async () => {
  const attemptId = route.params.attemptId

  if (!attemptId) {
    errorMessage.value = '缺少考试记录 ID'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    detail.value = await getAttemptDetail(attemptId)
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '考试结果详情加载失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAttemptDetail()
})
</script>

<template>
  <div class="attempt-detail-page">
    <div class="page-header">
      <p class="tag">Result Detail</p>
      <h1>考试结果详情</h1>
      <p class="desc">
        查看本次考试每一道题的作答情况、正确答案、得分、解析和知识点。
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
      正在加载考试结果详情……
    </div>

    <div v-else-if="errorMessage" class="api-warning">
      {{ errorMessage }}
    </div>

    <section v-else-if="detail" class="attempt-detail-section">
      <div class="attempt-summary-card">
        <h2>{{ detail.exam?.title || '未知试卷' }}</h2>

        <div class="attempt-summary-grid">
          <div>
            <span>本次得分</span>
            <strong>{{ actualScore }} / {{ fullScore }}</strong>
          </div>

          <div>
            <span>得分率</span>
            <strong>{{ scoreRate }}%</strong>
          </div>

          <div>
            <span>正确率</span>
            <strong>{{ detail.attempt.accuracyRate }}%</strong>
          </div>

          <div>
            <span>客观题得分</span>
            <strong>{{ formatScore(detail.attempt.objectiveScore) }}</strong>
          </div>

          <div>
            <span>主观题得分</span>
            <strong>{{ formatScore(detail.attempt.subjectiveScore) }}</strong>
          </div>

          <div>
            <span>题目数量</span>
            <strong>{{ totalQuestionCount }}</strong>
          </div>

          <div>
            <span>正确题数</span>
            <strong>{{ correctCount }}</strong>
          </div>

          <div>
            <span>错误题数</span>
            <strong>{{ wrongCount }}</strong>
          </div>

          <div>
            <span>用时</span>
            <strong>{{ formatUsedTime(detail.attempt.usedTime) }}</strong>
          </div>
        </div>

        <p class="attempt-submit-time">
          提交时间：{{ formatDateTime(detail.attempt.submittedAt) }}
        </p>
      </div>

      <div class="attempt-answer-list">
        <div
          v-for="item in detail.answers"
          :key="item.answerId"
          class="attempt-answer-card"
          :class="{
            correct: item.isCorrect === true,
            wrong: item.isCorrect === false,
          }"
        >
          <div class="attempt-answer-header">
            <span>第 {{ item.orderIndex }} 题</span>
            <span>{{ typeNameMap[item.type] || item.type }}</span>
            <span>{{ formatScore(item.userScore) }} / {{ formatScore(item.score) }} 分</span>
            <span v-if="item.isCorrect === true">正确</span>
            <span v-else-if="item.isCorrect === false">错误</span>
            <span v-else>待评分</span>
          </div>

          <h3>{{ item.text }}</h3>

          <ul v-if="item.options && item.options.length > 0">
            <li
              v-for="(option, index) in item.options"
              :key="option"
            >
              {{ String.fromCharCode(65 + index) }}. {{ option }}
            </li>
          </ul>

          <div class="attempt-answer-info">
            <p>
              <strong>你的答案：</strong>
              {{ item.userAnswerDisplay || item.answerText || '未作答' }}
            </p>

            <p>
              <strong>正确答案：</strong>
              {{ item.correctAnswerDisplay || item.referenceAnswer || '暂无' }}
            </p>

            <p>
              <strong>知识点：</strong>
              {{ item.knowledgePoint || '未分类' }}
            </p>

            <p v-if="item.referenceAnswer">
              <strong>参考答案：</strong>
              {{ item.referenceAnswer }}
            </p>

            <p v-if="item.explanation">
              <strong>解析：</strong>
              {{ item.explanation }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <p v-else class="empty-text">
      暂无考试结果详情。
    </p>
  </div>
</template>