import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Just Runner',
  description: 'Entenda como a Just Runner coleta, utiliza e protege os dados dos clientes.',
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

export default function PoliticaPrivacidadePage() {
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
          Política de Privacidade
        </h1>
        <p style={{ ...TEXT_STYLE, marginBottom: '40px', fontSize: '14px' }}>
          Entenda como a Just Runner coleta, utiliza e protege suas informações.
        </p>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

          <h2 style={HEADING_STYLE}>1. Introdução</h2>
          <p style={TEXT_STYLE}>
            A Just Runner respeita a privacidade de seus clientes e visitantes. Esta política explica de forma transparente como coletamos, utilizamos e protegemos suas informações pessoais ao utilizar nosso site e ao realizar compras em nossa loja. Os dados são utilizados exclusivamente para operar a loja, processar pedidos, melhorar sua experiência e cumprir obrigações legais aplicáveis.
          </p>

          <h2 style={HEADING_STYLE}>2. Dados que podemos coletar</h2>
          <p style={{ ...TEXT_STYLE, marginBottom: '8px' }}>Ao navegar ou realizar uma compra em nosso site, podemos coletar as seguintes informações:</p>
          <ul style={LIST_STYLE}>
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>Número de telefone</li>
            <li>CPF, quando necessário para o processamento do pedido ou emissão de nota fiscal</li>
            <li>Endereço de entrega</li>
            <li>Dados de navegação, como páginas visitadas, tempo de sessão e dispositivo utilizado</li>
            <li>Dados de carrinho e histórico de compras</li>
            <li>Informações de pagamento — processadas diretamente por plataformas e gateways parceiros em ambiente seguro; não armazenamos dados completos de cartão de crédito</li>
            <li>Comunicações trocadas em atendimentos e solicitações</li>
          </ul>

          <h2 style={HEADING_STYLE}>3. Como utilizamos seus dados</h2>
          <p style={{ ...TEXT_STYLE, marginBottom: '8px' }}>As informações coletadas são utilizadas para:</p>
          <ul style={LIST_STYLE}>
            <li>Processar e entregar pedidos realizados em nossa loja</li>
            <li>Enviar atualizações sobre o status da compra e informações de rastreamento</li>
            <li>Oferecer atendimento ao cliente e responder a solicitações</li>
            <li>Prevenir fraudes e garantir a segurança das transações</li>
            <li>Melhorar o funcionamento e a experiência do site</li>
            <li>Analisar dados de navegação e conversão de forma agregada</li>
            <li>Enviar comunicações de marketing, quando você autoriza</li>
            <li>Cumprir obrigações legais, regulatórias ou fiscais aplicáveis</li>
          </ul>

          <h2 style={HEADING_STYLE}>4. Compartilhamento de dados</h2>
          <p style={{ ...TEXT_STYLE, marginBottom: '8px' }}>
            A Just Runner não vende nem comercializa seus dados pessoais. Podemos compartilhar informações somente quando necessário, com:
          </p>
          <ul style={LIST_STYLE}>
            <li>Plataformas de pagamento e gateways de checkout (para processar transações)</li>
            <li>Operadores logísticos e transportadoras (para entrega dos pedidos)</li>
            <li>Ferramentas de atendimento ao cliente</li>
            <li>Ferramentas de análise e marketing (de forma agregada ou anonimizada, quando possível)</li>
            <li>Autoridades legais, quando exigido por lei ou ordem judicial</li>
          </ul>

          <h2 style={HEADING_STYLE}>5. Cookies e tecnologias semelhantes</h2>
          <p style={TEXT_STYLE}>
            Nosso site pode utilizar cookies e tecnologias similares para manter o funcionamento da loja, entender padrões de navegação, medir a performance das páginas, melhorar campanhas de publicidade e personalizar sua experiência. Você pode gerenciar as preferências de cookies nas configurações do seu navegador. A desativação de alguns cookies pode afetar funcionalidades do site.
          </p>

          <h2 style={HEADING_STYLE}>6. Segurança das informações</h2>
          <p style={TEXT_STYLE}>
            Adotamos medidas técnicas e organizacionais razoáveis para proteger suas informações contra acesso não autorizado, perda ou divulgação indevida. As transações de pagamento são processadas em ambientes seguros por parceiros especializados. É importante destacar que nenhum sistema de segurança é totalmente infalível, e não podemos garantir a segurança absoluta das informações transmitidas pela internet.
          </p>

          <h2 style={HEADING_STYLE}>7. Seus direitos</h2>
          <p style={{ ...TEXT_STYLE, marginBottom: '8px' }}>
            Nos termos da legislação aplicável, você pode solicitar a qualquer momento:
          </p>
          <ul style={LIST_STYLE}>
            <li>Acesso aos dados pessoais que mantemos sobre você</li>
            <li>Correção de informações incorretas ou desatualizadas</li>
            <li>Exclusão de dados, quando aplicável e permitido pela legislação</li>
            <li>Informações sobre como seus dados são utilizados</li>
            <li>Revogação de consentimentos anteriormente fornecidos</li>
          </ul>
          <p style={{ ...TEXT_STYLE, marginTop: '10px' }}>
            Para exercer esses direitos, entre em contato pelos canais oficiais disponíveis na{' '}
            <a href="/contato" style={{ color: 'var(--color-heading)', textDecoration: 'underline', fontWeight: 500 }}>
              página de contato
            </a>.
          </p>

          <h2 style={HEADING_STYLE}>8. Contato</h2>
          <p style={TEXT_STYLE}>
            Dúvidas, solicitações ou sugestões relacionadas a esta política podem ser enviadas pelos canais oficiais de atendimento:
          </p>
          <div style={{ ...TEXT_STYLE, marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>
              E-mail:{' '}
              <a href="mailto:justhavefunsuporte@gmail.com" style={{ color: 'var(--color-heading)', fontWeight: 500 }}>
                justhavefunsuporte@gmail.com
              </a>
            </span>
            <span>
              WhatsApp:{' '}
              <a href="https://wa.me/5511950514943" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-heading)', fontWeight: 500 }}>
                (11) 95051-4943
              </a>
            </span>
          </div>

          <h2 style={HEADING_STYLE}>9. Atualizações desta política</h2>
          <p style={TEXT_STYLE}>
            Esta política pode ser atualizada periodicamente para refletir mudanças em nossas práticas ou na legislação aplicável. Recomendamos que você a revise regularmente. A data da última atualização constará ao final desta página.
          </p>

          <p style={{ ...TEXT_STYLE, fontSize: '13px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
            Última atualização: junho de 2026 · Just Runner Store · CNPJ 62.880.024/0001-30
          </p>

        </div>
      </div>
    </div>
  )
}
