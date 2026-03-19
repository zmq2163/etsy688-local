const { loadConfig } = require('../config');
const fetch = require('node-fetch');

async function generateVideo({ imageUrl, prompt, duration }) {
  const config = loadConfig();
  const token = config.replicate_token;
  if (!token) throw new Error('未配置 Replicate API Key');

  // Use Stable Diffusion based animation model via Replicate
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': 'Token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 'anotherjesse/zeroscope-v2-576w:format=mp4',
      input: {
        prompt: prompt || 'product rotating showcase, white background, smooth motion, cinematic',
        negative_prompt: 'blurry, distortion',
        num_frames: duration === '5' ? 24 : 48,
        width: 1024,
        height: 1024,
        guidance_scale: 7.5,
        num_inference_steps: 30
      }
    })
  });

  if (!response.ok) throw new Error('视频生成API调用失败');

  const prediction = await response.json();
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch('https://api.replicate.com/v1/predictions/' + result.id, {
      headers: { 'Authorization': 'Token ' + token }
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') throw new Error('视频生成失败');
  return result.output;
}

module.exports = { generateVideo };
