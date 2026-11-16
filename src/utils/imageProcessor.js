/**
 * Procesador de imagenes en el navegador para el escudo del Grupo Scout.
 * Valida MIME contra lista blanca, re-codifica pixel a pixel via Canvas
 * (eliminando metadatos/payloads) y redimensiona a max 192x192px.
 */

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE_PX = 192;
const MAX_RECEIPT_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_RECEIPT_SIDE_PX = 1024;

export async function processLogoImageFile(file) {
  if (!file) {
    return { ok: false, error: 'Selecciona un archivo de imagen.' };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'Formato no permitido. Usa una imagen PNG, JPG o WebP (no SVG).'
    };
  }

  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: 'La imagen supera el limite maximo de 5 MB.'
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
      image.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      return { ok: false, error: 'La imagen no tiene dimensiones validas.' };
    }

    const canvas = document.createElement('canvas');
    canvas.width = TARGET_SIZE_PX;
    canvas.height = TARGET_SIZE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ok: false, error: 'No se pudo inicializar el procesador grafico.' };
    }

    // Ajuste centrado manteniendo proporcion dentro de un cuadrado 192x192
    const scale = Math.min(TARGET_SIZE_PX / width, TARGET_SIZE_PX / height);
    const drawW = Math.round(width * scale);
    const drawH = Math.round(height * scale);
    const offsetX = Math.round((TARGET_SIZE_PX - drawW) / 2);
    const offsetY = Math.round((TARGET_SIZE_PX - drawH) / 2);

    ctx.clearRect(0, 0, TARGET_SIZE_PX, TARGET_SIZE_PX);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    let dataUrl = canvas.toDataURL('image/webp', 0.88);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/png');
    }

    if (dataUrl.length > 180000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    }

    return { ok: true, dataUrl };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'No se pudo procesar la imagen del logo.'
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function processReceiptImageFile(file) {
  if (!file) {
    return { ok: false, error: 'Selecciona la foto o captura del comprobante o ticket.' };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'Formato no permitido. Usa una imagen PNG, JPG o WebP.'
    };
  }

  if (file.size > MAX_RECEIPT_INPUT_BYTES) {
    return {
      ok: false,
      error: 'La imagen del comprobante supera el limite maximo de 8 MB.'
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen del ticket.'));
      image.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      return { ok: false, error: 'La imagen del comprobante no tiene dimensiones validas.' };
    }

    const scale = Math.min(1, MAX_RECEIPT_SIDE_PX / Math.max(width, height));
    const drawW = Math.max(1, Math.round(width * scale));
    const drawH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ok: false, error: 'No se pudo inicializar el procesador de imagenes.' };
    }

    ctx.drawImage(img, 0, 0, drawW, drawH);

    let dataUrl = canvas.toDataURL('image/webp', 0.8);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    }
    if (dataUrl.length > 240000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    }
    if (dataUrl.length > 270000) {
      return {
        ok: false,
        error: 'La imagen sigue siendo muy pesada; intenta recortar o tomar una foto con menor resolucion.'
      };
    }

    return { ok: true, dataUrl };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'No se pudo procesar la imagen del comprobante.'
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
