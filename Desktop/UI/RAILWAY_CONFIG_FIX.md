# Fix Railway Config - Directory Structure Issue

## 🔍 Vấn Đề

Railway không tìm thấy code vì files đang ở trong `Desktop/UI/` thay vì root.

## ✅ Giải Pháp: Config Railway

### Cách 1: Set Root Directory trong Railway (Đơn Giản Nhất)

1. **Vào Railway Dashboard:**
   - Service → Settings → General

2. **Set Root Directory:**
   ```
   Desktop/UI
   ```

3. **Set Start Command:**
   ```
   node backend/server.js
   ```

4. **Set Build Command:**
   ```
   cd backend && npm install
   ```

5. **Save và Redeploy**

### Cách 2: Tạo nixpacks.toml

Tạo file `nixpacks.toml` ở root của repo (sẽ ở `Desktop/UI/nixpacks.toml`):

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["cd Desktop/UI/backend && npm install"]

[start]
cmd = "cd Desktop/UI/backend && node server.js"
```

### Cách 3: Dùng railway.json với Path Đúng

Update `railway.json` (nếu có):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd Desktop/UI/backend && npm install"
  },
  "deploy": {
    "startCommand": "cd Desktop/UI/backend && node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🚀 Quick Fix (Khuyến Nghị)

**Trong Railway Dashboard:**

1. **Service Settings → General:**
   - Root Directory: `Desktop/UI`
   - Start Command: `node backend/server.js`
   - Build Command: `cd backend && npm install`

2. **Redeploy service**

## 📋 Checklist

- [ ] Root Directory set: `Desktop/UI`
- [ ] Start Command: `node backend/server.js`
- [ ] Build Command: `cd backend && npm install` hoặc `npm install` (nếu root đã là Desktop/UI)
- [ ] Environment variables đã set
- [ ] Redeploy service

## 🎯 Kết Quả

Sau khi config:
- ✅ Railway sẽ tìm thấy `backend/package.json`
- ✅ Build sẽ chạy trong `Desktop/UI/backend/`
- ✅ Start command sẽ chạy đúng file

