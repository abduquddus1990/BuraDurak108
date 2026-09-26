// Ovoz effektlari WebAudio orqali sintez qilinadi - audio fayllar yuklanmaydi (Mini App tez ochilishi uchun).
// E'lonlar ("Moskva!", "Bura!", "Tuxum!") brauzerning nutq sintezi bilan aytiladi (mavjud bo'lsa).

export type SoundName = 'card' | 'deal' | 'turn' | 'win' | 'lose' | 'alert' | 'error';

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  try {
    if (!ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // Brauzerlar foydalanuvchi bosmaguncha ovozni to'xtatib turadi
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (e) {
    return null;
  }
};

// Qisqa shovqin portlashi - karta shaqillashi
const noiseBurst = (ac: AudioContext, at: number, duration: number, volume: number, freq: number) => {
  const length = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(at);
};

const tone = (ac: AudioContext, at: number, freq: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration + 0.05);
};

export function playSound(name: SoundName): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  switch (name) {
    case 'card':
      noiseBurst(ac, t, 0.08, 0.5, 2200);
      break;
    case 'deal':
      for (let i = 0; i < 4; i++) noiseBurst(ac, t + i * 0.07, 0.06, 0.35, 2600);
      break;
    case 'turn':
      tone(ac, t, 880, 0.18, 0.12);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, t + i * 0.1, f, 0.3, 0.15, 'triangle'));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(ac, t + i * 0.14, f, 0.35, 0.12, 'triangle'));
      break;
    case 'alert':
      [659, 831, 988].forEach((f) => tone(ac, t, f, 0.6, 0.08, 'triangle'));
      break;
    case 'error':
      tone(ac, t, 160, 0.2, 0.15, 'square');
      break;
  }
}

// Qisqa e'lon (masalan "Moskva!"). O'zbek ovozi bo'lmasa rus ovozi ishlatiladi - so'zlar bir xil o'qiladi.
export function announce(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang.startsWith('uz')) || voices.find(v => v.lang.startsWith('ru')) || voices.find(v => v.lang.startsWith('tr'));
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || 'ru-RU';
    utter.rate = 1.05;
    synth.cancel();
    synth.speak(utter);
  } catch (e) {}
}
