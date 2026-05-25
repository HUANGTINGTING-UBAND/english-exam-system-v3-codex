<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser } from '../api/authApi'

const currentUser = ref(getSavedUser())

const isAdmin = computed(() => {
  return currentUser.value?.role === 'ADMIN'
})

const adminStats = [
  {
    title: '试卷管理',
    desc: '后续可在这里新增、编辑、发布和下架试卷。',
  },
  {
    title: '题目管理',
    desc: '后续可在这里维护单选题、翻译题、改错题、写作题等题目。',
  },
  {
    title: '用户数据',
    desc: '后续可查看学生数量、考试次数、错题数量和学习情况。',
  },
  {
    title: '系统设置',
    desc: '后续可配置学段、题型、评分规则和公告内容。',
  },
]
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
          你当前拥有管理员权限。后续我们会逐步接入真实的试卷管理和题目管理功能。
        </p>
      </div>

      <div class="admin-grid">
        <div
          v-for="item in adminStats"
          :key="item.title"
          class="admin-card"
        >
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>