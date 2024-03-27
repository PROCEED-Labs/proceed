export async function scaleDownImage(
  imageFile: File,
  desiredMaxLength: number,
): Promise<File | Blob> {
  const blob = new Blob([imageFile], { type: imageFile.type });
  const scaledDownImage = new Image();
  scaledDownImage.src = URL.createObjectURL(blob);

  return new Promise(async (resolve, reject) => {
    scaledDownImage.onload = function () {
      URL.revokeObjectURL(scaledDownImage.src);

      const scaleDownRatio =
        scaledDownImage.width >= scaledDownImage.height
          ? desiredMaxLength / scaledDownImage.width
          : desiredMaxLength / scaledDownImage.height;

      if (scaleDownRatio < 1) {
        const canvas = document.createElement('canvas');
        canvas.width = scaleDownRatio * scaledDownImage.width;
        canvas.height = scaleDownRatio * scaledDownImage.height;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.scale(scaleDownRatio, scaleDownRatio);
        ctx.drawImage(scaledDownImage, 0, 0, scaledDownImage.width, scaledDownImage.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject('Received error while converting canvas element to blob');
          } else {
            resolve(blob);
          }
        }, imageFile.type);
      } else {
        resolve(imageFile);
      }
    };
  });
}
