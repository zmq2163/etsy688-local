const { loadConfig } = require('../config');
const fetch = require('node-fetch');

async function generateSEO({ keywords, mode }) {
  const config = loadConfig();
  if (!config.openai_key) throw new Error('未配置 OpenAI API Key，请前往配置页面填写');

  const systemPrompt = mode === 'keywords'
    ? '你是一位Etsy平台SEO关键词专家，请根据核心关键词生成15个长尾搜索关键词，每行一个，英文，≤30字符，直接输出列表不要解释'
    : '你是一位Etsy平台资深卖家，请为以下产品生成SEO优化内容。输出JSON格式：{title: "标题≤140字符", description: "描述约150字符", tags: ["标签1","标签2"..."标签13"]}，每个标签≤20字符，总字符≤195字符';

  const userPrompt = mode === 'keywords'
    ? '产品核心关键词：' + keywords
    : '产品关键词：' + keywords + '，请生成：1.SEO优化标题（含核心关键词）2.商品描述（自然流畅）3.13个搜索标签';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + config.openai_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.8,
      max_tokens: 1500
    })
  });

  if (!response.ok) throw new Error('OpenAI API 调用失败: ' + (await response.text()));

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI 返回为空');

  if (mode === 'keywords') {
    const keywords = content.split('\n').map(k => k.replace(/^\d+[.。]\s*/, '').trim()).filter(Boolean);
    return { keywords: keywords.slice(0, 15) };
  } else {
    try {
      let jsonStr = content;
      const match = content.match(/{[sS]*}/);
      if (match) jsonStr = match[0];
      return JSON.parse(jsonStr);
    } catch {
      throw new Error('SEO内容解析失败，请重试: ' + content.substring(0, 100));
    }
  }
}

module.exports = { generateSEO };
