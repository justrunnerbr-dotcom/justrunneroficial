import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trocas e Devoluções | Just Runner',
  description: 'Veja como funcionam trocas, devoluções e solicitações de arrependimento de compra na Just Runner.',
}

const HEADING_STYLE = {
  fontFamily: 'var(--font-poppins), sans-serif',
  fontWeight: 700 as const,
  fontSize: '17px',
  color: 'var(--color-heading)',
  marginTop: '36px',
  marginBottom: '10px',
}

const TEXT_STYLE = {
  fontSize: '15px',
  lineHeight: 1.8,
  color: 'var(--color-muted)',
  fontFamily: 'var(--font-montserrat), sans-serif',
}

const LIST_STYLE = {
  ...TEXT_STYLE,
  paddingLeft: '20px',
  display: 'flex' as const,
  flexDirection: 'column' as const,
  gap: '6px',
}

export default function TrocaseDevolucoes() {
  return (
    <div style={{ padding: '64px 0' }}>
      <div className="page-width" style={{ maxWidth: '720px' }}>

        <h1
          style={{
            fontFamily: 'var(--font-poppins), sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: 'var(--color-heading)',
            marginBottom: '8px',
          }}
        >
          Trocas e Devoluções
        </h1>
        <p style={{ ...TEXT_STYLE, marginBottom: '40px', fontSize: '14px' }}>
          Veja como funcionam as solicitações de troca, devolução e arrependimento de compra.
        </p>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

          <h2 style={HEADING_STYLE}>1. Nosso compromisso</h2>
          <p style={TEXT_STYLE}>
            A Just Runner quer garantir uma experiência de compra segura, transparente e satisfatória. Se algo não sair como esperado, estamos aqui para ajudar. Nossa equipe analisa cada solicitação com atenção e agilidade, sempre buscando a melhor solução para você.
          </p>

          <h2 style={HEADING_STYLE}>2. Direito de arrependimento</h2>
          <p style={TEXT_STYLE}>
            Conforme previsto no Código de Defesa do Consumidor para compras realizadas à distância, você tem o direito de desistir da compra em até <strong style={{ color: 'var(--color-heading)' }}>7 dias corridos</strong> após o recebimento do produto, sem necessidade de justificativa. Nesse caso, o produto deve ser devolvido em suas condições originais para que o reembolso seja processado.
          </p>

          <h2 style={HEADING_STYLE}>3. Condições para troca ou devolução</h2>
          <p style={{ ...TEXT_STYLE, marginBottom: '8px' }}>Para que a troca ou devolução seja aceita, o produto deve:</p>
          <ul style={LIST_STYLE}>
            <li>Estar sem sinais de uso ou danos causados pelo cliente</li>
            <li>Encontrar-se em bom estado de conservação</li>
            <li>Estar acompanhado de todos os acessórios, embalagem original e itens enviados, quando aplicável</li>
            <li>Ser identificado com as informações do pedido (número do pedido ou comprovante de compra)</li>
          </ul>
          <p style={{ ...TEXT_STYLE, marginTop: '10px' }}>
            Casos que fujam a essas condições serão analisados individualmente pela equipe de atendimento, sempre respeitando a legislação aplicável.
          </p>

          <h2 style={HEADING_STYLE}>4. Produto com defeito</h2>
          <p style={TEXT_STYLE}>
            Se o produto apresentar defeito de fabricação ou chegar danificado, entre em contato o quanto antes pelos nossos canais oficiais informando:
          </p>
          <ul style={{ ...LIST_STYLE, marginTop: '8px' }}>
            <li>Número do pedido</li>
            <li>Descrição detalhada do problema</li>
            <li>Fotos ou vídeos que evidenciem o defeito, quando necessário para a análise</li>
          </ul>
          <p style={{ ...TEXT_STYLE, marginTop: '10px' }}>
            Nossa equipe analisará o caso e orientará sobre os próximos passos de forma rápida e transparente.
          </p>

          <h2 style={HEADING_STYLE}>5. Como solicitar troca ou devolução</h2>
          <ol style={{ ...LIST_STYLE, listStyleType: 'decimal' }}>
            <li>Acesse nossa <a href="/contato" style={{ color: 'var(--color-heading)', fontWeight: 500, textDecoration: 'underline' }}>página de contato</a> ou entre em contato pelo WhatsApp</li>
            <li>Informe o número do pedido</li>
            <li>Descreva o motivo da solicitação</li>
            <li>Aguarde o retorno da nossa equipe com as orientações</li>
            <li>Envie o produto conforme as instruções recebidas, quando aplicável</li>
          </ol>

          <h2 style={HEADING_STYLE}>6. Prazo de análise</h2>
          <p style={TEXT_STYLE}>
            As solicitações são analisadas pela nossa equipe de atendimento. Os prazos podem variar conforme o tipo de solicitação, a localidade e a forma de envio do produto. Faremos o possível para dar um retorno o mais rápido possível após o recebimento do pedido de troca ou devolução.
          </p>

          <h2 style={HEADING_STYLE}>7. Reembolso</h2>
          <p style={TEXT_STYLE}>
            Após a aprovação da devolução, o reembolso será processado conforme a forma de pagamento utilizada na compra. Os prazos de estorno podem variar de acordo com a instituição financeira, o intermediador de pagamento ou a plataforma de checkout utilizada — o que pode levar alguns dias úteis para aparecer na sua fatura ou conta. Informaremos sobre o andamento assim que o processo for iniciado.
          </p>

          <h2 style={HEADING_STYLE}>8. Casos específicos</h2>
          <p style={TEXT_STYLE}>
            Situações que envolvam itens promocionais, condições especiais de venda ou outras particularidades serão analisadas individualmente pela equipe de atendimento, sempre respeitando os direitos do consumidor e a legislação aplicável.
          </p>

          <h2 style={HEADING_STYLE}>9. Contato</h2>
          <p style={TEXT_STYLE}>
            Para iniciar uma solicitação de troca ou devolução, ou para tirar qualquer dúvida, entre em contato pelos nossos canais oficiais:
          </p>
          <div style={{ ...TEXT_STYLE, marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>
              WhatsApp:{' '}
              <a href="https://wa.me/5511988766461" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-heading)', fontWeight: 500 }}>
                (11) 98876-6461
              </a>{' '}
              · Seg–Sáb, 9h às 18h
            </span>
            <span>
              E-mail:{' '}
              <a href="mailto:suportejustrunner@gmail.com" style={{ color: 'var(--color-heading)', fontWeight: 500 }}>
                suportejustrunner@gmail.com
              </a>
            </span>
          </div>
          <p style={{ ...TEXT_STYLE, marginTop: '10px' }}>
            Você também pode usar o formulário disponível na{' '}
            <a href="/contato" style={{ color: 'var(--color-heading)', textDecoration: 'underline', fontWeight: 500 }}>
              página de contato
            </a>.
          </p>

          <p style={{ ...TEXT_STYLE, fontSize: '13px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
            Última atualização: junho de 2026 · Just Runner Store · CNPJ 62.880.024/0001-30
          </p>

        </div>
      </div>
    </div>
  )
}
