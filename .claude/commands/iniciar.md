---
description: Lê a memória do projeto JHF e o estado real atual pra retomar de onde paramos
---

Início de sessão no projeto JHF (`C:\Users\Administrador\jhf\justhavefun`). Antes de perguntar o que o usuário quer, faça o seguinte:

1. Leia a memória do projeto (`MEMORY.md` e os arquivos linkados — principalmente o de contexto/estado do projeto JHF e o de preferências/regras de implementação).
2. **Confirme contra o estado real** — não confie cegamente na memória, ela pode estar desatualizada. Rode no projeto:
   - `git status --short`
   - `git log --oneline -5`
   - `git diff --stat` (se houver algo não commitado)
   Compare com o que a memória diz sobre commits e pendências — se divergir, o estado real manda.
3. Se a memória menciona algo pendente (mudança aguardando aprovação visual, revertida, pergunta em aberto sem resposta), tenha isso pronto pra relembrar o usuário.

Depois, dê um resumo curto (poucas linhas) de onde paramos: o que está em produção, o que está pendente de decisão/aprovação, e qual pergunta em aberto (se houver) precisa de resposta. Não liste tudo que já está funcionando bem — só o que precisa de atenção ou decisão agora.
