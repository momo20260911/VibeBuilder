#!/bin/sh
set -e

# 首次挂载空卷（bind mount 空目录）时，用镜像内置的初始数据库初始化，保证表结构存在
if [ ! -s /app/prisma/dev.db ] && [ -f /app/prisma-init/dev.db ]; then
  cp /app/prisma-init/dev.db /app/prisma/dev.db
fi

exec node server.js
