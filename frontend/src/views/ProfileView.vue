<script setup>
import { ref, onMounted } from 'vue'
import { getAttemptHistory } from '../api/examApi'

const examHistory = ref([])
const wrongQuestions = ref([])
const isLoadingHistory = ref(false)
const historyErrorMessage = ref('')

const formatUsedTime = (seconds) => {
  const minutes = Math.floor(Number(seconds || 0) / 60)
  const restSeconds = Number(seconds || 0) % 60
  return `${minutes} 分 ${restSeconds} 秒`
}

const formatSubmitType = (submitType) => {
  if (submitType === 'AUTO') {
    return '自动提交'
  }

  if (submitType === 'MANUAL') {
    return '主动提交'
  }

  return submitType || '未知'
}

const loadLocalWrongQuestions = () => {
  wrongQuestions.value = JSON.parse(localStorage.getItem('wrongQuestions') || '[]')
}

const loadHistoryFromApi = async () => {
  isLoadingHistory.value = true
  historyErrorMessage.value = ''

  try {
    examHistory.value = await getAttemptHistory()
  } catch (error) {
    console.error(error)
    historyErrorMessage.value = '后端历史记录暂时不可用，当前显示本地历史记录。'
    examHistory.value = JSON.parse(localStorage.getItem('examHistory') || '[]')
  } finally {
    isLoadingHistory.value = false
  }
}

const loadProfileData = async () => {
  await loadHistoryFromApi()
  loadLocalWrongQuestions()
}

const clearLocalHistory = () => {
  const confirmed = window.confirm('确认清空本地历史记录吗？这不会删除数据库里的记录。')

  if (!confirmed) {
    return
  }

  localStorage.removeItem('examHistory')
  loadProfileData()
}

const clearWrongQuestions = () => {
  const confirmed = window.confirm('确认清空本地错题本吗？')

  if (!confirmed) {
    return
  }

  localStorage.removeItem('wrongQuestions')
  loadLocalWrongQuestions()
}

onMounted(() => {
  loadProfileData()
})
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <p class="tag">Profile</p>
      <h1>个人中心</h1>
      <p class="desc">
        这里展示数据库中的考试历史记录，以及本地错题本雏形。
      </p>
    </div>

    <section class="profile-section">
      <div class="section-title-row">
        <h2>考试历史</h2>
        <button class="secondary-btn" @click="clearLocalHistory">
          清空本地历史
        </button>
      </div>

      <div v-if="historyErrorMessage" class="api-warning">
        {{ historyErrorMessage }}
      </div>

      <div v-if="isLoadingHistory" class="loading-box">
        正在加载考试历史……
      </div>

      <div v-else-if="examHistory.length > 0" class="history-list">
        <div
          v-for="record in examHistory"
          :key="record.id"
          class="history-card"
        >
          <h3>{{ record.examTitle }}</h3>
          <p>得分：{{ record.earnedScore }} / {{ record.totalScore }}</p>
          <p>正确率：{{ record.accuracyRate }}%</p>
          <p>客观题得分：{{ record.objectiveScore }} 分</p>
          <p>主观题得分：{{ record.subjectiveScore }} 分</p>
          <p>提交方式：{{ formatSubmitType(record.submitType) }}</p>
          <p>用时：{{ formatUsedTime(record.usedTime) }}</p>
          <p>暂停次数：{{ record.pauseCount }} 次</p>
          <p>答案数量：{{ record.answerCount || 0 }} 条</p>
          <p>时间：{{ new Date(record.createdAt).toLocaleString() }}</p>
        </div>
      </div>

      <p v-else class="empty-text">
        暂无考试历史。提交考试后即可在这里看到数据库记录。
      </p>
    </section>

    <section class="profile-section">
      <div class="section-title-row">
        <h2>本地错题本</h2>
        <button class="secondary-btn" @click="clearWrongQuestions">
          清空错题
        </button>
      </div>

      <div v-if="wrongQuestions.length > 0" class="wrong-list">
        <div
          v-for="item in wrongQuestions"
          :key="item.id"
          class="wrong-card"
        >
          <p class="tag">{{ item.knowledgePoint }}</p>
          <h3>{{ item.questionText }}</h3>
          <p>来源试卷：{{ item.examTitle }}</p>
          <p>得分：{{ item.earnedScore }} / {{ item.score }}</p>
          <p>保存时间：{{ new Date(item.savedAt).toLocaleString() }}</p>
        </div>
      </div>

      <p v-else class="empty-text">
        暂无错题。提交考试后点击“保存错题”即可出现在这里。
      </p>
    </section>
  </div>
</template>