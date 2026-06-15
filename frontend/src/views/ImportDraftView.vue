<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  confirmImportJob,
  createImportJob,
  getImportJob,
  getImportJobs,
  reparseImportJob,
  resolveImportWarning,
  updateImportDraftMaterial,
  updateImportDraftQuestion,
} from '../api/examApi'

const jobs = ref([])
const selectedJob = ref(null)
const title = ref('')
const rawText = ref('')
const selectedFile = ref(null)
const errorMessage = ref('')
const successMessage = ref('')

const materialGroups = computed(() => {
  if (!selectedJob.value) return []

  return (selectedJob.value.materials || []).map((material) => {
    const localId = material.metadata?.localId
    return {
      material,
      questions: (selectedJob.value.questions || []).filter((question) => question.materialLocalId === localId),
    }
  }).filter((group) => group.questions.length > 0)
})

const loadJobs = async () => {
  jobs.value = await getImportJobs()
}

const refreshSelectedJob = async () => {
  if (selectedJob.value?.id) selectedJob.value = prepareJobForEdit(await getImportJob(selectedJob.value.id))
}

const handleFileChange = (event) => {
  selectedFile.value = event.target.files?.[0] || null
}

const handleCreate = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const job = await createImportJob({ title: title.value, rawText: rawText.value, file: selectedFile.value })
    successMessage.value = '导入草稿创建成功，请校对题目、材料和 warning 后确认入库。'
    title.value = ''
    rawText.value = ''
    selectedFile.value = null
    selectedJob.value = prepareJobForEdit(job)
    await loadJobs()
  } catch (error) {
    errorMessage.value = error.message || '创建导入草稿失败'
  }
}

const handleSelect = async (jobId) => {
  selectedJob.value = prepareJobForEdit(await getImportJob(jobId))
}

const saveQuestion = async (question) => {
  await updateImportDraftQuestion(question.id, {
    text: question.text,
    options: normalizeOptions(question.optionsText),
    answer: normalizeAnswer(question),
    explanation: question.explanation,
    type: question.type,
    score: question.score,
    knowledgePoint: question.knowledgePoint,
    referenceAnswer: question.referenceAnswer,
    materialLocalId: question.materialLocalId,
  })
  successMessage.value = '草稿题目已保存'
  await refreshSelectedJob()
}

const saveMaterial = async (material) => {
  await updateImportDraftMaterial(material.id, {
    title: material.title,
    content: material.content,
    type: material.type,
    fileName: material.fileName,
    fileUrl: material.fileUrl,
  })
  successMessage.value = '草稿材料已保存'
  await refreshSelectedJob()
}

const markWarningResolved = async (warning) => {
  await resolveImportWarning(warning.id)
  successMessage.value = 'warning 已标记处理'
  await refreshSelectedJob()
}

const handleReparse = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    selectedJob.value = prepareJobForEdit(await reparseImportJob(selectedJob.value.id, selectedJob.value.rawText || ''))
    successMessage.value = 'rawText 已重新解析，请继续校对草稿题目、材料和 warning。'
    await loadJobs()
  } catch (error) {
    errorMessage.value = error.message || '重新解析 rawText 失败'
  }
}

const handleConfirm = async () => {
  const confirmed = window.confirm('确认将当前草稿生成正式试卷？生成后将出现在试卷列表或管理页面中。')
  if (!confirmed) return
  const result = await confirmImportJob(selectedJob.value.id)
  successMessage.value = `确认入库成功，正式试卷 ID：${result.examId}`
  await refreshSelectedJob()
  await loadJobs()
}

const normalizeOptions = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean)
const normalizeAnswer = (question) => question.type === 'CHOICE' ? Number(question.answerText) : question.answerText

const prepareJobForEdit = (job) => {
  if (!job) return job
  return {
    ...job,
    questions: (job.questions || []).map((question) => ({
      ...question,
      optionsText: Array.isArray(question.options) ? question.options.join('\n') : '',
      answerText: question.answer ?? '',
      materialLocalId: question.metadata?.materialLocalId || '',
      typeHint: question.metadata?.typeHint || 'choice',
    })),
  }
}

onMounted(() => {
  loadJobs().catch((error) => { errorMessage.value = error.message || '导入草稿加载失败' })
})
</script>

<template>
  <div class="admin-page">
    <section class="admin-hero-card">
      <p class="tag">Import Draft</p>
      <h1>导入草稿校对与确认入库</h1>
      <p>上传 TXT / DOCX / 文字型 PDF 或粘贴文本后，系统只生成导入草稿；人工校对后再确认生成正式试卷。</p>
    </section>

    <div v-if="errorMessage" class="api-warning">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <section class="admin-section-card">
      <h2>创建导入任务</h2>
      <label>草稿标题<input v-model="title" type="text" placeholder="例如：八年级期末试卷导入草稿" /></label>
      <label>上传文件<input type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf" @change="handleFileChange" /></label>
      <label>或粘贴原始文本<textarea v-model="rawText" rows="10" placeholder="支持 [MATERIAL] / [QUESTION] 标准格式，也兼容基础题号、选项、答案格式"></textarea></label>
      <button class="primary-btn" @click="handleCreate">生成导入草稿</button>
    </section>

    <section class="admin-section-card">
      <h2>导入任务列表</h2>
      <div v-if="jobs.length === 0" class="empty-state">暂无导入草稿。</div>
      <div v-else class="admin-table-wrap"><table class="admin-table"><thead><tr><th>标题</th><th>状态</th><th>创建者</th><th>题目</th><th>材料</th><th>警告</th><th>操作</th></tr></thead><tbody>
        <tr v-for="job in jobs" :key="job.id"><td>{{ job.title }}</td><td>{{ job.status }}</td><td>{{ job.creator?.nickname || job.creator?.username || '-' }}</td><td>{{ job._count?.questions || 0 }}</td><td>{{ job._count?.materials || 0 }}</td><td>{{ job._count?.warnings || 0 }}</td><td><button class="secondary-btn" @click="handleSelect(job.id)">校对</button></td></tr>
      </tbody></table></div>
    </section>

    <section v-if="selectedJob" class="admin-section-card">
      <div class="section-header-row"><h2>草稿详情：{{ selectedJob.title }}</h2><button class="primary-btn" @click="handleConfirm">确认入库</button></div>
      <p class="question-meta"><span>rawText 长度：{{ (selectedJob.rawText || '').length }} 字符</span><span>当前草稿题目：{{ selectedJob.questions?.length || 0 }} 题</span></p>

      <h3>原始文本与重新解析</h3>
      <label>rawText（可编辑后重新解析）<textarea v-model="selectedJob.rawText" rows="8"></textarea></label>
      <button class="secondary-btn" @click="handleReparse">重新解析 rawText</button>

      <h3>Warnings</h3>
      <ul class="simple-list"><li v-for="warning in selectedJob.warnings" :key="warning.id">[{{ warning.level }}] {{ warning.code }} - {{ warning.message }} <span v-if="warning.isResolved">（已处理）</span><button v-else class="secondary-btn" @click="markWarningResolved(warning)">标记已处理</button></li></ul>

      <h3>草稿材料</h3>
      <div v-for="material in selectedJob.materials" :key="material.id" class="admin-form-card"><label>材料标题<input v-model="material.title" /></label><label>材料类型<input v-model="material.type" /></label><label>正文<textarea v-model="material.content" rows="5"></textarea></label><button class="secondary-btn" @click="saveMaterial(material)">保存材料</button></div>

      <h3>材料题组预览</h3>
      <div v-if="materialGroups.length === 0" class="empty-state">暂无材料题组。</div>
      <div v-for="group in materialGroups" :key="group.material.id" class="admin-form-card">
        <h4>{{ group.material.title || '材料' }}（{{ group.material.metadata?.localId }}）</h4>
        <p class="material-content">{{ group.material.content }}</p>
        <p class="question-meta">关联题目：{{ group.questions.map((question) => question.metadata?.questionNo || question.orderIndex).join('、') }}</p>
      </div>

      <h3>草稿题目</h3>
      <div v-for="question in selectedJob.questions" :key="question.id" class="admin-form-card"><p class="question-meta"><span>真实题型：{{ question.typeHint }}</span><span>题号：{{ question.metadata?.questionNo || question.orderIndex }}</span></p><label>题型<select v-model="question.type"><option>CHOICE</option><option>READING</option><option>CLOZE</option><option>TRANSLATION</option><option>WRITING</option><option>ERROR_CORRECTION</option></select></label><label>题干<textarea v-model="question.text" rows="3"></textarea></label><label v-if="['CHOICE', 'CLOZE'].includes(question.type)">选项（每行一个）<textarea v-model="question.optionsText" rows="4"></textarea></label><label>答案（选择题填 0/1/2/3）<input v-model="question.answerText" /></label><label>解析<textarea v-model="question.explanation" rows="2"></textarea></label><label>知识点<input v-model="question.knowledgePoint" /></label><label>分值<input v-model.number="question.score" type="number" min="0" /></label><label>材料ID<input v-model="question.materialLocalId" placeholder="如 reading-001" /></label><button class="secondary-btn" @click="saveQuestion(question)">保存题目</button></div>

    </section>
  </div>
</template>
