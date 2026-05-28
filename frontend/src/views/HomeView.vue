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

            <RouterLink
              v-if="currentUser.role === 'ADMIN'"
              class="home-auth-link"
              to="/admin"
            >
              管理员后台
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

        <h1>英语在线模拟考试与错题学习系统</h1>

        <p class="desc">
          支持在线考试、自动评分、结果分析、薄弱知识点定位、错题本沉淀和管理员试卷管理，帮助学生形成完整学习闭环。
        </p>

        <div class="actions">
          <RouterLink class="primary-btn" to="/exams">
            开始练习
          </RouterLink>

          <RouterLink class="secondary-btn" to="/profile">
            查看学习记录
          </RouterLink>

          <RouterLink
            v-if="currentUser?.role === 'ADMIN'"
            class="secondary-btn"
            to="/admin"
          >
            管理试卷
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="section">
      <section class="home-feature-section">
        <div class="section-title-row">
          <div>
            <p class="tag">Learning Flow</p>
            <h2>从考试到复盘的完整学习闭环</h2>
          </div>
        </div>

        <div class="home-flow-grid">
          <div class="home-flow-card">
            <span>01</span>
            <h3>选择试卷</h3>
            <p>按小学、初中、高中、大学等学段选择适合自己的英语试卷。</p>
          </div>

          <div class="home-flow-card">
            <span>02</span>
            <h3>在线答题</h3>
            <p>支持选择题、翻译题、改错题、写作题、阅读理解和完形填空等题型。</p>
          </div>

          <div class="home-flow-card">
            <span>03</span>
            <h3>查看分析</h3>
            <p>提交后查看得分率、正确率、题型表现、薄弱知识点和复习建议。</p>
          </div>

          <div class="home-flow-card">
            <span>04</span>
            <h3>错题重练</h3>
            <p>系统沉淀错题，支持筛选、搜索、重练和标记已掌握。</p>
          </div>
        </div>
      </section>

      <section class="home-feature-section">
        <div class="section-title-row">
          <div>
            <p class="tag">Grade Practice</p>
            <h2>选择学段开始练习</h2>
          </div>
        </div>

        <div class="grade-grid">
          <div class="grade-card">
            <RouterLink class="grade-title-link" to="/exams?grade=primary">
              小学
            </RouterLink>
            <p>适合小学英语基础练习，巩固词汇、句型和基础语法。</p>
          </div>

          <div class="grade-card">
            <RouterLink class="grade-title-link" to="/exams?grade=junior">
              初中
            </RouterLink>
            <p>适合中考英语模拟训练，强化语法、阅读和综合运用能力。</p>
          </div>

          <div class="grade-card">
            <RouterLink class="grade-title-link" to="/exams?grade=senior">
              高中
            </RouterLink>
            <p>适合高考英语综合训练，提升阅读理解、写作和语言运用能力。</p>
          </div>

          <div class="grade-card">
            <RouterLink class="grade-title-link" to="/exams?grade=college">
              大学
            </RouterLink>
            <p>适合大学英语与四六级基础训练，支持更综合的题型练习。</p>
          </div>
        </div>
      </section>

      <section class="home-feature-section">
        <div class="section-title-row">
          <div>
            <p class="tag">Product Modules</p>
            <h2>系统核心模块</h2>
          </div>
        </div>

        <div class="home-module-grid">
          <div class="home-module-card">
            <h3>学生端</h3>
            <p>
              注册登录、试卷练习、考试提交、结果详情、错题本、错题重练和学习建议。
            </p>
          </div>

          <div class="home-module-card">
            <h3>管理员端</h3>
            <p>
              创建试卷、编辑题目、批量导入、筛选排序、查看学生考试记录和导出数据。
            </p>
          </div>

          <div class="home-module-card">
            <h3>学习分析</h3>
            <p>
              统计得分率、正确率、题型表现、薄弱知识点和错题分布，辅助学生复盘。
            </p>
          </div>

          <div class="home-module-card">
            <h3>权限保护</h3>
            <p>
              支持登录状态保存、路由守卫、管理员权限控制和登录过期处理。
            </p>
          </div>
        </div>
      </section>

      <section class="home-cta-card">
        <div>
          <p class="tag">Start Now</p>
          <h2>开始一次完整的英语练习</h2>
          <p>
            完成一套试卷后，你可以在个人中心查看考试历史、错题本和学习建议。
          </p>
        </div>

        <div class="actions">
          <RouterLink class="primary-btn" to="/exams">
            去试卷列表
          </RouterLink>

          <RouterLink class="secondary-btn" to="/profile">
            去个人中心
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>
