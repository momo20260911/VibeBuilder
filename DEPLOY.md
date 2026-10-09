# Vibe Builder 部署文档（Rocky Linux 9 / RHEL / CentOS）

> 目标系统：Rocky Linux 9（RHEL/CentOS 系列）。
> 已随项目提供部署文件：`ecosystem.config.js`、`nginx.conf`、`Dockerfile`、`entrypoint.sh`、`.dockerignore`。

---

## 一、架构与关键前提（先看，避免踩坑）

1. **AI API Key 仍在用户浏览器**。Key 由每个用户在浏览器设置面板里填（存各自浏览器 localStorage），请求时随消息一起发到你的服务器、再由服务器转发给 AI 服务商。所以：
   - 服务器**不保存、不需要**任何 AI 密钥。
2. **新增：SQLite 本地数据库**。登录用户、项目、历史版本、对话记录都存在本机文件 `prisma/dev.db`（ORM 用 Prisma）。这是**本地文件**，不是远程数据库，**无需 `DATABASE_URL`**；但要保证该文件**可写且持久化**（部署时需 `npx prisma db push` 初始化表结构）。
3. **新增：GitHub OAuth 登录**（NextAuth v5）。需要一个 GitHub OAuth App 的 Client ID / Secret，以及一个 `AUTH_SECRET`。**未登录也能正常用生成器**，只有「保存到云端 / 仪表盘」需要登录。
4. 请求链路：
   - 生成/修改：`用户浏览器 → 你的服务器(/api/chat、/api/test-connection) → AI 服务商`
   - 登录/项目：`用户浏览器 → 你的服务器(/api/auth/*、/api/projects) → SQLite(prisma/dev.db)`
   - 能否调用某个 AI 服务商，取决于你**服务器的网络出口**：国内服务器 DeepSeek 可用，OpenAI/Anthropic 通常连不上；海外服务器三个都能用。

---

## 二、准备

| 项 | 要求 |
|---|---|
| 服务器 | Rocky Linux 9（1C1G 能跑、2C2G 更稳） |
| 网络 | 公网 IP；**云控制台安全组放行 22 / 80 / 443** |
| 域名 | 推荐（HTTPS 与 GitHub OAuth 回调都需要）；A 记录指向服务器 IP |
| 运行环境 | Node.js 18.17+（推荐 20 LTS） |

---

## 三、环境安装（dnf）

```bash
sudo dnf upgrade -y

# 1) 安装 EPEL（nginx、certbot 都来自 EPEL）
sudo dnf install -y epel-release

# 2) 安装 Node.js 20 LTS（NodeSource 官方源）
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v          # 应显示 v20.x

# 3) 安装 Nginx（来自 EPEL）
sudo dnf install -y nginx

# 4) 安装 PM2（进程守护）
sudo npm install -g pm2
```

---

## 四、SELinux 与防火墙（Rocky/RHEL 特有，关键）

**① SELinux**（默认 Enforcing，必须放行 Nginx → 本机 3000，否则报 502 Bad Gateway）：

```bash
getenforce                       # 显示 Enforcing 则需要下面这条
sudo setsebool -P httpd_can_network_connect 1
```

**② firewalld**（系统防火墙，与云安全组是两层，都要放）：

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-services   # 确认 http https 在列
```

> 云控制台的安全组还需单独放行 22/80/443。

---

## 五、创建 GitHub OAuth 应用（登录功能必需）

1. 打开 https://github.com/settings/developers → **New OAuth App**。
2. 填写：
   - Application name：随意（如 `Vibe Builder`）
   - Homepage URL：`https://vibe.example.com`（换成你的域名）
   - Authorization callback URL：`https://vibe.example.com/api/auth/callback/github`（**必须精确**，路径不能错）
3. 创建后拿到 **Client ID** 和 **Client Secret**（Secret 只显示一次，记得复制）。

> 本地开发用 `http://localhost:3000/api/auth/callback/github`。
> GitHub 回调地址要求 HTTPS（localhost 除外），所以正式环境先做好第七步的域名 + 第十步的 HTTPS。

---

## 六、上传代码

**方案 A：git（推荐）**

本地（Windows PowerShell）：
```powershell
cd E:\cc\vibe-builder
git init
git add .
git commit -m "init vibe builder"
git remote add origin <你的仓库地址>
git push -u origin main
```
> `.gitignore` 已忽略 `node_modules`、`.next`、`.env*`、`prisma/dev.db`，推上去的是干净源码（数据库、密钥都不进 git）。

服务器：
```bash
git clone <你的仓库地址> /home/user/vibe-builder
```

**方案 B：打包上传（不用 git）**

本地 Windows（自带 tar）：
```powershell
cd E:\cc\vibe-builder
tar -czf vibe-builder.tar.gz --exclude=node_modules --exclude=.next --exclude=prisma/dev.db .
scp vibe-builder.tar.gz user@服务器IP:/home/user/
```
服务器：
```bash
mkdir -p /home/user/vibe-builder
tar -xzf /home/user/vibe-builder.tar.gz -C /home/user/vibe-builder
```

---

## 七、环境变量（登录功能必需）

在项目根目录创建 `.env.production`（`.gitignore` 已忽略 `.env*`，不会进 git）：

```bash
cd /home/user/vibe-builder
cat > .env.production <<'EOF'
# 生成方式见下方命令
AUTH_SECRET="换成你的随机密钥"

# 第五步 GitHub OAuth App 拿到的
AUTH_GITHUB_ID="你的 Client ID"
AUTH_GITHUB_SECRET="你的 Client Secret"

# 生产环境的对外地址（用于 OAuth 回调），推荐显式设置
AUTH_URL="https://vibe.example.com"
EOF
```

生成 `AUTH_SECRET`（一段随机 32 字节十六进制）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> 说明：代码里已开启 `trustHost: true`（`lib/auth.ts`），在 Nginx 反向代理后也能正确识别域名，无需额外设置 `AUTH_TRUST_HOST`。

---

## 八、安装依赖、初始化数据库、构建、启动（PM2）

```bash
cd /home/user/vibe-builder

npm ci            # 有 package-lock.json

# 初始化 SQLite 数据库（生成 Prisma Client + 创建 prisma/dev.db 及表结构）
npx prisma generate
npx prisma db push

npm run build     # 生产构建（output: standalone）

# 用项目自带的 PM2 配置启动（默认端口 3000）
pm2 start ecosystem.config.js

# 查看状态 / 日志
pm2 status
pm2 logs vibe-builder

# 开机自启（会生成 systemd 服务）
pm2 save
pm2 startup
# ↑ 执行 pm2 startup 输出的那条命令
```

> - 以后改了 `prisma/schema.prisma`，重新 `npx prisma db push` 同步表结构，再 `pm2 reload vibe-builder`。
> - 数据库文件 `prisma/dev.db` 被 `.gitignore` 忽略、不随代码部署，日常 `git pull` 不会覆盖它。

---

## 九、Nginx 反向代理（80 / 443 → 3000）

**端口结构（先理清，避免误解）：**

| 层 | 端口 | 说明 |
|---|---|---|
| 应用（Next.js / PM2） | `127.0.0.1:3000` | 实际运行的应用，**不对外** |
| Nginx 对外入口 | `80` / `443` | 唯一对外端口 |
| 80 | → 跳转 | 访问 HTTP 时 **301 跳转到 HTTPS（443）** |
| 443 | → 反代 | 访问 HTTPS 时反向代理到 `127.0.0.1:3000` |

> 所以不存在「443 转 80」；正确链路是 `浏览器 → 80(跳 HTTPS) → 443 → 3000`。

1. 编辑项目自带的 `nginx.conf`，把 `server_name vibe.example.com;` 改成你的域名（或 IP）。
2. 复制到 `conf.d`（Rocky 用 conf.d，不是 sites-available）并启用：

```bash
sudo cp nginx.conf /etc/nginx/conf.d/vibe-builder.conf

# 可选：移除默认欢迎页，避免占用 80 端口
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

> ⚠️ `proxy_buffering off;` 是 **SSE 流式必需**，不要删，否则生成过程会卡住或一次性返回；`Host` / `X-Forwarded-Proto` 头是 **OAuth 登录识别域名必需**，保留即可。
>
> 项目自带的 `nginx.conf` 只含 `listen 80` 一块，这是给 **certbot 自动升级** 用的「HTTP 起步版」。**443 块不需要你手动写**，下一步 `certbot --nginx` 会自动生成并改写。

---

## 十、HTTPS / 443（Let's Encrypt，certbot 来自 EPEL）

`certbot --nginx` 会自动完成两件事：**① 签发证书**、**② 改写 nginx 配置**（新增 `listen 443 ssl` 块 + 把 80 改成 `return 301` 跳 HTTPS）。所以 443 无需手动添加：

```bash
sudo dnf install -y certbot python3-certbot-nginx

# 自动：签发证书 + 新增 443 块 + 80→443 跳转（会改写上一步的 conf.d 配置）
sudo certbot --nginx -d vibe.example.com

sudo certbot renew --dry-run    # 验证自动续期
```

执行完后，`vibe-builder.conf` 会被 certbot 改写成类似下面这样（仅供参考，无需手动改）：

```nginx
# 80：HTTP → 跳转 HTTPS（certbot 自动把原 80 块改成这个）
server {
    listen 80;
    server_name vibe.example.com;
    return 301 https://$host$request_uri;
}

# 443：HTTPS → 反代到 3000（certbot 自动新增，并填好证书路径）
server {
    listen 443 ssl;
    server_name vibe.example.com;

    ssl_certificate     /etc/letsencrypt/live/vibe.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vibe.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;      # SSE 流式必需
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

> - 签完证书后，确认 GitHub OAuth App 回调地址与 `AUTH_URL` 都是 `https://` 前缀。
> - 暂时没域名想先用 IP 试：安全组/firewalld 放行 3000，直接访问 `http://服务器IP:3000`；正式使用仍建议域名 + HTTPS。

---

## 十一、验证

1. 浏览器打开 `https://vibe.example.com`。
2. **未登录**：右上角「设置」填 API Key →「测试连接」→ 成功 →「生成」正常流式出码。
3. **登录**：点右上角「登录」→ GitHub 授权 → 回到应用看到头像。
4. **保存 / 仪表盘**：生成应用后点顶部「保存」→ 提示「已保存」；点右上角头像 →「我的项目」→ 看到项目卡片，可「打开」「删除」。
5. `pm2 logs vibe-builder` 能看到 `[chat]` 日志。

---

## 十二、日常更新与运维

```bash
cd /home/user/vibe-builder
git pull
npm ci             # 依赖有变更时执行
npx prisma generate        # 依赖/schema 变更时执行
npx prisma db push         # schema 变更时执行
npm run build
pm2 reload vibe-builder
```

- 看日志：`pm2 logs vibe-builder`
- 重启：`pm2 restart vibe-builder`

---

## 十三、常见问题

| 问题 | 原因 / 解决 |
|---|---|
| 生成过程卡住 / 一次性返回 | Nginx 没关 `proxy_buffering off`（见第九步） |
| 访问报 **502 Bad Gateway** | SELinux 未放行：`sudo setsebool -P httpd_can_network_connect 1` |
| 端口/页面打不开 | firewalld 没放行（`firewall-cmd --add-service=http`）或云安全组没放行 80/443 |
| 登录报 **UntrustedHost** | 未开启 trustHost（代码里已默认开启）或 Nginx 没转发 `Host` / `X-Forwarded-Proto` 头 |
| 登录报 **MissingSecret / 500** | 服务器没设置 `AUTH_SECRET`（见第七步） |
| 点登录跳 GitHub 报错 | `AUTH_GITHUB_ID/SECRET` 没填，或 GitHub OAuth 回调地址与 `AUTH_URL` 不一致 |
| 保存/仪表盘报「未登录」 | 未登录就点保存；或登录态失效，重新登录 |
| 保存报 500 / 数据库错误 | `prisma/dev.db` 不存在或不可写：确认执行过 `npx prisma db push`，且目录可写 |
| 测试连接成功但生成失败 | 模型用了 `deepseek-reasoner`，换成 `deepseek-chat` |
| OpenAI/Anthropic 连不上 | 服务器网络出口问题（见第一节），换海外服务器或只用 DeepSeek |
| 编辑器 Monaco 加载慢/空白 | `@monaco-editor/react` 默认走 jsdelivr CDN，国内可能慢（可选本地化优化） |
| 3000 端口不通 | `pm2 status` 确认进程、检查 firewalld 与云安全组 |

---

## 十四、Docker 部署（可选）

已提供 `Dockerfile` + `entrypoint.sh` + `.dockerignore`（基于 standalone 输出，镜像更小；已内置 Prisma 引擎与初始数据库）。

**Rocky 9 安装 Docker：**

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
```

**构建并运行：**

```bash
docker build -t vibe-builder .

# 用命名卷持久化 SQLite（重要！否则容器删除后数据丢失）
docker run -d --name vibe-builder \
  -p 3000:3000 \
  -v vibe-data:/app/prisma \
  -e AUTH_SECRET="你的随机密钥" \
  -e AUTH_GITHUB_ID="你的 Client ID" \
  -e AUTH_GITHUB_SECRET="你的 Client Secret" \
  -e AUTH_URL="https://vibe.example.com" \
  --restart unless-stopped \
  vibe-builder
```

> 也可把第七步的 `.env.production` 直接用于 Docker：`docker run --env-file .env.production ...`。

然后按第九、十步做 Nginx 反代 + HTTPS（`proxy_pass` 仍指向 `127.0.0.1:3000`，SELinux 那一条仍要放行）。

**关于数据持久化**：
- 容器内 SQLite 文件路径为 `/app/prisma/dev.db`，务必用卷挂载 `/app/prisma`。
- 首次挂载空卷时，`entrypoint.sh` 会用镜像内置的初始数据库自动初始化表结构。
- 升级镜像（`docker build` + 重新 `docker run`）时，只要仍挂载同一个卷，数据不丢。
