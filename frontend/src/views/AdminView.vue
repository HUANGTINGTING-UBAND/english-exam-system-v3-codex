<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getSavedUser } from '../api/authApi'
import {
  createAdminExam,
  deleteAdminQuestion,
  getAdminExamQuestions,
  getAdminExams,
  importQuestionsToExam,
  parseQuestionFile,
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

const selectedExamId = ref('')
const selectedFile = ref(null)
const parsedQuestions = ref([])
const parsedFileName = ref('')
const isParsingFile = ref(false)
const isImportingQuestions = ref(false)
const showImportExample = ref(false)

const selectedQuestionExamId = ref('')
const selectedQuestionExamTitle = ref('')
const adminQuestions = ref([])
const isLoadingQuestions = ref(false)

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

const typeNameMap = {
  CHOICE: '单选题',
  TRANSLATION: '翻译题',
  ERROR_CORRECTION: '改错题',
  WRITING: '写作题',
  READING: '阅读理解',
  CLOZE: '完形填空',
}

const importExampleText = `【单选题】
1. She ___ to school every day.
A. go
B. goes
C. went
D. going
答案：B
解析：主语 She 是第三人称单数，一般现在时动词要加 s。
知识点：一般现在时
分值：2

【翻译题】
2. 请将下面句子翻译成英文：我喜欢学习英语。
参考答案：I like learning English.
解析：like doing something 表示喜欢做某事。
知识点：翻译
分值：5

【改错题】
3. He go to school yesterday. 请改正。
参考答案：He went to school yesterday.
解析：yesterday 表示过去时间，go 应改为 went。
知识点：一般过去时
分值：5

【写作题】
4. 请以 My Family 为题写一篇不少于 50 词的短文。
参考答案：I have a happy family.
解析：文章应包含家庭成员、人物特点和情感表达。
知识点：写作
分值：10`

const formatTimeLimit = (seconds) => {
  return `${Math.round(Number(seconds || 0) / 60)} 分钟`
}

const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return '暂无'
  }

  return new Date(dateValue).toLocaleString()
}

const formatAnswer = (question) => {
  if (question.answer === null || question.answer === undefined || question.answer === '') {
    return '暂无'
  }

  if (question.type === 'CHOICE' && Array.isArray(question.options)) {
    const index = Number(question.answer)
    const option = question.options[index]

    if (option) {
      return `${String.fromCharCode(65 + index)}. ${option}`
    }
  }

  return String(question.answer)
}

const loadAdminExams = async () => {
  if (!isAdmin.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    exams.value = await getAdminExams()

    if (!selectedExamId.value && exams.value.length > 0) {
      selectedExamId.value = exams.value[0].id
    }
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
    const createdExam = await createAdminExam({
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
    selectedExamId.value = createdExam.id
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

const handleFileChange = (event) => {
  const file = event.target.files?.[0]

  selectedFile.value = file || null
  parsedQuestions.value = []
  parsedFileName.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

const handleParseFile = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedFile.value) {
    errorMessage.value = '请先选择 .txt 或 .docx 试卷文件'
    return
  }

  isParsingFile.value = true

  try {
    const result = await parseQuestionFile(selectedFile.value)

    parsedFileName.value = result.fileName
    parsedQuestions.value = result.questions || []

    successMessage.value = `文件解析成功，共识别 ${result.questionCount || parsedQuestions.value.length} 道题`
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '文件解析失败'
  } finally {
    isParsingFile.value = false
  }
}

const handleImportQuestions = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!selectedExamId.value) {
    errorMessage.value = '请选择要导入题目的试卷'
    return
  }

  if (parsedQuestions.value.length === 0) {
    errorMessage.value = '当前没有可导入的题目'
    return
  }

  const confirmed = window.confirm(
    `确认将 ${parsedQuestions.value.length} 道题导入所选试卷吗？`
  )

  if (!confirmed) {
    return
  }

  isImportingQuestions.value = true

  try {
    const createdQuestions = await importQuestionsToExam(
      selectedExamId.value,
      parsedQuestions.value
    )

    successMessage.value = `题目导入成功，共导入 ${createdQuestions.length} 道题`
    parsedQuestions.value = []
    selectedFile.value = null
    parsedFileName.value = ''
    await loadAdminExams()

    if (selectedQuestionExamId.value === selectedExamId.value) {
      await handleLoadQuestionsByExamId(selectedExamId.value)
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '题目导入失败'
  } finally {
    isImportingQuestions.value = false
  }
}

const copyImportExample = async () => {
  try {
    await navigator.clipboard.writeText(importExampleText)
    successMessage.value = '标准导入格式已复制，可以粘贴到 txt 或 docx 文件中。'
  } catch (error) {
    console.error(error)
    errorMessage.value = '复制失败，请手动复制示例文本。'
  }
}

const handleLoadQuestions = async (exam) => {
  selectedQuestionExamId.value = exam.id
  selectedQuestionExamTitle.value = exam.title
  await handleLoadQuestionsByExamId(exam.id)
}

const handleLoadQuestionsByExamId = async (examId) => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoadingQuestions.value = true

  try {
    adminQuestions.value = await getAdminExamQuestions(examId)
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '题目列表加载失败'
  } finally {
    isLoadingQuestions.value = false
  }
}

const handleDeleteQuestion = async (question) => {
  const confirmed = window.confirm(
    `确认删除第 ${question.orderIndex} 题吗？删除后学生端将不再显示这道题。`
  )

  if (!confirmed) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteAdminQuestion(question.id)

    successMessage.value = '题目删除成功'
    await loadAdminExams()

    if (selectedQuestionExamId.value) {
      await handleLoadQuestionsByExamId(selectedQuestionExamId.value)
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = error.message || '题目删除失败'
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
          你当前拥有管理员权限。现在可以查看数据库试卷、新增试卷，并通过文件批量导入题目。
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

        <div class="admin-import-card">
          <h2>批量导入题目</h2>

          <p class="import-tip">
            支持上传 .txt 或 .docx 文件。建议使用标准格式：题型标题、题号、选项、答案、解析、知识点、分值。
          </p>

          <div class="import-example-actions">
            <button
              class="secondary-btn"
              @click="showImportExample = !showImportExample"
            >
              {{ showImportExample ? '收起格式示例' : '查看标准格式示例' }}
            </button>

            <button
              class="secondary-btn"
              @click="copyImportExample"
            >
              复制示例文本
            </button>
          </div>

          <div v-if="showImportExample" class="import-example-box">
            <pre>{{ importExampleText }}</pre>
          </div>

          <label>
            选择目标试卷
            <select v-model="selectedExamId">
              <option
                v-for="exam in exams"
                :key="exam.id"
                :value="exam.id"
              >
                {{ exam.title }}
              </option>
            </select>
          </label>

          <label>
            上传试卷文件
            <input
              type="file"
              accept=".txt,.docx"
              @change="handleFileChange"
            />
          </label>

          <div class="admin-import-actions">
            <button
              class="secondary-btn"
              :disabled="isParsingFile"
              @click="handleParseFile"
            >
              {{ isParsingFile ? '解析中……' : '解析文件' }}
            </button>

            <button
              class="primary-btn"
              :disabled="isImportingQuestions || parsedQuestions.length === 0"
              @click="handleImportQuestions"
            >
              {{ isImportingQuestions ? '导入中……' : '确认导入题目' }}
            </button>
          </div>

          <p v-if="parsedFileName" class="import-file-name">
            当前文件：{{ parsedFileName }}
          </p>

          <div v-if="parsedQuestions.length > 0" class="parsed-question-list">
            <h3>解析预览：{{ parsedQuestions.length }} 道题</h3>

            <div
              v-for="question in parsedQuestions"
              :key="question.orderIndex"
              class="parsed-question-item"
            >
              <p class="tag">
                {{ typeNameMap[question.type] || question.type }}
              </p>

              <h4>
                {{ question.orderIndex }}. {{ question.text }}
              </h4>

              <ul v-if="question.options && question.options.length > 0">
                <li
                  v-for="(option, index) in question.options"
                  :key="option"
                >
                  {{ String.fromCharCode(65 + index) }}. {{ option }}
                </li>
              </ul>

              <p>答案：{{ question.answer }}</p>
              <p>知识点：{{ question.knowledgePoint }}</p>
              <p>分值：{{ question.score }}</p>
              <p v-if="question.explanation">解析：{{ question.explanation }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-list-card admin-full-card">
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
                @click="handleLoadQuestions(exam)"
              >
                查看题目
              </button>

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

      <div v-if="selectedQuestionExamId" class="admin-question-card">
        <div class="section-title-row">
          <h2>题目列表：{{ selectedQuestionExamTitle }}</h2>
          <button
            class="secondary-btn"
            @click="handleLoadQuestionsByExamId(selectedQuestionExamId)"
          >
            刷新题目
          </button>
        </div>

        <div v-if="isLoadingQuestions" class="loading-box">
          正在加载题目……
        </div>

        <div v-else-if="adminQuestions.length > 0" class="admin-question-list">
          <div
            v-for="question in adminQuestions"
            :key="question.id"
            class="admin-question-item"
          >
            <div class="admin-question-header">
              <span class="question-order">
                第 {{ question.orderIndex }} 题
              </span>

              <span class="question-type">
                {{ typeNameMap[question.type] || question.type }}
              </span>

              <span class="question-score">
                {{ question.score }} 分
              </span>
            </div>

            <h3>{{ question.text }}</h3>

            <ul v-if="question.options && question.options.length > 0">
              <li
                v-for="(option, index) in question.options"
                :key="option"
              >
                {{ String.fromCharCode(65 + index) }}. {{ option }}
              </li>
            </ul>

            <p>
              <strong>答案：</strong>{{ formatAnswer(question) }}
            </p>

            <p>
              <strong>知识点：</strong>{{ question.knowledgePoint || '未分类' }}
            </p>

            <p v-if="question.referenceAnswer">
              <strong>参考答案：</strong>{{ question.referenceAnswer }}
            </p>

            <p v-if="question.explanation">
              <strong>解析：</strong>{{ question.explanation }}
            </p>

            <div class="admin-question-actions">
              <button
                class="danger-btn"
                @click="handleDeleteQuestion(question)"
              >
                删除题目
              </button>
            </div>
          </div>
        </div>

        <p v-else class="empty-text">
          当前试卷暂无题目。
        </p>
      </div>
    </section>
  </div>
</template>