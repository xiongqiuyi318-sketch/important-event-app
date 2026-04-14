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
   - **注意**：请先在 Vercel 项目中配置 Supabase 环境变量（见下文）

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

### 3. 配置 Supabase 环境变量

在 Vercel 的 Project Settings -> Environment Variables 中配置：

- `VITE_STORAGE_PROVIDER` = `supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EVENT_IMAGE_BUCKET` = `event-images`
- `VITE_EVENT_EXCEL_BUCKET` = `event-excel`
- `VITE_EVENT_PDF_BUCKET` = `event-pdf`

配置完成后重新部署，编辑者登录才可正常使用。

### 4. 初始化 Storage Buckets（首次部署必做）

在 Supabase Dashboard -> Storage -> Buckets 中确认以下桶存在：

- `event-images`
- `event-excel`
- `event-pdf`

建议首次部署后做一次最小验证：

1. 进入任意桶上传一个小文件
2. 预览或下载该文件（验证读取）
3. 删除该文件（验证删除）

## 二、访问控制说明

### 登录与访问模式
- 应用支持两种访问模式：访客（只读）和编辑者（可新增/修改）。
- 编辑者通过 Supabase 邮箱密码登录。
- 同设备会长期保持编辑者登录状态（依赖 Supabase session + refresh token），直到手动退出或令牌失效。
- 访客模式也会在同设备被记住，便于长期只读使用。

### 安全性说明
⚠️ **注意**：前端只负责展示和登录入口，真正的读写权限应由 Supabase RLS 策略控制。
- 建议所有写操作仅允许认证编辑者执行。
- 建议匿名用户仅保留只读权限。

### 更安全的方案（可选）
如果需要更强的安全性，可以考虑：
1. **Vercel Password Protection**（Pro 功能）
2. **Vercel IP Whitelisting**（Enterprise 功能）
3. **自定义后端认证**（需要添加后端服务）

## 三、更新编辑者账号

编辑者账号由 Supabase Authentication 管理：
1. 在 Supabase 控制台新增或禁用用户
2. 必要时重置用户密码
3. 用户下次登录时使用最新凭据

## 四、本地测试

在部署前，可以在本地测试登录流程：

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173` 后：
- 可选择访客进入（只读）
- 或使用 Supabase 编辑者账号登录

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
A: 当前版本不使用固定前端密码。编辑者通过 Supabase 账号密码登录，访客可只读进入。

**Q: 如何修改登录密码？**
A: 在 Supabase 控制台为对应编辑者账号重置密码即可，无需改前端代码。

**Q: 如何移除密码保护？**
A: 删除 `src/App.tsx` 中的 `<PasswordProtection>` 包装组件

**Q: 数据会同步吗？**
A: 不会。数据存储在浏览器的 localStorage 中，每个用户的数据是独立的
