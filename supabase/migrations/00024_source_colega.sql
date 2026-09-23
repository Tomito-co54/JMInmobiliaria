-- 00024 — a new source: 'colega', listings of a fellow broker shown as ours.
--
-- Tomy, 23-sep-2026: Luciano (Laudani & Cía, matrícula 3162, Adrogué) gave
-- him his whole catalog to publish, operations split in half. They are
-- neither the family's (owner_direct / agency) nor market intelligence
-- (zonaprop / trezza): they are public, but they are not Tomy's, and the
-- maestra sync must never mistake one for his.
--
-- Alone in its file because a new enum value cannot be used in the same
-- transaction that adds it; 00025 uses it.

ALTER TYPE property_source ADD VALUE IF NOT EXISTS 'colega';
