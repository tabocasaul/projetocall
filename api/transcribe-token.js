// Função serverless (Vercel). Roda no servidor: a OPENAI_API_KEY nunca
// chega ao navegador. O que volta pro cliente é um token efêmero, de
// curta duração, escopado só para uma sessão de transcrição.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada no servidor" });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "transcription",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              transcription: {
                model: "gpt-realtime-whisper",
                language: "pt",
              },
            },
          },
        },
      }),
    });

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      return res.status(502).json({ error: "Falha ao criar sessão na OpenAI", detail });
    }

    const data = await openaiRes.json();
    return res.status(200).json({ value: data.value, expires_at: data.expires_at });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno ao gerar token" });
  }
};
