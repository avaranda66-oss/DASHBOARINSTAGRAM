'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
    placeholder?: string;
}

export function TagInput({
    tags,
    onChange,
    maxTags = 30,
    placeholder = 'Adicionar hashtag...',
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
        <div>
            <div
                className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag, index) => (
                    <Badge
                        key={`${tag}-${index}`}
                        variant="secondary"
                        className="gap-1 text-xs"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="rounded-full hover:bg-foreground/10"
                        >
                            <X className="h-3 w-3" />
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
                        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground text-right">
                {tags.length}/{maxTags} hashtags
            </p>
        </div>
    );
}
