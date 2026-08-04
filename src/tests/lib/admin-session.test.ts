import { describe, it, expect } from 'vitest'
import { signSession, verifySession, SESSION_TTL_SECONDS } from '@/lib/admin/session'

// A sessão do admin é a única coisa entre a internet e um painel que gasta
// dinheiro em anúncios e lê a base de clientes. Um erro aqui ou tranca o dono
// para fora, ou deixa qualquer um entrar — por isso o teste cobre os dois
// lados, não só o caminho feliz.

const SECRET = 'segredo-de-teste-nao-usado-em-producao'

describe('sessão assinada do admin', () => {
  it('aceita um token que ela mesma emitiu', async () => {
    const token   = await signSession('rafael', SECRET)
    const payload = await verifySession(token, SECRET)

    expect(payload).not.toBeNull()
    expect(payload?.u).toBe('rafael')
  })

  it('preserva a identidade de cada usuário', async () => {
    const a = await verifySession(await signSession('rafael', SECRET), SECRET)
    const b = await verifySession(await signSession('socio', SECRET), SECRET)

    expect(a?.u).toBe('rafael')
    expect(b?.u).toBe('socio')
  })

  it('recusa token assinado com outro segredo', async () => {
    const token = await signSession('rafael', 'outro-segredo')
    expect(await verifySession(token, SECRET)).toBeNull()
  })

  it('recusa token com o corpo adulterado', async () => {
    const token = await signSession('rafael', SECRET)
    const [, sig] = token.split('.')

    // Tenta se passar por outro usuário reaproveitando a assinatura válida.
    const forjado = Buffer.from(JSON.stringify({
      u: 'invasor',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url')

    expect(await verifySession(`${forjado}.${sig}`, SECRET)).toBeNull()
  })

  it('recusa token expirado', async () => {
    // TTL negativo => já nasce vencido.
    const token = await signSession('rafael', SECRET, -10)
    expect(await verifySession(token, SECRET)).toBeNull()
  })

  it('recusa lixo, vazio e o formato antigo (segredo cru no cookie)', async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull()
    expect(await verifySession('', SECRET)).toBeNull()
    expect(await verifySession('nao-e-um-token', SECRET)).toBeNull()
    expect(await verifySession('a.b.c.d', SECRET)).toBeNull()
    // Este é o formato que o cookie tinha antes: o próprio ADMIN_SECRET.
    expect(await verifySession(SECRET, SECRET)).toBeNull()
  })

  it('recusa qualquer token quando não há segredo configurado', async () => {
    const token = await signSession('rafael', SECRET)
    expect(await verifySession(token, undefined)).toBeNull()
    expect(await verifySession(token, '')).toBeNull()
  })

  it('emite validade de 7 dias por padrão', async () => {
    const token   = await signSession('rafael', SECRET)
    const payload = await verifySession(token, SECRET)

    expect(payload).not.toBeNull()
    expect(payload!.exp - payload!.iat).toBe(SESSION_TTL_SECONDS)
  })
})
