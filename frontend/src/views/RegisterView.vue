<template>
  <div class="auth-page">
    <div class="auth-card">
      <p class="tag">Register</p>
      <h1>注册</h1>
      <p class="auth-tip">当前阶段只完成表单界面，后续接入真实注册接口。</p>

      <label>
        用户名
        <input type="text" placeholder="请输入用户名" />
      </label>

      <label>
        昵称
        <input type="text" placeholder="请输入昵称" />
      </label>

      <label>
        密码
        <input type="password" placeholder="请输入密码" />
      </label>

      <label>
        学段
        <select>
          <option>小学</option>
          <option>初中</option>
          <option>高中</option>
          <option>大学</option>
        </select>
      </label>

      <button class="primary-btn">
        注册
      </button>
    </div>
  </div>
</template>