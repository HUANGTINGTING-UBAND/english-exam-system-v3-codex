<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser } from '../api/authApi'
import { getAdminAttempts } from '../api/examApi'

const currentUser = ref(getSavedUser())
const attempts = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const isAdmin = computed(() => {
  return currentUser.value?.role === 'ADMIN'
})

const totalAttemptCount = computed(() => {
  return attempts.value.length
})

const averageScoreRate = computed(() => {
  if (attempts.value.length === 0) {
    return 0
  }

  const total = attempts.value.reduce((sum, item) => {
    return sum + Number(item.scoreRate || 0)
  }, 0)

  return Math.round(total / attempts.value.length)
})

const averageAccuracyRate = computed(() => {
  if (attempts.value.length === 0) {
    return 0
  }

  const total = attempts.value.reduce((sum, item) => {
    return sum + Number(item.accuracyRate || 0)
  }, 0)

  return Math.round(total / attempts.value.length)
})

const uniqueStudentCount = computed(() => {
  return new Set(attempts.value.map((item) => item.userId)).size
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

const loadAdminAttempts = async () => {
  if (!isAdmin.value) {
    errorMessage.value = '只有管理员可以查看学生考试记录'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    attempts.value = await getAdminAttempts()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '管理员考试记录加载失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAdminAttempts()
})
</script>

<template>
  <div class="admin-attempts-page">
    <div class="page-header">
      <p class="tag">Admin Attempts</p>
      <h1>学生考试记录</h1>
      <p class="desc">
        管理员可以查看所有学生的考试提交记录、得分、正确率和详情。
      </p>
    </div>

    <div class="attempt-detail-actions">
      <RouterLink class="secondary-btn" to="/admin">
        返回管理员后台
      </RouterLink>

      <RouterLink class="secondary-btn" to="/profile">
        返回个人中心
      </RouterLink>

      <button class="secondary-btn" @click="loadAdminAttempts">
        刷新记录
      </button>
    </div>

    <section v-if="!isAdmin" class="api-warning">
      只有管理员可以查看该页面。
    </section>

    <div v-else-if="isLoading" class="loading-box">
      正在加载学生考试记录……
    </div>

    <div v-else-if="errorMessage" class="api-warning">
      {{ errorMessage }}
    </div>

    <section v-else class="admin-attempts-section">
      <div class="admin-attempts-overview">
        <div>
          <span>考试记录数</span>
          <strong>{{ totalAttemptCount }}</strong>
        </div>

        <div>
          <span>参与学生数</span>
          <strong>{{ uniqueStudentCount }}</strong>
        </div>

        <div>
          <span>平均得分率</span>
          <strong>{{ averageScoreRate }}%</strong>
        </div>

        <div>
          <span>平均正确率</span>
          <strong>{{ averageAccuracyRate }}%</strong>
        </div>
      </div>

      <div v-if="attempts.length > 0" class="admin-attempt-table-wrap">
        <table class="admin-attempt-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>试卷</th>
              <th>得分</th>
              <th>得分率</th>
              <th>正确率</th>
              <th>用时</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="attempt in attempts"
              :key="attempt.id"
            >
              <td>
                <strong>{{ attempt.nickname || attempt.username }}</strong>
                <p>{{ attempt.username }}</p>
              </td>

              <td>
                <strong>{{ attempt.examTitle }}</strong>
                <p>{{ attempt.examGradeLevel }}</p>
              </td>

              <td>
                {{ attempt.totalScore }} / {{ attempt.examTotalScore }}
              </td>

              <td>
                {{ attempt.scoreRate }}%
              </td>

              <td>
                {{ attempt.accuracyRate }}%
              </td>

              <td>
                {{ formatUsedTime(attempt.usedTime) }}
              </td>

              <td>
                {{ formatDateTime(attempt.submittedAt) }}
              </td>

              <td>
                <RouterLink
                  class="secondary-btn"
                  :to="`/attempts/${attempt.id}`"
                >
                  查看详情
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="empty-text">
        暂无学生考试记录。
      </p>
    </section>
  </div>
</template>