# Vibe Builder 部署流程文档（Rocky Linux 9 / RHEL / CentOS）

> 目标系统：Rocky Linux 9（RHEL/CentOS 系列）。
> 已随项目提供 4 个部署文件：`ecosystem.config.js`、`nginx.conf`、`Dockerfile`、`.dockerignore`。

---

## 一、架构与关键前提（先看，避免踩坑）

1. **没有服务端密钥**。API Key 是每个用户在自己浏览器设置面板里填的（存在各自浏览器 localStorage），请求时随消息一起发到你的服务器、再由服务器转发给 AI 服务商。所以：
   - 服务器**不需要**配置任何 AI 密钥 / `.env`。
   - 你只需要把「应用本身」部署上去。
2. 请求链路：`用户浏览器 → 你的服务器(/api/chat、/api/test-connection) → AI 服务商`。
   **能否调用某个服务商，取决于你服务器的网络出口，而不是用户**：
   - 国内服务器（阿里云/腾讯云）：DeepSeek 可用，OpenAI/Anthropic 通常连不上。
   - 海外服务器：三个都能用，但国内用户访问你的站可能略慢。
   - → 主打 DeepSeek 选国内服务器；要支持 OpenAI/Anthropic 选海外服务器。
3. 应用本身无登录鉴权（谁拿到 URL 都能用，用自己的 Key）。要限制访问可加 Nginx Basic Auth。

---

## 二、准备

| 项 | 要求 |
|---|---|
| 服务器 | Rocky Linux 9（1C1G 能跑、2C2G 更稳） |
| 网络 | 公网 IP；**云控制台安全组放行 22 / 80 / 443** |
| 域名 | 推荐（用于 HTTPS）；A 记录指向服务器 IP |
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

# 备选：用系统 AppStream 模块（若 nodejs:20 流可用）
# sudo dnf module list nodejs
# sudo dnf module enable nodejs:20 -y
# sudo dnf install -y nodejs

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

## 五、上传代码

**方案 A：git（推荐，也方便以后更新）**

本地（Windows PowerShell）：
```powershell
cd E:\cc\vibe-builder
git init
git add .
git commit -m "init vibe builder"
git remote add origin <你的私有仓库地址>
git push -u origin main
```
> `.gitignore` 已忽略 `node_modules`、`.next`、`.env*`，推上去的是干净源码。

服务器：
```bash
git clone <你的私有仓库地址> /home/user/vibe-builder
```

**方案 B：打包上传（不用 git）**

本地 Windows（自带 tar）：
```powershell
cd E:\cc\vibe-builder
tar -czf vibe-builder.tar.gz --exclude=node_modules --exclude=.next .
scp vibe-builder.tar.gz user@服务器IP:/home/user/
```
服务器：
```bash
mkdir -p /home/user/vibe-builder
tar -xzf /home/user/vibe-builder.tar.gz -C /home/user/vibe-builder
```

---

## 六、安装依赖、构建、启动（PM2）

```bash
cd /home/user/vibe-builder

npm install        # 有 package-lock.json，也可用 npm ci
npm run build      # 生产构建（已开启 output: standalone）

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

> 想改端口：改 `ecosystem.config.js` 里的 `args: "start -p 3000"` 和 `PORT`，然后 `pm2 restart vibe-builder`。

---

## 七、Nginx 反向代理（关键）

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

> ⚠️ `nginx.conf` 里 `proxy_buffering off;` 是 **SSE 流式必需**，不要删。否则生成过程会卡住或一次性返回。

---

## 八、HTTPS（Let's Encrypt，certbot 来自 EPEL）

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vibe.example.com
sudo certbot renew --dry-run    # 验证自动续期
```

> 暂时没域名想先用 IP 试：安全组/firewalld 放行 3000，直接访问 `http://服务器IP:3000`；正式给人用仍建议域名 + HTTPS。

---

## 九、验证

1. 浏览器打开 `https://vibe.example.com`。
2. 填 API Key → 点「测试连接」→ 显示成功。
3. 点「生成」，确认流式过程正常、编辑器有代码、预览区正常。
4. `pm2 logs vibe-builder` 能看到 `[chat]` 日志。

---

## 十、日常更新与运维

```bash
cd /home/user/vibe-builder
git pull
npm install          # 依赖有变更时执行
npm run build
pm2 reload vibe-builder
```

- 看日志：`pm2 logs vibe-builder`
- 重启：`pm2 restart vibe-builder`

---

## 十一、常见问题

| 问题 | 原因 / 解决 |
|---|---|
| 生成过程卡住 / 一次性返回 | Nginx 没关 `proxy_buffering off`（见第七步） |
| 访问报 **502 Bad Gateway** | SELinux 未放行：`sudo setsebool -P httpd_can_network_connect 1` |
| 端口/页面打不开 | firewalld 没放行（`firewall-cmd --add-service=http`）或云安全组没放行 80/443 |
| 测试连接成功但生成失败 | 模型用了 `deepseek-reasoner`，换成 `deepseek-chat` |
| OpenAI/Anthropic 连不上 | 服务器网络出口问题（见第一节），换海外服务器或只用 DeepSeek |
| 编辑器 Monaco 加载慢/空白 | `@monaco-editor/react` 默认走 jsdelivr CDN，国内可能慢（可选本地化优化） |
| 3000 端口不通 | `pm2 status` 确认进程、检查 firewalld 与云安全组 |

---

## 十二、Docker 部署（可选）

已提供 `Dockerfile` + `.dockerignore`（基于 standalone 输出，镜像更小）。

**Rocky 9 安装 Docker：**
```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
```

构建并运行：
```bash
docker build -t vibe-builder .
docker run -d --name vibe-builder \
  -p 3000:3000 \
  --restart unless-stopped \
  vibe-builder
```

然后按第七、八步做 Nginx 反代 + HTTPS（`proxy_pass` 仍指向 `127.0.0.1:3000`，SELinux 那一条仍要放行）。

> Docker 方式下 SELinux 同样需要 `setsebool -P httpd_can_network_connect 1`（Nginx 还是通过本机 3000 连容器端口）。
