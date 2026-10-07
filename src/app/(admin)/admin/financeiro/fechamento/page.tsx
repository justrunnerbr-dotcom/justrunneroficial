import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mesValido, mesVizinho } from '@/lib/admin/fechamento'
import { fechamentoSalvo, sugestoesDoSistema } from '@/lib/admin/fechamento-dados'
import { FechamentoPainel } from './_components/fechamento-painel'

export const metadata = { title: 'Fechamento do Mês · Just Runner Admin' }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const nomeMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`

export default async function FechamentoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: mesParam } = await searchParams
  const mes = mesValido(mesParam)

  // Sugestões do sistema (mesma conta do Dashboard) e valores digitados do mês.
  const [{ sistema, fontesFaltando }, salvo] = await Promise.all([sugestoesDoSistema(mes), fechamentoSalvo(mes)])

  const anterior = mesVizinho(mes, -1), proximo = mesVizinho(mes, 1)
  const navBtn = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-sec)', fontSize: '13px', textDecoration: 'none' } as const

  return (
    <div style={{ padding: '32px', maxWidth: '1180px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>Financeiro</p>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Fechamento de {nomeMes(mes)}</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', maxWidth: '680px' }}>
            Digite os valores de fatura e extrato. Ao lado de cada linha está o que o sistema calcula; onde não houver valor digitado, o resultado usa a sugestão. Regras do fechamento oficial do Matheus.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`?mes=${anterior}`} style={navBtn}><ChevronLeft size={14} />{nomeMes(anterior)}</Link>
          <Link href={`?mes=${proximo}`} style={navBtn}>{nomeMes(proximo)}<ChevronRight size={14} /></Link>
        </div>
      </div>

      <FechamentoPainel
        key={mes}
        mes={mes}
        sistema={sistema}
        digitados={salvo.digitados}
        usarSistemaInicial={salvo.usarSistema}
        observacoesIniciais={salvo.observacoes}
        atualizadoEm={salvo.atualizadoEm}
        atualizadoPor={salvo.atualizadoPor}
        tabelaExiste={salvo.tabelaExiste}
        fontesFaltando={fontesFaltando}
      />
    </div>
  )
}
