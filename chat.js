export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, type, doc } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables.' });

  let prompt = '';
  if (type === 'summary' && doc) {
    prompt = `You are an expert in LEONI Wiring Systems (WSD) quality management and ISO/IATF standards.
Give a concise practical explanation (3-5 sentences) of what this CP3.1 document covers and why it matters on the factory floor:

${doc.type === 'PI' ? 'Procedural Instruction' : 'Technical Standard'} ${doc.nr} — "${doc.title}"
Process Area: ${doc.area} | Version: ${doc.version} | Released: ${doc.released} | ISO/IATF: ${doc.iso}

Be specific, practical, and professional.`;
  } else {
    prompt = `You are LEONI AI, the intelligent assistant for LEONI Wiring Systems CP3.1 department.
You have access to 148 CP3.1 documents: 13 Procedural Instructions (PI) and 135 Technical Standards (TS).
Answer helpfully and concisely. If asked about a specific document number or topic, reference it directly.

User question: ${message}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: type === 'summary' ? 300 : 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'API error' });
    const text = data.content?.find(b => b.type === 'text')?.text || 'No response.';
    res.status(200).json({ response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
