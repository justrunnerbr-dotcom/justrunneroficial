import { describe, it, expect } from 'vitest'
import {
  canonicalChannel, isAttributed, channelBreakdown,
  type OrderForChannel,
} from '@/lib/admin/analise-suprema-canais'

const ped = (utmSource: string | null, total: number, utmCampaign: string | null = null): OrderForChannel =>
  ({ utmSource, utmCampaign, total })

describe('canonicalChannel', () => {
  it('canoniza variantes do mesmo canal', () => {
    expect(canonicalChannel('ig')).toBe(canonicalChannel('instagram'))
    expect(canonicalChannel('IG')).toBe('Instagram')
    expect(canonicalChannel('Instagram_Stories')).toBe('Instagram')
  })

  it('placeholder de template nao vira canal', () => {
    expect(canonicalChannel('{{site_source_name}}')).toBe('Sem atribuição')
    expect(canonicalChannel('{{placement}}')).toBe('Sem atribuição')
  })

  it('nulo, vazio e espaco caem em sem atribuicao', () => {
    expect(canonicalChannel(null)).toBe('Sem atribuição')
    expect(canonicalChannel(undefined)).toBe('Sem atribuição')
    expect(canonicalChannel('')).toBe('Sem atribuição')
    expect(canonicalChannel('   ')).toBe('Sem atribuição')
  })

  it('agrupa variantes de whatsapp', () => {
    expect(canonicalChannel('WhatsApp_Yampi')).toBe('WhatsApp')
    expect(canonicalChannel('whatsapp')).toBe('WhatsApp')
  })

  it('agrupa google e facebook', () => {
    expect(canonicalChannel('google')).toBe('Google')
    expect(canonicalChannel('fb')).toBe('Facebook')
    expect(canonicalChannel('facebook')).toBe('Facebook')
    expect(canonicalChannel('meta')).toBe('Facebook')
  })

  it('preserva canal desconhecido em vez de descartar', () => {
    expect(canonicalChannel('pinterest')).toBe('Pinterest')
  })

  it('isAttributed separa o balde de sem origem', () => {
    expect(isAttributed('Instagram')).toBe(true)
    expect(isAttributed('Sem atribuição')).toBe(false)
  })
})

describe('channelBreakdown', () => {
  it('agrega receita e pedidos por canal', () => {
    const r = channelBreakdown([ped('ig', 300), ped('instagram', 200), ped('google', 500)])
    const insta = r.channels.find(c => c.channel === 'Instagram')!
    expect(insta.orders).toBe(2)
    expect(insta.revenue).toBe(500)
    expect(insta.aov).toBe(250)
  })

  it('calcula cobertura de atribuicao', () => {
    const r = channelBreakdown([ped('ig', 600), ped(null, 400)])
    expect(r.attributedRevenue).toBe(600)
    expect(r.unattributedRevenue).toBe(400)
    expect(r.coveragePct).toBeCloseTo(60, 5)
  })

  it('share soma 100% incluindo o balde sem atribuicao', () => {
    const r = channelBreakdown([ped('ig', 600), ped(null, 400)])
    expect(r.channels.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100, 5)
  })

  it('ordena canais por receita decrescente', () => {
    const r = channelBreakdown([ped('google', 100), ped('ig', 900), ped('whatsapp', 500)])
    expect(r.channels.map(c => c.channel)).toEqual(['Instagram', 'WhatsApp', 'Google'])
  })

  it('agrupa campanhas dentro do canal', () => {
    const r = channelBreakdown([
      ped('ig', 300, 'promo-julho'),
      ped('ig', 200, 'promo-julho'),
      ped('ig', 100, 'remarketing'),
    ])
    const insta = r.channels.find(c => c.channel === 'Instagram')!
    expect(insta.topCampaigns[0]).toEqual({ name: 'promo-julho', revenue: 500, orders: 2 })
  })

  it('ignora campanha com placeholder de template', () => {
    const r = channelBreakdown([ped('ig', 300, '{{campaign.name}}')])
    expect(r.channels[0].topCampaigns).toEqual([])
  })

  it('lista vazia nao divide por zero', () => {
    const r = channelBreakdown([])
    expect(r.channels).toEqual([])
    expect(r.coveragePct).toBe(0)
    expect(Number.isFinite(r.attributedRevenue)).toBe(true)
  })

  it('receita zero nao gera NaN em aov nem share', () => {
    const r = channelBreakdown([ped('ig', 0)])
    expect(Number.isFinite(r.channels[0].aov)).toBe(true)
    expect(Number.isFinite(r.channels[0].share)).toBe(true)
  })

  it('cobertura zero quando nenhum pedido tem origem', () => {
    const r = channelBreakdown([ped(null, 100), ped('', 200)])
    expect(r.coveragePct).toBe(0)
    expect(r.channels).toHaveLength(1)
    expect(r.channels[0].channel).toBe('Sem atribuição')
  })
})
