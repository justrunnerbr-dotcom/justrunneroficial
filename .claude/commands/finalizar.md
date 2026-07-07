---
description: Salva o estado atual do projeto na memória antes de encerrar a sessão
---

Sessão terminando. Antes de encerrar, atualize a memória do projeto (o arquivo de memória tipo "project" do JHF, e um de "feedback" se surgiu alguma preferência nova nesta conversa) com:

1. **Estado real do git**: branch, HEAD, o que foi commitado/pushado/deployado nesta sessão — e, mais importante, o que ainda está **pendente**: mudanças não commitadas, aguardando aprovação visual, ou revertidas a pedido do usuário.
2. **Perguntas em aberto** que ficaram sem resposta do usuário.
3. **Decisões importantes** tomadas nesta sessão (o quê e por quê), principalmente as que não são óbvias só olhando o código.
4. Qualquer regra nova que o usuário deu ("sempre faça X", "nunca mexa em Y").

Antes de escrever, releia a memória existente pra não duplicar o que já está correto — só atualize o que mudou ou é genuinamente novo.

Depois de salvar, confirme para o usuário em poucas linhas o que foi guardado — sem reexplicar tudo que já foi dito na conversa.
