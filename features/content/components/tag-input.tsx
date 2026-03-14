'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
// [ZERO_LUCIDE_PURGE]
import { Badge } from '@/design-system/atoms/Badge';
import { cn } from '@/design-system/utils/cn';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    placeholder?: string;
}

const GLYPHS = {
    CLOSE: '✕',
    TAG: '◆'
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

export function TagInput({
    tags,
    onChange,
    maxTags = 30,
    placeholder = 'PROTOCOL_TAG...',
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (value: string) => {
        let tag = value.trim();
        if (!tag) return;
        if (!tag.startsWith('#')) tag = `#${tag}`;
        if (tags.includes(tag) || tags.length >= maxTags) return;
        onChange([...tags, tag]);
        setInputValue('');
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div className="font-mono">
            <div
                className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] p-3 focus-within:border-[#A3E635]/40 transition-all cursor-text min-h-[44px]"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag, index) => (
                    <Badge
                        key={`${tag}-${index}`}
                        variant="subtle"
                        intent="default"
                        className="gap-2 text-[9px] uppercase tracking-widest bg-white/5 text-[#F5F5F5] border-white/10 hover:bg-white/10 transition-colors py-1 px-2 rounded"
                    >
                        <span className="text-[#A3E635] opacity-60">{wrap(GLYPHS.TAG)}</span>
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="text-[#4A4A4A] hover:text-[#EF4444] transition-colors"
                        >
                            {wrap(GLYPHS.CLOSE)}
                        </button>
                    </Badge>
                ))}
                {tags.length < maxTags && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => addTag(inputValue)}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        className="min-w-[120px] flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#2A2A2A] uppercase font-bold text-[#F5F5F5]"
                    />
                )}
            </div>
            <div className="mt-2 flex justify-between items-center px-1">
                <span className="text-[8px] text-[#4A4A4A] uppercase tracking-[0.2em] font-bold">Protocol_Hashtag_Array</span>
                <p className="text-[9px] font-bold text-[#4A4A4A]">
                    {tags.length}/{maxTags} KEY_NODES
                </p>
            </div>
        </div>
    );
}
