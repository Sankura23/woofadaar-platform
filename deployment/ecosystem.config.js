// PM2 Ecosystem Configuration for Woofadaar Production

module.exports = {
  apps: [{
    name: 'woofadaar',
    script: 'server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_TELEMETRY_DISABLED: 1
    },

    // Resource management
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',

    // Logging
    log_file: '/app/logs/combined.log',
    out_file: '/app/logs/out.log',
    error_file: '/app/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Auto restart configuration
    autorestart: true,
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads'
    ],

    // Advanced configuration
    kill_timeout: 3000,
    listen_timeout: 8000,
    shutdown_with_message: true,

    // Health check
    health_check_grace_period: 3000,

    // Monitoring
    monitoring: true,
    pmx: true,

    // Source map support
    source_map_support: true,

    // Node.js specific
    node_args: '--max-old-space-size=2048'
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.woofadaar.com', 'server2.woofadaar.com'],
      ref: 'origin/main',
      repo: 'git@github.com:woofadaar/platform.git',
      path: '/var/www/woofadaar',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.woofadaar.com',
      ref: 'origin/develop',
      repo: 'git@github.com:woofadaar/platform.git',
      path: '/var/www/woofadaar-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3000
      }
    }
  }
};