/**
 * AI Adapter Service — Central hub for AI calls.
 * Supports two providers:
 *   1. Gemini (default) — Uses @google/genai SDK directly
 *   2. Antigravity — Uses OpenAI-compatible API with model selection
 *
 * All 3 AI routes (ai-analysis, ai-comparison, ai-comment-analysis) use this adapter.
 */

import { GoogleGenAI } from '@google/genai';
import { getSettingAction } from '@/app/actions/settings.actions';

export type AIProvider = 'gemini' | 'antigravity';

export interface AIConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
    baseUrl?: string; // Only for Antigravity (OpenAI-compatible endpoint)
}

// Default models per provider
export const AI_MODELS: Record<AIProvider, { label: string; models: { id: string; label: string }[] }> = {
    gemini: {
        label: 'Google Gemini',
        models: [
            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Rápido)' },
            { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanceado)' },
            { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
            { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Novo)' },
            { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Máximo)' },
        ],
    },
    antigravity: {
        label: 'OpenRouter / Custom (Multi-modelo)',
        models: [
            { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanceado)' },
            { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Rápido)' },
            { id: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
            { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
            { id: 'o3', label: 'o3 (Raciocínio Avançado)' },
        ],
    },
};

/**
 * Resolve AI configuration from settings/env
 */
export async function resolveAIConfig(): Promise<AIConfig> {
    let geminiKey = process.env.GEMINI_API_KEY;
    let provider: AIProvider = 'gemini';
    let model = 'gemini-2.0-flash';
    let baseUrl = '';
    let antigravityKey = '';

    try {
        const settingStr = await getSettingAction('global-settings');
        if (settingStr) {
            const parsed = JSON.parse(settingStr);
            if (parsed.geminiApiKey) geminiKey = parsed.geminiApiKey;
            if (parsed.aiProvider) provider = parsed.aiProvider;
            if (parsed.aiModel) model = parsed.aiModel;
            if (parsed.antigravityApiKey) antigravityKey = parsed.antigravityApiKey;
            if (parsed.antigravityBaseUrl) baseUrl = parsed.antigravityBaseUrl;
        }
    } catch (e) { }

    if (provider === 'antigravity') {
        if (!antigravityKey) {
            throw new Error('API Key do provedor custom não configurada. Vá em Configurações → Chaves de API.');
        }
        return { provider, model, apiKey: antigravityKey, baseUrl: baseUrl || 'https://api.antigravity.ai/v1' };
    }

    if (!geminiKey) {
        throw new Error('GEMINI_API_KEY não configurada. Vá em Configurações → Chaves de API.');
    }
    return { provider, model, apiKey: geminiKey };
}

/**
 * Generate content using the configured AI provider.
 * This is the single entrypoint all routes should use.
 */
export async function generateAIContent(prompt: string, config?: AIConfig): Promise<string> {
    const cfg = config || await resolveAIConfig();

    if (cfg.provider === 'gemini') {
        return generateWithGemini(prompt, cfg);
    } else {
        return generateWithOpenAICompatible(prompt, cfg);
    }
}

export interface AIContentOptions {
    systemPrompt?: string;
    jsonMode?: boolean;
    temperature?: number;
}

/**
 * Generate content with system prompt, JSON mode, and temperature.
 * Used by ai-comment-analysis for structured JSON responses.
 */
export async function generateAIContentWithSystem(
    prompt: string,
    options: AIContentOptions,
    config?: AIConfig,
): Promise<string> {
    const cfg = config || await resolveAIConfig();

    if (cfg.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
        const response = await ai.models.generateContent({
            model: cfg.model,
            contents: prompt,
            config: {
                systemInstruction: options.systemPrompt,
                responseMimeType: options.jsonMode ? 'application/json' : undefined,
                temperature: options.temperature,
            },
        });
        return response.text ?? '';
    } else {
        const baseUrl = cfg.baseUrl || 'https://api.antigravity.ai/v1';
        const messages: { role: string; content: string }[] = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const body: any = {
            model: cfg.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: 4096,
        };
        if (options.jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => 'Unknown error');
            throw new Error(`Custom provider API error (${response.status}): ${errBody}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
    }
}

/**
 * Gemini provider — uses @google/genai SDK
 */
async function generateWithGemini(prompt: string, cfg: AIConfig): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
    const response = await ai.models.generateContent({
        model: cfg.model,
        contents: prompt,
    });
    return response.text ?? 'Não foi possível gerar resposta.';
}

/**
 * OpenAI-compatible provider — works with Antigravity, OpenRouter, etc.
 */
async function generateWithOpenAICompatible(prompt: string, cfg: AIConfig): Promise<string> {
    const baseUrl = cfg.baseUrl || 'https://api.antigravity.ai/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
            model: cfg.model,
            messages: [
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => 'Unknown error');
        throw new Error(`Custom provider API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'Não foi possível gerar resposta.';
}

