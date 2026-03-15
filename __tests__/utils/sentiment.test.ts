// =============================================================================
// sentiment.test.ts — Tests for Sentiment Analysis, Buying Intent,
// Urgency Triggers, Sensory Language, Authority Signals
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  analyzeSingleComment,
  analyzeCommentsSentiment,
  detectBuyingIntent,
  detectUrgencyTriggers,
  sensoryLanguageScore,
  detectAuthoritySignals,
} from '@/lib/utils/sentiment';
import type { InstagramPostMetrics } from '@/types/analytics';
import { isClean, withinRange } from '@/__tests__/_helpers/tolerance';

// =============================================================================
// analyzeSingleComment
// =============================================================================
describe('analyzeSingleComment', () => {
  it('classifies strongly positive text as POSITIVE', () => {
    const result = analyzeSingleComment('Parabens! Incrivel trabalho, amei demais! Show!');
    expect(result.sentiment).toBe('POSITIVE');
    expect(result.positiveScore).toBeGreaterThan(0);
  });

  it('classifies strongly negative text as NEGATIVE', () => {
    const result = analyzeSingleComment('Horrivel, pessimo atendimento, decepcionante');
    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.negativeScore).toBeGreaterThan(0);
  });

  it('classifies neutral text as NEUTRAL', () => {
    const result = analyzeSingleComment('ok');
    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('classifies brand reply as BRAND_REPLY', () => {
    const result = analyzeSingleComment('Obrigado pelo feedback!', 'mybrand', 'mybrand');
    expect(result.sentiment).toBe('BRAND_REPLY');
    expect(result.positiveScore).toBe(0);
    expect(result.negativeScore).toBe(0);
  });

  it('returns NEUTRAL for empty text', () => {
    const result = analyzeSingleComment('');
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.positiveScore).toBe(0);
    expect(result.negativeScore).toBe(0);
  });

  it('returns NEUTRAL for whitespace-only text', () => {
    const result = analyzeSingleComment('   ');
    expect(result.sentiment).toBe('NEUTRAL');
  });

  it('applies effort multiplier for longer comments', () => {
    const short = analyzeSingleComment('amei');
    const long = analyzeSingleComment('eu amei muito esse conteudo que voce fez, parabens pelo trabalho incrivel');
    // Longer comment should have higher positiveScore due to effort multiplier
    expect(long.positiveScore).toBeGreaterThan(short.positiveScore);
  });

  it('handles emoji-only comments with reduced weight', () => {
    const result = analyzeSingleComment('❤️🔥😍');
    expect(result.sentiment).toBe('POSITIVE');
    // Emoji weight is 0.5 each, so score should be modest
    expect(result.positiveScore).toBeLessThan(5);
  });
});

// =============================================================================
// analyzeCommentsSentiment
// =============================================================================
describe('analyzeCommentsSentiment', () => {
  const makePost = (comments: { text: string; ownerUsername: string }[], postOwner = 'brand'): InstagramPostMetrics => ({
    id: 'post_1',
    shortCode: 'abc',
    url: 'https://instagram.com/p/abc',
    type: 'Image',
    caption: 'Test post',
    hashtags: [],
    likesCount: 100,
    commentsCount: comments.length,
    videoViewCount: null,
    videoPlayCount: null,
    timestamp: '2026-03-01T10:00:00Z',
    displayUrl: 'https://example.com/img.jpg',
    ownerUsername: postOwner,
    latestComments: comments.map((c, i) => ({ id: `c${i}`, text: c.text, ownerUsername: c.ownerUsername, timestamp: '', likesCount: 0 })),
  });

  it('counts positive, neutral, negative correctly', () => {
    const post = makePost([
      { text: 'Amei! Incrivel! Maravilhoso!', ownerUsername: 'user1' },
      { text: 'Horrivel atendimento pessimo', ownerUsername: 'user2' },
      { text: 'ok', ownerUsername: 'user3' },
    ]);

    const result = analyzeCommentsSentiment([post]);
    expect(result.total).toBe(3);
    expect(result.pctPos + result.pctNeu + result.pctNeg).toBeGreaterThanOrEqual(99); // rounding
    expect(result.pctPos + result.pctNeu + result.pctNeg).toBeLessThanOrEqual(101);
  });

  it('excludes brand replies from counts', () => {
    const post = makePost([
      { text: 'Amei!', ownerUsername: 'user1' },
      { text: 'Obrigado!', ownerUsername: 'brand' }, // brand reply
    ]);

    const result = analyzeCommentsSentiment([post]);
    expect(result.brand).toBe(1);
    expect(result.total).toBe(1); // only user1 counted
  });

  it('returns zeros for posts with no comments', () => {
    const post = makePost([]);
    const result = analyzeCommentsSentiment([post]);

    expect(result.total).toBe(0);
    expect(result.pctPos).toBe(0);
    expect(result.pctNeu).toBe(0);
    expect(result.pctNeg).toBe(0);
  });

  it('positivityMultiplier is a clean number', () => {
    const post = makePost([
      { text: 'Lindo! Perfeito!', ownerUsername: 'user1' },
      { text: 'Show! Top!', ownerUsername: 'user2' },
    ]);

    const result = analyzeCommentsSentiment([post]);
    expect(isClean(result.positivityMultiplier)).toBe(true);
  });

  it('handles multiple posts aggregated', () => {
    const post1 = makePost([{ text: 'Amei!', ownerUsername: 'u1' }]);
    const post2 = makePost([{ text: 'Pessimo', ownerUsername: 'u2' }]);

    const result = analyzeCommentsSentiment([post1, post2]);
    expect(result.total).toBe(2);
  });
});

// =============================================================================
// detectBuyingIntent
// =============================================================================
describe('detectBuyingIntent', () => {
  it('detects "Onde compro?" as buying intent', () => {
    const comments = [{ id: '1', text: 'Onde compro isso?', ownerUsername: 'user1' }];
    const result = detectBuyingIntent(comments);

    expect(result.intentCount).toBe(1);
    expect(result.intentComments[0].keywords).toContain('onde compro');
  });

  it('detects "quanto custa" and "qual o preco"', () => {
    const comments = [
      { id: '1', text: 'Quanto custa esse produto?', ownerUsername: 'u1' },
      { id: '2', text: 'Qual o preco?', ownerUsername: 'u2' },
    ];

    const result = detectBuyingIntent(comments);
    expect(result.intentCount).toBe(2);
  });

  it('does not detect intent in neutral text', () => {
    const comments = [
      { id: '1', text: 'Bom dia!', ownerUsername: 'u1' },
      { id: '2', text: 'Que legal esse conteudo', ownerUsername: 'u2' },
    ];

    const result = detectBuyingIntent(comments);
    expect(result.intentCount).toBe(0);
    expect(result.intentRate).toBe(0);
  });

  it('calculates intentRate correctly', () => {
    const comments = [
      { id: '1', text: 'Onde compro?', ownerUsername: 'u1' },
      { id: '2', text: 'Bonito!', ownerUsername: 'u2' },
      { id: '3', text: 'Legal', ownerUsername: 'u3' },
      { id: '4', text: 'Quero comprar', ownerUsername: 'u4' },
    ];

    const result = detectBuyingIntent(comments);
    expect(result.intentCount).toBe(2);
    expect(result.totalComments).toBe(4);
    expect(result.intentRate).toBe(50); // 2/4 * 100
  });

  it('returns zero for empty comments array', () => {
    const result = detectBuyingIntent([]);
    expect(result.intentCount).toBe(0);
    expect(result.totalComments).toBe(0);
    expect(result.intentRate).toBe(0);
  });

  it('detects delivery/logistics keywords', () => {
    const comments = [{ id: '1', text: 'Faz entrega? Qual o horario?', ownerUsername: 'u1' }];
    const result = detectBuyingIntent(comments);
    expect(result.intentCount).toBe(1);
  });

  it('deduplicates keywords in a single comment', () => {
    const comments = [{ id: '1', text: 'Onde compro? Onde compro mesmo?', ownerUsername: 'u1' }];
    const result = detectBuyingIntent(comments);
    // keywords should be deduplicated
    const keywords = result.intentComments[0].keywords;
    const unique = new Set(keywords);
    expect(keywords.length).toBe(unique.size);
  });
});

// =============================================================================
// detectUrgencyTriggers
// =============================================================================
describe('detectUrgencyTriggers', () => {
  it('detects "Ultima vaga hoje!" as urgency', () => {
    const result = detectUrgencyTriggers('Ultima vaga hoje! So hoje!');
    expect(result.hasUrgency).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.triggers.length).toBeGreaterThan(0);
  });

  it('detects multiple urgency keywords', () => {
    const result = detectUrgencyTriggers('Promocao imperdivel! Ultimas unidades! Corre!');
    expect(result.hasUrgency).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(3);
  });

  it('returns hasUrgency=false for text without triggers', () => {
    const result = detectUrgencyTriggers('Bom dia a todos, esperamos que gostem do conteudo');
    expect(result.hasUrgency).toBe(false);
    expect(result.triggers).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('returns empty result for empty string', () => {
    const result = detectUrgencyTriggers('');
    expect(result.hasUrgency).toBe(false);
    expect(result.triggers).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('detects "desconto" and "exclusivo"', () => {
    const result = detectUrgencyTriggers('Desconto exclusivo para seguidores');
    expect(result.hasUrgency).toBe(true);
    expect(result.triggers).toEqual(expect.arrayContaining(['desconto']));
  });

  it('deduplicates triggers', () => {
    const result = detectUrgencyTriggers('Corre! Corre! Corre!');
    const unique = new Set(result.triggers);
    expect(result.triggers.length).toBe(unique.size);
  });
});

// =============================================================================
// sensoryLanguageScore
// =============================================================================
describe('sensoryLanguageScore', () => {
  it('scores > 0 for text with sensory words', () => {
    const result = sensoryLanguageScore('Veja as cores brilhantes e sinta a textura suave');
    expect(result.score).toBeGreaterThan(0);
    expect(result.count).toBeGreaterThan(0);
    expect(result.sensoryWords.length).toBeGreaterThan(0);
  });

  it('returns 0 for text without sensory words', () => {
    const result = sensoryLanguageScore('O projeto foi entregue no prazo');
    expect(result.score).toBe(0);
    expect(result.sensoryWords).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('returns 0 for empty string', () => {
    const result = sensoryLanguageScore('');
    expect(result.score).toBe(0);
    expect(result.classification).toBe('neutro');
  });

  it('classifies "multisensorial" when 3+ unique sensory words', () => {
    const result = sensoryLanguageScore('Veja o visual brilhante, sinta a textura e ouça o som');
    expect(result.classification).toBe('multisensorial');
    expect(result.count).toBeGreaterThanOrEqual(3);
  });

  it('classifies "sensorial" for 1-2 unique sensory words', () => {
    const result = sensoryLanguageScore('Veja o visual');
    expect(result.classification).toBe('sensorial');
  });

  it('caps score at 100', () => {
    // Many sensory words
    const text = 'veja imagine brilhante cores visual bonito ouça som musica silencio sinta toque suave quente frio textura sabor delicioso doce amargo salgado crocante aroma perfume cheiro fragrancia';
    const result = sensoryLanguageScore(text);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('deduplicates sensory words', () => {
    const result = sensoryLanguageScore('bonito bonito bonito visual visual');
    const unique = new Set(result.sensoryWords);
    expect(result.sensoryWords.length).toBe(unique.size);
  });

  it('score is a clean number', () => {
    const result = sensoryLanguageScore('cores brilhantes e suave');
    expect(isClean(result.score)).toBe(true);
  });
});

// =============================================================================
// detectAuthoritySignals
// =============================================================================
describe('detectAuthoritySignals', () => {
  it('detects authority signals in text with numbers and credentials', () => {
    const result = detectAuthoritySignals('Especialista com 10 anos de experiencia, certificado e comprovado');
    expect(result.hasAuthority).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  it('detects year-based authority (e.g. "10 anos")', () => {
    const result = detectAuthoritySignals('Profissional com 10 anos no mercado');
    expect(result.hasAuthority).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(2); // "10 anos" + "profissional"
  });

  it('returns false for text without authority signals', () => {
    const result = detectAuthoritySignals('Bom dia, como vai?');
    expect(result.hasAuthority).toBe(false);
    expect(result.signals).toEqual([]);
  });

  it('returns false for empty string', () => {
    const result = detectAuthoritySignals('');
    expect(result.hasAuthority).toBe(false);
    expect(result.count).toBe(0);
  });

  it('detects "pesquisa" and "estudo"', () => {
    const result = detectAuthoritySignals('Segundo pesquisa e estudo recente');
    expect(result.hasAuthority).toBe(true);
  });
});
