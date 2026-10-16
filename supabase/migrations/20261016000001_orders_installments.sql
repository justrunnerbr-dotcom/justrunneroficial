-- Parcelas do cartão de cada pedido (16/10/2026), lidas da transação paga da Yampi.
-- O admin usava 3x pra todo cartão; com isso a taxa AppMax (4,98% + 1,89% por parcela extra) sai pela parcela real.
alter table orders add column if not exists installments smallint;
