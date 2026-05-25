<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser } from '../api/authApi'
import {
  createAdminExam,
  getAdminExams,
  updateAdminExamPublishStatus,
} from '../api/examApi'

const currentUser = ref(getSavedUser())

const isAdmin = computed(() => {
  return currentUser.value?.role === 'ADMIN'
})

const exams = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  title: '',
  gradeLevel: 'JUNIOR',
  description: '',
  timeLimit: 3600,
  totalScore: 100,
  isPublished: true,
})

const gradeNameMap = {
  PRIMARY: '小学',
  JUNIOR: '初中',
  SENIOR: '高中',
  COLLEGE: '大学',
}

const formatTimeLimit = (seconds) => {
  return `${Math.round(Number(seconds || 0) / 60)} 分钟`
}

const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return '暂无'
  }

  return new Date(dateValue).toLocaleString()
}

const loadAdminExams = async () => {
  if (!isAdmin.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    exams.value = await getAdminExams()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '管理员试卷列表加载失败'
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    gradeLevel: 'JUNIOR',
    description: '',
    timeLimit: 3600,
    totalScore: 100,
    isPublished: true,
  }
}

const handleCreateExam = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.value.title.trim()) {
    errorMessage.value = '请输入试卷标题'
    return
  }

  try {
    await createAdminExam({
      title: form.value.title.trim(),
      gradeLevel: form.value.gradeLevel,
      description: form.value.description.trim(),
      timeLimit: Number(form.value.timeLimit),
      totalScore: Number(form.value.totalScore),
      isPublished: Boolean(form.value.isPublished),
    })

    successMessage.value = '试卷创建成功'
    resetForm()
    await loadAdminExams()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '试卷创建失败'
  }
}

const handleTogglePublish = async (exam) => {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateAdminExamPublishStatus(exam.id, !exam.isPublished)

    successMessage.value = exam.isPublished ? '试卷已下架' : '试卷已发布'
    await loadAdminExams()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '试卷发布状态更新失败'
  }
}

onMounted(() => {
  loadAdminExams()
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <p class="tag">Admin</p>
      <h1>管理员后台</h1>
      <p class="desc">
        管理员后台用于维护试卷、题目、用户数据和系统配置。
      </p>
    </div>

    <section v-if="!currentUser" class="admin-guard-card">
      <h2>请先登录</h2>
      <p>
        你当前未登录。管理员后台需要登录后才能访问。
      </p>

      <RouterLink class="primary-btn" to="/login">
        去登录
      </RouterLink>
    </section>

    <section v-else-if="!isAdmin" class="admin-guard-card">
      <h2>暂无管理员权限</h2>
      <p>
        当前账号：{{ currentUser.nickname || currentUser.username }}
      </p>
      <p>
        你的角色是 {{ currentUser.role }}，暂时不能访问管理员后台。
      </p>

      <RouterLink class="secondary-btn" to="/">
        返回首页
      </RouterLink>
    </section>

    <section v-else class="admin-section">
      <div class="admin-welcome-card">
        <h2>欢迎，{{ currentUser.nickname || currentUser.username }}</h2>
        <p>
          你当前拥有管理员权限。现在可以查看数据库试卷，并新增基础试卷。
        </p>
      </div>

      <div v-if="errorMessage" class="api-warning">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="api-success">
        {{ successMessage }}
      </div>

      <div class="admin-panel-grid">
        <div class="admin-form-card">
          <h2>新增试卷</h2>

          <label>
            试卷标题
            <input
              v-model="form.title"
              type="text"
              placeholder="例如：2026 初中英语模拟卷 003"
            />
          </label>

          <label>
            学段
            <select v-model="form.gradeLevel">
              <option value="PRIMARY">小学</option>
              <option value="JUNIOR">初中</option>
              <option value="SENIOR">高中</option>
              <option value="COLLEGE">大学</option>
            </select>
          </label>

          <label>
            试卷说明
            <textarea
              v-model="form.description"
              rows="4"
              placeholder="请输入试卷说明"
            ></textarea>
          </label>

          <label>
            考试时间，单位：秒
            <input
              v-model="form.timeLimit"
              type="number"
              min="60"
            />
          </label>

          <label>
            试卷满分
            <input
              v-model="form.totalScore"
              type="number"
              min="1"
            />
          </label>

          <label class="checkbox-label">
            <input
              v-model="form.isPublished"
              type="checkbox"
            />
            创建后直接发布
          </label>

          <button class="primary-btn" @click="handleCreateExam">
            新增试卷
          </button>
        </div>

        <div class="admin-list-card">
          <div class="section-title-row">
            <h2>数据库试卷列表</h2>
            <button class="secondary-btn" @click="loadAdminExams">
              刷新
            </button>
          </div>

          <div v-if="isLoading" class="loading-box">
            正在加载管理员试卷列表……
          </div>

          <div v-else-if="exams.length > 0" class="admin-exam-list">
            <div
              v-for="exam in exams"
              :key="exam.id"
              class="admin-exam-item"
            >
              <div>
                <h3>{{ exam.title }}</h3>
                <p>{{ exam.description || '暂无说明' }}</p>

                <div class="admin-exam-meta">
                  <span>学段：{{ gradeNameMap[exam.gradeLevel] || exam.gradeLevel }}</span>
                  <span>题目：{{ exam.questionCount }} 题</span>
                  <span>满分：{{ exam.totalScore }} 分</span>
                  <span>时长：{{ formatTimeLimit(exam.timeLimit) }}</span>
                  <span>状态：{{ exam.isPublished ? '已发布' : '已下架' }}</span>
                  <span>创建：{{ formatDateTime(exam.createdAt) }}</span>
                </div>
              </div>

              <div class="admin-exam-actions">
                <button
                  class="secondary-btn"
                  @click="handleTogglePublish(exam)"
                >
                  {{ exam.isPublished ? '下架' : '发布' }}
                </button>
              </div>
            </div>
          </div>

          <p v-else class="empty-text">
            暂无试卷。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>