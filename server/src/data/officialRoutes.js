/**
 * Dataset oficial de Rutas y Barrios de Recolección de Asunción para el Backend
 */

export const COLOR_PALETTE = {
  MJS_MANANA: '#2E7D32',
  MJS_TARDE: '#B48E35',
  MJS_NOCHE: '#2B4C6F',
  LMV_MANANA: '#5BB34A',
  LMV_TARDE: '#D97757',
  LMV_NOCHE: '#3A444D',
};

export const OFFICIAL_ROUTES = [
  // Martes, Jueves y Sábado - Mañana
  { name: 'Ruta Zeballos Cué / IPVU', zone: 'Zeballos Cué', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },
  { name: 'Ruta Loma Pytã / De las Residentas / San Blas', zone: 'Loma Pytã', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },
  { name: 'Ruta Mbocayaty / Salvador del Mundo', zone: 'Mbocayaty', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },
  { name: 'Ruta San Jorge / Ytay / Ycuá Satí', zone: 'San Jorge', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },
  { name: 'Ruta Santa María / Herrera', zone: 'Herrera', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },
  { name: 'Ruta Villa Aurelia / San Pablo', zone: 'Villa Aurelia', shift: 'Mañana', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.MJS_MANANA },

  // Martes, Jueves y Sábado - Tarde
  { name: 'Ruta Itá Pytã Punta / San Antonio', zone: 'Itá Pytã Punta', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },
  { name: 'Ruta Tacumbú / Dr. Francia Sur', zone: 'Tacumbú', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },
  { name: 'Ruta Barrio Obrero / Roberto L. Petit', zone: 'Obrero', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },
  { name: 'Ruta Santa Ana / San Cayetano / Republicano', zone: 'Republicano', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },
  { name: 'Ruta Jukyty / Santa Librada / Itá Enramada', zone: 'Itá Enramada', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },
  { name: 'Ruta San Vicente Sur', zone: 'San Vicente', shift: 'Tarde', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.MJS_TARDE },

  // Martes, Jueves y Sábado - Noche
  { name: 'Ruta Mcal. Solano López / Villa Morra', zone: 'Villa Morra', shift: 'Noche', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.MJS_NOCHE },
  { name: 'Ruta Recoleta / Mburicaó / Tembetary', zone: 'Recoleta', shift: 'Noche', schedule_days: ['Martes', 'Jueves', 'Sábado'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.MJS_NOCHE },

  // Lunes, Miércoles y Viernes - Mañana
  { name: 'Ruta Santa Rosa / Santísima Trinidad', zone: 'Santísima Trinidad', shift: 'Mañana', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.LMV_MANANA },
  { name: 'Ruta Mburucuyá / Madame Lynch', zone: 'Mburucuyá', shift: 'Mañana', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.LMV_MANANA },
  { name: 'Ruta Jara / Virgen del Huerto / Bella Vista', zone: 'Jara', shift: 'Mañana', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.LMV_MANANA },
  { name: 'Ruta Santo Domingo / Las Lomas (Carmelitas) / Manorá', zone: 'Las Lomas', shift: 'Mañana', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '06:00', end_time: '12:00', color_hex: COLOR_PALETTE.LMV_MANANA },

  // Lunes, Miércoles y Viernes - Tarde
  { name: 'Ruta Pinozá / San Vicente Este / Vista Alegre', zone: 'Pinozá', shift: 'Tarde', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.LMV_TARDE },
  { name: 'Ruta Nazareth / Los Laureles / Hipódromo', zone: 'Los Laureles', shift: 'Tarde', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.LMV_TARDE },
  { name: 'Ruta Terminal / Mcal. Estigarribia', zone: 'Terminal', shift: 'Tarde', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '12:00', end_time: '18:00', color_hex: COLOR_PALETTE.LMV_TARDE },

  // Lunes, Miércoles y Viernes - Noche
  { name: 'Ruta Carlos A. López (Sajonia)', zone: 'Sajonia', shift: 'Noche', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.LMV_NOCHE },
  { name: 'Ruta Centro Histórico (La Encarnación / La Catedral / San Roque)', zone: 'Centro Histórico', shift: 'Noche', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.LMV_NOCHE },
  { name: 'Ruta Las Mercedes / Ciudad Nueva', zone: 'Las Mercedes', shift: 'Noche', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.LMV_NOCHE },
  { name: 'Ruta Bernardino Caballero / Silvio Pettirossi (Mercado 4)', zone: 'Mercado 4', shift: 'Noche', schedule_days: ['Lunes', 'Miércoles', 'Viernes'], start_time: '19:00', end_time: '02:00', color_hex: COLOR_PALETTE.LMV_NOCHE }
];
