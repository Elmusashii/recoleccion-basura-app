import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const updatedGeoJSONPath = path.resolve(rootDir, 'barrios-actualizados.geojson');
const targetPath = path.resolve(rootDir, 'client/src/data/barriosAsuncionGeoJSON.js');

const updatedGeo = JSON.parse(fs.readFileSync(updatedGeoJSONPath, 'utf8'));

// 1. 58 OSM reales sin tocar (índices 0 a 57)
const osmFeatures = updatedGeo.features.slice(0, 58).map(f => ({
  type: 'Feature',
  properties: {
    name: f.properties.name,
    normalized_name: f.properties.normalized_name,
    osm_id: f.properties.osm_id,
    admin_level: f.properties.admin_level || '10',
    approx: false
  },
  geometry: f.geometry
}));

// 2. 5 aproximados viejos reemplazados por los trazados nuevos manteniendo approx: true (índices 58 a 62)
const approx5 = updatedGeo.features.slice(58, 63).map(f => ({
  type: 'Feature',
  properties: {
    name: f.properties.name,
    normalized_name: f.properties.normalized_name,
    approx: true
  },
  geometry: f.geometry
}));

// 3. Carlos Antonio López (desde índice 63: "PRESIDENTE CARLOS ANTONIO LOPEZ", descartando SAJONIA duplicado)
const carlosAntonioLopez = {
  type: 'Feature',
  properties: {
    name: 'Carlos Antonio López',
    normalized_name: 'carlos antonio lopez',
    approx: true
  },
  geometry: updatedGeo.features[63].geometry
};

// 4. Nuevos barrios aproximados: San Cayetano (65), Santa Librada (66), Jukyty (67)
const new3 = [
  {
    type: 'Feature',
    properties: {
      name: 'San Cayetano',
      normalized_name: 'san cayetano',
      approx: true
    },
    geometry: updatedGeo.features[65].geometry
  },
  {
    type: 'Feature',
    properties: {
      name: 'Santa Librada',
      normalized_name: 'santa librada',
      approx: true
    },
    geometry: updatedGeo.features[66].geometry
  },
  {
    type: 'Feature',
    properties: {
      name: 'Jukyty',
      normalized_name: 'jukyty',
      approx: true
    },
    geometry: updatedGeo.features[67].geometry
  }
];

// Fusión total: 58 OSM + 5 actualizados + 1 Carlos Antonio López + 3 nuevos = 67 features
const finalFeatures = [...osmFeatures, ...approx5, carlosAntonioLopez, ...new3];

const outputGeoJSON = {
  type: 'FeatureCollection',
  features: finalFeatures
};

const header = `/**
 * Módulo de Capa GeoJSON Vectorial Oficial de Barrios de Asunción
 * Extraído de OpenStreetMap (admin_level=10) mediante Overpass API + Geometrías complementarias.
 * 
 * Contiene 58 polígonos vectoriales reales y 9 aproximados (EPSG:4326).
 * Total: 67 barrios sin duplicados ni solapamientos.
 */

export const OFFICIAL_SHIFT_COLORS = {
  Mañana: {
    base: '#10b981',
    light: '#4ade80',
    border: '#059669',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  Tarde: {
    base: '#f97316',
    light: '#fb923c',
    border: '#ea580c',
    badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
  },
  Noche: {
    base: '#334155',
    light: '#475569',
    border: '#1e293b',
    badgeBg: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
  }
};

export const BARRIOS_ASUNCION_GEOJSON = `;

const content = header + JSON.stringify(outputGeoJSON, null, 2) + `;\n\nexport default BARRIOS_ASUNCION_GEOJSON;\n`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ GeoJSON fusionado exitosamente en:', targetPath);
console.log('📊 Total de features generados:', finalFeatures.length);
