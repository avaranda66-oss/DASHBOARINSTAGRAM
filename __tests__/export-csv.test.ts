import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { csvFilename, downloadCsv, campaignsToCSV, dailyInsightsToCSV } from '../lib/utils/export-csv';
import type { AdCampaign, DailyAdInsight } from '../types/ads';

// =============================================================================
// csvFilename
// =============================================================================

describe('csvFilename', () => {
    it('contém o nome da seção', () => {
        const name = csvFilename('campanhas');
        expect(name).toContain('campanhas');
    });

    it('termina com .csv', () => {
        expect(csvFilename('test')).toMatch(/\.csv$/);
    });

    it('começa com "dashboard-"', () => {
        expect(csvFilename('insights')).toMatch(/^dashboard-/);
    });

    it('contém a data no formato YYYY-MM-DD', () => {
        const name = csvFilename('test');
        expect(name).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
});

// =============================================================================
// downloadCsv — BOM, headers, dados (ambiente Node com mocks de browser)
// =============================================================================

describe('downloadCsv', () => {
    let capturedContent: string;
    let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        capturedContent = '';
        mockAnchor = { href: '', download: '', click: vi.fn() };

        // Mock Blob para capturar o conteúdo gerado
        vi.stubGlobal('Blob', class MockBlob {
            constructor(parts: BlobPart[], _opts?: BlobPropertyBag) {
                capturedContent = parts.join('');
            }
        });

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:mock-url'),
            revokeObjectURL: vi.fn(),
        });

        vi.stubGlobal('document', {
            createElement: vi.fn(() => mockAnchor),
            body: {
                appendChild: vi.fn(),
                removeChild: vi.fn(),
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('gera CSV com BOM UTF-8 (\\uFEFF) no início', () => {
        downloadCsv([{ nome: 'Alice', valor: 42 }], 'test.csv');
        expect(capturedContent.startsWith('\uFEFF')).toBe(true);
    });

    it('headers corretos na primeira linha', () => {
        downloadCsv([{ nome: 'Alice', valor: 42 }], 'test.csv');
        const lines = capturedContent.slice(1).split('\n'); // remove BOM
        expect(lines[0]).toBe('nome,valor');
    });

    it('dados na segunda linha', () => {
        downloadCsv([{ nome: 'Alice', valor: 42 }], 'test.csv');
        const lines = capturedContent.slice(1).split('\n');
        expect(lines[1]).toBe('Alice,42');
    });

    it('múltiplas linhas para múltiplos objetos', () => {
        const rows = [
            { nome: 'Alice', valor: 10 },
            { nome: 'Bob', valor: 20 },
        ];
        downloadCsv(rows, 'test.csv');
        const lines = capturedContent.slice(1).split('\n');
        expect(lines).toHaveLength(3); // header + 2 rows
    });

    it('adiciona extensão .csv se ausente', () => {
        downloadCsv([{ a: 1 }], 'export');
        expect(mockAnchor.download).toBe('export.csv');
    });

    it('não duplica extensão .csv', () => {
        downloadCsv([{ a: 1 }], 'export.csv');
        expect(mockAnchor.download).toBe('export.csv');
    });

    it('retorna CSV vazio para array vazio (sem click)', () => {
        downloadCsv([], 'test.csv');
        // toCSV retorna '' para array vazio — Blob recebe string vazia (+ BOM vazio)
        expect(capturedContent).toBe('\uFEFF');
    });

    it('valores com vírgula são escapados com aspas duplas', () => {
        downloadCsv([{ texto: 'Olá, mundo' }], 'test.csv');
        expect(capturedContent).toContain('"Olá, mundo"');
    });

    it('valores nulos/undefined ficam como string vazia', () => {
        downloadCsv([{ a: null, b: undefined }], 'test.csv');
        const lines = capturedContent.slice(1).split('\n');
        expect(lines[1]).toBe(',');
    });

    it('columns personalizado respeita a ordem fornecida', () => {
        downloadCsv([{ a: 1, b: 2, c: 3 }], 'test.csv', ['c', 'a']);
        const lines = capturedContent.slice(1).split('\n');
        expect(lines[0]).toBe('c,a');
        expect(lines[1]).toBe('3,1');
    });
});

// =============================================================================
// campaignsToCSV — formatação de campanhas
// =============================================================================

describe('campaignsToCSV', () => {
    const mockCampaign: AdCampaign = {
        id: 'camp-001',
        name: 'Campanha Teste',
        status: 'ACTIVE',
        effective_status: 'ACTIVE',
        objective: 'OUTCOME_SALES',
        created_time: '2026-01-01',
        insights: {
            impressions: '10000',
            clicks: '500',
            spend: '150.50',
            ctr: '5.00',
            cpm: '15.05',
            cpc: '0.30',
            reach: '8000',
            frequency: '1.25',
            date_start: '2026-01-01',
            date_stop: '2026-01-31',
            purchase_roas: [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '3.50' }],
        },
    };

    it('retorna array com o mesmo número de campanhas', () => {
        const result = campaignsToCSV([mockCampaign, { ...mockCampaign, id: 'camp-002' }], 'BRL');
        expect(result).toHaveLength(2);
    });

    it('cada linha tem campo "Nome" com o nome da campanha', () => {
        const [row] = campaignsToCSV([mockCampaign], 'BRL');
        expect(row['Nome']).toBe('Campanha Teste');
    });

    it('ROAS é formatado com sufixo "x"', () => {
        const [row] = campaignsToCSV([mockCampaign], 'BRL');
        expect(String(row['ROAS'])).toMatch(/x$/);
        expect(String(row['ROAS'])).toBe('3.50x');
    });

    it('CTR é formatado com sufixo "%"', () => {
        const [row] = campaignsToCSV([mockCampaign], 'BRL');
        expect(String(row['CTR'])).toMatch(/%$/);
    });

    it('Gasto contém a moeda', () => {
        const [row] = campaignsToCSV([mockCampaign], 'BRL');
        expect(String(row['Gasto'])).toContain('BRL');
    });

    it('campanha sem insights usa valores padrão', () => {
        const campaignSemInsights: AdCampaign = {
            id: 'camp-no-insights',
            name: 'Sem Insights',
            status: 'PAUSED',
            effective_status: 'PAUSED',
            objective: 'OUTCOME_AWARENESS',
            created_time: '2026-01-01',
        };
        const [row] = campaignsToCSV([campaignSemInsights], 'USD');
        expect(row['Gasto']).toBe('0');
        expect(row['ROAS']).toBe('—');
    });
});

// =============================================================================
// dailyInsightsToCSV — formatação de insights diários
// =============================================================================

describe('dailyInsightsToCSV', () => {
    const mockInsight: DailyAdInsight = {
        date: '2026-01-15',
        spend: 125.75,
        impressions: 8000,
        clicks: 400,
        reach: 7500,
        cpc: 0.31,
        cpm: 15.72,
        ctr: 5.00,
        conversions: 12,
        conversionValue: 350.00,
        roas: 2.78,
    };

    it('retorna array com o mesmo número de insights', () => {
        const result = dailyInsightsToCSV([mockInsight, { ...mockInsight, date: '2026-01-16' }], 'BRL');
        expect(result).toHaveLength(2);
    });

    it('campo "Data" está preenchido', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'BRL');
        expect(row['Data']).toBe('2026-01-15');
    });

    it('Gasto é formatado com 2 casas decimais e moeda', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'USD');
        expect(String(row['Gasto'])).toContain('125.75');
        expect(String(row['Gasto'])).toContain('USD');
    });

    it('ROAS é formatado com sufixo "x"', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'BRL');
        expect(String(row['ROAS'])).toMatch(/x$/);
        expect(String(row['ROAS'])).toBe('2.78x');
    });

    it('CTR é formatado com sufixo "%"', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'BRL');
        expect(String(row['CTR'])).toMatch(/%$/);
    });

    it('Impressoes é um número', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'BRL');
        expect(Number(row['Impressoes'])).toBe(8000);
    });

    it('Conversoes é um número', () => {
        const [row] = dailyInsightsToCSV([mockInsight], 'BRL');
        expect(Number(row['Conversoes'])).toBe(12);
    });
});
