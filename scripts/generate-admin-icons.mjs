import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const SOURCE = 'resource/Isotio.png'
const OUT_DIR = 'public/icons'

await mkdir(OUT_DIR, { recursive: true })

const trimmed = await sharp(SOURCE).trim({ threshold: 12 }).png().toBuffer()

// Monocromo elegante: fondo negro oscuro (#0F172A) con el isotipo en blanco y gris (acero/plata)
// o versión blanco y negro pura con alto contraste
const bwSymbol = await sharp(trimmed)
  .grayscale()
  .linear(1.4, -20) // Aumentar contraste para nitidez
  .png()
  .toBuffer()

async function makeAdminIcon(size, ratio, file, bg = { r: 15, g: 23, b: 42, alpha: 1 }) {
  const inner = Math.round(size * ratio)
  const symbol = await sharp(bwSymbol)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg, // Fondo elegante obsidian (#0F172A)
    },
  })
    .composite([{ input: symbol, gravity: 'center' }])
    .png()
    .toFile(file)

  console.log(`Generado: ${file} (${size}x${size})`)
}

await makeAdminIcon(192, 0.75, `${OUT_DIR}/admin-icon-192.png`)
await makeAdminIcon(512, 0.75, `${OUT_DIR}/admin-icon-512.png`)
await makeAdminIcon(180, 0.75, `${OUT_DIR}/admin-apple-touch-icon.png`)
await makeAdminIcon(64, 0.82, 'public/admin-favicon.png')

console.log('Iconos monocromáticos de Super Admin generados con éxito.')
