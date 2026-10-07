import { describe, expect, it, afterEach } from 'vitest'
import { canAccess, canOpenPage, getUserArea } from '@/lib/admin/roles'

const original = process.env.ADMIN_ROLES
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_ROLES
  else process.env.ADMIN_ROLES = original
})

describe('getUserArea', () => {
  it('sem ADMIN_ROLES, todo mundo é full — um deploy sem a variável não tranca os sócios', () => {
    delete process.env.ADMIN_ROLES
    expect(getUserArea('Marujo')).toBe('full')
  })

  it('lê a área do usuário listado e mantém os demais em full', () => {
    process.env.ADMIN_ROLES = 'Marujo:recuperacao'
    expect(getUserArea('Marujo')).toBe('recuperacao')
    expect(getUserArea('rafael')).toBe('full')
  })

  it('não confunde usuários com nome parecido', () => {
    process.env.ADMIN_ROLES = 'Marujo:recuperacao'
    expect(getUserArea('Maruj')).toBe('full')
    expect(getUserArea('Marujo2')).toBe('full')
  })

  it('área desconhecida não vira acesso restrito silencioso', () => {
    process.env.ADMIN_ROLES = 'Marujo:financeiro'
    expect(getUserArea('Marujo')).toBe('full')
  })

  it('ignora entrada malformada sem derrubar as válidas', () => {
    process.env.ADMIN_ROLES = 'lixo,,Marujo:recuperacao'
    expect(getUserArea('Marujo')).toBe('recuperacao')
  })
})

describe('canAccess — nega por padrão', () => {
  it('full acessa qualquer área', () => {
    expect(canAccess('full')).toBe(true)
    expect(canAccess('full', 'recuperacao')).toBe(true)
  })

  it('área restrita é barrada quando a rota não declara nada', () => {
    // Este é o ponto do desenho: rota nova nasce fechada para o usuário restrito.
    expect(canAccess('recuperacao')).toBe(false)
  })

  it('área restrita só passa na área declarada', () => {
    expect(canAccess('recuperacao', 'recuperacao')).toBe(true)
    expect(canAccess('recuperacao', 'full')).toBe(false)
  })
})

describe('canOpenPage', () => {
  it('full abre qualquer página', () => {
    expect(canOpenPage('full', '/admin/financeiro/agente')).toBe(true)
  })

  it('recuperacao abre as próprias páginas e subrotas', () => {
    expect(canOpenPage('recuperacao', '/admin/recuperar-vendas')).toBe(true)
    expect(canOpenPage('recuperacao', '/admin/recuperar-vendas/algo')).toBe(true)
    expect(canOpenPage('recuperacao', '/admin/clientes-sumidos')).toBe(true)
  })

  it('clientes-sumidos não abre a de clientes, que é outra página', () => {
    // '/admin/clientes' NÃO pode passar por ser prefixo de '/admin/clientes-sumidos'.
    expect(canOpenPage('recuperacao', '/admin/clientes')).toBe(false)
  })

  it('recuperacao não abre o resto do painel', () => {
    expect(canOpenPage('recuperacao', '/admin')).toBe(false)
    expect(canOpenPage('recuperacao', '/admin/custos')).toBe(false)
    expect(canOpenPage('recuperacao', '/admin/financeiro/agente')).toBe(false)
  })

  it('prefixo parecido não abre outra página', () => {
    expect(canOpenPage('recuperacao', '/admin/recuperar-vendas-secreto')).toBe(false)
  })
})
