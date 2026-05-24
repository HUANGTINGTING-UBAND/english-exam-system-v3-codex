<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser, logoutUser } from '../api/authApi'

const currentUser = ref(null)

const loadCurrentUser = () => {
  currentUser.value = getSavedUser()
}

const handleLogout = () => {
  const confirmed = window.confirm('确认退出登录吗？')

  if (!confirmed) {
    return
  }

  logoutUser()
  currentUser.value = null
  window.alert('已退出登录')
}

onMounted(() => {
  loadCurrentUser()
})
</script>

<template>
  <div class="home-page">
    <header class="hero">
      <div class="hero-content">
        <div class="home-auth-bar">
          <div v-if="currentUser" class="home-user-info">
            <span>
              当前登录：{{ currentUser.nickname || currentUser.username }}
            </span>

            <RouterLink class="home-auth-link" to="/profile">
              个人中心
            </RouterLink>

            <button class="home-auth-button" @click="handleLogout">
              退出登录
            </button>
          </div>

          <div v-else class="home-user-info">
            <RouterLink class="home-auth-link" to="/login">
              登录
            </RouterLink>

            <RouterLink class="home-auth-link primary-auth-link" to="/register">
              注册
            </RouterLink>
          </div>
        </div>

        <p class="tag">English Exam System</p>

        <h1>英语在线模拟考试系统</h1>

        <p class="desc">
          支持学段选择、限时答题、自动评分、薄弱项分析与错题沉淀。
        </p>

        <div class="actions">
          <RouterLink class="primary-btn" to="/exams">
            开始练习
          </RouterLink>

          <RouterLink class="secondary-btn" to="/profile">
            查看我的记录
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="section">
      <h2>选择学段</h2>

      <div class="grade-grid">
        <div class="grade-card">
          <RouterLink class="grade-title-link" to="/exams?grade=primary">
            小学
          </RouterLink>
          <p>适合小学英语基础练习。</p>
        </div>

        <div class="grade-card">
          <RouterLink class="grade-title-link" to="/exams?grade=junior">
            初中
          </RouterLink>
          <p>适合中考英语模拟训练。</p>
        </div>

        <div class="grade-card">
          <RouterLink class="grade-title-link" to="/exams?grade=senior">
            高中
          </RouterLink>
          <p>适合高考英语综合训练。</p>
        </div>

        <div class="grade-card">
          <RouterLink class="grade-title-link" to="/exams?grade=college">
            大学
          </RouterLink>
          <p>适合大学英语与四六级基础训练。</p>
        </div>
      </div>
    </main>
  </div>
</template>