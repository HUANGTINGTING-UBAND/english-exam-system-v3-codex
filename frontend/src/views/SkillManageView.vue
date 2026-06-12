<script setup>
import { onMounted, ref } from 'vue'
import { activateSkill, createSkill, deactivateSkill, getSkills } from '../api/examApi'

const skills = ref([])
const name = ref('')
const description = ref('')
const prompt = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const loadSkills = async () => {
  skills.value = await getSkills()
}

const handleCreate = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await createSkill({ name: name.value, description: description.value, prompt: prompt.value })
    successMessage.value = 'Skill 创建成功'
    name.value = ''
    description.value = ''
    prompt.value = ''
    await loadSkills()
  } catch (error) {
    errorMessage.value = error.message || 'Skill 创建失败'
  }
}

const toggleSkill = async (skill) => {
  if (skill.isActive) {
    await deactivateSkill(skill.id)
  } else {
    await activateSkill(skill.id)
  }
  await loadSkills()
}

onMounted(() => {
  loadSkills().catch((error) => {
    errorMessage.value = error.message || 'Skill 列表加载失败'
  })
})
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Generation Skill</p>
      <h1>Skill 管理</h1>
      <p>基础版仅支持创建、查看、启用和停用，为后续 AI 生成能力预留。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <section class="admin-section-card">
      <h2>创建 Skill</h2>
      <label>名称<input v-model="name" type="text" placeholder="例如：阅读题讲评建议" /></label>
      <label>说明<input v-model="description" type="text" placeholder="用途说明" /></label>
      <label>Prompt 模板<textarea v-model="prompt" rows="6" placeholder="后续 AI 调用时使用"></textarea></label>
      <button class="primary-btn" @click="handleCreate">创建 Skill</button>
    </section>

    <section class="admin-section-card">
      <h2>Skill 列表</h2>
      <div v-if="skills.length === 0" class="empty-state">暂无 Skill。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>名称</th><th>说明</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="skill in skills" :key="skill.id">
              <td>{{ skill.name }}</td>
              <td>{{ skill.description }}</td>
              <td>{{ skill.isActive ? '启用' : '停用' }}</td>
              <td><button class="secondary-btn" @click="toggleSkill(skill)">{{ skill.isActive ? '停用' : '启用' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
