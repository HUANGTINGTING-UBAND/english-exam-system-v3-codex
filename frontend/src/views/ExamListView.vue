<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getExams } from '../api/examApi'
import { mockExams } from '../data/mockExams'

const route = useRoute()

const exams = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const grade = computed(() => route.query.grade || '')

const gradeNameMap = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  PRIMARY: '小学',
  JUNIOR: '初中',
  SENIOR: '高中',
  COLLEGE: '大学',
}

const currentGradeName = computed(() => {
  if (!grade.value) {
    return '全部学段'
  }

  return gradeNameMap[grade.value] || '未知学段'
})

const normalizeGradeForApi = (gradeValue) => {
  if (!gradeValue) {
    return ''
  }

  return String(gradeValue).toUpperCase()
}

const normalizeGradeForMock = (gradeValue) => {
  if (!gradeValue) {
    return ''
  }

  return String(gradeValue).toLowerCase()
}

const fallbackToMockExams = () => {
  const mockGrade = normalizeGradeForMock(grade.value)

  if (!mockGrade) {
    exams.value = mockExams
    return
  }

  exams.value = mockExams.filter((exam) => exam.gradeLevel === mockGrade)
}

const loadExams = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const apiGrade = normalizeGradeForApi(grade.value)
    exams.value = await getExams(apiGrade)
  } catch (error) {
    console.error(error)
    errorMessage.value = '后端接口暂时不可用，当前显示本地 mock 试卷数据。'
    fallbackToMockExams()
  } finally {
    isLoading.value = false
  }
}

const formatTimeLimit = (seconds) => {
  return Math.round(seconds / 60)
}

onMounted(() => {
  loadExams()
})
</script>

<template>
  <div class="exam-list-page">
    <div class="page-header">
      <p class="tag">Exam List</p>
      <h1>{{ currentGradeName }}试卷列表</h1>
      <p class="desc">
        请选择一张试卷开始练习。当前页面优先读取后端数据库数据，如果后端未启动，则使用本地备用数据。
      </p>
    </div>

    <div v-if="errorMessage" class="api-warning">
      {{ errorMessage }}
    </div>

    <div v-if="isLoading" class="loading-box">
      正在加载试卷数据……
    </div>

    <div v-else-if="exams.length > 0" class="exam-card-grid">
      <div
        v-for="exam in exams"
        :key="exam.id"
        class="exam-card"
      >
        <h2>{{ exam.title }}</h2>
        <p>{{ exam.description }}</p>

        <div class="exam-meta">
          <span>题目数量：{{ exam.questionCount }} 题</span>
          <span>考试时间：{{ formatTimeLimit(exam.timeLimit) }} 分钟</span>
          <span>试卷满分：{{ exam.totalScore }} 分</span>
        </div>

        <RouterLink
          class="primary-btn"
          :to="`/exam/${exam.id}`"
        >
          进入考试
        </RouterLink>
      </div>
    </div>

    <div v-else class="empty-card">
      <h2>暂无试卷</h2>
      <p>当前学段暂时没有可用试卷。</p>
      <RouterLink class="secondary-btn" to="/">
        返回首页
      </RouterLink>
    </div>
  </div>
</template>