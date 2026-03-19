const { loadConfig } = require('../config');
const fetch = require('node-fetch');

async function generateSceneImage({ imageBase64, prompt, sizeRatio, style }) {
  const config = loadConfig();
  const token = config.replicate_token || config.stable_diffusion_key;
  if (!token) throw new Error('未配置 Replicate/Stable Diffusion API Key，请前往配置页面填写');

  const sizeMap = { '1:1': [1024,1024], '3:4': [896,1152], '4:3': [1152,896], '9:16': [768,1344], '5:4': [1024,1280] };
  const [width, height] = sizeMap[sizeRatio] || [1024,1024];

  const stylePrompts = {
    'smart': 'professional e-commerce product photography, clean white studio background, soft shadow, ultra realistic, 8K commercial quality',
    'realistic_model': 'professional fashion photography, model wearing product, natural outdoor environment, golden hour lighting, magazine quality editorial',
    'home': 'product displayed in modern living room interior, natural lighting, lifestyle photography, cozy home atmosphere',
    'pinterest': 'flat lay photography, product arranged artfully on marble surface, top-down view, Pinterest aesthetic, soft natural light',
    'instagram': 'product photography for Instagram, clean background, aesthetic Instagram feed style, bright and airy, trendy',
    'custom': prompt || ''
  };

  const fullPrompt = prompt && prompt.trim() ? prompt : stylePrompts[style] || stylePrompts['smart'];

  const body = {
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea7575255551ad3e41d73ee1e',
    input: {
      prompt: fullPrompt,
      negative_prompt: 'blurry, low quality, watermark, text, logo, distortion',
      width, height,
      guidance_scale: 7.5,
      num_inference_steps: 30,
      seed: Math.floor(Math.random() * 9999999999)
    }
  };

  // Use Replicate API
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': 'Token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error('Replicate API 调用失败: ' + err);
  }

  const prediction = await response.json();

  // Poll for completion
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
      headers: { 'Authorization': 'Token ' + token }
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') throw new Error('图片生成失败: ' + (result.error || 'unknown error'));
  return result.output?.[0] || result.output;
}

async function enhanceDetail({ imageUrl, scale }) {
  const config = loadConfig();
  const token = config.replicate_token;
  if (!token) throw new Error('未配置 Replicate API Key');

  // Use Real-ESRGAN via Replicate
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': 'Token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 'nightfu/realesrgan-ncnn-vulkan-pyjs:e86b8eb9e568dd5d2a6b7b6b9f0c5a5c8f1e6d8e9a0b1c2d3e4f5a6b7c8d9e0f',
      input: { image: imageUrl, scale: scale || 2 }
    })
  });

  if (!response.ok) throw new Error('Real-ESRGAN API 调用失败');

  const prediction = await response.json();
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
      headers: { 'Authorization': 'Token ' + token }
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') throw new Error('图片增强失败');
  return result.output?.[0];
}

module.exports = { generateSceneImage, enhanceDetail };
