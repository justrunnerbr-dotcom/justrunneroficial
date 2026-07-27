// Reduz as fotos da galeria de prova social (public/FEEDBACKS) para o tamanho
// em que realmente aparecem na tela.
//
// Contexto: os arquivos vieram em 700x1244 (~87KB cada, 2.6MB no total) mas o
// componente social-proof.tsx exibe cada um num box de 140x180 CSS px. Isso
// fazia a home baixar 2.6MB de imagem que o navegador ia encolher de qualquer
// jeito — e a galeria aparece na home E em toda página de produto.
//
// Redimensiona para 280px de largura (2x o box, para telas retina) preservando
// a proporção — sem recortar, para não tomar decisão de enquadramento em foto
// de cliente. Os originais estão versionados no git, então dá para voltar com
// `git checkout public/FEEDBACKS`.
//
// Uso: node --experimental-strip-types scripts/optimize-feedbacks.ts [--dry-run]
import sharp from 'sharp'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')
const DIR = join(process.cwd(), 'public', 'FEEDBACKS')
const TARGET_WIDTH = 280
const QUALITY = 78

async function main() {
  const files = readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f)).sort()
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Otimizando ${files.length} foto(s) em public/FEEDBACKS`)
  console.log(`Alvo: ${TARGET_WIDTH}px de largura, qualidade ${QUALITY}\n`)

  let before = 0
  let after = 0

  for (const file of files) {
    const path = join(DIR, file)
    const originalSize = statSync(path).size
    before += originalSize

    // Lê para buffer antes de processar: no Windows, o sharp mantém o arquivo
    // aberto e a escrita de volta no mesmo caminho falha com UNKNOWN.
    const source = readFileSync(path)
    const meta = await sharp(source).metadata()

    const output = await sharp(source)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer()

    after += output.length
    const pct = Math.round((1 - output.length / originalSize) * 100)
    console.log(
      `  ${file.padEnd(18)} ${meta.width}x${meta.height} ${String(Math.round(originalSize / 1024)).padStart(4)}KB` +
      ` -> ${TARGET_WIDTH}px ${String(Math.round(output.length / 1024)).padStart(3)}KB  (-${pct}%)`,
    )

    if (!DRY_RUN) writeFileSync(path, output)
  }

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`  antes : ${(before / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  depois: ${(after / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  economia: ${(((before - after) / before) * 100).toFixed(0)}% (${((before - after) / 1024 / 1024).toFixed(2)} MB por visita)`)
  console.log('─'.repeat(56))
  if (DRY_RUN) console.log('\n[DRY RUN] Nenhum arquivo foi escrito.\n')
}

main().catch((err: Error) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
