<script setup>
import { ref, onMounted } from 'vue'

const examHistory = ref([])
const wrongQuestions = ref([])

const loadProfileData = () => {
  examHistory.value = JSON.parse(localStorage.getItem('examHistory') || '[]')
  wrongQuestions.value = JSON.parse(localStorage.getItem('wrongQuestions') || '[]')
}

const clearHistory = () => {
  const confirmed = window.confirm('确认清空历史记录吗？')

  if (!confirmed) {
    return
  }

  localStorage.removeItem('examHistory')
  loadProfileData()
}

const clearWrongQuestions = () => {
  const confirmed = window.confirm('确认清空错题本吗？')

  if (!confirmed) {
    return
  }

  localStorage.removeItem('wrongQuestions')
  loadProfileData()
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
      <p class="desc">这里展示本地保存的考试记录和错题本雏形。</p>
    </div>

    <section class="profile-section">
      <div class="section-title-row">
        <h2>考试历史</h2>
        <button class="secondary-btn" @click="clearHistory">
          清空历史
        </button>
      </div>

      <div v-if="examHistory.length > 0" class="history-list">
        <div
          v-for="record in examHistory"
          :key="record.id"
          class="history-card"
        >
          <h3>{{ record.examTitle }}</h3>
          <p>得分：{{ record.earnedScore }} / {{ record.totalScore }}</p>
          <p>正确率：{{ record.accuracyRate }}%</p>
          <p>提交方式：{{ record.submitType }}</p>
          <p>用时：{{ Math.floor(record.usedTime / 60) }} 分 {{ record.usedTime % 60 }} 秒</p>
          <p>时间：{{ new Date(record.createdAt).toLocaleString() }}</p>
        </div>
      </div>

      <p v-else class="empty-text">
        暂无考试历史。提交考试后点击“保存结果”即可出现在这里。
      </p>
    </section>

    <section class="profile-section">
      <div class="section-title-row">
        <h2>错题本</h2>
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