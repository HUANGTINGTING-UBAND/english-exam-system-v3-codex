<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

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
</script>

<template>
  <div class="page-placeholder">
    <h1>试卷列表页</h1>
    <p>当前学段：{{ currentGrade }}</p>
    <p>这里后续会根据学段展示对应的试卷列表。</p>
  </div>
</template>