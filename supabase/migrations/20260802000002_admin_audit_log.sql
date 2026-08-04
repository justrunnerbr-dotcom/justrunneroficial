-- ── admin_audit_log ─────────────────────────────────────────────────────────
-- Registro de quem fez o quê no admin.
--
-- Motivação: o painel pausa campanha, edita preço, muda custo de produto e
-- sincroniza pedido — e até agora não existia nenhum registro. Não havia como
-- responder "quem mudou o custo do Minute na terça?".
--
-- A tabela também serve de base pro limite de tentativas de login: o limitador
-- anterior vivia num Map em memória, que em serverless não é compartilhado
-- entre instâncias e zera a cada cold start — ou seja, não limitava quase nada.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001',

  -- Quem. 'anonimo' quando a ação nem chegou a autenticar (login falho).
  actor       TEXT        NOT NULL DEFAULT 'anonimo',

  -- O quê. Verbo curto e estável, ex: 'login_ok', 'login_falhou',
  -- 'campanha_status', 'custo_produto', 'pedido_sync', 'produto_editado'.
  action      TEXT        NOT NULL,

  -- Sobre o quê (opcional).
  entity_type TEXT,
  entity_id   TEXT,

  -- Frase pronta pra exibir na tela, sem precisar interpretar metadata.
  summary     TEXT,

  -- Detalhe livre (valor antigo/novo, payload, etc).
  metadata    JSONB,

  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON admin_audit_log (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log (store_id, actor, created_at DESC);

-- Usado pelo limitador de login: contar falhas recentes por IP.
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_login_falhou
  ON admin_audit_log (ip, created_at DESC)
  WHERE action = 'login_falhou';

ALTER TABLE admin_audit_log DISABLE ROW LEVEL SECURITY;
