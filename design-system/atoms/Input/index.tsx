'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/design-system/utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    label?: string;
    hint?: string;
    error?: string;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    size?: 'sm' | 'md';
    isLoading?: boolean;
    isMono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, error, prefix, suffix, size = 'md', isLoading, disabled, className, isMono, ...props }, ref) => {
        const isError = !!error;
        const [isFocused, setIsFocused] = React.useState(false);

        return (
            <div className={cn("flex flex-col w-full", disabled && "opacity-40 cursor-not-allowed", className)}>
                {label && (
                    <label className="text-[11px] font-medium text-[#8A8A8A] mb-1.5 uppercase tracking-wider select-none">
                        {label}
                    </label>
                )}

                <div 
                    className={cn(
                        "relative flex items-center transition-colors duration-150",
                        "bg-[#0A0A0A] rounded-[6px] border border-white/5",
                        isFocused && "border-white/20",
                        isError && "border-[#EF4444]/40",
                        size === 'md' && "h-9",
                        size === 'sm' && "h-7"
                    )}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                >
                    {prefix && (
                        <div className="pl-3 flex items-center justify-center text-[#4A4A4A] shrink-0">
                            {prefix}
                        </div>
                    )}

                    <input
                        ref={ref}
                        disabled={disabled || isLoading}
                        className={cn(
                            "flex-1 bg-transparent px-3 h-full text-[13px] text-[#F5F5F5] placeholder:text-[#4A4A4A] focus:outline-none",
                            isMono && "font-mono font-medium tracking-tight",
                            prefix && "pl-2",
                            suffix && "pr-2"
                        )}
                        {...props}
                    />

                    {isLoading && (
                        <div className="pr-3">
                            <svg
                                className="animate-spin h-3.5 w-3.5 text-[#4A4A4A]"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    )}

                    {suffix && !isLoading && (
                        <div className="pr-3 flex items-center justify-center text-[#4A4A4A] shrink-0">
                            {suffix}
                        </div>
                    )}

                    {/* Industrial focus indicator (bottom line) */}
                    <motion.div 
                        initial={false}
                        animate={{ 
                            width: isFocused ? '100%' : '0%',
                            opacity: isFocused ? 1 : 0 
                        }}
                        className="absolute bottom-[-1px] left-0 h-[1px] bg-[#A3E635] pointer-events-none"
                        transition={{ duration: 0.2 }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {isError ? (
                        <motion.span 
                            key="error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-[10px] text-[#EF4444] mt-1 font-medium tracking-tight"
                        >
                            {error}
                        </motion.span>
                    ) : hint ? (
                        <motion.span 
                            key="hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-[#4A4A4A] mt-1 tracking-tight"
                        >
                            {hint}
                        </motion.span>
                    ) : null}
                </AnimatePresence>
            </div>
        );
    }
);

Input.displayName = 'Input';
