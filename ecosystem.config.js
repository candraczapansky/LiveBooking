module.exports = {
  apps: [
    {
      name: 'salon-spa-app',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DISABLE_AUTOMATIC_SERVICE_CREATION: 'true',
      },
      // Process Management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Performance
      node_args: '--max-old-space-size=1024',
      
      // Security
      uid: 'www-data',
      gid: 'www-data',
      
      // Environment Variables
      env_file: '.env',
      
      // Health Check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Metrics
      merge_logs: true,
      log_type: 'json',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/salon-spa-app.git',
      path: '/var/www/salon-spa-app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },

  // PM2 Configuration
  pm2: {
    // Log Management
    log_rotate_interval: '0 0 * * *',
    log_rotate_max_size: '10M',
    log_rotate_keep: 7,
    
    // Monitoring
    monitoring: true,
    
    // Notifications
    notify: false,
  },
}; 