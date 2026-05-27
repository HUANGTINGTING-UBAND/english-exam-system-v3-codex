<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser, logoutUser } from '../api/authApi'
import {
  getAttemptHistory,
  getWrongQuestions,
  markWrongQuestionMastered,
} from '../api/examApi'

const currentUser = ref(getSavedUser())
const attemptHistory = ref([])
const wrongQuestions = ref([])
const isLoadingHistory = ref(false)
const isLoadingWrongQuestions = ref(false)
const historyErrorMessage = ref('')
const wrongQuestionErrorMessage = ref('')
const successMessage = ref('')

const isLoggedIn = computed(() => {
  return Boolean(currentUser.value)
})

const roleNameMap = {
  STUDENT: '学生',
  ADMIN: '管理员',
}

const gradeNameMap = {
  PRIMARY: '小学',
  JUNIOR: '初中',
  SENIOR: '高中',
  COLLEGE: '大学',
}

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

const handleLogout = () => {
  logoutUser()
  currentUser.value = null
  attemptHistory.value = []
  wrongQuestions.value = []
}

const loadAttemptHistory = async () => {
  if (!isLoggedIn.value) {
    return
  }

  isLoadingHistory.value = true
  historyErrorMessage.value = ''

  try {
    attemptHistory.value = await getAttemptHistory()
  } catch (error) {
    console.error(error)
    historyErrorMessage.value = error.message || '考试历史加载失败'
  } finally {
    isLoadingHistory.value = false
  }
}

const loadWrongQuestions = async () => {
  if (!isLoggedIn.value) {
    return
  }

  isLoadingWrongQuestions.value = true
  wrongQuestionErrorMessage.value = ''

  try {
    wrongQuestions.value = await getWrongQuestions()
  } catch (error) {
    console.error(error)
    wrongQuestionErrorMessage.value = error.message || '错题本加载失败'
  } finally {
    isLoadingWrongQuestions.value = false
  }
}

const handleMarkMastered = async (item) => {
  const confirmed = window.confirm(
    `确认将这道错题标记为已掌握吗？\n\n标记后它会从错题本中移除。`
  )

  if (!confirmed) {
    return
  }

  wrongQuestionErrorMessage.value = ''
  successMessage.value = ''

  try {
    await markWrongQuestionMastered(item.id)

    wrongQuestions.value = wrongQuestions.value.filter(
      (wrongQuestion) => wrongQuestion.id !== item.id
    )

    successMessage.value = '已标记为掌握，错题已从错题本移除。'
  } catch (error) {
    console.error(error)
    wrongQuestionErrorMessage.value = error.message || '标记已掌握失败'
  }
}

onMounted(() => {
  loadAttemptHistory()
  loadWrongQuestions()
})
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <p class="tag">Profile</p>
      <h1>个人中心</h1>
      <p class="desc">
        查看你的账号信息、考试历史和错题记录。
      </p>
    </div>

    <section v-if="!isLoggedIn" class="profile-login-card">
      <h2>你还没有登录</h2>
      <p>
        登录后可以保存考试记录、查看错题本，并继续追踪学习情况。
      </p>

      <div class="profile-actions">
        <RouterLink class="primary-btn" to="/login">
          去登录
        </RouterLink>

        <RouterLink class="secondary-btn" to="/register">
          注册账号
        </RouterLink>
      </div>
    </section>

    <section v-else class="profile-section">
      <div class="profile-card">
        <div>
          <p class="tag">Account</p>
          <h2>{{ currentUser.nickname || currentUser.username }}</h2>
          <p>
            用户名：{{ currentUser.username }}
          </p>
          <p>
            角色：{{ roleNameMap[currentUser.role] || currentUser.role }}
          </p>
          <p>
            学段：{{ gradeNameMap[currentUser.gradeLevel] || currentUser.gradeLevel }}
          </p>
        </div>

        <div class="profile-actions">
          <RouterLink
            v-if="currentUser.role === 'ADMIN'"
            class="secondary-btn"
            to="/admin"
          >
            管理员后台
          </RouterLink>

          <button class="secondary-btn" @click="handleLogout">
            退出登录
          </button>
        </div>
      </div>

      <div v-if="successMessage" class="api-success">
        {{ successMessage }}
      </div>

      <div class="profile-grid">
        <div class="profile-panel">
          <div class="section-title-row">
            <h2>考试历史</h2>
            <button class="secondary-btn" @click="loadAttemptHistory">
              刷新
            </button>
          </div>

          <div v-if="historyErrorMessage" class="api-warning">
            {{ historyErrorMessage }}
          </div>

          <div v-if="isLoadingHistory" class="loading-box">
            正在加载考试历史……
          </div>

          <div v-else-if="attemptHistory.length > 0" class="history-list">
            <div
              v-for="attempt in attemptHistory"
              :key="attempt.id"
              class="history-item"
            >
              <div>
                <h3>{{ attempt.examTitle || '未知试卷' }}</h3>
                <p>
                  总分：{{ attempt.totalScore }} 分 /
                  正确率：{{ attempt.accuracyRate }}%
                </p>
                <p>
                  用时：{{ formatUsedTime(attempt.usedTime) }}
                </p>
                <p>
                  提交时间：{{ formatDateTime(attempt.submittedAt) }}
                </p>
              </div>

              <RouterLink
                class="secondary-btn"
                :to="`/attempts/${attempt.id}`"
              >
                查看详情
              </RouterLink>
            </div>
          </div>

          <p v-else class="empty-text">
            暂无考试历史。
          </p>
        </div>

        <div class="profile-panel">
          <div class="section-title-row">
            <h2>错题本</h2>
            <button class="secondary-btn" @click="loadWrongQuestions">
              刷新
            </button>
          </div>

          <div v-if="wrongQuestionErrorMessage" class="api-warning">
            {{ wrongQuestionErrorMessage }}
          </div>

          <div v-if="isLoadingWrongQuestions" class="loading-box">
            正在加载错题本……
          </div>

          <div v-else-if="wrongQuestions.length > 0" class="wrong-question-list">
            <div
              v-for="item in wrongQuestions"
              :key="item.id"
              class="wrong-question-item"
            >
              <p class="tag">
                {{ item.questionType || '题目' }}
              </p>

              <h3>{{ item.questionText || '题目内容暂缺' }}</h3>

              <p>
                知识点：{{ item.knowledgePoint || '未分类' }}
              </p>

              <p>
                来源试卷：{{ item.examTitle || '未知试卷' }}
              </p>

              <p v-if="item.referenceAnswer">
                参考答案：{{ item.referenceAnswer }}
              </p>

              <p v-if="item.explanation">
                解析：{{ item.explanation }}
              </p>

              <div class="wrong-question-actions">
                <RouterLink
                  class="primary-btn"
                  :to="`/wrong-practice/${item.id}`"
                >
                  重新练习
                </RouterLink>

                <button
                  class="secondary-btn"
                  @click="handleMarkMastered(item)"
                >
                  标记已掌握
                </button>
              </div>
            </div>
          </div>

          <p v-else class="empty-text">
            暂无错题。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>