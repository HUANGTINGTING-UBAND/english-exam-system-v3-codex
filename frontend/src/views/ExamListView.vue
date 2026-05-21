<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { mockExams } from '../data/mockExams'

const route = useRoute()

const gradeMap = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
}

const currentGrade = computed(() => {
  const grade = route.query.grade
  return gradeMap[grade] || '全部学段'
})

const filteredExams = computed(() => {
  const grade = route.query.grade

  if (!grade) {
    return mockExams
  }

  return mockExams.filter((exam) => exam.gradeLevel === grade)
})

const formatTimeLimit = (seconds) => {
  return Math.round(seconds / 60)
}
</script>

<template>
  <div class="exam-list-page">
    <div class="page-header">
      <p class="tag">Exam List</p>
      <h1>试卷列表</h1>
      <p class="desc">当前学段：{{ currentGrade }}</p>
    </div>

    <div class="exam-grid">
      <div v-for="exam in filteredExams" :key="exam.id" class="exam-card">
        <h2>{{ exam.title }}</h2>
        <p class="exam-desc">{{ exam.description }}</p>

        <div class="exam-meta">
          <span>共 {{ exam.questionCount }} 题</span>
          <span>满分 {{ exam.totalScore }} 分</span>
          <span>限时 {{ formatTimeLimit(exam.timeLimit) }} 分钟</span>
        </div>

        <RouterLink class="primary-btn exam-btn" :to="`/exam/${exam.id}`">
          开始考试
        </RouterLink>
      </div>
    </div>

    <p v-if="filteredExams.length === 0" class="empty-text">
      当前学段暂无试卷。
    </p>
  </div>
</template>