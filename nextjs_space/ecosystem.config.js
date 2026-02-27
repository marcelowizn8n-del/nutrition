/**
 * PM2 Ecosystem Configuration
 * Nutrition - Sistema de Nutrição e Visualização 3D
 * 
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'nutrition',
      
      // Script de entrada (standalone server do Next.js)
      script: '.next/standalone/server.js',
      
      // Diretório de trabalho
      cwd: '/home/ubuntu/workspace/nutrition/nextjs_space',
      
      // Variáveis de ambiente
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
        HOSTNAME: '127.0.0.1',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3006,
        HOSTNAME: '127.0.0.1',
      },
      
      // Número de instâncias (1 para Next.js standalone)
      instances: 1,
      
      // Modo de execução
      exec_mode: 'fork',
      
      // Auto-restart se crash
      autorestart: true,
      
      // Watch files (desabilitado em produção)
      watch: false,
      
      // Limite de memória para restart automático
      max_memory_restart: '1G',
      
      // Logs
      log_file: '/home/ubuntu/logs/nutrition/combined.log',
      out_file: '/home/ubuntu/logs/nutrition/out.log',
      error_file: '/home/ubuntu/logs/nutrition/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Merge logs de diferentes instâncias
      merge_logs: true,
      
      // Tempo de espera antes de considerar app como "online"
      min_uptime: '10s',
      
      // Máximo de restarts em período
      max_restarts: 10,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
