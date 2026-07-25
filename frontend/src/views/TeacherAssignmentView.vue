<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  createTeacherAssignment,
  getExams,
  getTeacherAssignmentSubmissions,
  getTeacherAssignments,
  getTeacherClassrooms,
} from '../api/examApi'

const route = useRoute()
const classrooms = ref([])
const exams = ref([])
const assignments = ref([])
const submissions = ref([])
const selectedAssignmentId = ref('')
const classroomId = ref('')
const examId = ref('')
const title = ref('')
const description = ref('')
const dueAt = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

const selectedAssignment = computed(() => assignments.value.find((item) => item.id === selectedAssignmentId.value))

const loadAll = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [classroomResult, examResult, assignmentResult] = await Promise.all([
      getTeacherClassrooms(),
      getExams(),
      getTeacherAssignments(),
    ])
    classrooms.value = classroomResult
    exams.value = examResult
    assignments.value = assignmentResult
    selectedAssignmentId.value = route.query.assignmentId || assignments.value[0]?.id || ''
    if (selectedAssignmentId.value) await loadSubmissions()
  } catch (error) {
    errorMessage.value = error.message || '任务页面加载失败。教师需要可读取试卷列表。'
  } finally {
    isLoading.value = false
  }
}

const handleCreate = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const assignment = await createTeacherAssignment({
      classroomId: classroomId.value,
      examId: examId.value,
      title: title.value,
      description: description.value,
      dueAt: dueAt.value || null,
    })
    successMessage.value = '任务发布成功'
    selectedAssignmentId.value = assignment.id
    title.value = ''
    description.value = ''
    dueAt.value = ''
    await loadAll()
  } catch (error) {
    errorMessage.value = error.message || '发布任务失败'
  }
}

const loadSubmissions = async () => {
  if (!selectedAssignmentId.value) return
  const result = await getTeacherAssignmentSubmissions(selectedAssignmentId.value)
  submissions.value = result.submissions || []
}

watch(selectedAssignmentId, () => {
  loadSubmissions().catch((error) => {
    errorMessage.value = error.message || '提交情况加载失败'
  })
})

onMounted(loadAll)
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Assignments</p>
      <h1>教师任务管理</h1>
      <p>选择已有试卷发布给班级，并查看学生提交和成绩。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
    <p v-if="isLoading">加载中……</p>

    <section class="admin-section-card">
      <h2>发布新任务</h2>
      <div class="admin-form-grid">
        <label>班级
          <select v-model="classroomId">
            <option value="">请选择班级</option>
            <option v-for="classroom in classrooms" :key="classroom.id" :value="classroom.id">{{ classroom.name }}</option>
          </select>
        </label>
        <label>试卷
          <select v-model="examId">
            <option value="">请选择试卷</option>
            <option v-for="exam in exams" :key="exam.id" :value="exam.id">{{ exam.title }}</option>
          </select>
        </label>
        <label>任务标题<input v-model="title" type="text" placeholder="默认使用试卷标题" /></label>
        <label>截止时间<input v-model="dueAt" type="datetime-local" /></label>
      </div>
      <label>任务说明<textarea v-model="description" placeholder="可选"></textarea></label>
      <button class="primary-btn" @click="handleCreate">发布任务</button>
    </section>

    <section class="admin-section-card">
      <h2>任务列表</h2>
      <div v-if="assignments.length === 0" class="empty-state">暂无任务。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>任务</th><th>班级</th><th>试卷</th><th>提交数</th><th>查看</th></tr></thead>
          <tbody>
            <tr v-for="assignment in assignments" :key="assignment.id">
              <td>{{ assignment.title }}</td>
              <td>{{ assignment.classroom?.name }}</td>
              <td>{{ assignment.exam?.title }}</td>
              <td>{{ assignment._count?.attempts || 0 }}</td>
              <td><button class="secondary-btn" @click="selectedAssignmentId = assignment.id">提交情况</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="selectedAssignment" class="admin-section-card">
      <h2>提交情况：{{ selectedAssignment.title }}</h2>
      <div v-if="submissions.length === 0" class="empty-state">暂无学生。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>学生</th><th>状态</th><th>得分</th><th>正确率</th><th>提交时间</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="item in submissions" :key="item.student.id">
              <td>{{ item.student.nickname || item.student.username }}</td>
              <td>{{ item.submitted ? '已提交' : '未提交' }}</td>
              <td>{{ item.attempt ? `${item.attempt.totalScore} / ${item.attempt.examTotalScore}` : '-' }}</td>
              <td>{{ item.attempt ? `${item.attempt.accuracyRate}%` : '-' }}</td>
              <td>{{ item.attempt?.submittedAt ? new Date(item.attempt.submittedAt).toLocaleString() : '-' }}</td>
              <td><RouterLink v-if="item.attempt" :to="`/attempts/${item.attempt.id}`">查看</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
