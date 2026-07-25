<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getStudentAssignments, joinStudentClassroom } from '../api/examApi'

const assignments = ref([])
const inviteCode = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

const loadAssignments = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    assignments.value = await getStudentAssignments()
  } catch (error) {
    errorMessage.value = error.message || '班级任务加载失败'
  } finally {
    isLoading.value = false
  }
}

const handleJoin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await joinStudentClassroom(inviteCode.value)
    successMessage.value = `已加入班级：${result.classroom?.name}`
    inviteCode.value = ''
    await loadAssignments()
  } catch (error) {
    errorMessage.value = error.message || '加入班级失败'
  }
}

onMounted(loadAssignments)
</script>

<template>
  <div class="profile-page">
    <section class="profile-hero-card">
      <p class="tag">My Assignments</p>
      <h1>我的班级任务</h1>
      <p>通过教师的邀请码加入班级，并从这里进入班级考试任务。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <section class="profile-section-card">
      <h2>加入班级</h2>
      <label>班级邀请码<input v-model="inviteCode" type="text" placeholder="请输入教师提供的邀请码" /></label>
      <button class="primary-btn" @click="handleJoin">加入班级</button>
    </section>

    <section class="profile-section-card">
      <h2>任务列表</h2>
      <p v-if="isLoading">加载中……</p>
      <div v-if="assignments.length === 0" class="empty-state">暂无班级任务。</div>
      <div v-else class="exam-card-grid">
        <article v-for="assignment in assignments" :key="assignment.id" class="exam-card">
          <span class="exam-tag">{{ assignment.classroom.name }}</span>
          <h3>{{ assignment.title }}</h3>
          <p>{{ assignment.description || assignment.exam.title }}</p>
          <div class="exam-meta">
            <span>试卷：{{ assignment.exam.title }}</span>
            <span>状态：{{ assignment.submitted ? '已提交' : '待完成' }}</span>
          </div>
          <div class="actions">
            <RouterLink class="primary-btn" :to="`/exam/${assignment.exam.id}?assignmentId=${assignment.id}`">
              {{ assignment.submitted ? '再次练习' : '进入考试' }}
            </RouterLink>
            <RouterLink v-if="assignment.latestAttempt" class="secondary-btn" :to="`/attempts/${assignment.latestAttempt.id}`">
              查看结果
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
