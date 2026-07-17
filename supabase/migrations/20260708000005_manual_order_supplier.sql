alter table manual_order_items add column if not exists supplier_id uuid references suppliers(id) on delete set null;
