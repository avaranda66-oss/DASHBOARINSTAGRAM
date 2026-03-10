'use client';

import { useEffect } from 'react';

export const useKeyboardShortcut = (
    key: string,
    callback: (e: KeyboardEvent) => void,
    modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean } = {}
) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Verifica se a tecla principal bate (case insensitive)
            if (e.key.toLowerCase() !== key.toLowerCase()) return;

            // Verifica os modificadores (se requerido, deve estar pressionado. Se não requerido, não importa ou deve estar solto dependendo da lógica.
            // O padrão para shortcuts Cmd/Ctrl é checar se batem exatamente.)
            const ctrlMatch = modifiers.ctrl ? e.ctrlKey : !e.ctrlKey;
            const metaMatch = modifiers.meta ? e.metaKey : !e.metaKey;
            const shiftMatch = modifiers.shift ? e.shiftKey : !e.shiftKey;
            const altMatch = modifiers.alt ? e.altKey : !e.altKey;

            // Para Cmd/Ctrl (mac/windows), geralmente aceitamos um ou outro como "comando principal"
            // Se for pedido CTRL ou META, a gente flexibiliza um pouco para multi-os
            const isCmdOrCtrl = modifiers.ctrl || modifiers.meta;
            const cmdOrCtrlPressed = e.ctrlKey || e.metaKey;

            const cmdCtrlMatch = isCmdOrCtrl ? cmdOrCtrlPressed : (!e.ctrlKey && !e.metaKey);

            if (cmdCtrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                callback(e);
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [key, callback, modifiers]);
};
