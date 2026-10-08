// PM2 进程配置
// 用法：pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "vibe-builder",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
