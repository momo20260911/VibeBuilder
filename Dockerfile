# syntax=docker/dockerfile:1

# ---- 1. 安装依赖（含 devDependencies，供 prisma generate / db push 使用）----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. 构建（output: standalone）+ 生成 SQLite 初始库 ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建期占位 AUTH_SECRET，避免打包阶段因缺少 secret 报错（运行时用真实值覆盖）
ENV AUTH_SECRET=build-time-placeholder
RUN npx prisma generate
RUN npm run build
# 生成初始 SQLite 数据库文件（含全部表结构），运行时依赖它
RUN npx prisma db push

# ---- 3. 运行（standalone 最小镜像）----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 产物 + 静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma 运行时：SQLite 查询引擎 + 生成的客户端（standalone 追踪不会带上 .prisma）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# schema 与初始数据库；dev.db 同时备份到 prisma-init，供首次挂载空卷时初始化
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/dev.db ./prisma-init/dev.db

# 启动脚本：首次挂载空卷时用初始库初始化，再启动服务
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
