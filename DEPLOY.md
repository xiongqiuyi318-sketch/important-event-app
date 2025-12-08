# 部署到 Vercel 指南

## 一、部署步骤

### 1. 准备工作
- 确保代码已提交到 Git 仓库（GitHub、GitLab 或 Bitbucket）
- 如果没有仓库，需要先初始化 Git 并推送到远程仓库

### 2. 部署到 Vercel

**方法一：通过 Vercel 网站（推荐）**

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub/GitLab/Bitbucket 账号登录
3. 点击 "Add New Project"（新建项目）
4. 导入你的 Git 仓库
5. Vercel 会自动检测项目类型（Vite）
6. 点击 "Deploy"（部署）
   - **注意**：密码已在代码中设置为固定值，无需设置环境变量

**方法二：通过 Vercel CLI**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel

# 部署到生产环境
vercel --prod
```

### 3. 密码说明

- **访问密码**：`570508`
- 密码已固定设置在代码中，只有管理员可以修改
- 部署后，用户访问应用需要输入密码 `570508`

## 二、访问控制说明

### 密码保护功能
- 应用部署后，首次访问会要求输入密码
- 密码验证后，在当前浏览器会话期间（关闭浏览器标签页前）无需再次输入
- **访问密码**：`570508`
- 密码已固定设置在代码中，只有管理员可以修改代码来更改密码

### 安全性说明
⚠️ **注意**：这是前端密码保护，主要用于防止随意访问，不是高度安全方案。
- 密码会暴露在客户端代码中（经过打包）
- 适合：个人/小团队内部工具，防止误访问
- 不适合：敏感数据、金融系统等高安全性要求场景

### 更安全的方案（可选）
如果需要更强的安全性，可以考虑：
1. **Vercel Password Protection**（Pro 功能）
2. **Vercel IP Whitelisting**（Enterprise 功能）
3. **自定义后端认证**（需要添加后端服务）

## 三、更新密码

密码已固定设置在代码中，如需修改：
1. 修改 `src/components/PasswordProtection.tsx` 文件中的 `CORRECT_PASSWORD` 值
2. 提交代码更改到 Git 仓库
3. Vercel 会自动重新部署
4. 用户下次访问时需要输入新密码

## 四、本地测试

在部署前，可以在本地测试密码保护：

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173` 时会要求输入密码 `570508`

## 五、自定义域名（可选）

1. 在 Vercel 项目设置中点击 "Domains"（域名）
2. 添加你的自定义域名
3. 按照提示配置 DNS 记录

## 六、后续更新

代码更新后，Vercel 会自动重新部署：
- **Git Push**：推送到主分支会自动部署到生产环境
- **Pull Request**：会创建预览部署

---

## 常见问题

**Q: 访问密码是什么？**
A: 密码是 `570508`

**Q: 如何修改密码？**
A: 只有管理员可以修改。需要修改 `src/components/PasswordProtection.tsx` 文件中的 `CORRECT_PASSWORD` 值，然后重新部署。

**Q: 如何移除密码保护？**
A: 删除 `src/App.tsx` 中的 `<PasswordProtection>` 包装组件

**Q: 数据会同步吗？**
A: 不会。数据存储在浏览器的 localStorage 中，每个用户的数据是独立的
