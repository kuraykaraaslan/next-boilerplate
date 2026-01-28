// cropImage.ts
export const getCroppedImg = (
  imageSrc: string,
  pixelCrop: any,
  outputType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92,
  outputWidth?: number,
  outputHeight?: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return reject(new Error('Canvas context missing'));

      // Use output dimensions if provided, otherwise use crop dimensions
      const finalWidth = outputWidth || pixelCrop.width;
      const finalHeight = outputHeight || pixelCrop.height;

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        finalWidth,
        finalHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Blob creation failed'));
          resolve(blob);
        },
        outputType,
        quality
      );
    };

    image.onerror = () => reject(new Error('Image load failed'));
    image.src = imageSrc;
  });
};
