const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string;
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID as string;
export const FEMALE_VOICE_ID = import.meta.env.VITE_ELEVENLABS_FEMALE_VOICE_ID as string;

export async function generateSpeech(text: string, voiceId: string = VOICE_ID): Promise<ArrayBuffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`);
  return res.arrayBuffer();
}
