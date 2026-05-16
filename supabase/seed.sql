-- ============================================================================
-- Jotaeme — Seed Data
-- Run AFTER migrations. Populates sample properties for development.
-- Note: user data is NOT seeded here — users come through auth.
-- ============================================================================

INSERT INTO properties (
  external_id, source, url, partido, address,
  lat, lng, property_type, operation_type,
  price_amount, price_currency,
  surface_total, surface_covered, rooms, bedrooms, bathrooms, garages,
  description, photos, is_active
) VALUES
(
  'ZP-001', 'zonaprop',
  'https://www.zonaprop.com.ar/propiedades/casa-lomas-001.html',
  'Lomas de Zamora', 'Av. Hipólito Yrigoyen 9200, Lomas de Zamora',
  -34.7612, -58.3960, 'casa', 'venta',
  135000, 'USD',
  180, 120, 4, 3, 2, 1,
  'Casa de 3 dormitorios con patio y garaje en zona céntrica de Lomas. Excelente estado, lista para mudarse. Cocina comedor amplia, living con balcón.',
  '["https://via.placeholder.com/800x600?text=Casa+Lomas+1", "https://via.placeholder.com/800x600?text=Casa+Lomas+2"]',
  true
),
(
  'ZP-002', 'zonaprop',
  'https://www.zonaprop.com.ar/propiedades/depto-banfield-002.html',
  'Lomas de Zamora', 'Calle Maipú 350, Banfield',
  -34.7445, -58.3960, 'departamento', 'venta',
  78000, 'USD',
  65, 60, 3, 2, 1, 0,
  'Departamento luminoso de 2 ambientes en Banfield. A 3 cuadras de la estación. Balcón con vista abierta. Edificio con ascensor.',
  '["https://via.placeholder.com/800x600?text=Depto+Banfield+1"]',
  true
),
(
  'ZP-003', 'zonaprop',
  'https://www.zonaprop.com.ar/propiedades/ph-lanus-003.html',
  'Lanús', 'Calle Ituzaingó 1500, Lanús Este',
  -34.7056, -58.3811, 'ph', 'venta',
  95000, 'USD',
  110, 95, 4, 3, 1, 0,
  'PH en planta baja tipo casa. Patio propio grande. 3 dormitorios, living comedor, cocina separada. Sin expensas.',
  '["https://via.placeholder.com/800x600?text=PH+Lanus+1", "https://via.placeholder.com/800x600?text=PH+Lanus+2", "https://via.placeholder.com/800x600?text=PH+Lanus+3"]',
  true
),
(
  'ZP-004', 'zonaprop',
  'https://www.zonaprop.com.ar/propiedades/casa-avellaneda-004.html',
  'Avellaneda', 'Av. Mitre 800, Avellaneda',
  -34.6627, -58.3654, 'casa', 'venta',
  210000, 'USD',
  250, 180, 5, 4, 3, 2,
  'Casona reciclada en zona comercial. Ideal familia grande o uso mixto. 4 dormitorios, 3 baños, doble cochera, quincho.',
  '["https://via.placeholder.com/800x600?text=Casa+Avellaneda+1", "https://via.placeholder.com/800x600?text=Casa+Avellaneda+2"]',
  true
),
(
  'ZP-005', 'zonaprop',
  'https://www.zonaprop.com.ar/propiedades/depto-quilmes-005.html',
  'Quilmes', 'Calle Rivadavia 200, Quilmes Centro',
  -34.7206, -58.2543, 'departamento', 'venta',
  62000, 'USD',
  45, 42, 2, 1, 1, 0,
  'Monoambiente amplio en Quilmes Centro. Ideal primera vivienda o inversión. Edificio con seguridad 24hs.',
  '["https://via.placeholder.com/800x600?text=Depto+Quilmes+1"]',
  false
);

-- Add some fake history for testing
INSERT INTO property_history (property_id, field_changed, old_value, new_value, changed_at)
SELECT
  id, 'price_amount', '145000', '135000',
  now() - interval '15 days'
FROM properties WHERE external_id = 'ZP-001';

INSERT INTO property_history (property_id, field_changed, old_value, new_value, changed_at)
SELECT
  id, 'price_amount', '85000', '78000',
  now() - interval '7 days'
FROM properties WHERE external_id = 'ZP-002';
