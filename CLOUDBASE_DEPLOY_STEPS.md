# CloudBase 部署步骤（固定二维码到应用 A）

适用场景：同一 CloudBase 环境下有多个前端应用（A/B），你要确保患者端二维码永远跳到 A。

## 0) 前提确认

- 项目根目录：`doctor-platform`
- 前端发布子路径：`/doctor-platform`
- 本项目已配置：
  - `package.json` 中 `homepage: /doctor-platform`
  - `cloudbaserc.json` 中 `cloudPath: /doctor-platform`

## 1) 配置构建环境变量（关键）

二维码地址在构建期写入，必须在构建前设置：

```bash
export REACT_APP_BIND_BASE_URL="https://你的A访问域名/doctor-platform"
```

示例：

```bash
export REACT_APP_BIND_BASE_URL="https://example.com/doctor-platform"
```

> 注意：必须包含子路径 `/doctor-platform`，否则可能跳到根站点（例如 B）。

## 2) 本地构建并检查

```bash
npm run build
```

可选检查（确认产物中包含你的 A 地址）：

```bash
grep -R "example.com/doctor-platform" build/static/js || true
```

## 3) 部署到 CloudBase（CLI）

首次使用（如未登录）：

```bash
npm i -g @cloudbase/cli
tcb login
```

部署：

```bash
tcb framework deploy
```

## 4) 回归验证（手机扫码）

1. 打开患者端 A 页面，生成新二维码（不要复用旧码）
2. 微信扫码后，地址应为：`https://你的A访问域名/doctor-platform/?token=...`
3. 医生端登录并完成绑定

## 5) 如果你用 CI/CD 自动部署

在 CI 的构建环境变量中添加：

- `REACT_APP_BIND_BASE_URL=https://你的A访问域名/doctor-platform`

并确保部署步骤仍是先构建再上传 `build/`。

## 6) 失败排查

- 扫码还是到 B：
  - 检查 `REACT_APP_BIND_BASE_URL` 是否带 `/doctor-platform`
  - 检查是否是最新构建产物（重新构建并重新部署）
- 地址正确但页面 404：
  - 检查 CloudBase 静态托管是否发布到 `/doctor-platform`
  - 检查 `_headers` 与路由回退配置是否生效
- 微信内缓存导致旧地址：
  - 重新生成二维码；不要用历史截图
