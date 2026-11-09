const axios = require('axios');

async function sendToGrafana(level, message, meta = {}) {
  console.log(`[${level.toUpperCase()}] ${message}`, meta);

  const payload = {
    resourceLogs: [{
      resource: {
        attributes: [{ key: "service.name", value: { stringValue: "hustlehub-backend" } }]
      },
      scopeLogs: [{
        scope: { name: "node-app" },
        logRecords: [{
          timeUnixNano: String(Date.now() * 1000000),
          severityText: level.toUpperCase(),
          severityNumber: level === 'error' ? 17 : (level === 'warn' ? 13 : 9),
          body: { stringValue: `${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}` }
        }]
      }]
    }]
  };

  // The correct OTLP Gateway URL for eu-north-0
  const url = 'https://otlp-gateway-prod-eu-north-0.grafana.net/otlp/v1/logs';
  
  const authString = `${process.env.GRAFANA_USER_ID}:${process.env.GRAFANA_API_TOKEN}`;
  const base64Auth = Buffer.from(authString).toString('base64');

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`
      }
    });
    console.log('✅ Successfully sent to Grafana! Status:', response.status);
  } catch (error) {
    console.error('❌ Failed to send to Grafana:', error.message);
    if (error.response) {
      console.error('Grafana Response:', error.response.data);
    }
  }
}

const logger = {
  info: (msg, meta) => sendToGrafana('info', msg, meta),
  warn: (msg, meta) => sendToGrafana('warn', msg, meta),
  error: (msg, meta) => sendToGrafana('error', msg, meta),
};

module.exports = logger;