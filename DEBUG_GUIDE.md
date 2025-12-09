# 调试指南

## 方法 1：在浏览器中调试（最简单）

### 步骤：
1. **启动开发服务器**（在终端中运行）：
   ```bash
   npm run dev
   ```

2. **等待服务器启动**，你会看到类似这样的输出：
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

3. **在浏览器中打开** `http://localhost:5173`

4. **打开浏览器开发者工具**：
   - 按 `F12` 或 `Ctrl+Shift+I`
   - 或者右键点击页面 → "检查"

5. **设置断点**：
   - 在 Sources 标签页中找到你的源代码
   - 点击行号左侧设置断点
   - 刷新页面或触发相应操作

6. **查看控制台**：
   - 在 Console 标签页查看日志和错误
   - 使用 `console.log()` 输出调试信息

## 方法 2：在 VS Code/Cursor 中调试

### 前提条件：
- 确保开发服务器正在运行（`npm run dev`）
- 安装 Chrome 浏览器

### 步骤：
1. **在代码中设置断点**：点击行号左侧

2. **启动调试**：
   - 按 `F5` 键
   - 或点击左侧调试面板（虫子图标）
   - 选择 "Debug React in Chrome"

3. **Chrome 会自动打开**，并在断点处暂停

4. **使用调试工具栏**：
   - `F10` - 单步跳过
   - `F11` - 单步进入
   - `Shift+F11` - 单步跳出
   - `F5` - 继续执行

## 常见问题

### 问题 1：无法访问 localhost:5173
**解决方案**：
- 检查服务器是否正在运行
- 尝试使用 `http://127.0.0.1:5173` 代替 `localhost`
- 检查防火墙设置

### 问题 2：断点不生效
**解决方案**：
- 确保在源代码文件中设置断点（不是编译后的文件）
- 检查 source maps 是否启用（已在 vite.config.ts 中配置）
- 清除浏览器缓存并刷新

### 问题 3：调试器无法连接
**解决方案**：
- 确保开发服务器在运行
- 检查端口 5173 是否被占用
- 尝试重启 VS Code/Cursor

## 调试技巧

1. **使用 console.log()**：
   ```typescript
   console.log('变量值:', variable);
   console.table(arrayData);
   ```

2. **使用 React DevTools**：
   - 安装 Chrome 扩展 "React Developer Tools"
   - 可以查看组件状态和 props

3. **使用 Network 标签**：
   - 查看 API 请求和响应
   - 检查资源加载情况

4. **使用 Performance 标签**：
   - 分析应用性能
   - 查找性能瓶颈




