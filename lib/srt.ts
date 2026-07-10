// پارسر فایل SRT — زیرنویس را به آرایه‌ای از cue تبدیل می‌کند
export interface SrtCue {
  index: number
  start_ms: number
  end_ms: number
  text: string
}

// "00:01:23,456" → میلی‌ثانیه
function timeToMs(t: string): number {
  const m = t.trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{3})/)
  if (!m) return 0
  const [, h, mi, s, ms] = m
  return (Number(h) * 3600 + Number(mi) * 60 + Number(s)) * 1000 + Number(ms)
}

export function parseSRT(content: string): SrtCue[] {
  // نرمال‌سازی خطوط جدید و حذف BOM احتمالی
  const clean = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  const blocks = clean.split(/\n\s*\n/)
  const cues: SrtCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue

    // خط اول ممکن است شماره باشد یا مستقیم timestamp — هر دو را پشتیبانی می‌کنیم
    let idx = 0
    let timeLine = lines[0]
    let textLines = lines.slice(1)

    if (/^\d+$/.test(lines[0]) && lines[1]?.includes('-->')) {
      idx = parseInt(lines[0], 10)
      timeLine = lines[1]
      textLines = lines.slice(2)
    }

    const timeMatch = timeLine.match(/([\d:,.]+)\s*-->\s*([\d:,.]+)/)
    if (!timeMatch) continue

    const start_ms = timeToMs(timeMatch[1])
    const end_ms = timeToMs(timeMatch[2])
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim() // حذف تگ‌های HTML مثل <b>

    if (text) {
      cues.push({ index: idx || cues.length + 1, start_ms, end_ms, text })
    }
  }

  return cues.sort((a, b) => a.start_ms - b.start_ms)
}
