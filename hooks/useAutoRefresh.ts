'use client';

/**
 * US-56 — Auto-Refresh com Polling Inteligente
 * - Intervalo configurável (5min / 15min / 30min / manual)
 * - Pausa automática quando aba perde foco (Page Visibility API)
 * - Persiste preferência em localStorage
 * - Retorna tempo até próximo refresh
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type RefreshInterval = 5 | 15 | 30 | 0; // 0 = manual

const STORAGE_KEY = 'ads-refresh-interval';

export interface AutoRefreshState {
    interval: RefreshInterval;
    setInterval: (v: RefreshInterval) => void;
    isActive: boolean;
    nextRefreshIn: number | null; // segundos
    triggerRefresh: () => void;
}

export function useAutoRefresh(
    onRefresh: () => void,
    options?: { defaultInterval?: RefreshInterval }
): AutoRefreshState {
    const [interval, setIntervalState] = useState<RefreshInterval>(() => {
        if (typeof window === 'undefined') return options?.defaultInterval ?? 0;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === '5' || stored === '15' || stored === '30') return Number(stored) as RefreshInterval;
        if (stored === '0') return 0;
        return options?.defaultInterval ?? 0;
    });

    const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const countdownRef = useRef<number | null>(null);
    const isPausedRef = useRef(false);
    const secondsLeftRef = useRef<number>(0);
    const onRefreshRef = useRef(onRefresh);

    // Mantém ref atualizada sem re-criar efeitos
    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    const clearTimers = useCallback(() => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (countdownRef.current) window.clearInterval(countdownRef.current);
        timerRef.current = null;
        countdownRef.current = null;
        setNextRefreshIn(null);
    }, []);

    const startTimers = useCallback((minutes: RefreshInterval) => {
        if (minutes === 0) {
            clearTimers();
            return;
        }

        const totalSeconds = minutes * 60;
        secondsLeftRef.current = totalSeconds;
        setNextRefreshIn(totalSeconds);

        // Countdown a cada segundo
        countdownRef.current = window.setInterval(() => {
            if (isPausedRef.current) return;
            secondsLeftRef.current -= 1;
            setNextRefreshIn(secondsLeftRef.current);
        }, 1000);

        // Trigger de refresh
        timerRef.current = window.setInterval(() => {
            if (isPausedRef.current) return;
            secondsLeftRef.current = totalSeconds;
            setNextRefreshIn(totalSeconds);
            onRefreshRef.current();
        }, minutes * 60 * 1000);
    }, [clearTimers]);

    // Restart timers ao mudar intervalo
    useEffect(() => {
        clearTimers();
        startTimers(interval);
        localStorage.setItem(STORAGE_KEY, String(interval));

        return clearTimers;
    }, [interval, startTimers, clearTimers]);

    // Page Visibility API — pausa ao perder foco
    useEffect(() => {
        const handleVisibility = () => {
            isPausedRef.current = document.hidden;
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // Exportado como `setInterval` para a interface pública, mas internamente nomeado
    // `changeInterval` para não fazer shadowing do `window.setInterval`
    const changeInterval = useCallback((v: RefreshInterval) => {
        setIntervalState(v);
    }, []);

    const triggerRefresh = useCallback(() => {
        if (interval > 0) {
            secondsLeftRef.current = interval * 60;
            setNextRefreshIn(interval * 60);
        }
        onRefreshRef.current();
    }, [interval]);

    const isActive = interval > 0;

    return { interval, setInterval: changeInterval, isActive, nextRefreshIn, triggerRefresh };
}
