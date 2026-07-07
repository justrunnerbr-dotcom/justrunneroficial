-- Caixa de entrada WhatsApp — conversas e mensagens recebidas/enviadas via Cloud API.
-- Rodar manualmente no SQL Editor do Supabase Dashboard (sem CLI configurado neste projeto).

create table if not exists whatsapp_conversations (id uuid primary key default gen_random_uuid(), store_id uuid not null default 'a0000000-0000-0000-0000-000000000001', wa_phone_number_id text not null, customer_phone text not null, customer_name text, last_message_at timestamptz not null default now(), last_message_preview text, unread_count int not null default 0, created_at timestamptz not null default now(), unique (store_id, wa_phone_number_id, customer_phone));

create table if not exists whatsapp_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references whatsapp_conversations(id) on delete cascade, direction text not null, body text, wa_message_id text, status text not null default 'sent', created_at timestamptz not null default now());

create index if not exists idx_whatsapp_messages_conversation on whatsapp_messages(conversation_id, created_at);

alter table whatsapp_conversations disable row level security;
alter table whatsapp_messages disable row level security;
