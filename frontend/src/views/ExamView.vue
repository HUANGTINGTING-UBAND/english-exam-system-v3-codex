<script setup>
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { mockExams } from '../data/mockExams'
import { mockQuestions } from '../data/mockQuestions'

const route = useRoute()

const isStarted = ref(false)
const currentQuestionIndex = ref(0)
const userAnswers = ref({})
const isSubmitted = ref(false)
const examId = computed(() => route.params.examId)

const currentExam = computed(() => {
  return mockExams.find((exam) => exam.id === examId.value)
})

const currentQuestions = computed(() => {
  return mockQuestions.filter((question) => question.examId === examId.value)
})

const currentQuestion = computed(() => {
  return currentQuestions.value[currentQuestionIndex.value]
})

const answeredCount = computed(() => {
  return currentQuestions.value.filter((question) => {
    const answer = userAnswers.value[question.id]
    return answer !== undefined && answer !== ''
  }).length
})
const unansweredCount = computed(() => {
  return currentQuestions.value.length - answeredCount.value
})

const choiceQuestions = computed(() => {
  return currentQuestions.value.filter((question) => question.type === 'choice')
})

const objectiveScore = computed(() => {
  return choiceQuestions.value.reduce((total, question) => {
    const userAnswer = userAnswers.value[question.id]

    if (userAnswer === question.answer) {
      return total + question.score
    }

    return total
  }, 0)
})

const correctChoiceCount = computed(() => {
  return choiceQuestions.value.filter((question) => {
    const userAnswer = userAnswers.value[question.id]
    return userAnswer === question.answer
  }).length
})

const isCurrentQuestionAnswered = computed(() => {
  if (!currentQuestion.value) {
    return false
  }

  const answer = userAnswers.value[currentQuestion.value.id]
  return answer !== undefined && answer !== ''
})

const isQuestionAnswered = (questionId) => {
  const answer = userAnswers.value[questionId]
  return answer !== undefined && answer !== ''
}

const formatTimeLimit = (seconds) => {
  return Math.round(seconds / 60)
}

const questionTypeMap = {
  choice: '单选题',
  translation: '翻译题',
  error_correction: '改错题',
  writing: '写作题',
  reading: '阅读理解',
  cloze: '完形填空',
}

const getQuestionTypeName = (type) => {
  return questionTypeMap[type] || '未知题型'
}

const startExam = () => {
  isStarted.value = true
  currentQuestionIndex.value = 0
}

const goBackToPreview = () => {
  isStarted.value = false
}
const saveChoiceAnswer = (questionId, optionIndex) => {
  if (isSubmitted.value) {
    return
  }

  userAnswers.value[questionId] = optionIndex
}

const saveTextAnswer = (questionId, answerText) => {
  if (isSubmitted.value) {
    return
  }

  userAnswers.value[questionId] = answerText
}
const goToPreviousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value -= 1
  }
}

const goToNextQuestion = () => {
  if (currentQuestionIndex.value < currentQuestions.value.length - 1) {
    currentQuestionIndex.value += 1
  }
}

const goToQuestion = (index) => {
  currentQuestionIndex.value = index
}

const submitExam = () => {
  if (unansweredCount.value > 0) {
    const confirmed = window.confirm(
      `你还有 ${unansweredCount.value} 道题未作答，确认提交吗？`
    )

    if (!confirmed) {
      return
    }
  } else {
    const confirmed = window.confirm('确认提交试卷吗？提交后将不能修改答案。')

    if (!confirmed) {
      return
    }
  }

  isSubmitted.value = true
}

</script>

<template>
  <div class="exam-page">
    <div v-if="currentExam && !isStarted" class="exam-start-card">
      <p class="tag">Exam Preview</p>
      <h1>{{ currentExam.title }}</h1>
      <p class="exam-desc">{{ currentExam.description }}</p>

      <div class="exam-info-grid">
        <div class="exam-info-item">
          <span class="info-label">题目数量</span>
          <strong>{{ currentExam.questionCount }} 题</strong>
        </div>

        <div class="exam-info-item">
          <span class="info-label">试卷满分</span>
          <strong>{{ currentExam.totalScore }} 分</strong>
        </div>

        <div class="exam-info-item">
          <span class="info-label">考试时间</span>
          <strong>{{ formatTimeLimit(currentExam.timeLimit) }} 分钟</strong>
        </div>
      </div>

      <div class="exam-notice">
        <h2>考试说明</h2>
        <ul>
          <li>点击“开始考试”后，系统将进入正式答题页面。</li>
          <li>后续版本会加入倒计时、自动保存、提交评分和薄弱项分析。</li>
          <li>当前阶段先展示试卷题目预览，用于验证题目数据读取。</li>
        </ul>
      </div>

      <section class="question-preview-section">
        <h2>本卷题目预览</h2>

        <div v-if="currentQuestions.length > 0" class="question-preview-list">
          <div
            v-for="(question, index) in currentQuestions"
            :key="question.id"
            class="question-preview-card"
          >
            <p class="question-index">第 {{ index + 1 }} 题</p>
            <h3>{{ question.text }}</h3>

            <div class="question-meta">
              <span>题型：{{ getQuestionTypeName(question.type) }}</span>
              <span>知识点：{{ question.knowledgePoint }}</span>
              <span>分值：{{ question.score }} 分</span>
            </div>
          </div>
        </div>

        <p v-else class="empty-text">
          当前试卷暂未配置题目。
        </p>
      </section>

      <button class="primary-btn start-exam-btn" @click="startExam">
        开始考试
      </button>

      <RouterLink class="back-link" to="/exams">
        返回试卷列表
      </RouterLink>
    </div>
    <div v-else-if="currentExam && isStarted" class="exam-answer-card">
      <div class="answer-header">
       <div>
         <p class="tag">Answering</p>
         <h1>{{ currentExam.title }}</h1>
         <p class="answer-progress">
         已答 {{ answeredCount }} / 共 {{ currentQuestions.length }} 题
         </p>
       </div>

       <div class="answer-header-actions">
         <button class="secondary-btn" @click="goBackToPreview">
           返回说明页
         </button>

         <button
           v-if="!isSubmitted"
           class="primary-btn"
           @click="submitExam"
          >
           提交试卷
          </button>

          <span v-else class="submitted-badge">
           已提交
          </span>
       </div>
      </div>  
 
      <div class="question-nav">
       <button
         v-for="(question, index) in currentQuestions"
         :key="question.id"
         class="question-nav-item"
         :class="{
         active: index === currentQuestionIndex,
         answered: isQuestionAnswered(question.id),
         }"
         @click="goToQuestion(index)"
        >
         {{ index + 1 }}
        </button>
      </div>
      
     <div v-if="isSubmitted" class="submit-result-box">
       <h2>试卷已提交</h2>
       <p>当前阶段已完成选择题自动评分，主观题评分将在后续步骤继续完善。</p>

       <div class="score-summary">
        <div class="score-item">
         <span>客观题得分</span>
          <strong>{{ objectiveScore }} 分</strong>
        </div>

        <div class="score-item">
         <span>选择题正确数</span>
         <strong>{{ correctChoiceCount }} / {{ choiceQuestions.length }}</strong>
        </div>
       </div>
     </div>

      <div v-if="currentQuestion" class="answer-question-card">
        <p class="question-index">
          第 {{ currentQuestionIndex + 1 }} 题 / 共 {{ currentQuestions.length }} 题
        </p>

        <p
         class="answer-status"
         :class="{ answered: isCurrentQuestionAnswered }"
        >
         {{ isCurrentQuestionAnswered ? '当前题：已答' : '当前题：未答' }}
        </p>

        <h2>{{ currentQuestion.text }}</h2>

        <div class="question-meta">
          <span>题型：{{ getQuestionTypeName(currentQuestion.type) }}</span>
          <span>知识点：{{ currentQuestion.knowledgePoint }}</span>
          <span>分值：{{ currentQuestion.score }} 分</span>
        </div>

        <div v-if="currentQuestion.type === 'choice'" class="choice-options">
          <label
            v-for="(option, index) in currentQuestion.options"
            :key="option"
            class="choice-option"
          >
            <input
             type="radio"
             :name="currentQuestion.id"
             :checked="userAnswers[currentQuestion.id] === index"
             :disabled="isSubmitted"
             @change="saveChoiceAnswer(currentQuestion.id, index)"
            />
            <span>{{ String.fromCharCode(65 + index) }}. {{ option }}</span>
          </label>
        </div>

        <textarea
         v-else
         class="subjective-answer"
         placeholder="请在这里输入你的答案"
         :value="userAnswers[currentQuestion.id] || ''"
         :disabled="isSubmitted"
         @input="saveTextAnswer(currentQuestion.id, $event.target.value)"
        ></textarea>
        
        <div class="question-actions">
          <button
            class="secondary-btn"
            :disabled="currentQuestionIndex === 0"
            @click="goToPreviousQuestion"
          >
            上一题
          </button>

          <button
            class="primary-btn"
            :disabled="currentQuestionIndex === currentQuestions.length - 1"
            @click="goToNextQuestion"
          >
            下一题
          </button>
        </div>
      </div>

      <p v-else class="empty-text">
        当前试卷暂无可作答题目。
      </p>
    </div>

    <div v-else class="page-placeholder">
      <h1>试卷不存在</h1>
      <p>没有找到 ID 为 {{ examId }} 的试卷，请返回试卷列表重新选择。</p>

      <RouterLink class="primary-btn" to="/exams">
        返回试卷列表
      </RouterLink>
    </div>
  </div>
</template>