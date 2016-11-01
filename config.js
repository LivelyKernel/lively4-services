module.exports = {
  PORT: process.env.PORT || 9007, // Allow Heroku to set port
  LIVELY_SERVER_PORT: 8901,
  LIVELY_SERVER_PATH: './node_modules/lively4-server/dist/httpServer.js',
  NODE_INSPECTOR_WEB_PORT: 8902,
  logsDir: './logs',
  servicesDir: './services'
};