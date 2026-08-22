/**
 * Módulo de Cruce de Datos (Join Barrial) y Normalización de Nombres
 * Municipalidad de Asunción - Dirección de Servicios Urbanos
 */

export const OFFICIAL_PALETTE = {
  MANANA: '#4ade80',  // Verde (06:00 - 12:00)
  TARDE: '#f97316',   // Naranja / Salmón (12:00 - 18:00)
  NOCHE: '#475569',   // Gris oscuro / Azul pizarra (19:00 - 02:00)
  NEUTRO: '#e2e8f0',  // Neutro / Fuera de filtro
  BORDER_NEUTRO: '#94a3b8',
  BORDER_SOLID: '#ffffff'
};

const NAME_ALIASES = {
  'roberto luis pettit': 'roberto l petit',
  'las lomas': 'las lomas carmelitas',
  'carmelitas': 'las lomas carmelitas',
  'carlos antonio lopez': 'carlos antonio lopez',
  'presidente carlos antonio lopez': 'carlos antonio lopez',
  'carlos a lopez': 'carlos antonio lopez',
  'luis alberto de herrera': 'luis a de herrera',
  'la encarnacion': 'encarnacion',
  'la catedral': 'catedral'
};

/**
 * Normaliza nombres de barrios eliminando acentos, mayúsculas, puntuación y abreviaturas
 * para permitir un cruce perfecto (100% Join) con el GeoJSON.
 */
export const normalizeBarrioName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/\b(barrio|b°|b\.)\b/gi, '')
    .replace(/\b(mariscal|mcal|mcal\.)\b/gi, 'mcal')
    .replace(/\b(doctor|dr|dr\.)\b/gi, 'dr')
    .replace(/\b(general|gral|gral\.)\b/gi, 'gral')
    .replace(/\b(coronel|cnel|cnel\.)\b/gi, 'cnel')
    .replace(/\b(teniente|tte|tte\.)\b/gi, 'tte')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return NAME_ALIASES[normalized] || normalized;
};

/**
 * Base de Datos Oficial de Cronogramas por Barrio
 */
export const BARRIO_SCHEDULE_DATABASE = {
  // =========================================================================
  // MARTES, JUEVES Y SÁBADO
  // =========================================================================
  // --- Turno Mañana ---
  'zeballos cue': {
    name: 'Zeballos Cué',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Tte. Claudio Acosta, Cnel. Bóveda, Viñas Cué'
  },
  'de la residenta': {
    name: 'De la Residenta',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Madame Lynch Norte, Av. Semidei'
  },
  'san blas': {
    name: 'San Blas',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Noreste',
    mainStreets: 'Límite Mariano Roque Alonso / Luque'
  },
  'botanico': {
    name: 'Botánico',
    group: 'NO_ASIGNADO',
    groupLabel: 'Consultar cuadrilla municipal',
    shift: 'Sin Turno',
    shiftHours: 'Horario especial',
    color: OFFICIAL_PALETTE.NEUTRO,
    zone: 'Norte',
    mainStreets: 'Av. Primer Presidente, Jardín Botánico, Av. Artigas'
  },
  'loma pyta': {
    name: 'Loma Pytã',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Ruta Transchaco, Av. Semidei, Dr. Andrés Barbero'
  },
  'nu guazu': {
    name: 'Ñu Guazú',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Noreste',
    mainStreets: 'Av. Silvio Pettirossi, Parque Ñu Guazú'
  },
  'mbocayaty': {
    name: 'Mbocayaty',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Noreste',
    mainStreets: 'Av. Santísima Trinidad Este, Av. Madame Lynch'
  },
  'salvador del mundo': {
    name: 'Salvador del Mundo',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Noreste',
    mainStreets: 'Av. Aviadores del Chaco, Mayor Infante Rivarola'
  },
  'san jorge': {
    name: 'San Jorge',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Santa Teresa, Av. Salvador del Mundo'
  },
  'ytay': {
    name: 'Ytay',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Madame Lynch, Cnel. Martínez'
  },
  'ycua sati': {
    name: 'Ycuá Satí',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Santa Teresa, Denis Roa, Dr. Juan E. O’Leary'
  },
  'santa maria': {
    name: 'Santa María',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Mcal. López Este, Av. Santa Teresa Sur'
  },
  'luis a de herrera': {
    name: 'Luis A. de Herrera',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Mcal. López, Denis Roa, Lillo, Dr. Hassler'
  },
  'herrera': {
    name: 'Luis A. de Herrera',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este',
    mainStreets: 'Av. Mcal. López, Denis Roa, Lillo'
  },
  'villa aurelia': {
    name: 'Villa Aurelia',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Este / Sureste',
    mainStreets: 'Av. Guido Boggiani, Av. Eusebio Ayala Este'
  },
  'san pablo': {
    name: 'San Pablo',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Sureste',
    mainStreets: 'Av. Eusebio Ayala, Av. Defensores del Chaco, Abasto'
  },
  'banado cara cara': {
    name: 'Bañado Cara Cará',
    group: 'NO_ASIGNADO',
    groupLabel: 'Consultar cuadrilla municipal',
    shift: 'Sin Turno',
    shiftHours: 'Horario especial',
    color: OFFICIAL_PALETTE.NEUTRO,
    zone: 'Norte Ribereño',
    mainStreets: 'Ribera Norte, Sector Cañadón'
  },

  // --- Turno Tarde ---
  'ita pyta punta': {
    name: 'Itá Pytã Punta',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Oeste',
    mainStreets: 'Mirador de Itá Pytã Punta, Comandante Gamarra'
  },
  'san antonio': {
    name: 'San Antonio',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Oeste',
    mainStreets: 'Av. Dr. Francia, Av. Stella Maris'
  },
  'dr francia': {
    name: 'Dr. Francia',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Oeste / Centro',
    mainStreets: 'Av. Gaspar Rodríguez de Francia, Av. Próceres de Mayo'
  },
  'tacumbu': {
    name: 'Tacumbú',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur / Suroeste',
    mainStreets: 'Av. Colón, Av. 21 Proyectadas, O’Leary Sur'
  },
  'obrero': {
    name: 'Barrio Obrero',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. Acuña de Figueroa (5ta Av.), Av. Estados Unidos, 21 Proyectadas'
  },
  'roberto l petit': {
    name: 'Roberto L. Petit',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. 21 Proyectadas, Antequera, México'
  },
  'santa ana': {
    name: 'Santa Ana',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Sector Bañado Sur, Av. Antequera'
  },
  'republicano': {
    name: 'Republicano',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. Japón, Av. José Félix Bogado, Av. Cantalupi'
  },
  'san cayetano': {
    name: 'San Cayetano',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur / Ribereño',
    mainStreets: 'Av. Cantalupi, Sector Bañado Sur'
  },
  'santa librada': {
    name: 'Santa Librada',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur Extremo',
    mainStreets: 'Av. Perón, Av. Japón, Av. Coronel Félix Bogado'
  },
  'jukyty': {
    name: 'Jukyty',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur / Ribereño',
    mainStreets: 'Av. Perón, Sector Cerro Lambaré'
  },
  'ita enramada': {
    name: 'Itá Enramada',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur Extremo',
    mainStreets: 'Av. Coronel Abraham Schweitzer, Cerro Lambaré'
  },

  // --- Turno Noche ---
  'mcal lopez': {
    name: 'Mcal. López',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Este',
    mainStreets: 'Av. Mcal. López, Av. San Martín, Av. Guido Boggiani'
  },
  'villa morra': {
    name: 'Villa Morra',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Eje Comercial',
    mainStreets: 'Av. Mcal. López, Av. España, Senador Long, Malutín'
  },
  'recoleta': {
    name: 'Recoleta',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Este',
    mainStreets: 'Av. Mcal. López, Av. Choferes del Chaco, Av. Boggiani'
  },
  'mburicao': {
    name: 'Mburicaó',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Este',
    mainStreets: 'Av. Choferes del Chaco, Av. Eusebio Ayala, Teodoro S. Mongelós'
  },
  'tembetary': {
    name: 'Tembetary',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Sur',
    mainStreets: 'Av. Eusebio Ayala, Av. Choferes del Chaco, R.I. 6 Boquerón'
  },

  // =========================================================================
  // LUNES, MIÉRCOLES Y VIERNES
  // =========================================================================
  // --- Turno Mañana ---
  'santa rosa': {
    name: 'Santa Rosa',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Santísima Trinidad, Av. Primer Presidente'
  },
  'santisima trinidad': {
    name: 'Santísima Trinidad',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Primer Presidente, Av. Santísima Trinidad, Av. Artigas'
  },
  'mburucuya': {
    name: 'Mburucuyá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Santísima Trinidad, Av. Julio Correa, Cnel. Silva'
  },
  'madame lynch': {
    name: 'Madame Lynch',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Noreste',
    mainStreets: 'Av. Madame Lynch, Av. Aviadores del Chaco'
  },
  'jara': {
    name: 'Jara',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Brasilia, Av. Artigas, República de Siria'
  },
  'virgen del huerto': {
    name: 'Virgen del Huerto',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Brasilia, Av. Venezuela, San Salvador'
  },
  'bella vista': {
    name: 'Bella Vista',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Venezuela, Av. Artigas, Av. España'
  },
  'santo domingo': {
    name: 'Santo Domingo',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte / Este',
    mainStreets: 'Av. Santísima Trinidad, Av. San Martín, Av. Molas López'
  },
  'tablada nueva': {
    name: 'Tablada Nueva',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte Ribereño',
    mainStreets: 'Av. Artigas Norte, Lombardo'
  },
  'virgen de fatima': {
    name: 'Virgen de Fátima',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Santísima Trinidad Oeste, Av. Artigas'
  },
  'canada del ybyray': {
    name: 'Cañada del Ybyray',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Santísima Trinidad, Julio Correa'
  },
  'virgen de la asuncion': {
    name: 'Virgen de la Asunción',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color: OFFICIAL_PALETTE.MANANA,
    zone: 'Norte',
    mainStreets: 'Av. Venezuela, Av. Artigas'
  },
  'banco san miguel': {
    name: 'Banco San Miguel',
    group: 'NO_ASIGNADO',
    groupLabel: 'Consultar cuadrilla municipal',
    shift: 'Sin Turno',
    shiftHours: 'Horario especial',
    color: OFFICIAL_PALETTE.NEUTRO,
    zone: 'Ribera / Bahía',
    mainStreets: 'Costanera Norte, Bahía de Asunción'
  },

  // --- Turno Tarde ---
  'las lomas': {
    name: 'Las Lomas',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Eje Corporativo',
    mainStreets: 'Av. Aviadores del Chaco, Av. Molas López, Av. San Martín'
  },
  'las lomas carmelitas': {
    name: 'Las Lomas',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Eje Corporativo',
    mainStreets: 'Av. Aviadores del Chaco, Av. Molas López'
  },
  'manora': {
    name: 'Manorá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Este',
    mainStreets: 'Av. España, Av. San Martín, Av. Aviadores del Chaco'
  },
  'pinoza': {
    name: 'Pinozá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Centro-Sur',
    mainStreets: 'Av. Eusebio Ayala, Av. Gral. Santos, Próceres de Mayo'
  },
  'san vicente': {
    name: 'San Vicente',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. Félix Bogado, Av. Gral. Santos, Tte. Garay'
  },
  'vista alegre': {
    name: 'Vista Alegre',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Centro-Sur',
    mainStreets: 'Av. Fernando de la Mora, Av. Eusebio Ayala'
  },
  'nazareth': {
    name: 'Nazareth',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. Eusebio Ayala, Av. Fernando de la Mora, Médicos del Chaco'
  },
  'los laureles': {
    name: 'Los Laureles',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sureste',
    mainStreets: 'Av. Eusebio Ayala, Av. Rca. Argentina, Boggiani'
  },
  'hipodromo': {
    name: 'Hipódromo',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sureste',
    mainStreets: 'Av. Eusebio Ayala, Av. Rca. Argentina, Cedro'
  },
  'terminal': {
    name: 'Terminal',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sur',
    mainStreets: 'Av. Fernando de la Mora, Av. Rca. Argentina, Lapacho'
  },
  'mcal estigarribia': {
    name: 'Mcal. Estigarribia',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Sureste',
    mainStreets: 'Av. Boggiani, Av. Rca. Argentina, Av. Eusebio Ayala'
  },
  'san cristobal': {
    name: 'San Cristóbal',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color: OFFICIAL_PALETTE.TARDE,
    zone: 'Este',
    mainStreets: 'Av. Denis Roa, Av. Guido Boggiani, Av. San Martín'
  },

  // --- Turno Noche ---
  'sajonia': {
    name: 'Sajonia',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Oeste / Ribera',
    mainStreets: 'Av. Carlos Antonio López, Av. Colón, Dr. Paiva'
  },
  'carlos antonio lopez': {
    name: 'Carlos Antonio López',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Oeste',
    mainStreets: 'Av. Carlos Antonio López, Parque Carlos A. López'
  },
  'encarnacion': {
    name: 'Encarnación',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro Histórico',
    mainStreets: 'Palma, Estrella, Oliva, Juan O’Leary, Alberdi'
  },
  'catedral': {
    name: 'Catedral',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro Histórico',
    mainStreets: 'El Paraguayo Independiente, Mcal. López, Eligio Ayala'
  },
  'san roque': {
    name: 'San Roque',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro',
    mainStreets: 'Eligio Ayala, 25 de Mayo, Cerro Corá, Tacuary'
  },
  'gral diaz': {
    name: 'Gral. Díaz',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro',
    mainStreets: 'Chile, Alberdi, Yegros, Haedo, Piribebuy'
  },
  'las mercedes': {
    name: 'Las Mercedes',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Norte',
    mainStreets: 'Av. España, Av. Mcal. López, Washington, Padre Cardozo'
  },
  'ciudad nueva': {
    name: 'Ciudad Nueva',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro',
    mainStreets: 'Av. Mcal. López, Av. Eusebio Ayala, Av. Perú'
  },
  'bernardino caballero': {
    name: 'Bernardino Caballero',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Este',
    mainStreets: 'Av. Mcal. López, Av. Gral. Santos, Av. Choferes del Chaco'
  },
  'pettirossi': {
    name: 'Pettirossi',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Centro-Comercial',
    mainStreets: 'Av. Pettirossi, Av. Perú, Rodríguez de Francia (Mercado 4)'
  },
  'ricardo brugada': {
    name: 'Ricardo Brugada',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color: OFFICIAL_PALETTE.NOCHE,
    zone: 'Costanera / Chacarita',
    mainStreets: 'Plaza Uruguaya Norte, Florencio Villamayor'
  }
};

/**
 * Cruza un feature GeoJSON con el esquema municipal oficial de recolección
 * 
 * @param {string|Object} rawInput Nombre del barrio o properties de la feature
 * @returns {Object} Metadata enriquecida de recolección municipal
 */
export const getBarrioSchedule = (rawInput) => {
  let nameToLookup = '';

  if (typeof rawInput === 'string') {
    nameToLookup = rawInput;
  } else if (rawInput && typeof rawInput === 'object') {
    nameToLookup = rawInput.barrio || rawInput.BARRIO || rawInput.name || rawInput.NAME || rawInput.NOM_BARRIO || rawInput.id || '';
  }

  const key = normalizeBarrioName(nameToLookup);

  if (BARRIO_SCHEDULE_DATABASE[key]) {
    return BARRIO_SCHEDULE_DATABASE[key];
  }

  // Búsqueda aproximada si no hay coincidencia exacta de clave
  const entries = Object.entries(BARRIO_SCHEDULE_DATABASE);
  const matched = entries.find(([k]) => key.includes(k) || k.includes(key));

  if (matched) {
    return matched[1];
  }

  // Fallback seguro neutro
  return {
    name: nameToLookup || 'Barrio de Asunción',
    group: 'NO_ASIGNADO',
    groupLabel: 'Consultar cuadrilla municipal',
    shift: 'Sin Turno',
    shiftHours: 'Horario especial',
    color: OFFICIAL_PALETTE.NEUTRO,
    zone: 'Asunción',
    mainStreets: 'Calles vecinales'
  };
};
