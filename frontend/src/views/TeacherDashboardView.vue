<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getTeacherAssignments, getTeacherClassrooms } from '../api/examApi'

const classrooms = ref([])
const assignments = ref([])
const errorMessage = ref('')
const isLoading = ref(false)

const loadDashboard = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const [classroomResult, assignmentResult] = await Promise.all([
      getTeacherClassrooms(),
      getTeacherAssignments(),
    ])

    classrooms.value = classroomResult
    assignments.value = assignmentResult
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '教师工作台加载失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Teacher</p>
      <h1>教师工作台</h1>
      <p>管理班级、发布试卷任务，并查看学生提交情况。</p>
      <div class="admin-actions">
        <RouterLink class="primary-btn" to="/teacher/classrooms">班级管理</RouterLink>
        <RouterLink class="secondary-btn" to="/teacher/assignments">任务管理</RouterLink>
        <RouterLink class="secondary-btn" to="/import-drafts">导入草稿</RouterLink>
        <RouterLink class="secondary-btn" to="/skills">Skill 管理</RouterLink>
      </div>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <p v-if="isLoading">加载中……</p>

    <section class="admin-section-grid">
      <article class="admin-stat-card">
        <span>我的班级</span>
        <strong>{{ classrooms.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>已发布任务</span>
        <strong>{{ assignments.length }}</strong>
      </article>
    </section>

    <section class="admin-section-card">
      <h2>最近任务</h2>
      <div v-if="assignments.length === 0" class="empty-state">暂无任务，请先发布一个班级考试。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>任务</th><th>班级</th><th>试卷</th><th>提交数</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="assignment in assignments.slice(0, 5)" :key="assignment.id">
              <td>{{ assignment.title }}</td>
              <td>{{ assignment.classroom?.name }}</td>
              <td>{{ assignment.exam?.title }}</td>
              <td>{{ assignment._count?.attempts || 0 }}</td>
              <td><RouterLink :to="`/teacher/assignments?assignmentId=${assignment.id}`">查看提交</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
