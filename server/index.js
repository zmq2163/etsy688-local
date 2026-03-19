const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== CONFIG ==========
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
  stable_diffusion_key: '', openai_key: '', replicate_token: '',
  pika_key: '', admin_pin: '1234', max_concurrent_tasks: 3
};
function loadConfig() {
  try { if (fs.existsSync(CONFIG_FILE)) return {...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE)) }; }
  catch (e) {}
  return {...DEFAULT_CONFIG};
}
function saveConfig(newConfig) {
  const current = loadConfig();
  const merged = {...current, ...newConfig};
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

// ========== DB ==========
const DB_FILE = path.join(__dirname, 'tasks.db');
const db = require('better-sqlite3')(DB_FILE);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT DEFAULT 'pending',
    input_params TEXT, result_url TEXT, error TEXT, progress INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY, original_name TEXT, stored_path TEXT, url TEXT,
    size INTEGER, mime_type TEXT, width INTEGER, height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ========== MULTER ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ========== FILE UPLOAD ==========
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: 'No file' });
    const fileId = uuidv4();
    const url = '/uploads/' + req.file.filename;
    let width = 0, height = 0;
    try { const sharp = require('sharp'); const meta = await sharp(req.file.path).metadata(); width = meta.width||0; height = meta.height||0; } catch(e) {}
    db.prepare(`INSERT INTO files (id,original_name,stored_path,url,size,mime_type,width,height) VALUES (?,?,?,?,?,?,?,?)`).run(fileId,req.file.originalname,req.file.path,url,req.file.size,req.file.mimetype,width,height);
    res.json({ code: 0, data: { file_id: fileId, url, width, height, size: req.file.size } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== TASK HELPERS ==========
function createTask(type, params) {
  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id,type,input_params,status) VALUES (?,?,?,?)').run(id, type, JSON.stringify(params), 'processing');
  return id;
}
function completeTask(id, resultUrl, error = null) {
  db.prepare('UPDATE tasks SET status=?, result_url=?, error=?, completed_at=CURRENT_TIMESTAMP WHERE id=?').run(error?'failed':'completed', resultUrl, error, id);
}

// ========== ROUTES ==========
app.get('/api/task/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ code: 404, message: 'Not found' });
  res.json({ code: 0, data: task });
});
app.get('/api/tasks', (req, res) => {
  res.json({ code: 0, data: db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50').all() });
});

// ========== SCENE GENERATION ==========
app.post('/api/generate/scene', async (req, res) => {
  try {
    const { images, size_ratio, style, custom_prompt } = req.body;
    const taskId = createTask('scene', req.body);
    res.json({ code: 0, data: { task_id: taskId } });
    (async () => {
      try {
        const cfg = loadConfig();
        const token = cfg.replicate_token || cfg.stable_diffusion_key;
        if (!token) throw new Error('Please configure Replicate API Key at /admin');
        const sizeMap = { '1:1': [1024,1024], '3:4': [896,1152], '4:3': [1152,896], '9:16': [768,1344], '5:4': [1024,1280] };
        const [w,h] = sizeMap[size_ratio] || [1024,1024];
        const stylePrompts = {
          'smart': 'professional e-commerce product photography, clean white studio background, soft shadow, ultra realistic, 8K commercial quality',
          'realistic_model': 'professional fashion photography, model wearing product, natural outdoor environment, golden hour lighting, magazine quality',
          'home': 'product displayed in modern living room interior, natural lighting, lifestyle photography, cozy home atmosphere',
          'pinterest': 'flat lay photography, product arranged artfully on marble surface, top-down view, Pinterest aesthetic',
          'instagram': 'product photography for Instagram, clean background, aesthetic Instagram feed style, bright and airy',
          'custom': custom_prompt || ''
        };
        const prompt = (style === 'custom' && custom_prompt) ? custom_prompt : stylePrompts[style] || stylePrompts['smart'];
        const body = {
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea7575255551ad3e41d73ee1e',
          input: { prompt, width: w, height: h, guidance_scale: 7.5, num_inference_steps: 30, seed: Math.floor(Math.random()*9999999999) }
        };
        const r1 = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST', headers: { 'Authorization': 'Token '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (!r1.ok) throw new Error('Replicate API error: ' + await r1.text());
        let result = await r1.json();
        while (result.status !== 'succeeded' && result.status !== 'failed') {
          await new Promise(r => setTimeout(r, 2000));
          const p = await fetch('https://api.replicate.com/v1/predictions/' + result.id, { headers: { 'Authorization': 'Token '+token } });
          result = await p.json();
        }
        if (result.status === 'failed') throw new Error('Generation failed: ' + (result.error||''));
        completeTask(taskId, Array.isArray(result.output) ? result.output[0] : result.output);
      } catch (err) { completeTask(taskId, null, err.message); }
    })();
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== VIDEO GENERATION ==========
app.post('/api/generate/video', async (req, res) => {
  try {
    const { image_url, prompt, duration } = req.body;
    const taskId = createTask('video', req.body);
    res.json({ code: 0, data: { task_id: taskId } });
    (async () => {
      try {
        const cfg = loadConfig();
        const token = cfg.replicate_token;
        if (!token) throw new Error('Please configure Replicate API Key at /admin');
        const r1 = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST', headers: { 'Authorization': 'Token '+token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: 'anotherjesse/zeroscope-v2-576w:format=mp4',
            input: { prompt: prompt || 'product rotating showcase, white background, smooth motion', num_frames: duration==='5'?24:48, width: 1024, height: 1024, guidance_scale: 7.5 }
          })
        });
        if (!r1.ok) throw new Error('Video API error: ' + await r1.text());
        let result = await r1.json();
        while (result.status !== 'succeeded' && result.status !== 'failed') {
          await new Promise(r => setTimeout(r, 3000));
          const p = await fetch('https://api.replicate.com/v1/predictions/' + result.id, { headers: { 'Authorization': 'Token '+token } });
          result = await p.json();
        }
        if (result.status === 'failed') throw new Error('Video generation failed');
        completeTask(taskId, Array.isArray(result.output) ? result.output[0] : result.output);
      } catch (err) { completeTask(taskId, null, err.message); }
    })();
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== MODEL GENERATION ==========
app.post('/api/generate/model', async (req, res) => {
  try {
    const { image_url, scene_prompt, style, count, output_ratio } = req.body;
    const taskId = createTask('model', req.body);
    res.json({ code: 0, data: { task_id: taskId } });
    (async () => {
      try {
        const cfg = loadConfig();
        const token = cfg.replicate_token;
        if (!token) throw new Error('Please configure Replicate API Key at /admin');
        const stylePrompts = {
          'outdoor': 'professional fashion photography, model wearing product, outdoor sunlight, golden hour, natural environment',
          'cafe': 'cozy cafe setting, warm ambient lighting, lifestyle photography, model with product',
          'bedroom': 'bedroom atmosphere, soft warm lighting, intimate lifestyle feel, model with product',
          'street': 'street fashion photography, urban background, cool tone, editorial magazine style',
          'studio': 'professional studio photography, clean seamless background, commercial lighting, fashion catalog quality',
          'custom': scene_prompt || ''
        };
        const fullPrompt = (style === 'custom' && scene_prompt) ? scene_prompt : (stylePrompts[style] || stylePrompts['studio']);
        const urls = [];
        for (let i = 0; i < (count||1); i++) {
          const body = {
            version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea7575255551ad3e41d73ee1e',
            input: { prompt: fullPrompt, width: 1024, height: 1280, guidance_scale: 8, num_inference_steps: 35, seed: Math.floor(Math.random()*9999999999) }
          };
          const r1 = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST', headers: { 'Authorization': 'Token '+token, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          });
          if (!r1.ok) throw new Error('Model API error');
          let result = await r1.json();
          while (result.status !== 'succeeded' && result.status !== 'failed') {
            await new Promise(r => setTimeout(r, 2000));
            const p = await fetch('https://api.replicate.com/v1/predictions/' + result.id, { headers: { 'Authorization': 'Token '+token } });
            result = await p.json();
          }
          if (result.status === 'succeeded') urls.push(Array.isArray(result.output) ? result.output[0] : result.output);
        }
        completeTask(taskId, JSON.stringify(urls));
      } catch (err) { completeTask(taskId, null, err.message); }
    })();
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== ENHANCE ==========
app.post('/api/enhance/detail', async (req, res) => {
  try {
    const { image_url, scale } = req.body;
    const taskId = createTask('enhance', req.body);
    res.json({ code: 0, data: { task_id: taskId } });
    (async () => {
      try {
        const cfg = loadConfig();
        const token = cfg.replicate_token;
        if (!token) throw new Error('Please configure Replicate API Key at /admin');
        const r1 = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST', headers: { 'Authorization': 'Token '+token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: 'nightfu/realesrgan-ncnn-vulkan-pyjs:e86b8eb9e568dd5d2a6b7b6b9f0c5a5c8f1e6d8e9a0b1c2d3e4f5a6b7c8d9e0f',
            input: { image: image_url, scale: scale || 2 }
          })
        });
        if (!r1.ok) throw new Error('Enhance API error');
        let result = await r1.json();
        while (result.status !== 'succeeded' && result.status !== 'failed') {
          await new Promise(r => setTimeout(r, 2000));
          const p = await fetch('https://api.replicate.com/v1/predictions/' + result.id, { headers: { 'Authorization': 'Token '+token } });
          result = await p.json();
        }
        if (result.status === 'failed') throw new Error('Enhance failed');
        completeTask(taskId, Array.isArray(result.output) ? result.output[0] : result.output);
      } catch (err) { completeTask(taskId, null, err.message); }
    })();
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== SEO ==========
async function callOpenAI(prompt, system, model = 'gpt-4o-mini') {
  const cfg = loadConfig();
  if (!cfg.openai_key) throw new Error('Please configure OpenAI API Key at /admin');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer '+cfg.openai_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{role:'system',content:system},{role:'user',content:prompt}], temperature: 0.8, max_tokens: 1500 })
  });
  if (!r.ok) throw new Error('OpenAI API error: ' + await r.text());
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

app.post('/api/seo/generate', async (req, res) => {
  try {
    const { keywords, mode } = req.body;
    if (!keywords) return res.status(400).json({ code: 400, message: 'Keywords required' });
    const taskId = createTask('seo', req.body);
    try {
      const system = mode === 'keywords'
        ? 'You are an Etsy SEO keyword expert. Generate 15 long-tail keywords, one per line, English, no numbering. Output ONLY the list.'
        : 'You are an expert Etsy seller. Output JSON: {title:"title max 140 chars",description:"about 150 chars",tags:["tag1","tag2",...13 tags]}';
      const content = await callOpenAI(mode === 'keywords' ? 'Product: ' + keywords : 'Keywords: ' + keywords + '. Generate title, description, tags.', system);
      let result;
      if (mode === 'keywords') {
        result = { keywords: content.split('\n').map(function(k){return k.replace(/^[\d]+[.。]\s*/,'').trim();}).filter(Boolean).slice(0,15) };
      } else {
        const match = content.match(/\{[\s\S]*\}/);
        result = match ? JSON.parse(match[0]) : {};
      }
      completeTask(taskId, JSON.stringify(result));
      res.json({ code: 0, data: { task_id: taskId, ...result } });
    } catch (err) { completeTask(taskId, null, err.message); res.status(500).json({ code: 500, message: err.message }); }
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

app.post('/api/seo/keywords', async (req, res) => {
  try {
    const { keywords } = req.body;
    const content = await callOpenAI('Generate 15 Etsy long-tail keywords, one per line, English, no numbering. Product: ' + keywords,
      'You are an Etsy SEO keyword expert. Output ONLY the list, one per line.');
    const kw = content.split('\n').map(function(k){return k.replace(/^[\d]+[.。]\s*/,'').trim();}).filter(Boolean).slice(0,15);
    res.json({ code: 0, data: { keywords: kw } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

// ========== ADMIN CONFIG ==========
app.get('/api/admin/config', (req, res) => {
  const cfg = loadConfig();
  res.json({ code: 0, data: {
    has_sd: !!cfg.stable_diffusion_key, has_openai: !!cfg.openai_key,
    has_replicate: !!cfg.replicate_token, has_pika: !!cfg.pika_key,
    admin_pin_set: cfg.admin_pin !== '1234'
  }});
});
app.post('/api/admin/verify-pin', (req, res) => {
  res.json({ code: 0, data: { valid: req.body.pin === loadConfig().admin_pin } });
});
app.post('/api/admin/config', (req, res) => {
  try {
    const { stable_diffusion_key, openai_key, replicate_token, pika_key, admin_pin, max_concurrent_tasks } = req.body;
    const toSave = {};
    if (stable_diffusion_key !== undefined) toSave.stable_diffusion_key = stable_diffusion_key;
    if (openai_key !== undefined) toSave.openai_key = openai_key;
    if (replicate_token !== undefined) toSave.replicate_token = replicate_token;
    if (pika_key !== undefined) toSave.pika_key = pika_key;
    if (admin_pin !== undefined) toSave.admin_pin = admin_pin;
    if (max_concurrent_tasks !== undefined) toSave.max_concurrent_tasks = max_concurrent_tasks;
    saveConfig(toSave);
    res.json({ code: 0, message: 'Config saved. Restart server to apply.', data: { ok: true } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message }); }
});

app.get('/api/health', (req, res) => res.json({ code: 0, message: 'ok' }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// SPA fallback
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.send('<html><body><h1>Etsy688 Local</h1><p><a href="/admin">Admin</a></p></body></html>');
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('Etsy688 Local running on http://0.0.0.0:' + PORT);
  console.log('Admin panel: http://0.0.0.0:' + PORT + '/admin');
});
