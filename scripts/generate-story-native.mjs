import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let apiKey = process.env.GEMINI_API_KEY;

try {
    const setting = await prisma.setting.findUnique({ where: { key: 'global-settings' } });
    if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.geminiApiKey) apiKey = parsed.geminiApiKey;
    }
} catch (e) {
    console.error("Erro ao ler banco de dados:", e.message);
}

if (!apiKey) {
    console.error("❌ ERRO: GEMINI_API_KEY não configurada no .env nem nas Configurações da interface!");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const TARCILA_PHOTO = 'C:\\Users\\Usuario\\Desktop\\_ARQUIVO\\_ORGANIZADO\\PROJETOS\\JARVIS\\MOLTBOT (CUIDADO!!!)\\clawd\\memory\\fotosreais\\cheff_tarcila_1.jpg';
const OUTPUT_FILE = 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\36e9eae7-1208-49e4-91f5-e396a03a5fb6\\chef_tarcila_native_api_9x16.png';

async function main() {
    console.log("🤖 Iniciando geração nativa 9:16 via Gemini API (gemini-2.5-flash-image)...");

    // Leitura da imagem base64 para o payload
    const imageInfo = {
        inlineData: {
            data: Buffer.from(fs.readFileSync(TARCILA_PHOTO)).toString("base64"),
            mimeType: "image/jpeg"
        }
    };

    const prompt = `[STRICT INSTRUCTION: YOU MUST CLONE THE EXACT FACE, BONE STRUCTURE, AGE, AND EXPRESSION FROM THE REFERENCE IMAGE. DO NOT ADD A SMILE. DO NOT MAKE THE SUBJECT LOOK YOUNGER OR CHANGED. ABSOLUTE ZERO DEVIATION FROM HER ORIGINAL FACE AND MOOD.]

High-end professional gastronomic advertisement, Standard Senior Layout style.

SUBJECT:
The female chef from the reference image. She must have the EXACT SAME FACE, EXACT SAME NEUTRAL/FOCUSED EXPRESSION (NO SMILE), and EXACT SAME CLOTHING/APRON. Positioned slightly to the left.

ENVIRONMENT:
A premium, dark fine-dining background. Moody terracotta tones with focused warm illumination on the subject. Clean composition.

LIGHTING:
Gold and Amazon Green dual rim lights for high-end 3D separation.

UI ELEMENTS:
- TOP LEFT HEADLINE: Large Bold Elegant Serif Title 'MOMENTOS ÚNICOS' in metallic gold.
- SUBHEADLINE: Clean sans-serif 'A gastronomia brasileira encontra a alma belga.' in ivory white.
- BOTTOM CTA BUTTON: A professional rounded button containing the text 'RESERVAR MESA' in bold dark font.

FRAME:
A hammered gold leaf texture on the vertical and horizontal edges.

QUALITY:
Masterpiece, ultra-realistic portrait, unreal engine 5 render, 8k.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [imageInfo, prompt],
            config: {
                // O SEGREDO DO FORMATO 9:16 FICA PRESO AQUI!
                imageConfig: {
                    aspectRatio: "9:16",
                },
                responseModalities: ["Image"]
            }
        });

        const part = response.candidates[0].content.parts[0];
        if (part && part.inlineData) {
            const buffer = Buffer.from(part.inlineData.data, "base64");
            fs.writeFileSync(OUTPUT_FILE, buffer);
            console.log(`✅ Sucesso! Imagem gerada e salva com aspecto estrito 9:16 em: ${OUTPUT_FILE}`);

            // Logar dimensão para ter certeza (opcional, só visualizando o arquivo já serve)
            console.log("👉 Por favor, abra a imagem e verifique se as proporções e o rosto estão corretos!");
        } else {
            console.error("❌ ERRO: Resposta da API não continha imagem:", response);
        }
    } catch (e) {
        console.error("❌ ERRO FATAL ao chamar a API:", e);
    }
}

main();
