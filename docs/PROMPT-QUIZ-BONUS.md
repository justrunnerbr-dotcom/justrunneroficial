# Prompt — Quiz do cliente com óculos de bônus (portar da JHF para o Just Runner)

> Escrito em 07/10/2026 a partir da sessão do projeto JHF, onde isto foi construído e testado
> ponta a ponta. Rode numa sessão do **Just Runner**. Nada aqui é dado da JHF: nenhum ID, SKU,
> produto, cupom, logo ou número de venda atravessa. Só a lógica, o comportamento da Yampi
> (que é a mesma plataforma) e as armadilhas já pagas.

## Objetivo

Página escondida `/quiz` (fora do menu e do Google) com um quiz de pesquisa (11 perguntas sobre
o que impede a compra, preço, oferta preferida, origem, estilo musical) + captura de contato
(nome, WhatsApp, e-mail, cidade, UF, faixa de idade, consentimento LGPD). Quem termina ganha
**1 óculos de bônus** na compra da promoção principal da loja. Depois de escolher o bônus, a
pessoa cai numa vitrine exclusiva `/oferta-quiz` e o carrinho mostra o bônus.

Fonte do quiz (HTML/CSS/JS do sócio, com marca da JHF — **trocar logo e textos de marca**):
`~/Downloads/quiz-just-have-fun/` (se não estiver mais lá, peça o zip ao dono).

## Antes de começar — confirmar com o dono (não assumir)

1. **Qual promoção o bônus acompanha** no Just Runner e qual o subtotal cheio que ela exige.
   Na JHF era "Compre 1 Leve 2" com 2 itens de R$ 297 → subtotal cheio R$ 594. Leia o
   `src/lib/cart-store.ts` e a regra de desconto na Yampi do JR antes de propor o número.
2. **Quais produtos vão como bônus.** Na JHF o critério final do dono foi: *entre as cores mais
   vendidas nos últimos 30 dias, as de custo até R$ 25* (o 1º critério, só custo, trazia modelos
   que quase não vendem e ele recusou). Proponha a lista com vendas e custo e espere o ok.
3. **Validade** (na JHF: até o fim do mês) e se o bônus **não acumula com outros cupons**.
4. Os textos do quiz citam preço ("cada óculos sai por R$ 150") e oferta — ajustar à oferta do JR.

## Como o bônus funciona na Yampi (testado no checkout real, 07/10/2026)

Não use produto de R$ 0 no carrinho (dá pra comprar sozinho). O mecanismo certo:

- **Brinde** `POST /{alias}/pricing/freebies` com
  `{ name, active: true, start_at, resource_type: 'sku', resource_id: <SKU>, rule: 'promocode' }`.
  - `start_at` aceita **só data** `YYYY-MM-DD`. Com hora → 422 "Insira uma data válida".
  - `end_at` é **ignorado** (volta `expires_at: null`) — a validade se controla no cupom.
  - Um brinde por modelo de bônus, criado uma vez (script idempotente: procure por nome
    **ou** por `resource_id` + `rule`, porque a Yampi troca o "—" do nome por espaços).
  - Brinde ligado a cupom **não pode ser apagado** (422 "vinculado a um cupom") — desvincule antes.
- **Cupom único por pessoa** `POST /{alias}/pricing/promocodes` com
  `{ code, value: 0, discount_type: 'v', quantity: 1, once_per_customer: true, accumulate: false,
  min_value: <subtotal cheio da promoção>, freebie_id, active: true, start_at, end_at }`
  (`start_at`/`end_at` aqui aceitam data **com hora**). Valor 0 + brinde é aceito.
  - `PUT` de cupom exige o corpo **inteiro** (active, quantity, value, start_at, end_at) — senão 422.
- **`min_value` é conferido no subtotal CHEIO, antes do desconto da promoção.** Na JHF: 1 item
  (R$ 297) → "Cupom inválido"; 2 itens (R$ 594, total com desconto R$ 297) → entra o 3º item a
  R$ 0 e o total não muda. É isso que trava "só com a promoção".
- **Aplicar pelo link:** `&promocode=CODIGO` na URL `/cart/items` aplica sozinho.
  (`coupon=`, `cupom=`, `code=` não funcionam.)
- **Estoque:** a loja vende sem estoque (`availability_soldout: -1`, `total_in_stock: 0`); o
  brinde entra mesmo assim. Critério de seleção é só `blocked_sale: false`.
- Teste o fluxo criando brinde e cupom de teste (código aleatório, validade curta), abra o
  checkout com Playwright (`seguro.<dominio>/cart/items?...&promocode=...`, iPhone 13,
  `waitUntil: 'domcontentloaded'` + esperar a URL `/checkout` + ~9 s — `networkidle` nunca
  resolve), leia `.detail` do resumo e **apague tudo** depois, conferindo 404 na releitura.

## Arquitetura (o que foi feito na JHF — referência de leitura em `~/jhf/justhavefun`)

Só leia esses arquivos como modelo; **não copie os IDs/SKUs/nomes** de dentro deles.

| Peça | Arquivo na JHF | Papel |
|---|---|---|
| Layout do quiz | `src/app/(quiz)/layout.tsx` | tela cheia, sem header da loja, com `TrackingProvider` (UTM/page_view); fontes via `next/font` |
| Página | `src/app/(quiz)/quiz/page.tsx` | `robots: noindex`; busca a foto de cada bônus por `variant_id` |
| Marcação | `src/app/(quiz)/quiz/quiz-markup.ts` | o HTML do sócio como string, com `__VALIDADE__` |
| Lógica | `src/app/(quiz)/quiz/quiz-engine.ts` | o `script.js` dele portado pra TS, agindo pelos ids |
| CSS | `src/app/(quiz)/quiz/quiz.css` | o CSS dele **escopado em `.jhf-quiz`** (gerado com postcss) |
| Config | `src/lib/quiz/bonus.ts` | bônus (id, nome, SKU, freebieId, variantId), validade, mínimo, destino |
| Cupom no navegador | `src/lib/quiz/client.ts` | `saveQuizCupom`, `getQuizCupom`, `useQuizCupom` (useSyncExternalStore), `quizCupomLiberado(subtotal)` |
| API respostas | `src/app/api/quiz/lead/route.ts` | grava em 2 etapas (respostas → contato) na mesma linha; só chaves conhecidas |
| API cupom | `src/app/api/quiz/bonus/route.ts` | cria o cupom na Yampi; **1 por pessoa** (mesmo WhatsApp ou e-mail devolve o mesmo); recusa resposta sem contato |
| Checkout | `src/lib/yampi.ts` → `quizPromocodeParam` | põe `&promocode=` **só** com subtotal cheio ≥ mínimo (abaixo disso a Yampi mostra "Cupom inválido" à toa) |
| Linha no carrinho | `src/components/store/quiz-bonus-row.tsx` + `cart-drawer.tsx` | aviso fixo com foto: "falta R$ X" / "✓ liberado, entra no checkout" |
| Vitrine exclusiva | `src/app/(store)/oferta-quiz/` | topo com o bônus escolhido + progresso + resumo; mesma vitrine da promoção; sem cupom → convite pro quiz |
| Script brindes | `scripts/_quiz-cria-brindes.mjs` | cria os brindes que faltam e remove os do quiz que saíram da lista |
| Tabela | `supabase/migrations/20261007000001_quiz_respostas.sql` | o dono roda no SQL Editor; RLS ligado e **sem política** (anon recebe 401) |
| Meta | `src/lib/meta.ts` (`metaLead`) + `src/app/api/meta/capi-event/route.ts` | Lead no pixel + CAPI com o mesmo `event_id`; incluir `'Lead'` em `ALLOWED_EVENTS` |

Eventos próprios disparados: `quiz_start`, `quiz_complete`, `quiz_lead`, `quiz_bonus`.

## Armadilhas já pagas

- **CSS global vaza**: o CSS do sócio usa `body`, `.cta`, `.product`… Escopar tudo num wrapper.
  E o global da loja pinta `h1–h6` com `--color-heading` (quase preto): o título some no fundo
  preto — declarar `.wrapper h1, h2 { color: var(--text) }`.
- **Fonte**: no Google Fonts "Big Shoulders Display" virou **`Big_Shoulders`** no `next/font/google`.
- **`.gitignore` no Mac**: regra de pasta de dados em maiúsculas (ex.: `PEDIDOS/`) esconde pasta
  de código `pedidos/` (git do Mac ignora maiúsculas). Confira com `git check-ignore -v`.
- **Filtro `.or()` do Supabase com e-mail do usuário**: não monte texto de filtro; faça 2 consultas.
- **Brinde não vira item do carrinho do site** — a Yampi só o adiciona no checkout. Por isso a
  linha no carrinho e a vitrine exclusiva: o cliente precisa VER que o bônus está garantido.
- ⚠️ **Conferir no JR:** `src/lib/yampi.ts` tem o mesmo `STORE_TOKEN` da JHF. Verifique na Yampi
  do Just Runner se o token é o dele — se não for, o link do checkout pode estar apontando pra
  loja errada (independe do quiz, mas afeta o teste).

## Testes que fecharam na JHF (repetir)

1. Quiz inteiro como cliente (Playwright, iPhone 13): respostas e contato na **mesma** linha;
   UTM do link gravada; tela de bônus com todos os cards com foto.
2. Cupom criado e relido na Yampi: valor 0, mínimo certo, 1 uso, não acumula, brinde certo, validade.
3. Carrinho do site com 1 item → linha "falta R$ X"; com 2 → "liberado"; "Finalizar" gera link
   com `&promocode=`; checkout mostra **3 itens e o total da promoção**.
4. Mesmo WhatsApp em outra resposta → **mesmo** cupom. Resposta sem contato → 403.
5. Tabela: service_role lê; anon leitura e escrita → 401.
6. Apagar dados e cupons de teste e conferir (tabela vazia, cupom 404).
7. `npx tsc --noEmit`, lint dos arquivos tocados, `npm run build`.
