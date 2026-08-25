export type BadgeTone = "teal" | "red" | "grey" | "unknown"

export type Bbox = { x0: number; y0: number; x1: number; y1: number }

function isVividGreen(r: number, g: number, b: number) {
  return g > 72 && g > r + 22 && g >= b - 4
}

function isVividRed(r: number, g: number, b: number) {
  return r > 82 && r > g + 24 && r >= b - 10
}

function countVivid(image: ImageData, x0: number, y0: number, x1: number, y1: number) {
  let green = 0
  let red = 0
  const left = Math.max(0, Math.floor(x0))
  const top = Math.max(0, Math.floor(y0))
  const right = Math.min(image.width - 1, Math.ceil(x1))
  const bottom = Math.min(image.height - 1, Math.ceil(y1))
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const i = (y * image.width + x) * 4
      const r = image.data[i]
      const g = image.data[i + 1]
      const b = image.data[i + 2]
      if (isVividGreen(r, g, b)) green += 1
      else if (isVividRed(r, g, b)) red += 1
    }
  }
  return { green, red }
}

export function sampleBadge(image: ImageData, bbox: Bbox, side: "tp" | "sl"): BadgeTone {
  const width = Math.max(8, bbox.x1 - bbox.x0)
  const height = Math.max(8, bbox.y1 - bbox.y0)
  const counts = countVivid(
    image,
    bbox.x0 - width * 0.35,
    bbox.y0 - height * 0.45,
    bbox.x1 + width * 0.35,
    bbox.y1 + height * 0.45,
  )
  if (side === "tp") return counts.green >= 8 && counts.green > counts.red ? "teal" : "grey"
  return counts.red >= 8 && counts.red > counts.green ? "red" : "grey"
}

export function sampleRowBadges(image: ImageData, actionY: number) {
  const y1 = actionY - Math.max(6, image.height * 0.006)
  const y0 = y1 - Math.max(22, image.height * 0.022)
  const tp = countVivid(image, image.width * 0.32, y0, image.width * 0.48, y1)
  const sl = countVivid(image, image.width * 0.42, y0, image.width * 0.58, y1)
  return {
    tpHit: tp.green >= 12 && tp.green > tp.red,
    slHit: sl.red >= 12 && sl.red > sl.green,
  }
}

function clusterYs(ys: number[], maxGap = 16) {
  if (!ys.length) return []
  const sorted = [...ys].sort((a, b) => a - b)
  const groups: number[][] = [[sorted[0]]]
  for (const y of sorted.slice(1)) {
    const last = groups.at(-1)!
    if (y - last.at(-1)! <= maxGap) last.push(y)
    else groups.push([y])
  }
  return groups.map((group) => (group[0] + group[group.length - 1]) / 2)
}

export function findColoredBadgeRows(image: ImageData) {
  const tpRows: number[] = []
  const slRows: number[] = []
  const step = 2
  const tpX0 = image.width * 0.33
  const tpX1 = image.width * 0.48
  const slX0 = image.width * 0.42
  const slX1 = image.width * 0.56
  for (let y = 0; y < image.height; y += step) {
    const tp = countVivid(image, tpX0, y, tpX1, y + step)
    const sl = countVivid(image, slX0, y, slX1, y + step)
    if (tp.green >= 8 && tp.green > tp.red * 1.4) tpRows.push(y)
    if (sl.red >= 8 && sl.red > sl.green * 1.4) slRows.push(y)
  }
  return { tpYs: clusterYs(tpRows), slYs: clusterYs(slRows) }
}

export function isTpHit(tone: BadgeTone) {
  return tone === "teal"
}

export function isSlHit(tone: BadgeTone) {
  return tone === "red"
}
