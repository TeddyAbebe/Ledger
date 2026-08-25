export type PreparedShot = {
  ocr: Blob
  color: ImageData
}

export async function prepareScreenshot(file: File): Promise<PreparedShot> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = img.width < 900 ? 2.2 : img.width > 1400 ? 1 : 1.6
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)

    const colorCanvas = document.createElement("canvas")
    colorCanvas.width = width
    colorCanvas.height = height
    const colorCtx = colorCanvas.getContext("2d", { willReadFrequently: true })
    if (!colorCtx) throw new Error("Canvas unavailable")
    colorCtx.drawImage(img, 0, 0, width, height)
    const color = colorCtx.getImageData(0, 0, width, height)

    const ocrCanvas = document.createElement("canvas")
    ocrCanvas.width = width
    ocrCanvas.height = height
    const ocrCtx = ocrCanvas.getContext("2d")
    if (!ocrCtx) throw new Error("Canvas unavailable")
    ocrCtx.putImageData(color, 0, 0)
    const image = ocrCtx.getImageData(0, 0, width, height)
    const data = image.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
      const inverted = 255 - gray
      const stretched = (inverted - 28) * 1.35
      const value = Math.min(255, Math.max(0, stretched))
      data[i] = data[i + 1] = data[i + 2] = value
    }
    ocrCtx.putImageData(image, 0, 0)

    const ocr = await new Promise<Blob>((resolve, reject) => {
      ocrCanvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not process image"))), "image/png")
    })
    return { ocr, color }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not read that image"))
    img.src = src
  })
}
