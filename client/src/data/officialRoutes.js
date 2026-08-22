/**
 * Base de Datos Oficial de Rutas y Barrios de Recolección de Basura
 * Municipalidad de Asunción - Dirección General de Servicios Urbanos
 * 
 * Basado en la cartografía y cronogramas oficiales:
 * 1. Martes, Jueves y Sábado (Turnos Mañana, Tarde y Noche)
 * 2. Lunes, Miércoles y Viernes (Turnos Mañana, Tarde y Noche)
 */

export const COLOR_PALETTE = {
  // Martes, Jueves y Sábado
  MJS_MANANA: '#2E7D32', // Verde Bosque
  MJS_TARDE: '#B48E35',  // Ocre / Mostaza
  MJS_NOCHE: '#2B4C6F',  // Azul Noche

  // Lunes, Miércoles y Viernes
  LMV_MANANA: '#5BB34A', // Verde Claro
  LMV_TARDE: '#D97757',  // Salmón / Coral
  LMV_NOCHE: '#3A444D',  // Gris Oscuro / Antracita
};

export const SHIFT_HOURS = {
  Mañana: '06:00 a 12:00 hs',
  Tarde: '12:00 a 18:00 hs',
  Noche: '19:00 a 02:00 hs'
};

export const OFFICIAL_BARRIOS = [
  // =========================================================================
  // GRUPO 1: MARTES, JUEVES Y SÁBADO
  // =========================================================================

  // --- 1.1 TURNO MAÑANA (Verde) ---
  {
    id: 'zeballos-cue',
    name: 'Zeballos Cué',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Norte',
    center: [-25.2185, -57.5680],
    polygon: [
      [-25.2050, -57.5750],
      [-25.2120, -57.5550],
      [-25.2280, -57.5600],
      [-25.2290, -57.5800],
      [-25.2150, -57.5820]
    ],
    mainStreets: 'Av. Tte. Claudio Acosta, Cnel. Bóveda, Viñas Cué',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'ipvu',
    name: 'IPVU',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Norte',
    center: [-25.2280, -57.5780],
    polygon: [
      [-25.2230, -57.5850],
      [-25.2250, -57.5720],
      [-25.2340, -57.5740],
      [-25.2320, -57.5880]
    ],
    mainStreets: 'Zona Botánico Norte, San Miguel',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'de-las-residentas',
    name: 'De las Residentas',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Norte',
    center: [-25.2340, -57.5450],
    polygon: [
      [-25.2270, -57.5500],
      [-25.2300, -57.5380],
      [-25.2400, -57.5420],
      [-25.2380, -57.5550]
    ],
    mainStreets: 'Av. Madame Lynch Norte, Av. Semidei',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'san-blas',
    name: 'San Blas',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Norte / Noreste',
    center: [-25.2320, -57.5300],
    polygon: [
      [-25.2260, -57.5360],
      [-25.2310, -57.5220],
      [-25.2390, -57.5250],
      [-25.2370, -57.5380]
    ],
    mainStreets: 'Límite Mariano Roque Alonso / Luque',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'loma-pyta',
    name: 'Loma Pytã',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Norte',
    center: [-25.2430, -57.5520],
    polygon: [
      [-25.2360, -57.5620],
      [-25.2360, -57.5380],
      [-25.2520, -57.5450],
      [-25.2500, -57.5680]
    ],
    mainStreets: 'Ruta Transchaco, Av. Semidei, Dr. Andrés Barbero',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'mbocayaty',
    name: 'Mbocayaty',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Noreste',
    center: [-25.2620, -57.5500],
    polygon: [
      [-25.2540, -57.5600],
      [-25.2550, -57.5400],
      [-25.2690, -57.5440],
      [-25.2680, -57.5620]
    ],
    mainStreets: 'Av. Santísima Trinidad Este, Av. Madame Lynch',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'salvador-del-mundo',
    name: 'Salvador del Mundo',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Noreste',
    center: [-25.2720, -57.5420],
    polygon: [
      [-25.2670, -57.5480],
      [-25.2690, -57.5350],
      [-25.2780, -57.5380],
      [-25.2760, -57.5500]
    ],
    mainStreets: 'Av. Aviadores del Chaco, Mayor Infante Rivarola',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'san-jorge',
    name: 'San Jorge',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este',
    center: [-25.2810, -57.5510],
    polygon: [
      [-25.2740, -57.5580],
      [-25.2760, -57.5420],
      [-25.2880, -57.5450],
      [-25.2870, -57.5600]
    ],
    mainStreets: 'Av. Santa Teresa, Av. Salvador del Mundo, Ybyrapytã',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'ytay',
    name: 'Ytay',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este',
    center: [-25.2870, -57.5320],
    polygon: [
      [-25.2790, -57.5400],
      [-25.2810, -57.5250],
      [-25.2950, -57.5280],
      [-25.2930, -57.5420]
    ],
    mainStreets: 'Av. Madame Lynch, Cnel. Martínez (Límite Luque)',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'ycua-sati',
    name: 'Ycuá Satí',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este',
    center: [-25.2880, -57.5640],
    polygon: [
      [-25.2820, -57.5730],
      [-25.2820, -57.5560],
      [-25.2950, -57.5580],
      [-25.2940, -57.5750]
    ],
    mainStreets: 'Av. Santa Teresa, Denis Roa, Dr. Juan E. O’Leary',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'santa-maria',
    name: 'Santa María',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este',
    center: [-25.3020, -57.5370],
    polygon: [
      [-25.2940, -57.5440],
      [-25.2960, -57.5300],
      [-25.3080, -57.5320],
      [-25.3070, -57.5460]
    ],
    mainStreets: 'Av. Mcal. López Este, Av. Santa Teresa Sur',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'herrera',
    name: 'Herrera',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este',
    center: [-25.2970, -57.5530],
    polygon: [
      [-25.2900, -57.5620],
      [-25.2900, -57.5450],
      [-25.3040, -57.5470],
      [-25.3030, -57.5630]
    ],
    mainStreets: 'Av. Mcal. López, Denis Roa, Lillo, Dr. Hassler',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'villa-aurelia',
    name: 'Villa Aurelia',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Este / Sureste',
    center: [-25.3090, -57.5560],
    polygon: [
      [-25.3020, -57.5650],
      [-25.3020, -57.5480],
      [-25.3160, -57.5500],
      [-25.3160, -57.5660]
    ],
    mainStreets: 'Av. Guido Boggiani, Av. Eusebio Ayala Este, R.I. 18 Pitiantuta',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'san-pablo',
    name: 'San Pablo',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.MJS_MANANA,
    zone: 'Sureste',
    center: [-25.3280, -57.5660],
    polygon: [
      [-25.3180, -57.5750],
      [-25.3180, -57.5550],
      [-25.3380, -57.5580],
      [-25.3380, -57.5760]
    ],
    mainStreets: 'Av. Eusebio Ayala, Av. Defensores del Chaco, Abasto',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },

  // --- 1.2 TURNO TARDE (Ocre / Mostaza) ---
  {
    id: 'ita-pyta-punta',
    name: 'Itá Pytã Punta',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Oeste',
    center: [-25.2830, -57.6680],
    polygon: [
      [-25.2750, -57.6740],
      [-25.2770, -57.6620],
      [-25.2900, -57.6640],
      [-25.2890, -57.6750]
    ],
    mainStreets: 'Mirador de Itá Pytã Punta, Comandante Gamarra',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'san-antonio',
    name: 'San Antonio',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Oeste',
    center: [-25.2910, -57.6620],
    polygon: [
      [-25.2850, -57.6660],
      [-25.2860, -57.6560],
      [-25.2970, -57.6580],
      [-25.2960, -57.6680]
    ],
    mainStreets: 'Av. Dr. Paiva, Alférez Silva, Cnel. López',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'dr-gaspar-rodriguez-de-francia-sur',
    name: 'Dr. Gaspar Rodríguez de Francia (Sur)',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Centro-Sur',
    center: [-25.2950, -57.6430],
    polygon: [
      [-25.2900, -57.6500],
      [-25.2900, -57.6360],
      [-25.3020, -57.6380],
      [-25.3020, -57.6520]
    ],
    mainStreets: 'Av. Dr. Gaspar Rodríguez de Francia, Ygatimí, Colón Sur',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'tacumbu',
    name: 'Tacumbú',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur-Oeste',
    center: [-25.3120, -57.6580],
    polygon: [
      [-25.3000, -57.6680],
      [-25.3010, -57.6500],
      [-25.3220, -57.6530],
      [-25.3200, -57.6700]
    ],
    mainStreets: 'Av. Colón Sur, 21 Proyectadas, Cerro Tacumbú',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'obrero',
    name: 'Obrero',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3080, -57.6350],
    polygon: [
      [-25.3000, -57.6450],
      [-25.3000, -57.6250],
      [-25.3180, -57.6260],
      [-25.3180, -57.6460]
    ],
    mainStreets: '5ta. Avenida (Acña de Figueroa), Av. Estados Unidos, 21 Proyectadas',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'roberto-l-petit',
    name: 'Roberto L. Petit',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3220, -57.6460],
    polygon: [
      [-25.3160, -57.6550],
      [-25.3160, -57.6380],
      [-25.3280, -57.6400],
      [-25.3280, -57.6570]
    ],
    mainStreets: '21 Proyectadas, Antequera, México Proyectadas',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'santa-ana',
    name: 'Santa Ana',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3320, -57.6560],
    polygon: [
      [-25.3250, -57.6660],
      [-25.3260, -57.6480],
      [-25.3400, -57.6500],
      [-25.3390, -57.6680]
    ],
    mainStreets: 'Bañado Sur, Antequera prolongación sur',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'san-cayetano',
    name: 'San Cayetano',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3380, -57.6460],
    polygon: [
      [-25.3300, -57.6540],
      [-25.3300, -57.6380],
      [-25.3460, -57.6400],
      [-25.3450, -57.6560]
    ],
    mainStreets: 'Zona Bañado Sur, Mallorquín Sur',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'republicano',
    name: 'Republicano',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3320, -57.6290],
    polygon: [
      [-25.3220, -57.6380],
      [-25.3220, -57.6200],
      [-25.3420, -57.6220],
      [-25.3420, -57.6400]
    ],
    mainStreets: 'Av. Japón, Cnel. Francisco López, Cantaluppi',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'jukyty',
    name: 'Jukyty',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3520, -57.6420],
    polygon: [
      [-25.3420, -57.6550],
      [-25.3430, -57.6320],
      [-25.3620, -57.6350],
      [-25.3600, -57.6580]
    ],
    mainStreets: 'Faldas del Cerro Lambaré, Av. José Félix Bogado Sur',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'santa-librada',
    name: 'Santa Librada',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur',
    center: [-25.3480, -57.6240],
    polygon: [
      [-25.3400, -57.6320],
      [-25.3400, -57.6160],
      [-25.3580, -57.6180],
      [-25.3570, -57.6340]
    ],
    mainStreets: 'Av. Perón, Cnel. Abraham Schweitzer',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'ita-enramada',
    name: 'Itá Enramada',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur Extremo',
    center: [-25.3680, -57.6340],
    polygon: [
      [-25.3580, -57.6450],
      [-25.3580, -57.6220],
      [-25.3800, -57.6280],
      [-25.3800, -57.6480]
    ],
    mainStreets: 'Av. Cnel. Abraham Schweitzer, Club Sajonia Ribera, Río Paraguay',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'san-vicente-sur',
    name: 'San Vicente (Sector Sur/Oeste)',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.MJS_TARDE,
    zone: 'Sur-Centro',
    center: [-25.3150, -57.6270],
    polygon: [
      [-25.3080, -57.6320],
      [-25.3080, -57.6200],
      [-25.3220, -57.6220],
      [-25.3220, -57.6340]
    ],
    mainStreets: 'Av. Félix Bogado, Padre Cassanello, Tte. Pratts Gill',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },

  // --- 1.3 TURNO NOCHE (Azul Noche) ---
  {
    id: 'mcal-francisco-solano-lopez',
    name: 'Mcal. Francisco Solano López',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.MJS_NOCHE,
    zone: 'Centro-Este',
    center: [-25.2910, -57.6010],
    polygon: [
      [-25.2840, -57.6080],
      [-25.2840, -57.5940],
      [-25.2980, -57.5950],
      [-25.2970, -57.6100]
    ],
    mainStreets: 'Av. Mcal. López, Av. Brasilia Sur, Av. Choferes del Chaco',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'villa-morra',
    name: 'Villa Morra',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.MJS_NOCHE,
    zone: 'Eje Corporativo / Comercial',
    center: [-25.2930, -57.5810],
    polygon: [
      [-25.2850, -57.5900],
      [-25.2860, -57.5720],
      [-25.3000, -57.5740],
      [-25.2990, -57.5920]
    ],
    mainStreets: 'Av. Mcal. López, Av. San Martín, Senador Long, Guido Spano',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'recoleta',
    name: 'Recoleta',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.MJS_NOCHE,
    zone: 'Centro-Este',
    center: [-25.2990, -57.5890],
    polygon: [
      [-25.2920, -57.5980],
      [-25.2920, -57.5800],
      [-25.3060, -57.5820],
      [-25.3050, -57.6000]
    ],
    mainStreets: 'Av. Choferes del Chaco, Av. Mcal. López, Cementerio de la Recoleta',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'mburicao',
    name: 'Mburicaó',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.MJS_NOCHE,
    zone: 'Centro-Este',
    center: [-25.3020, -57.6030],
    polygon: [
      [-25.2960, -57.6100],
      [-25.2960, -57.5960],
      [-25.3100, -57.5970],
      [-25.3090, -57.6120]
    ],
    mainStreets: 'Av. Choferes del Chaco, Av. Eusebio Ayala, 25 de Mayo',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'tembetary',
    name: 'Tembetary',
    group: 'MARTES_JUEVES_SABADO',
    groupLabel: 'Martes, Jueves y Sábado',
    schedule_days: ['Martes', 'Jueves', 'Sábado'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.MJS_NOCHE,
    zone: 'Centro-Sur',
    center: [-25.3110, -57.5970],
    polygon: [
      [-25.3050, -57.6050],
      [-25.3050, -57.5880],
      [-25.3180, -57.5900],
      [-25.3180, -57.6070]
    ],
    mainStreets: 'Av. Eusebio Ayala, Bartolomé de las Casas, Av. Choferes del Chaco',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },

  // =========================================================================
  // GRUPO 2: LUNES, MIÉRCOLES Y VIERNES
  // =========================================================================

  // --- 2.1 TURNO MAÑANA (Verde Claro) ---
  {
    id: 'santa-rosa',
    name: 'Santa Rosa',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte',
    center: [-25.2490, -57.5920],
    polygon: [
      [-25.2420, -57.6000],
      [-25.2430, -57.5840],
      [-25.2550, -57.5860],
      [-25.2540, -57.6020]
    ],
    mainStreets: 'Av. Santísima Trinidad Norte, Vía Férrea Botánico',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'santisima-trinidad',
    name: 'Santísima Trinidad',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte',
    center: [-25.2580, -57.5880],
    polygon: [
      [-25.2510, -57.5980],
      [-25.2520, -57.5780],
      [-25.2650, -57.5800],
      [-25.2640, -57.6000]
    ],
    mainStreets: 'Av. Santísima Trinidad, Av. Artigas, Av. Itapúa',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'mburucuya',
    name: 'Mburucuyá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Noreste',
    center: [-25.2670, -57.5760],
    polygon: [
      [-25.2600, -57.5860],
      [-25.2610, -57.5670],
      [-25.2740, -57.5690],
      [-25.2730, -57.5880]
    ],
    mainStreets: 'Av. Santísima Trinidad, Av. Julio Correa, Cnel. Vicente Mongelós',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'madame-lynch',
    name: 'Madame Lynch',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Noreste',
    center: [-25.2690, -57.5580],
    polygon: [
      [-25.2620, -57.5680],
      [-25.2630, -57.5490],
      [-25.2760, -57.5510],
      [-25.2750, -57.5700]
    ],
    mainStreets: 'Av. Madame Lynch, Av. Aviadores del Chaco Norte',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'jara',
    name: 'Jara',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte-Centro',
    center: [-25.2760, -57.6070],
    polygon: [
      [-25.2680, -57.6160],
      [-25.2690, -57.5980],
      [-25.2830, -57.6000],
      [-25.2820, -57.6180]
    ],
    mainStreets: 'Av. Brasilia, Av. Artigas, Av. España, Pitiantuta',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'virgen-del-huerto',
    name: 'Virgen del Huerto',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte-Centro',
    center: [-25.2710, -57.6000],
    polygon: [
      [-25.2650, -57.6080],
      [-25.2660, -57.5920],
      [-25.2770, -57.5940],
      [-25.2760, -57.6100]
    ],
    mainStreets: 'Av. Venezuela, Av. Artigas, San Antonio',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'bella-vista',
    name: 'Bella Vista',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte',
    center: [-25.2660, -57.5960],
    polygon: [
      [-25.2600, -57.6040],
      [-25.2610, -57.5880],
      [-25.2720, -57.5900],
      [-25.2710, -57.6060]
    ],
    mainStreets: 'Av. Venezuela, Cervantes, Río de Janeiro',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'santo-domingo',
    name: 'Santo Domingo',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Norte-Este',
    center: [-25.2770, -57.5860],
    polygon: [
      [-25.2700, -57.5950],
      [-25.2710, -57.5780],
      [-25.2840, -57.5800],
      [-25.2830, -57.5970]
    ],
    mainStreets: 'Av. San Martín Norte, Av. Molas López, Capitán Lombardo',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'las-lomas',
    name: 'Las Lomas (Carmelitas)',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Noreste',
    center: [-25.2740, -57.5710],
    polygon: [
      [-25.2670, -57.5800],
      [-25.2680, -57.5620],
      [-25.2810, -57.5640],
      [-25.2800, -57.5820]
    ],
    mainStreets: 'Av. Molas López, Av. San Martín, Nstra. Sra. del Carmen',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },
  {
    id: 'manora',
    name: 'Manorá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Mañana',
    shiftHours: '06:00 a 12:00 hs',
    color_hex: COLOR_PALETTE.LMV_MANANA,
    zone: 'Noreste-Centro',
    center: [-25.2830, -57.5790],
    polygon: [
      [-25.2760, -57.5880],
      [-25.2770, -57.5700],
      [-25.2890, -57.5720],
      [-25.2880, -57.5900]
    ],
    mainStreets: 'Av. España, Av. San Martín, Av. Mcal. López Norte',
    recommendation: 'Sacar las bolsas cerradas entre las 05:30 y las 06:00 hs'
  },

  // --- 2.2 TURNO TARDE (Salmón / Coral) ---
  {
    id: 'pinoza',
    name: 'Pinozá',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Centro-Sur',
    center: [-25.3120, -57.6160],
    polygon: [
      [-25.3050, -57.6240],
      [-25.3050, -57.6080],
      [-25.3190, -57.6100],
      [-25.3190, -57.6260]
    ],
    mainStreets: 'Av. Fernando de la Mora, Av. Gral. Santos, Av. Próceres de Mayo',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'san-vicente-este',
    name: 'San Vicente (Sector Este)',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sur-Centro',
    center: [-25.3210, -57.6230],
    polygon: [
      [-25.3140, -57.6300],
      [-25.3140, -57.6160],
      [-25.3280, -57.6180],
      [-25.3280, -57.6320]
    ],
    mainStreets: 'Av. Félix Bogado Este, Pozo Favorito, Tte. Garay',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'vista-alegre',
    name: 'Vista Alegre',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sur-Centro',
    center: [-25.3210, -57.6090],
    polygon: [
      [-25.3130, -57.6180],
      [-25.3130, -57.6000],
      [-25.3290, -57.6020],
      [-25.3290, -57.6200]
    ],
    mainStreets: 'Av. Fernando de la Mora, Médicos del Chaco, Bartolomé de las Casas',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'nazareth',
    name: 'Nazareth',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sureste',
    center: [-25.3230, -57.5960],
    polygon: [
      [-25.3150, -57.6050],
      [-25.3150, -57.5870],
      [-25.3310, -57.5890],
      [-25.3310, -57.6070]
    ],
    mainStreets: 'Av. Eusebio Ayala, Médicos del Chaco, Rca. Argentina',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'los-laureles',
    name: 'Los Laureles',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sureste',
    center: [-25.3120, -57.5760],
    polygon: [
      [-25.3050, -57.5850],
      [-25.3050, -57.5680],
      [-25.3190, -57.5700],
      [-25.3190, -57.5870]
    ],
    mainStreets: 'Av. Rca. Argentina, Av. Guido Boggiani, Eusebio Ayala',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'hipodromo',
    name: 'Hipódromo',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sureste',
    center: [-25.3280, -57.5810],
    polygon: [
      [-25.3200, -57.5900],
      [-25.3200, -57.5720],
      [-25.3360, -57.5740],
      [-25.3360, -57.5920]
    ],
    mainStreets: 'Av. Eusebio Ayala, Cedro, Jockey Club del Paraguay',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'terminal',
    name: 'Terminal',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Sur',
    center: [-25.3370, -57.5920],
    polygon: [
      [-25.3300, -57.6020],
      [-25.3300, -57.5820],
      [-25.3440, -57.5840],
      [-25.3440, -57.6040]
    ],
    mainStreets: 'Av. Fernando de la Mora, Av. Rca. Argentina, Terminal de Ómnibus',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },
  {
    id: 'mcal-estigarribia',
    name: 'Mcal. Estigarribia',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Tarde',
    shiftHours: '12:00 a 18:00 hs',
    color_hex: COLOR_PALETTE.LMV_TARDE,
    zone: 'Centro-Este',
    center: [-25.3020, -57.5680],
    polygon: [
      [-25.2950, -57.5770],
      [-25.2950, -57.5590],
      [-25.3090, -57.5610],
      [-25.3090, -57.5790]
    ],
    mainStreets: 'Av. Mcal. López, Av. Guido Boggiani, Facundo Machaín',
    recommendation: 'Sacar las bolsas cerradas entre las 11:30 y las 12:00 hs'
  },

  // --- 2.3 TURNO NOCHE (Gris Oscuro / Antracita) ---
  {
    id: 'carlos-antonio-lopez-sajonia',
    name: 'Carlos A. López (Sajonia)',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Oeste',
    center: [-25.2970, -57.6560],
    polygon: [
      [-25.2880, -57.6660],
      [-25.2890, -57.6460],
      [-25.3060, -57.6480],
      [-25.3050, -57.6680]
    ],
    mainStreets: 'Av. Carlos Antonio López, Av. Colón, Estadio Defensores del Chaco',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'dr-gaspar-rodriguez-de-francia-norte',
    name: 'Dr. Gaspar Rodríguez de Francia (Norte)',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro',
    center: [-25.2890, -57.6440],
    polygon: [
      [-25.2840, -57.6500],
      [-25.2840, -57.6380],
      [-25.2940, -57.6400],
      [-25.2940, -57.6520]
    ],
    mainStreets: 'Av. Dr. Gaspar Rodríguez de Francia, Ygatimí, Alberdi',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'la-encarnacion',
    name: 'La Encarnación',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro Histórico',
    center: [-25.2840, -57.6390],
    polygon: [
      [-25.2790, -57.6450],
      [-25.2790, -57.6330],
      [-25.2890, -57.6350],
      [-25.2890, -57.6470]
    ],
    mainStreets: 'Calle Palma, Estrella, Oliva, Eduardo Víctor Haedo, 14 de Mayo',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'la-catedral',
    name: 'La Catedral',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro Histórico',
    center: [-25.2810, -57.6330],
    polygon: [
      [-25.2760, -57.6390],
      [-25.2760, -57.6270],
      [-25.2860, -57.6290],
      [-25.2860, -57.6410]
    ],
    mainStreets: 'Catedral Metropolitana, Plaza de Armas, Palacio de López, El Paraguayo Independiente',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'san-roque',
    name: 'San Roque',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro Histórico / Este',
    center: [-25.2860, -57.6260],
    polygon: [
      [-25.2800, -57.6330],
      [-25.2800, -57.6190],
      [-25.2920, -57.6210],
      [-25.2920, -57.6350]
    ],
    mainStreets: 'Antequera, Tacuary, Mcal. Estigarribia, Eligio Ayala, Plaza Uruguaya',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'las-mercedes',
    name: 'Las Mercedes',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro-Este',
    center: [-25.2840, -57.6120],
    polygon: [
      [-25.2770, -57.6200],
      [-25.2780, -57.6040],
      [-25.2910, -57.6060],
      [-25.2900, -57.6220]
    ],
    mainStreets: 'Av. España, Av. Mcal. López, Curupayty, Washington, Juan de Salazar',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'ciudad-nueva',
    name: 'Ciudad Nueva',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro-Este',
    center: [-25.2990, -57.6180],
    polygon: [
      [-25.2920, -57.6260],
      [-25.2920, -57.6100],
      [-25.3060, -57.6120],
      [-25.3060, -57.6280]
    ],
    mainStreets: 'Av. Eusebio Ayala, Av. Perú, Mayor Fleitas, Teodoro S. Mongelós',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'bernardino-caballero',
    name: 'Bernardino Caballero',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Centro-Este',
    center: [-25.3050, -57.6100],
    polygon: [
      [-25.2980, -57.6180],
      [-25.2980, -57.6020],
      [-25.3120, -57.6040],
      [-25.3120, -57.6200]
    ],
    mainStreets: 'Av. Eusebio Ayala, Av. Gral. Santos, Parque Caballero',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  },
  {
    id: 'silvio-pettirossi',
    name: 'Silvio Pettirossi (Mercado 4)',
    group: 'LUNES_MIERCOLES_VIERNES',
    groupLabel: 'Lunes, Miércoles y Viernes',
    schedule_days: ['Lunes', 'Miércoles', 'Viernes'],
    shift: 'Noche',
    shiftHours: '19:00 a 02:00 hs',
    color_hex: COLOR_PALETTE.LMV_NOCHE,
    zone: 'Comercial / Mercado 4',
    center: [-25.3040, -57.6260],
    polygon: [
      [-25.2970, -57.6340],
      [-25.2970, -57.6180],
      [-25.3110, -57.6200],
      [-25.3110, -57.6360]
    ],
    mainStreets: 'Av. Silvio Pettirossi, Av. Perú, Av. Rodríguez de Francia, Mercado 4',
    recommendation: 'Sacar las bolsas cerradas a partir de las 18:30 hs'
  }
];

/**
 * Retorna el día de la semana actual en español
 */
export const getCurrentDayOfWeek = () => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date().getDay()];
};

/**
 * Determina si hoy pasa el recolector por un barrio
 */
export const isBarrioActiveToday = (barrio) => {
  const currentDay = getCurrentDayOfWeek();
  return barrio.schedule_days.includes(currentDay);
};

/**
 * Determina el turno actual del día según la hora
 */
export const getCurrentShift = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'Mañana';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noche';
};

/**
 * Camiones activos simulados ubicados en barrios estratégicos según el turno y día
 */
export const getActiveTrucksForCurrentTime = () => {
  const currentDay = getCurrentDayOfWeek();
  const currentShift = getCurrentShift();

  return [
    {
      id: 'trk-01',
      code: 'CAM-01',
      plate: 'AABC 101',
      driver: 'Ramón González',
      lat: -25.2930,
      lng: -57.5810,
      barrio: 'Villa Morra',
      zone: 'Eje Corporativo',
      status: 'EN_RUTA',
      shift: 'Noche',
      days: 'Martes, Jueves, Sábado',
      loadPercent: 68
    },
    {
      id: 'trk-02',
      code: 'CAM-02',
      plate: 'AABC 202',
      driver: 'Jorge Benítez',
      lat: -25.2970,
      lng: -57.6560,
      barrio: 'Carlos A. López (Sajonia)',
      zone: 'Oeste',
      status: 'EN_RUTA',
      shift: 'Noche',
      days: 'Lunes, Miércoles, Viernes',
      loadPercent: 82
    },
    {
      id: 'trk-03',
      code: 'CAM-03',
      plate: 'AABC 303',
      driver: 'Alcides Martínez',
      lat: -25.2430,
      lng: -57.5520,
      barrio: 'Loma Pytã',
      zone: 'Norte',
      status: 'EN_RUTA',
      shift: 'Mañana',
      days: 'Martes, Jueves, Sábado',
      loadPercent: 45
    },
    {
      id: 'trk-04',
      code: 'CAM-04',
      plate: 'AABC 404',
      driver: 'Esteban Duarte',
      lat: -25.3080,
      lng: -57.6350,
      barrio: 'Barrio Obrero',
      zone: 'Sur',
      status: 'EN_RUTA',
      shift: 'Tarde',
      days: 'Martes, Jueves, Sábado',
      loadPercent: 74
    },
    {
      id: 'trk-05',
      code: 'CAM-05',
      plate: 'AABC 505',
      driver: 'Osvaldo Romero',
      lat: -25.2840,
      lng: -57.6390,
      barrio: 'La Encarnación (Centro)',
      zone: 'Centro Histórico',
      status: 'EN_RUTA',
      shift: 'Noche',
      days: 'Lunes, Miércoles, Viernes',
      loadPercent: 90
    },
    {
      id: 'trk-06',
      code: 'CAM-06',
      plate: 'AABC 606',
      driver: 'Ignacio Peralta',
      lat: -25.3370,
      lng: -57.5920,
      barrio: 'Terminal',
      zone: 'Sur',
      status: 'EN_RUTA',
      shift: 'Tarde',
      days: 'Lunes, Miércoles, Viernes',
      loadPercent: 55
    }
  ];
};
