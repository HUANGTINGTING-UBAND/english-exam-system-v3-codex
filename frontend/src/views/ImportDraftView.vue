<script setup>
import { onMounted, ref } from 'vue'
import { createImportJob, getImportJob, getImportJobs } from '../api/examApi'

const jobs = ref([])
const selectedJob = ref(null)
const title = ref('')
const rawText = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const loadJobs = async () => {
  jobs.value = await getImportJobs()
}

const handleCreate = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const job = await createImportJob({
      title: title.value,
      rawText: rawText.value,
      warnings: [
        {
          level: 'INFO',
          code: 'MANUAL_DRAFT',
          message: '基础版导入草稿已创建，后续版本再接入文件解析与校对入库。',
        },
      ],
    })
    successMessage.value = '导入草稿创建成功'
    title.value = ''
    rawText.value = ''
    selectedJob.value = job
    await loadJobs()
  } catch (error) {
    errorMessage.value = error.message || '创建导入草稿失败'
  }
}

const handleSelect = async (jobId) => {
  selectedJob.value = await getImportJob(jobId)
}

onMounted(() => {
  loadJobs().catch((error) => {
    errorMessage.value = error.message || '导入草稿加载失败'
  })
})
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Import Draft</p>
      <h1>导入草稿</h1>
      <p>本轮提供基础草稿创建与 warning 展示，不直接写入正式题库。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <section class="admin-section-card">
      <h2>创建基础草稿</h2>
      <label>草稿标题<input v-model="title" type="text" placeholder="例如：八年级期末试卷导入草稿" /></label>
      <label>原始文本<textarea v-model="rawText" rows="8" placeholder="可粘贴试卷文本，复杂解析后续迭代"></textarea></label>
      <button class="primary-btn" @click="handleCreate">创建草稿</button>
    </section>

    <section class="admin-section-card">
      <h2>草稿列表</h2>
      <div v-if="jobs.length === 0" class="empty-state">暂无导入草稿。</div>
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>标题</th><th>状态</th><th>题目</th><th>材料</th><th>警告</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td>{{ job.title }}</td>
              <td>{{ job.status }}</td>
              <td>{{ job._count?.questions || 0 }}</td>
              <td>{{ job._count?.materials || 0 }}</td>
              <td>{{ job._count?.warnings || 0 }}</td>
              <td><button class="secondary-btn" @click="handleSelect(job.id)">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="selectedJob" class="admin-section-card">
      <h2>草稿详情：{{ selectedJob.title }}</h2>
      <h3>Warnings</h3>
      <ul class="simple-list">
        <li v-for="warning in selectedJob.warnings" :key="warning.id">[{{ warning.level }}] {{ warning.message }}</li>
      </ul>
      <h3>原始文本预览</h3>
      <pre>{{ selectedJob.rawText || '暂无原始文本' }}</pre>
    </section>
  </div>
</template>
