// Helper: runs a SQL string against the Just Runner Supabase project via the
// Management API (no psql/DATABASE_URL configured locally). Usage:
//   node scripts/.supabase-query.mjs "select 1"
//   node scripts/.supabase-query.mjs --file path/to.sql
import fs from 'node:fs'

const PROJECT_REF = 'jprxiyxxdncfyeblcebb'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN não está setado no ambiente.')
  process.exit(1)
}

let sql
if (process.argv[2] === '--file') {
  sql = fs.readFileSync(process.argv[3], 'utf8')
} else {
  sql = process.argv[2]
}
if (!sql) {
  console.error('Uso: node scripts/.supabase-query.mjs "<sql>"  ou  --file <path>')
  process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const data = await res.json()
if (!res.ok) {
  console.error('ERRO:', JSON.stringify(data, null, 2))
  process.exit(1)
}
console.log(JSON.stringify(data, null, 2))
