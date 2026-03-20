import { useState, useEffect, useRef } from 'react'

const API = ''

type Tab = 'scene' | 'video' | 'model' | 'seo' | 'config'

interface Task {
  id: string
  type: string
  status: string
  result_url: string | null
  error: string | null
  created_at: string
}

function App() {
  const [tab, setTab] = useState<Tab>('scene')
  const [config, setConfig] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [pin, setPin] = useState('1234')
  const [pinInput, setPinInput] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollId, setPollId] = useState<string | null>(null)

  // SEO state
  const [seoKeywords, setSeoKeywords] = useState('')
  const [seoMode, setSeoMode] = useState<'title' | 'keywords'>('title')
  const [seoResult, setSeoResult] = useState<any>(null)

  // Config state
  const [cfgReplicate, setCfgReplicate] = useState('')
  const [cfgOpenAI, setCfgOpenAI] = useState('')
  const [cfgPin, setCfgPin] = useState('1234')

  // Scene state
  const [sceneFile, setSceneFile] = useState<File | null>(null)
  const [sceneStyle, setSceneStyle] = useState('smart')
  const [sceneRatio, setSceneRatio] = useState('1:1')

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState('5')

  // Model state
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelStyle, setModelStyle] = useState('studio')
  const [modelCount, setModelCount] = useState(1)

  useEffect(() => { fetchConfig() }, [])
  useEffect(() => {
    if (pollId) {
      const t = setTimeout(pollTask, 2000)
      return () => clearTimeout(t)
    }
  }, [pollId])

  async function fetchConfig() {
    try {
      const r = await fetch(`${API}/api/admin/config`)
      const d = await r.json()
      setConfig(d.data)
    } catch {}
  }

  async function pollTask() {
    if (!pollId) return
    try {
      const r = await fetch(`${API}/api/task/${pollId}`)
      const d = await r.json()
      if (d.data.status !== 'processing') {
        setLoading(false)
        if (d.data.status === 'completed') setResult(d.data.result_url)
        else setError(d.data.error || 'Generation failed')
        setPollId(null)
        loadTasks()
      } else {
        const t = setTimeout(pollTask, 3000)
      }
    } catch {}
  }

  async function loadTasks() {
    try {
      const r = await fetch(`${API}/api/tasks`)
      const d = await r.json()
      setTasks(d.data.slice(0, 20))
    } catch {}
  }

  async function doLogin() {
    const r = await fetch(`${API}/api/admin/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput })
    })
    const d = await r.json()
    if (d.data?.valid) { setLoggedIn(true); setPin(pinInput) }
    else alert('Wrong PIN')
  }

  async function saveConfig() {
    await fetch(`${API}/api/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replicate_token: cfgReplicate,
        openai_key: cfgOpenAI,
        admin_pin: cfgPin
      })
    })
    alert('Config saved!')
    fetchConfig()
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
    const d = await r.json()
    return d.data?.url || null
  }

  async function submitScene() {
    if (!sceneFile) return
    setLoading(true); setResult(null); setError(null)
    const url = await handleImageUpload(sceneFile)
    if (!url) { setLoading(false); setError('Upload failed'); return }
    const r = await fetch(`${API}/api/generate/scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: [url], style: sceneStyle, size_ratio: sceneRatio })
    })
    const d = await r.json()
    setPollId(d.data.task_id)
  }

  async function submitVideo() {
    if (!videoFile) return
    setLoading(true); setResult(null); setError(null)
    const url = await handleImageUpload(videoFile)
    if (!url) { setLoading(false); setError('Upload failed'); return }
    const r = await fetch(`${API}/api/generate/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url, prompt: videoPrompt, duration: videoDuration })
    })
    const d = await r.json()
    setPollId(d.data.task_id)
  }

  async function submitModel() {
    if (!modelFile) return
    setLoading(true); setResult(null); setError(null)
    const url = await handleImageUpload(modelFile)
    if (!url) { setLoading(false); setError('Upload failed'); return }
    const r = await fetch(`${API}/api/generate/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url, style: modelStyle, count: modelCount })
    })
    const d = await r.json()
    setPollId(d.data.task_id)
  }

  async function submitSeo() {
    if (!seoKeywords.trim()) return
    setLoading(true); setSeoResult(null); setError(null)
    try {
      const r = await fetch(`${API}/api/seo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: seoKeywords, mode: seoMode })
      })
      const d = await r.json()
      if (d.data.task_id) {
        setPollId(d.data.task_id)
        const t = setInterval(async () => {
          const rt = await fetch(`${API}/api/task/${d.data.task_id}`)
          const rd = await rt.json()
          if (rd.data.status !== 'processing') {
            clearInterval(t)
            setSeoResult(rd.data.result_url ? JSON.parse(rd.data.result_url) : null)
            setLoading(false)
          }
        }, 2000)
      } else {
        setSeoResult(d.data)
        setLoading(false)
      }
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '16px 24px', borderBottom: '1px solid #333' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#7c3aed' }}>🎨 Etsy688 Local AI</h1>
        <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>AI 创作工具 · 场景生成 · 视频生成 · SEO 优化</p>
      </div>

      {/* Config Warning */}
      {config && !config.has_replicate && (
        <div style={{ background: '#7f1d1d', padding: '10px 24px', fontSize: 13 }}>
          ⚠️ 请先配置 Replicate API Key（去 Config 页面填写）
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#111' }}>
        {(['scene', 'video', 'model', 'seo', 'config'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 20px', background: 'none', border: 'none', color: tab === t ? '#7c3aed' : '#888',
            cursor: 'pointer', fontSize: 14, borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent'
          }}>{t === 'scene' ? '🖼️ 场景' : t === 'video' ? '🎬 视频' : t === 'model' ? '👤 模特' : t === 'seo' ? '📝 SEO' : '⚙️ 配置'}</button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800 }}>
        {/* Scene Tab */}
        {tab === 'scene' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
              <h3 style={{ margin: '0 0 16px' }}>🖼️ 场景生成</h3>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#aaa' }}>上传商品图片</span>
                <input type="file" accept="image/*" onChange={e => setSceneFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: 6 }} />
              </label>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <label style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: '#aaa' }}>风格</span>
                  <select value={sceneStyle} onChange={e => setSceneStyle(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333' }}>
                    <option value="smart">专业电商摄影</option>
                    <option value="realistic_model">真人模特</option>
                    <option value="home">家居场景</option>
                    <option value="pinterest">Pinterest风格</option>
                    <option value="instagram">Instagram风格</option>
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: '#aaa' }}>比例</span>
                  <select value={sceneRatio} onChange={e => setSceneRatio(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333' }}>
                    <option value="1:1">1:1 (方)</option>
                    <option value="3:4">3:4 (竖)</option>
                    <option value="4:3">4:3 (横)</option>
                    <option value="9:16">9:16 (Story)</option>
                  </select>
                </label>
              </div>
              <button onClick={submitScene} disabled={loading || !sceneFile} style={{ padding: '10px 24px', background: loading ? '#444' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                {loading ? '生成中...' : '🚀 生成场景'}
              </button>
            </div>
          </div>
        )}

        {/* Video Tab */}
        {tab === 'video' && (
          <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px' }}>🎬 视频生成</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>上传图片</span>
              <input type="file" accept="image/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: 6 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>视频描述</span>
              <input value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} placeholder="product rotating showcase" style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
            </label>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa', marginRight: 12 }}>时长</span>
              {['5', '10'].map(d => <label key={d} style={{ marginRight: 12, fontSize: 14 }}><input type="radio" value={d} checked={videoDuration === d} onChange={() => setVideoDuration(d)} /> {d}秒</label>)}
            </div>
            <button onClick={submitVideo} disabled={loading || !videoFile} style={{ padding: '10px 24px', background: loading ? '#444' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '生成中...' : '🎬 生成视频'}
            </button>
          </div>
        )}

        {/* Model Tab */}
        {tab === 'model' && (
          <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px' }}>👤 AI 模特生成</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>上传商品图片</span>
              <input type="file" accept="image/*" onChange={e => setModelFile(e.target.files?.[0] || null)} style={{ display: 'block', marginTop: 6 }} />
            </label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: '#aaa' }}>场景</span>
                <select value={modelStyle} onChange={e => setModelStyle(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333' }}>
                  <option value="studio">影棚</option><option value="outdoor">户外</option><option value="cafe">咖啡馆</option><option value="street">街拍</option>
                </select>
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: '#aaa' }}>数量</span>
                <input type="number" min={1} max={4} value={modelCount} onChange={e => setModelCount(parseInt(e.target.value))} style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
              </label>
            </div>
            <button onClick={submitModel} disabled={loading || !modelFile} style={{ padding: '10px 24px', background: loading ? '#444' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '生成中...' : '👤 生成模特图'}
            </button>
          </div>
        )}

        {/* SEO Tab */}
        {tab === 'seo' && (
          <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px' }}>📝 Etsy SEO 优化</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>输入产品关键词（英文）</span>
              <input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="LED neon sign, custom sign, bar decoration" style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
            </label>
            <div style={{ marginBottom: 12 }}>
              <label style={{ marginRight: 16, fontSize: 14 }}><input type="radio" value="title" checked={seoMode === 'title'} onChange={() => setSeoMode('title')} /> 标题+描述+Tags</label>
              <label style={{ fontSize: 14 }}><input type="radio" value="keywords" checked={seoMode === 'keywords'} onChange={() => setSeoMode('keywords')} /> 关键词列表</label>
            </div>
            <button onClick={submitSeo} disabled={loading || !seoKeywords.trim()} style={{ padding: '10px 24px', background: loading ? '#444' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '生成中...' : '📝 生成 SEO'}
            </button>
            {seoResult && (
              <div style={{ marginTop: 16, background: '#111', padding: 16, borderRadius: 8 }}>
                {seoMode === 'title' ? (
                  <>
                    <p style={{ margin: '0 0 8px' }}><strong>📌 标题：</strong>{seoResult.title}</p>
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#aaa' }}><strong>📝 描述：</strong>{seoResult.description}</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}><strong>🏷️ Tags：</strong>{seoResult.tags?.join(', ')}</p>
                  </>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>{((seoResult.keywords || seoResult)?.split?.('\n') || []).map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Config Tab */}
        {tab === 'config' && !loggedIn && (
          <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 16px' }}>🔐 Admin 登录</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>默认 PIN：1234</p>
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="输入 PIN" style={{ padding: '10px 16px', borderRadius: 8, background: '#111', color: '#fff', border: '1px solid #333', width: 200, marginRight: 8 }} />
            <button onClick={doLogin} style={{ padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>登录</button>
          </div>
        )}

        {tab === 'config' && loggedIn && (
          <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 16px' }}>⚙️ API 配置</h3>
            {config && <div style={{ marginBottom: 16, fontSize: 13, color: '#888' }}>
              {config.has_replicate ? '✅ Replicate' : '❌ Replicate'} ·
              {config.has_openai ? '✅ OpenAI' : '❌ OpenAI'} ·
              PIN: {config.admin_pin_set ? '已改' : '默认1234'}
            </div>}
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>Replicate Token</span>
              <input value={cfgReplicate} onChange={e => setCfgReplicate(e.target.value)} placeholder="r8_..." style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>OpenAI API Key</span>
              <input value={cfgOpenAI} onChange={e => setCfgOpenAI(e.target.value)} placeholder="sk-..." style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#aaa' }}>新 PIN（可选）</span>
              <input value={cfgPin} onChange={e => setCfgPin(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: 4, borderRadius: 6, background: '#111', color: '#fff', border: '1px solid #333', boxSizing: 'border-box' }} />
            </label>
            <button onClick={saveConfig} style={{ padding: '10px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>💾 保存配置</button>
          </div>
        )}

        {/* Result */}
        {loading && <div style={{ marginTop: 20, textAlign: 'center', color: '#7c3aed', fontSize: 14 }}>⏳ 生成中，请稍候...</div>}
        {error && <div style={{ marginTop: 20, background: '#7f1d1d', padding: 12, borderRadius: 8, fontSize: 13, color: '#fca5a5' }}>❌ {error}</div>}
        {result && (
          <div style={{ marginTop: 20, background: '#1a1a2e', padding: 16, borderRadius: 12 }}>
            <p style={{ color: '#4ade80', margin: '0 0 12px', fontSize: 14 }}>✅ 生成完成！</p>
            <img src={result} style={{ maxWidth: '100%', borderRadius: 8 }} />
            <br />
            <a href={result} target="_blank" style={{ color: '#7c3aed', fontSize: 13 }}>🔗 打开原图</a>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
