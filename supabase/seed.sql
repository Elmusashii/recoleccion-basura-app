-- ==============================================================================
-- SEED DATA: RUTAS Y BARRIOS OFICIALES DE ASUNCIÓN
-- Dirección General de Servicios Urbanos - Municipalidad de Asunción
-- ==============================================================================

-- 1. Rutas: Martes, Jueves y Sábado (Turno Mañana - 06:00 a 12:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Zeballos Cué / IPVU', 'Zeballos Cué', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true),
  ('Ruta Loma Pytã / De las Residentas / San Blas', 'Loma Pytã', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true),
  ('Ruta Mbocayaty / Salvador del Mundo', 'Mbocayaty', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true),
  ('Ruta San Jorge / Ytay / Ycuá Satí', 'San Jorge', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true),
  ('Ruta Santa María / Herrera', 'Herrera', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true),
  ('Ruta Villa Aurelia / San Pablo', 'Villa Aurelia', 'Mañana', ARRAY['Martes', 'Jueves', 'Sábado'], '06:00', '12:00', '#2E7D32', true);

-- 2. Rutas: Martes, Jueves y Sábado (Turno Tarde - 12:00 a 18:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Itá Pytã Punta / San Antonio', 'Itá Pytã Punta', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true),
  ('Ruta Tacumbú / Dr. Francia Sur', 'Tacumbú', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true),
  ('Ruta Barrio Obrero / Roberto L. Petit', 'Obrero', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true),
  ('Ruta Santa Ana / San Cayetano / Republicano', 'Republicano', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true),
  ('Ruta Jukyty / Santa Librada / Itá Enramada', 'Itá Enramada', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true),
  ('Ruta San Vicente Sur', 'San Vicente', 'Tarde', ARRAY['Martes', 'Jueves', 'Sábado'], '12:00', '18:00', '#B48E35', true);

-- 3. Rutas: Martes, Jueves y Sábado (Turno Noche - 19:00 a 02:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Mcal. Solano López / Villa Morra', 'Villa Morra', 'Noche', ARRAY['Martes', 'Jueves', 'Sábado'], '19:00', '02:00', '#2B4C6F', true),
  ('Ruta Recoleta / Mburicaó / Tembetary', 'Recoleta', 'Noche', ARRAY['Martes', 'Jueves', 'Sábado'], '19:00', '02:00', '#2B4C6F', true);

-- 4. Rutas: Lunes, Miércoles y Viernes (Turno Mañana - 06:00 a 12:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Santa Rosa / Santísima Trinidad', 'Santísima Trinidad', 'Mañana', ARRAY['Lunes', 'Miércoles', 'Viernes'], '06:00', '12:00', '#5BB34A', true),
  ('Ruta Mburucuyá / Madame Lynch', 'Mburucuyá', 'Mañana', ARRAY['Lunes', 'Miércoles', 'Viernes'], '06:00', '12:00', '#5BB34A', true),
  ('Ruta Jara / Virgen del Huerto / Bella Vista', 'Jara', 'Mañana', ARRAY['Lunes', 'Miércoles', 'Viernes'], '06:00', '12:00', '#5BB34A', true),
  ('Ruta Santo Domingo / Las Lomas (Carmelitas) / Manorá', 'Las Lomas', 'Mañana', ARRAY['Lunes', 'Miércoles', 'Viernes'], '06:00', '12:00', '#5BB34A', true);

-- 5. Rutas: Lunes, Miércoles y Viernes (Turno Tarde - 12:00 a 18:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Pinozá / San Vicente Este / Vista Alegre', 'Pinozá', 'Tarde', ARRAY['Lunes', 'Miércoles', 'Viernes'], '12:00', '18:00', '#D97757', true),
  ('Ruta Nazareth / Los Laureles / Hipódromo', 'Los Laureles', 'Tarde', ARRAY['Lunes', 'Miércoles', 'Viernes'], '12:00', '18:00', '#D97757', true),
  ('Ruta Terminal / Mcal. Estigarribia', 'Terminal', 'Tarde', ARRAY['Lunes', 'Miércoles', 'Viernes'], '12:00', '18:00', '#D97757', true);

-- 6. Rutas: Lunes, Miércoles y Viernes (Turno Noche - 19:00 a 02:00 hs)
INSERT INTO public.routes (name, zone, shift, schedule_days, start_time, end_time, color_hex, is_active)
VALUES
  ('Ruta Carlos A. López (Sajonia)', 'Sajonia', 'Noche', ARRAY['Lunes', 'Miércoles', 'Viernes'], '19:00', '02:00', '#3A444D', true),
  ('Ruta Centro Histórico (La Encarnación / La Catedral / San Roque)', 'Centro Histórico', 'Noche', ARRAY['Lunes', 'Miércoles', 'Viernes'], '19:00', '02:00', '#3A444D', true),
  ('Ruta Las Mercedes / Ciudad Nueva', 'Las Mercedes', 'Noche', ARRAY['Lunes', 'Miércoles', 'Viernes'], '19:00', '02:00', '#3A444D', true),
  ('Ruta Bernardino Caballero / Silvio Pettirossi (Mercado 4)', 'Mercado 4', 'Noche', ARRAY['Lunes', 'Miércoles', 'Viernes'], '19:00', '02:00', '#3A444D', true);

-- 7. Flota Inicial de Camiones
INSERT INTO public.trucks (code, plate_number, model, capacity_tons, status)
VALUES
  ('CAM-01', 'AABC 101', 'Mercedes-Benz Atego 1726 Compactador', 12.0, 'DISPONIBLE'),
  ('CAM-02', 'AABC 202', 'Scania P280 Basurero Municipal', 15.0, 'DISPONIBLE'),
  ('CAM-03', 'AABC 303', 'Volkswagen Constellation 17.280', 10.0, 'DISPONIBLE'),
  ('CAM-04', 'AABC 404', 'Iveco Tector Attack Recolector', 12.0, 'DISPONIBLE'),
  ('CAM-05', 'AABC 505', 'Mercedes-Benz Atego 1729', 14.0, 'DISPONIBLE'),
  ('CAM-06', 'AABC 606', 'Ford Cargo 1723 Compactador', 11.0, 'DISPONIBLE');
