import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  yampiProductName,
  syncVariantNameToYampi,
  syncVariantNamesForProduct,
} from '@/lib/yampi/catalog'

const creds = { alias: 'jhfstore', token: 'tok', secretKey: 'sek' }

function mockSkuResponse(overrides: Partial<{ id: number; active: boolean; simple: boolean; brandId: number | null; categoryIds: number[] }> = {}) {
  const { id = 999, active = true, simple = true, brandId = 42, categoryIds = [7] } = overrides
  return {
    data: {
      id: 300000001,
      product_id: id,
      product: {
        data: {
          id,
          active,
          simple,
          name: 'old name',
          brand: brandId != null ? { data: { id: brandId } } : undefined,
          categories: { data: categoryIds.map((cid) => ({ id: cid })) },
        },
      },
    },
  }
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('yampiProductName', () => {
  it('joins product and variant name with 3 spaces and the [SO] prefix', () => {
    expect(yampiProductName('Radar', 'Preta Lente Espelhada')).toBe('[SO] Radar   Preta Lente Espelhada')
  })

  it('does not trim or alter either input', () => {
    expect(yampiProductName('A', 'B')).toBe('[SO] A   B')
  })
})

describe('syncVariantNameToYampi', () => {
  it('resolves sku -> product, PUTs the new name, and preserves simple/brand/active/categories from the GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(mockSkuResponse({ id: 555, active: true, simple: true, brandId: 42, categoryIds: [7, 8] })))
      .mockResolvedValueOnce(jsonResponse({ data: { id: 555 } }))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await syncVariantNameToYampi(creds, {
      yampiSkuId:  '300000001',
      productName: 'Radar',
      variantName: 'Preta Lente Espelhada',
      variantId:   'v1',
    })

    expect(outcome).toEqual({
      ok: true,
      yampiSkuId: '300000001',
      yampiProductId: 555,
      variantId: 'v1',
      newName: '[SO] Radar   Preta Lente Espelhada',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [getUrl] = fetchMock.mock.calls[0]
    expect(getUrl).toContain('/catalog/skus/300000001')
    expect(getUrl).toContain('include=product.brand,product.categories')

    const [putUrl, putInit] = fetchMock.mock.calls[1]
    expect(putUrl).toBe('https://api.dooki.com.br/v2/jhfstore/catalog/products/555')
    expect(putInit.method).toBe('PUT')
    const putBody = JSON.parse(putInit.body)
    expect(putBody).toEqual({
      simple: true,
      active: true,
      name: '[SO] Radar   Preta Lente Espelhada',
      brand_id: 42,
      categories_ids: [7, 8],
    })
  })

  it('returns ok:false and never attempts the PUT when the GET fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 404))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await syncVariantNameToYampi(creds, {
      yampiSkuId: '404sku', productName: 'A', variantName: 'B',
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.error).toContain('404')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns ok:false when the PUT fails after a successful GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(mockSkuResponse()))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await syncVariantNameToYampi(creds, {
      yampiSkuId: 'sku1', productName: 'A', variantName: 'B',
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.yampiProductId).toBe(999)
    expect(outcome.error).toContain('500')
  })

  it('never throws, even when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const outcome = await syncVariantNameToYampi(creds, {
      yampiSkuId: 'sku1', productName: 'A', variantName: 'B',
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.error).toContain('network down')
  })
})

describe('syncVariantNamesForProduct', () => {
  it('aggregates synced/failed counts across a mixed-outcome batch', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/skus/bad-sku')) return jsonResponse({}, false, 404)
      if (url.includes('/skus/')) return jsonResponse(mockSkuResponse())
      return jsonResponse({ data: { id: 999 } }) // PUT
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await syncVariantNamesForProduct(
      creds,
      'Radar',
      [
        { id: 'v1', name: 'Preta', yampiSkuId: 'good-sku-1' },
        { id: 'v2', name: 'Azul', yampiSkuId: 'bad-sku' },
        { id: 'v3', name: 'Verde', yampiSkuId: 'good-sku-2' },
      ],
      2,
    )

    expect(result.synced).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.results).toHaveLength(3)
    expect(result.results.find((r) => r.variantId === 'v2')?.ok).toBe(false)
  })

  it('never runs more than the configured concurrency limit at once', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return url.includes('/skus/') ? jsonResponse(mockSkuResponse()) : jsonResponse({ data: { id: 999 } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const variants = Array.from({ length: 6 }, (_, i) => ({
      id: `v${i}`, name: `variant-${i}`, yampiSkuId: `sku-${i}`,
    }))

    const result = await syncVariantNamesForProduct(creds, 'Radar', variants, 2)

    expect(result.synced).toBe(6)
    expect(maxInFlight).toBeLessThanOrEqual(2)
    expect(maxInFlight).toBe(2) // proves the batch actually parallelized, not accidentally serial
  })
})
