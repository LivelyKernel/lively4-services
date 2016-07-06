module.exports = {
  PORT: process.env.LK4_SERVICES_PORT || 9007,
  LIVELY_SERVER_PORT: 8901,
  LIVELY_SERVER_PATH: './node_modules/lively4-server/httpServer.js',
  NODE_INSPECTOR_WEB_PORT: 8902,
  logsDir: './logs',
  servicesDir: './services'
};