import multer from 'multer';
import path from 'path';
import { errorResponse } from '../utils/response.js';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

/**
 * Valida los magic bytes (firmas binarias) de los formatos de imagen permitidos
 * para prevenir que archivos maliciosos o no soportados pasen disfrazados.
 *
 * @param {Buffer} buffer - Buffer del archivo subido en memoria
 * @returns {boolean}
 */
export const isValidImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  // 1. JPEG / JPG (FF D8 FF)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  // 2. PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return true;
  }

  // 3. WEBP (RIFF .... WEBP)
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }

  // 4. HEIC / HEIF / ISO Base Media (....ftypheic, ftypmif1, ftypmsf1, ftyphevc, etc.)
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii').toLowerCase();
    const allowedHeicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'];
    if (allowedHeicBrands.includes(brand)) {
      return true;
    }
  }

  return false;
};

/**
 * Filtro de archivos para Multer basado en MimeType y Extensión
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  const isMimeAllowed = ALLOWED_MIMETYPES.includes(mimetype);
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    const error = new Error('Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o HEIC.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // Límite de 8MB por archivo
    files: 5                   // Máximo 5 archivos por request
  },
  fileFilter
});

/**
 * Middleware seguro de carga para subida de fotos (maneja errores de multer limpiamente con HTTP 400)
 */
export const uploadReportPhotoMiddleware = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, 'El archivo excede el tamaño máximo permitido de 8MB.', null, 400);
      }
      return errorResponse(res, `Error en la carga de archivo: ${err.message}`, null, 400);
    } else if (err) {
      return errorResponse(
        res,
        err.message || 'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o HEIC.',
        null,
        400
      );
    }
    next();
  });
};
