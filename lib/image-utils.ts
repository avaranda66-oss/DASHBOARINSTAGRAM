import sharp from 'sharp';

/**
 * Resizes and pads an image to fit exactly within an Instagram Story 1080x1920 canvas.
 * The original image is kept within the center, and the background is blurred and darkened to fill the 9:16 space.
 */
export async function formatStoryImage(inputBuffer: Buffer): Promise<Buffer> {
    const TARGET_WIDTH = 1080;
    const TARGET_HEIGHT = 1920;

    try {
        // Create a blurred background from the original image
        const background = await sharp(inputBuffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
                fit: 'cover',
                position: 'center',
                kernel: 'lanczos3',
            })
            .blur(20)
            .modulate({ brightness: 0.5 }) // Darken background slightly to make foreground pop
            .toBuffer();

        // Resize the foreground image to fit inside the canvas without stretching
        // The image generated is usually 4:5 (e.g. 1024x1280) so it will fit well in the center
        const foreground = await sharp(inputBuffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
                fit: 'contain',
                kernel: 'lanczos3',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        // Composite the foreground over the blurred background
        // Qualidade otimizada: mozjpeg + 4:4:4 chroma para máxima fidelidade de cor
        // Instagram recomprime tudo — quality 92 + mozjpeg é o sweet spot
        return await sharp(background)
            .composite([{ input: foreground }])
            .toColorspace('srgb')
            .jpeg({
                quality: 92,
                mozjpeg: true,
                chromaSubsampling: '4:4:4',
            })
            .toBuffer();
    } catch (e: any) {
        console.error('Erro ao processar imagem de Story no sharp:', e);
        return inputBuffer; // Fallback to original buffer if process fails
    }
}
