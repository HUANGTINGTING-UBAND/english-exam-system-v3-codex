<script setup>
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { mockExams } from '../data/mockExams'
import { mockQuestions } from '../data/mockQuestions'

const route = useRoute()
const isStarted = ref(false)
const currentQuestionIndex = ref(0)
const userAnswers = ref({})
const subjectiveScores = ref({})
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
const subjectiveQuestions = computed(() => {
  return currentQuestions.value.filter((question) => question.type !== 'choice')
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

const subjectiveScore = computed(() => {
  return subjectiveQuestions.value.reduce((total, question) => {
    const score = Number(subjectiveScores.value[question.id] || 0)
    return total + score
  }, 0)
})

const totalScore = computed(() => {
  return objectiveScore.value + subjectiveScore.value
})

const accuracyRate = computed(() => {
  if (!currentExam.value || currentExam.value.totalScore === 0) {
    return 0
  }

  return Math.round((totalScore.value / currentExam.value.totalScore) * 100)
})

const weakKnowledgePoints = computed(() => {
  const pointMap = {}

  currentQuestions.value.forEach((question) => {
    const pointName = question.knowledgePoint || '未分类'
    const questionScore = getQuestionScore(question)

    if (!pointMap[pointName]) {
      pointMap[pointName] = {
        name: pointName,
        totalScore: 0,
        earnedScore: 0,
      }
    }

    pointMap[pointName].totalScore += question.score
    pointMap[pointName].earnedScore += questionScore
  })

  return Object.values(pointMap)
    .map((point) => {
      const lostScore = point.totalScore - point.earnedScore
      const lossRate = point.totalScore === 0
        ? 0
        : Math.round((lostScore / point.totalScore) * 100)

      return {
        ...point,
        lostScore,
        lossRate,
      }
    })
    .sort((a, b) => b.lossRate - a.lossRate)
    .slice(0, 3)
})

const getChoiceAnswerText = (question, answerIndex) => {
  if (answerIndex === undefined || answerIndex === '') {
    return '未作答'
  }

  const optionText = question.options?.[answerIndex]

  if (!optionText) {
    return '未作答'
  }

  return `${String.fromCharCode(65 + answerIndex)}. ${optionText}`
}

const isChoiceCorrect = (question) => {
  return userAnswers.value[question.id] === question.answer
}

const getQuestionScore = (question) => {
  if (question.type === 'choice') {
    return isChoiceCorrect(question) ? question.score : 0
  }

  return Number(subjectiveScores.value[question.id] || 0)
}

const saveSubjectiveScore = (question, scoreValue) => {
  const score = Number(scoreValue)

  if (Number.isNaN(score)) {
    subjectiveScores.value[question.id] = 0
    return
  }

  if (score < 0) {
    subjectiveScores.value[question.id] = 0
    return
  }

  if (score > question.score) {
    subjectiveScores.value[question.id] = question.score
    return
  }

  subjectiveScores.value[question.id] = score
}

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

const knowledgeAdviceMap = {
  动词时态: '建议复习一般现在时、一般过去时和现在完成时，整理常见不规则动词变化。',
  翻译: '建议每天练习 5 句中译英，重点关注语序、时态和固定搭配。',
  动词过去式: '建议集中复习过去时间标志词，如 yesterday、last week，并背熟常见动词过去式。',
  写作: '建议积累开头句、过渡句和结尾句，每周完成 2 篇短文训练表达结构。',
  基础词汇: '建议每天复习 10 个基础高频词，并结合图片或例句记忆。',
  'be 动词': '建议复习 am、is、are 与不同主语的搭配，并通过造句巩固。',
}

const getQuestionTypeName = (type) => {
  return questionTypeMap[type] || '未知题型'
}

const getKnowledgeAdvice = (pointName) => {
  return knowledgeAdviceMap[pointName] || '建议回看本知识点相关错题，整理错误原因，并进行专项练习。'
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
       <div class="result-header">
         <div>
           <p class="tag">Result</p>
             <h2>考试结果</h2>
          </div>

          <span class="submitted-badge">
            已提交
          </span>
        </div>

        <p class="result-desc">
         本次考试已完成提交，系统已根据选择题自动评分，并结合主观题自评分生成当前成绩。
       </p>

       <div class="score-summary">
         <div class="score-item score-main">
           <span>最终得分</span>
           <strong>{{ totalScore }} / {{ currentExam.totalScore }}</strong>
         </div>

         <div class="score-item">
           <span>正确率</span>
           <strong>{{ accuracyRate }}%</strong>
         </div>

         <div class="score-item">
           <span>客观题得分</span>
           <strong>{{ objectiveScore }} 分</strong>
         </div>

         <div class="score-item">
           <span>主观题自评分</span>
           <strong>{{ subjectiveScore }} 分</strong>
         </div>

         <div class="score-item">
           <span>选择题正确数</span>
           <strong>{{ correctChoiceCount }} / {{ choiceQuestions.length }}</strong>
         </div>
       </div>
       
       <div class="weak-points-section">
         <h3>薄弱项分析</h3>

         <div v-if="weakKnowledgePoints.length > 0" class="weak-point-list">
           <div
             v-for="point in weakKnowledgePoints"
             :key="point.name"
             class="weak-point-item"
            >
             <div>
               <strong>{{ point.name }}</strong>
               <p>
                 得分 {{ point.earnedScore }} / {{ point.totalScore }}，
                 失分 {{ point.lostScore }} 分
               </p>
               <p class="advice-text">
                 建议：{{ getKnowledgeAdvice(point.name) }}
               </p>
             </div>

             <span class="loss-rate">
               失分率 {{ point.lossRate }}%
             </span>
         </div>
       
        </div>
         <p v-else class="empty-text">
           暂无薄弱项数据。
          </p>
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
        
        <div v-if="isSubmitted" class="question-result-box">
          <template v-if="currentQuestion.type === 'choice'">
           <p>
             <strong>你的答案：</strong>
             {{ getChoiceAnswerText(currentQuestion, userAnswers[currentQuestion.id]) }}
           </p>

           <p>
             <strong>正确答案：</strong>
             {{ getChoiceAnswerText(currentQuestion, currentQuestion.answer) }}
           </p>

           <p>
             <strong>结果：</strong>
             <span :class="isChoiceCorrect(currentQuestion) ? 'result-correct' : 'result-wrong'">
               {{ isChoiceCorrect(currentQuestion) ? '正确' : '错误' }}
             </span>
           </p>

           <p>
             <strong>得分：</strong>
             {{ getQuestionScore(currentQuestion) }} / {{ currentQuestion.score }}
           </p>
         </template>

         <template v-else>
           <p>
             <strong>你的答案：</strong>
             {{ userAnswers[currentQuestion.id] || '未作答' }}
           </p>

           <p>
             <strong>参考答案：</strong>
             {{ currentQuestion.referenceAnswer || '暂无参考答案' }}
           </p>

           <div class="subjective-score-control">
             <label>
               本题自评分：
               <input
                 type="number"
                 min="0"
                 :max="currentQuestion.score"
                 :value="subjectiveScores[currentQuestion.id] || 0"
                 @input="saveSubjectiveScore(currentQuestion, $event.target.value)"
               />
               / {{ currentQuestion.score }} 分
             </label>
           </div>
         </template>

           <p v-if="currentQuestion.explanation">
              <strong>解析：</strong>{{ currentQuestion.explanation }}
           </p>
        </div>

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