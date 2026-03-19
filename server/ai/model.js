const { loadConfig } = require('../config');
const fetch = require('node-fetch');

async function generateModelImage({ imageBase64, scenePrompt, style }) {
  const config = loadConfig();
  const token = config.replicate_token;
  if (!token) throw new Error('未配置 Replicate API Key');

  const stylePrompts = {
    'outdoor': 'professional fashion photography, model wearing product, outdoor sunlight, golden hour, natural environment, editorial magazine quality',
    'cafe': 'cozy cafe setting, warm ambient lighting, lifestyle photography, model with product, relaxed atmosphere',
    'bedroom': 'bedroom atmosphere, soft warm lighting, intimate lifestyle feel, model with product, cozy home setting',
    'street': 'street fashion photography, urban background, cool tone, editorial magazine style, model wearing product',
    'studio': 'professional studio photography, clean seamless background, commercial lighting, fashion catalog quality, model with product',
    'custom': scenePrompt || ''
  };

  const fullPrompt = scenePrompt && scenePrompt.trim()
    ? scenePrompt
    : stylePrompts[style] || stylePrompts['studio'];

  // Use SDXL with img2img + controlnet for model generation
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': 'Token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea7575255551ad3e41d73ee1e',
      input: {
        prompt: fullPrompt,
        negative_prompt: 'blurry, low quality, cartoon, anime, distortion, watermark, text, logo',
        width: 1024,
        height: 1280,
        guidance_scale: 8,
        num_inference_steps: 35,
        image: imageBase64,
        prompt_strength: 0.7,
        seed: Math.floor(Math.random() * 9999999999)
      }
    })
  });

  if (!response.ok) throw new Error('模特图生成API调用失败');

  const prediction = await response.json();
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
      headers: { 'Authorization': 'Token ' + token }
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') throw new Error('模特图生成失败');
  return result.output?.[0] || result.output;
}

module.exports = { generateModelImage };
