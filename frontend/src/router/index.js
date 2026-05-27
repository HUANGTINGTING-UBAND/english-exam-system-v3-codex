import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ExamListView from '../views/ExamListView.vue'
import ExamView from '../views/ExamView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminView from '../views/AdminView.vue'
import AttemptDetailView from '../views/AttemptDetailView.vue'
import WrongPracticeView from '../views/WrongPracticeView.vue'
import AdminAttemptsView from '../views/AdminAttemptsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/exams',
    name: 'exams',
    component: ExamListView,
  },
  {
    path: '/exam/:examId',
    name: 'exam-detail',
    component: ExamView,
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
  },
  {
    path: '/attempts/:attemptId',
    name: 'attempt-detail',
    component: AttemptDetailView,
  },
  {
    path: '/wrong-practice/:wrongQuestionId',
    name: 'wrong-practice',
    component: WrongPracticeView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
  },
  {
  path: '/admin/attempts',
  name: 'admin-attempts',
  component: AdminAttemptsView,
},
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router