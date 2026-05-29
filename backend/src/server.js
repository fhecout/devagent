require('dotenv').config();

const app = require('./app');

const PORT = parseInt(process.env.PORT || '3002', 10);

app.listen(PORT, () => {
  console.log(`[DevAgent Lite] API rodando em http://localhost:${PORT}`);
  console.log(`[DevAgent Lite] Ollama: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
  console.log(`[DevAgent Lite] Modelo: ${process.env.OLLAMA_MODEL || 'llama3.2:3b'}`);
});
