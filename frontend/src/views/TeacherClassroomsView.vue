<script setup>
import { computed, onMounted, ref } from 'vue'
import { createTeacherClassroom, getTeacherClassroomStudents, getTeacherClassrooms } from '../api/examApi'

const classrooms = ref([])
const selectedClassroomId = ref('')
const students = ref([])
const name = ref('')
const description = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selectedClassroom = computed(() => classrooms.value.find((item) => item.id === selectedClassroomId.value))

const loadClassrooms = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    classrooms.value = await getTeacherClassrooms()
    if (!selectedClassroomId.value && classrooms.value.length > 0) {
      selectedClassroomId.value = classrooms.value[0].id
      await loadStudents()
    }
  } catch (error) {
    errorMessage.value = error.message || '班级加载失败'
  } finally {
    isLoading.value = false
  }
}

const loadStudents = async () => {
  if (!selectedClassroomId.value) return
  students.value = await getTeacherClassroomStudents(selectedClassroomId.value)
}

const handleCreate = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const classroom = await createTeacherClassroom({ name: name.value, description: description.value })
    successMessage.value = `班级创建成功，邀请码：${classroom.inviteCode}`
    name.value = ''
    description.value = ''
    selectedClassroomId.value = classroom.id
    await loadClassrooms()
  } catch (error) {
    errorMessage.value = error.message || '创建班级失败'
  }
}

onMounted(loadClassrooms)
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Classrooms</p>
      <h1>教师班级管理</h1>
      <p>创建班级后，把邀请码发给学生，学生即可加入班级。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <section class="admin-section-card">
      <h2>创建班级</h2>
      <div class="admin-form-grid">
        <label>班级名称<input v-model="name" type="text" placeholder="例如：八年级 1 班英语" /></label>
        <label>班级说明<input v-model="description" type="text" placeholder="可选" /></label>
      </div>
      <button class="primary-btn" @click="handleCreate">创建班级</button>
    </section>

    <section class="admin-section-card">
      <h2>我的班级</h2>
      <p v-if="isLoading">加载中……</p>
      <div v-if="classrooms.length === 0" class="empty-state">暂无班级。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>班级</th><th>邀请码</th><th>学生数</th><th>任务数</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="classroom in classrooms" :key="classroom.id">
              <td>{{ classroom.name }}</td>
              <td><strong>{{ classroom.inviteCode }}</strong></td>
              <td>{{ classroom.studentCount }}</td>
              <td>{{ classroom.assignmentCount }}</td>
              <td><button class="secondary-btn" @click="selectedClassroomId = classroom.id; loadStudents()">查看学生</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="selectedClassroom" class="admin-section-card">
      <h2>{{ selectedClassroom.name }} 学生</h2>
      <div v-if="students.length === 0" class="empty-state">暂无学生加入。</div>
      <ul v-else class="simple-list">
        <li v-for="student in students" :key="student.id">
          {{ student.nickname || student.username }}（{{ student.username }}）- {{ student.gradeLevel || '未设置学段' }}
        </li>
      </ul>
    </section>
  </div>
</template>
