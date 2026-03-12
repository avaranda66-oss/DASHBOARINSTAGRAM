'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Heart, MessageCircle, Users, Image as ImageIcon, Video, Layers, AlertCircle, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  handle: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  avatarUrl?: string;
}

interface Post {
  id: string;
  caption?: string;
  type: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  url: string;
  thumbnailUrl?: string;
}

interface Props {
  profile: Profile;
  posts: Post[];
  fetchedAt: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

export function MetaDiscoveryCard({ profile, posts, fetchedAt }: Props) {
  const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.commentsCount, 0);
  const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
  const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;
  
  // Taxa de engajamento por seguidores — apenas se disponível
  const engRate = profile.followersCount > 0
    ? (((avgLikes + avgComments) / profile.followersCount) * 100).toFixed(2)
    : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
      {/* Header Profile */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
              {profile.avatarUrl ? (
                // BUG FIX: usar image-proxy para evitar bloqueio CORS do CDN do Instagram
                <img src={`/api/image-proxy?url=${encodeURIComponent(profile.avatarUrl)}`} alt={profile.handle} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center instagram-gradient opacity-20" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">@{profile.handle}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  <ShieldCheck className="h-3 w-3" /> Apify
                </span>
              </div>
              <p className="text-sm text-zinc-400">{profile.name}</p>
              <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                <span><strong className="text-zinc-300">{profile.followersCount > 0 ? fmt(profile.followersCount) : 'N/D'}</strong> seguidores</span>
                <span><strong className="text-zinc-300">{profile.mediaCount > 0 ? fmt(profile.mediaCount) : '?'}</strong> posts buscados</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Última Busca: {format(parseISO(fetchedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
            <a 
              href={`https://instagram.com/${profile.handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-1 inline-flex flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
            >
              Abrir Perfil <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        
        {profile.biography && (
            <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap">
                {profile.biography}
            </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 bg-zinc-900/30">
        <div className="p-4 text-center">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Média Likes</p>
            <p className="text-xl font-bold font-mono text-pink-400 flex items-center justify-center gap-1.5">
                <Heart className="h-4 w-4" /> {fmt(avgLikes)}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Últimos {posts.length} posts</p>
        </div>
        <div className="p-4 text-center">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Média Comentários</p>
            <p className="text-xl font-bold font-mono text-orange-400 flex items-center justify-center gap-1.5">
                <MessageCircle className="h-4 w-4" /> {fmt(avgComments)}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Últimos {posts.length} posts</p>
        </div>
        <div className="p-4 text-center">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Eng. Rate (Seguid.)</p>
            <p className="text-xl font-bold font-mono text-purple-400 flex items-center justify-center gap-1.5">
                <Users className="h-4 w-4" /> {engRate !== null ? `${engRate}%` : 'N/D'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{engRate === null ? 'Seguidores não disponíveis' : `Est. ${posts.length} posts`}</p>
        </div>
      </div>

      {/* Mini-table of Posts */}
      {posts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Post</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Data</th>
                <th className="text-right px-4 py-2 font-medium text-pink-400">Likes</th>
                <th className="text-right px-4 py-2 font-medium text-orange-400">Comments</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-2.5 max-w-[250px]">
                    <div className="flex items-center gap-2">
                      {post.type === 'Video' ? <Video className="h-3 w-3 text-purple-400 shrink-0" /> : 
                       post.type === 'Sidecar' ? <Layers className="h-3 w-3 text-blue-400 shrink-0" /> : 
                       <ImageIcon className="h-3 w-3 text-emerald-400 shrink-0" />}
                      <span className="truncate text-zinc-400" title={post.caption}>
                        {post.caption?.slice(0, 60) || '(sem legenda)'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                    {format(parseISO(post.timestamp), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-pink-400">{fmt(post.likesCount)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-400">{fmt(post.commentsCount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {post.url && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer"
                            className="text-zinc-600 hover:text-zinc-300 transition-colors inline-block">
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-zinc-900/10">
            <AlertCircle className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Nenhum post recente retornado pela API.</p>
        </div>
      )}
    </div>
  );
}
