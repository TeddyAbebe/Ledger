import { createWorker, PSM } from "tesseract.js"
import { sampleBadge } from "./badges"
import { parseExnessHistory, type ExtractedDay, type OcrWord } from "./parseExness"
import { prepareScreenshot } from "./prepare"

type TessWord = {
  text?: string
  bbox?: { x0?: number; y0?: number; x1?: number; y1?: number; x?: number; y?: number; w?: number; h?: number }
}
type TessBlock = {
  paragraphs?: { lines?: { words?: TessWord[] }[] }[]
  lines?: { words?: TessWord[] }[]
}

function readBbox(raw: TessWord["bbox"]): OcrWord["bbox"] | null {
  if (!raw) return null
  const x0 = Number(raw.x0 ?? raw.x)
  const y0 = Number(raw.y0 ?? raw.y)
  const x1 = Number(raw.x1 ?? (raw.w != null && Number.isFinite(x0) ? x0 + Number(raw.w) : Number.NaN))
  const y1 = Number(raw.y1 ?? (raw.h != null && Number.isFinite(y0) ? y0 + Number(raw.h) : Number.NaN))
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null
  return { x0, y0, x1, y1 }
}

function wordsFromTsv(tsv: string | null | undefined): OcrWord[] {
  if (!tsv) return []
  const words: OcrWord[] = []
  for (const line of tsv.split(/\r?\n/)) {
    const cols = line.split("\t")
    if (cols.length < 12 || Number(cols[0]) !== 5) continue
    const left = Number(cols[6])
    const top = Number(cols[7])
    const width = Number(cols[8])
    const height = Number(cols[9])
    const text = cols.slice(11).join("\t").trim()
    if (!text || ![left, top, width, height].every(Number.isFinite)) continue
    words.push({
      text,
      bbox: { x0: left, y0: top, x1: left + width, y1: top + height },
    })
  }
  return words
}

function flattenWords(blocks: TessBlock[] | null | undefined): OcrWord[] {
  if (!blocks) return []
  const words: OcrWord[] = []
  for (const block of blocks) {
    const lineGroups = [
      ...(block.paragraphs ?? []).flatMap((paragraph) => paragraph.lines ?? []),
      ...(block.lines ?? []),
    ]
    for (const line of lineGroups) {
      for (const word of line.words ?? []) {
        const text = word.text?.trim()
        const bbox = readBbox(word.bbox)
        if (!text || !bbox) continue
        words.push({ text, bbox })
      }
    }
  }
  return words
}

export async function readExnessScreenshot(
  file: File,
  onProgress?: (value: number) => void,
): Promise<{ text: string; days: ExtractedDay[] }> {
  onProgress?.(0.05)
  const prepared = await prepareScreenshot(file)
  onProgress?.(0.15)
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(0.2 + m.progress * 0.75)
      }
    },
  })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: "1",
    })
    const { data } = await worker.recognize(prepared.ocr, undefined, {
      text: true,
      blocks: true,
      tsv: true,
    })
    const text = data.text ?? ""
    const fromTsv = wordsFromTsv(data.tsv)
    const fromBlocks = flattenWords(data.blocks as TessBlock[] | null)
    const words = fromTsv.length >= fromBlocks.length ? fromTsv : fromBlocks
    const days = parseExnessHistory(text, new Date(), {
      words,
      color: prepared.color,
      sampleBadge: (bbox, side) => sampleBadge(prepared.color, bbox, side),
    })
    onProgress?.(1)
    return { text, days }
  } finally {
    await worker.terminate()
  }
}
