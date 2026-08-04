import { describe, it, expect, afterEach } from 'vitest'
import { authenticate, getAdminUsers, isMultiUser } from '@/lib/admin/users'

// O risco aqui não é invasão, é o oposto: um erro de leitura da variável de
// ambiente tranca o dono para fora do painel de produção. Por isso o fallback
// pro ADMIN_PASSWORD antigo é testado com o mesmo cuidado que o caminho novo.

const ORIGINAL_USERS    = process.env.ADMIN_USERS
const ORIGINAL_PASSWORD = process.env.ADMIN_PASSWORD

function setEnv(users?: string, password?: string) {
  if (users === undefined) delete process.env.ADMIN_USERS
  else process.env.ADMIN_USERS = users

  if (password === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = password
}

afterEach(() => {
  setEnv(ORIGINAL_USERS, ORIGINAL_PASSWORD)
})

describe('usuários do admin', () => {
  it('lê vários usuários de ADMIN_USERS', () => {
    setEnv('rafael:senha1,socio:senha2')

    expect(getAdminUsers()).toHaveLength(2)
    expect(authenticate('rafael', 'senha1')).toBe('rafael')
    expect(authenticate('socio',  'senha2')).toBe('socio')
    expect(isMultiUser()).toBe(true)
  })

  it('nega senha errada e usuário inexistente', () => {
    setEnv('rafael:senha1')

    expect(authenticate('rafael',   'errada')).toBeNull()
    expect(authenticate('ninguem',  'senha1')).toBeNull()
    expect(authenticate('',         '')).toBeNull()
  })

  it('não deixa a senha de um usuário abrir a conta de outro', () => {
    setEnv('rafael:senha1,socio:senha2')
    expect(authenticate('rafael', 'senha2')).toBeNull()
    expect(authenticate('socio',  'senha1')).toBeNull()
  })

  it('cai no ADMIN_PASSWORD antigo quando ADMIN_USERS não existe', () => {
    setEnv(undefined, 'senhaAntiga')

    expect(isMultiUser()).toBe(false)
    expect(authenticate('admin', 'senhaAntiga')).toBe('admin')
    expect(authenticate('admin', 'outra')).toBeNull()
  })

  it('cai no fallback também quando ADMIN_USERS está vazia ou ilegível', () => {
    setEnv('   ', 'senhaAntiga')
    expect(authenticate('admin', 'senhaAntiga')).toBe('admin')

    // Sem o separador ":" não dá pra extrair par nenhum.
    setEnv('rafael-sem-senha', 'senhaAntiga')
    expect(authenticate('admin', 'senhaAntiga')).toBe('admin')
  })

  it('aceita senha contendo ":" (só o primeiro separa)', () => {
    setEnv('rafael:sen:ha:1')
    expect(authenticate('rafael', 'sen:ha:1')).toBe('rafael')
  })

  it('não autentica ninguém quando nada está configurado', () => {
    setEnv(undefined, undefined)

    expect(getAdminUsers()).toHaveLength(0)
    expect(authenticate('admin', '')).toBeNull()
    expect(authenticate('admin', 'qualquer')).toBeNull()
  })
})
