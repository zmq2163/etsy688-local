const fs = require('fs');
const path = require('path');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
  stable_diffusion_key: '',
  openai_key: '',
  replicate_token: '',
  pika_key: '',
  admin_pin: '1234',
  storage_path: './uploads',
  max_concurrent_tasks: 3
};
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) { console.error('Config load error:', e.message); }
  return { ...DEFAULT_CONFIG };
}
function saveConfig(newConfig) {
  const current = loadConfig();
  const merged = { ...current, ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}
module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG };
