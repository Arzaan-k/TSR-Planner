module.exports = {
  apps: [{
    name: 'tsr-planner',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Auto restart on file changes (development only)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    
    // Advanced features
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    
    // Environment-specific settings
    node_args: '--max-old-space-size=1024',
    
    // Error handling
    autorestart: true,
    restart_delay: 4000,
    
    // Monitoring
    pmx: true,
    
    // Source map support
    source_map_support: true
  }]
};
