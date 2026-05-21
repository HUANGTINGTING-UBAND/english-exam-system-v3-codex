<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { mockExams } from '../data/mockExams'

const route = useRoute()

const examId = computed(() => route.params.examId)

const currentExam = computed(() => {
  return mockExams.find((exam) => exam.id === examId.value)
})

const formatTimeLimit = (seconds) => {
  return Math.round(seconds / 60)
}
</script>

<template>
  <div class="exam-page">
    <div v-if="currentExam" class="exam-start-card">
      <p class="tag">Exam Preview</p>
      <h1>{{ currentExam.title }}</h1>
      <p class="exam-desc">{{ currentExam.description }}</p>

      <div class="exam-info-grid">
        <div class="exam-info-item">
          <span class="info-label">题目数量</span>
          <strong>{{ currentExam.questionCount }} 题</strong>
        </div>

        <div class="exam-info-item">
          <span class="info-label">试卷满分</span>
          <strong>{{ currentExam.totalScore }} 分</strong>
        </div>

        <div class="exam-info-item">
          <span class="info-label">考试时间</span>
          <strong>{{ formatTimeLimit(currentExam.timeLimit) }} 分钟</strong>
        </div>
      </div>

      <div class="exam-notice">
        <h2>考试说明</h2>
        <ul>
          <li>点击“开始考试”后，系统将进入正式答题页面。</li>
          <li>后续版本会加入倒计时、自动保存、提交评分和薄弱项分析。</li>
          <li>当前阶段仅展示试卷基本信息，用于验证页面跳转和数据读取。</li>
        </ul>
      </div>

      <button class="primary-btn start-exam-btn">开始考试</button>
      <RouterLink class="back-link" to="/exams">返回试卷列表</RouterLink>
    </div>

    <div v-else class="page-placeholder">
      <h1>试卷不存在</h1>
      <p>没有找到 ID 为 {{ examId }} 的试卷，请返回试卷列表重新选择。</p>
      <RouterLink class="primary-btn" to="/exams">返回试卷列表</RouterLink>
    </div>
  </div>
</template>
