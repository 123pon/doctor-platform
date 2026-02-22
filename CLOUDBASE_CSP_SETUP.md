# 腾讯云Cloudbase CSP配置指南

## 问题说明
登录后访问时出现"加载中"卡住，控制台报错 CSP blocked eval。这是因为腾讯云Cloudbase在服务器响应头设置了严格的CSP策略。

## 解决方案

### 方案1：通过Cloudbase控制台配置（推荐）

1. 登录 [腾讯云Cloudbase控制台](https://console.cloud.tencent.com/tcb)
2. 进入你的环境 → **静态网站托管**
3. 找到 **设置** → **响应头配置**
4. 添加或修改 `Content-Security-Policy` 响应头：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ufupwqkutrdutmcsspfx.supabase.co; base-uri 'self'; form-action 'self';
```

5. 保存后重新访问

### 方案2：使用cloudbaserc.json配置

已为你创建了 `cloudbaserc.json` 配置文件，在下次部署时会自动应用。

**部署命令：**
```bash
# 安装Cloudbase CLI（如果还没安装）
npm install -g @cloudbase/cli

# 登录
tcb login

# 使用配置文件部署
tcb framework deploy
```

### 方案3：临时解决（测试用）

如果你想快速测试，可以暂时：
1. 在浏览器中访问 `chrome://flags` (Chrome) 或 `about:config` (Firefox)
2. 搜索并禁用 CSP 检查（**仅用于开发测试，不要在生产环境使用**）

## CSP策略说明

- `script-src 'unsafe-eval'` - 允许 Supabase SDK 和 React 使用动态代码执行
- `connect-src *.supabase.co` - 允许连接到 Supabase 服务器
- `wss://*.supabase.co` - 允许 WebSocket 实时订阅

## 验证是否生效

配置后，打开浏览器开发者工具（F12）：
1. Network 标签 → 刷新页面 → 点击第一个HTML请求
2. Response Headers 中应该看到你配置的 `Content-Security-Policy`
3. Console 标签不应再有 CSP 错误

## 常见问题

**Q: 配置后仍然报错？**
A: 清除浏览器缓存（Ctrl+Shift+Delete）后重试

**Q: Cloudbase控制台找不到响应头配置？**
A: 部分版本可能没有图形界面，使用方案2的CLI部署即可

**Q: 想要更严格的安全策略？**
A: 可以移除 `'unsafe-eval'`，但需要修改 Supabase 客户端配置使用 bundle 模式
