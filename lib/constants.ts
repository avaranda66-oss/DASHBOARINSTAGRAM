// Content status pipeline
export const CONTENT_STATUSES = [
    { value: 'idea', label: 'Ideia', color: '#9CA3AF' },
    { value: 'draft', label: 'Rascunho', color: '#F59E0B' },
    { value: 'approved', label: 'Aprovado', color: '#10B981' },
    { value: 'scheduled', label: 'Agendado', color: '#6366F1' },
    { value: 'published', label: 'Publicado', color: '#3B82F6' },
    { value: 'failed', label: 'Falhou', color: '#EF4444' },
] as const;

// Content types for Instagram
export const CONTENT_TYPES = [
    { value: 'post', label: 'Post', icon: 'Image' },
    { value: 'story', label: 'Story', icon: 'Circle' },
    { value: 'reel', label: 'Reel', icon: 'Film' },
    { value: 'carousel', label: 'Carrossel', icon: 'Layers' },
] as const;

// Derived type helpers
export type ContentStatus = (typeof CONTENT_STATUSES)[number]['value'];
export type ContentType = (typeof CONTENT_TYPES)[number]['value'];

// Board column configuration for Storyboard Kanban
export const BOARD_COLUMNS = [
    { id: 'idea', label: 'Ideia', icon: 'Lightbulb', color: '#94A3B8' },
    { id: 'draft', label: 'Rascunho', icon: 'FileEdit', color: '#F59E0B' },
    { id: 'approved', label: 'Aprovado', icon: 'CheckCircle2', color: '#10B981' },
    { id: 'scheduled', label: 'Agendado', icon: 'Clock', color: '#6366F1' },
    { id: 'published', label: 'Publicado', icon: 'Send', color: '#8B5CF6' },
    { id: 'failed', label: 'Falhou', icon: 'AlertCircle', color: '#EF4444' },
] as const;

// Badge colors by content type
export const TYPE_BADGE_COLORS: Record<string, string> = {
    post: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    story: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    reel: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    carousel: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};
