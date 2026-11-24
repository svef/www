import sharp from 'sharp'

/** Test images generated on the fly, so no binary fixtures are committed. */
export async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 137, g: 23, b: 225 } },
  })
    .png()
    .toBuffer()
}

export async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 9, g: 6, b: 12 } },
  })
    .jpeg()
    .toBuffer()
}

export async function gif(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .gif()
    .toBuffer()
}
