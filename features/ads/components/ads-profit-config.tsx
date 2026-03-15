'use client';

import { useState } from 'react';
import { useProfitConfigStore, type ProfitConfig } from '@/stores/profit-config-slice';
import { calcBreakevenRoas, calcTargetRoas } from '@/lib/utils/profit-calculator';

interface Props {
    onClose: () => void;
}

export function AdsProfitConfig({ onClose }: Props) {
    const { config, saveConfig } = useProfitConfigStore();
    const [draft, setDraft] = useState<ProfitConfig>({ ...config });

    const update = (key: keyof ProfitConfig, value: number | boolean) =>
        setDraft(prev => ({ ...prev, [key]: value }));

    const breakeven = calcBreakevenRoas(draft);
    const target = calcTargetRoas(draft);
    const breakevenDisplay = isFinite(breakeven) ? breakeven.toFixed(2) : '∞';
    const targetDisplay = isFinite(target) ? target.toFixed(2) : '∞';

    const handleSave = () => {
        saveConfig({ ...draft, enabled: true });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-lg p-8 font-mono space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#A3E635] tracking-widest uppercase">⚙ Configurar_Margem</span>
                    <button
                        onClick={onClose}
                        className="text-[#4A4A4A] hover:text-white text-[12px] transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <NumericInput
                        label="COGS %"
                        hint="Custo do produto"
                        value={draft.cogsPct}
                        onChange={v => update('cogsPct', v)}
                    />
                    <NumericInput
                        label="Shipping %"
                        hint="Frete / entrega"
                        value={draft.shippingPct}
                        onChange={v => update('shippingPct', v)}
                    />
                    <NumericInput
                        label="Fees %"
                        hint="Taxas de plataforma / processamento"
                        value={draft.feesPct}
                        onChange={v => update('feesPct', v)}
                    />
                    <NumericInput
                        label="Target Multiplier"
                        hint="Quantas vezes acima do breakeven"
                        value={draft.targetRoasMultiplier}
                        step={0.1}
                        onChange={v => update('targetRoasMultiplier', v)}
                    />
                </div>

                {/* Preview */}
                <div className="p-4 bg-[#141414] border border-white/5 rounded space-y-1">
                    <p className="text-[9px] text-[#4A4A4A] uppercase tracking-widest mb-2">Preview em tempo real</p>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Breakeven ROAS</span>
                        <span className="text-[#F5F5F5] font-bold">{breakevenDisplay}x</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Target ROAS</span>
                        <span className="text-[#A3E635] font-bold">{targetDisplay}x</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8A8A8A]">Margem de contribuição</span>
                        <span className="text-[#F5F5F5]">
                            {(100 - draft.cogsPct - draft.shippingPct - draft.feesPct).toFixed(1)}%
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-white/10 text-[#4A4A4A] text-[10px] uppercase tracking-widest rounded hover:border-white/20 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2 bg-[#A3E635] text-black text-[10px] uppercase tracking-widest font-bold rounded hover:bg-[#B8F050] transition-colors"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}

function NumericInput({
    label,
    hint,
    value,
    step = 1,
    onChange,
}: {
    label: string;
    hint: string;
    value: number;
    step?: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-[10px] text-[#F5F5F5] uppercase tracking-widest">{label}</p>
                <p className="text-[9px] text-[#4A4A4A]">{hint}</p>
            </div>
            <input
                type="number"
                value={value}
                step={step}
                min={0}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                className="w-20 bg-[#141414] border border-white/10 rounded px-2 py-1 text-[12px] text-[#F5F5F5] text-right outline-none focus:border-[#A3E635] transition-colors"
            />
        </div>
    );
}
