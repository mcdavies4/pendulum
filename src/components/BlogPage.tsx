import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ArrowLeft, Eye, Clock, User, PlusCircle, PenTool, CheckCircle, Sparkles, AlertCircle, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';
import { BlogPost } from '../types';

interface BlogPageProps {
  activeSlug: string;
  onNavigate: (path: string) => void;
  userEmail: string | null;
  activeTheme: 'light' | 'dark';
}

export default function BlogPage({ activeSlug, onNavigate, userEmail, activeTheme }: BlogPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isWriting, setIsWriting] = useState(false);

  // New Post Draft state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('Marketing Strategy');
  const [draftExcerpt, setDraftExcerpt] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftAuthor, setDraftAuthor] = useState(userEmail || 'Team Pendulum');
  const [draftError, setDraftError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Category list
  const categories = ['All', 'Marketing Strategy', 'Real Estate', 'B2B & Enterprise', 'General'];

  // Fetch all posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/blogs');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Increment views and trigger route navigation on post click
  const handlePostClick = async (post: BlogPost) => {
    onNavigate(`/blog/${post.slug}`);
    try {
      await apiFetch(`/api/blogs/${post.slug}/view`, { method: 'POST' });
      // Update local state views count for quick feedback
      setPosts(prev => prev.map(p => p.slug === post.slug ? { ...p, views: (p.views || 0) + 1 } : p));
    } catch (err) {
      console.error('Failed to log article view:', err);
    }
  };

  // Publish new blog draft
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftContent.trim()) {
      setDraftError('Title and content are required to publish your article.');
      return;
    }
    setDraftError('');

    try {
      const res = await apiFetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: draftTitle,
          content: draftContent,
          excerpt: draftExcerpt || undefined,
          category: draftCategory,
          author: draftAuthor,
        }),
      });

      if (res.ok) {
        setPublishSuccess(true);
        setTimeout(() => {
          setPublishSuccess(false);
          setIsWriting(false);
          // Reset form fields
          setDraftTitle('');
          setDraftContent('');
          setDraftExcerpt('');
        }, 1500);
        // Reload all posts
        fetchPosts();
      } else {
        const data = await res.json();
        setDraftError(data.error || 'Failed to publish draft.');
      }
    } catch (err) {
      console.error('Error creating blog post:', err);
      setDraftError('A network error occurred while publishing.');
    }
  };

  // Find active post
  const activePost = posts.find(p => p.slug === activeSlug);

  // Filter posts based on category and search query
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Pure React parser to render markdown gorgeous-looking tags safely without external overhead!
  const renderBeautifulContent = (text: string) => {
    if (!text) return null;
    const blocks = text.split('\n\n');

    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      
      // Headers
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} id={`heading-${idx}`} className="text-2xl font-black tracking-tight text-white mt-10 mb-4 font-sans flex items-center gap-2">
            <span className="w-1.5 h-6 rounded bg-indigo-500"></span>
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} id={`subheading-${idx}`} className="text-xl font-bold tracking-tight text-zinc-100 mt-6 mb-3 font-sans">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h4 key={idx} id={`subsubheading-${idx}`} className="text-lg font-bold text-zinc-200 mt-4 mb-2 font-sans">
            {trimmed.replace('#### ', '')}
          </h4>
        );
      }

      // Unordered list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(line => line.replace(/^[\-\*]\s+/, ''));
        return (
          <ul key={idx} className="space-y-2 my-4 pl-6 list-disc text-zinc-300">
            {items.map((item, itemIdx) => {
              // Parse inline bold
              return (
                <li key={itemIdx} className="leading-relaxed">
                  {parseInlineFormatting(item)}
                </li>
              );
            })}
          </ul>
        );
      }

      // Ordered list (Simple number parsing)
      if (/^\d+\.\s+/.test(trimmed)) {
        const items = trimmed.split('\n').map(line => line.replace(/^\d+\.\s+/, ''));
        return (
          <ol key={idx} className="space-y-2 my-4 pl-6 list-decimal text-zinc-300 font-medium">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
      }

      // Table mapping
      if (trimmed.startsWith('|')) {
        const rows = trimmed.split('\n').map(r => r.trim()).filter(Boolean);
        const headers = rows[0].split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        const dataRows = rows.slice(2).map(r => r.split('|').map(cell => cell.trim()).filter(cell => cell !== ''));
        return (
          <div key={idx} className="overflow-x-auto my-6 border border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#191926]/90 border-b border-zinc-800 text-[#a3a3c2] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-3.5 px-4 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-800/20 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 font-mono font-medium">{parseInlineFormatting(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Horizontal Rule
      if (trimmed === '---') {
        return <hr key={idx} className="my-8 border-t border-zinc-800/80" />;
      }

      // Regular Paragraph
      return (
        <p key={idx} className="text-zinc-300 leading-relaxed font-sans text-sm md:text-base my-4">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // Helper to parse double asterisks for bolding text elegantly
  const parseInlineFormatting = (text: string) => {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const codeRegex = /`([^`]+)`/g;

    let elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Replace markdown inline styles with rich TSX spans
    const matchesAll: { index: number; type: 'bold' | 'code'; match: string; text: string }[] = [];
    
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      matchesAll.push({
        index: match.index,
        type: 'bold',
        match: match[0],
        text: match[1]
      });
    }

    codeRegex.lastIndex = 0; // reset
    while ((match = codeRegex.exec(text)) !== null) {
      matchesAll.push({
        index: match.index,
        type: 'code',
        match: match[0],
        text: match[1]
      });
    }

    // Sort by appearance index
    matchesAll.sort((a, b) => a.index - b.index);

    if (matchesAll.length === 0) return text;

    matchesAll.forEach((item, i) => {
      // Add text before styling marker
      if (item.index > lastIndex) {
        elements.push(text.substring(lastIndex, item.index));
      }

      if (item.type === 'bold') {
        elements.push(
          <span key={`bold-${i}`} className="font-extrabold text-white bg-indigo-500/10 px-1 rounded-sm border border-indigo-550/20">
            {item.text}
          </span>
        );
      } else if (item.type === 'code') {
        elements.push(
          <span key={`code-${i}`} className="font-mono text-xs font-black bg-zinc-800 text-teal-300 px-1.5 py-0.5 rounded border border-zinc-700/50">
            {item.text}
          </span>
        );
      }

      lastIndex = item.index + item.match.length;
    });

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return <>{elements}</>;
  };

  // Formatted date string reader
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Subtle SEO Breadcrumb Component
  const Breadcrumb = () => {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 select-none bg-[#11101b]/40 border border-zinc-850/70 px-3.5 py-2 rounded-xl backdrop-blur-sm">
        <button
          onClick={() => onNavigate('/')}
          className="hover:text-white transition-colors cursor-pointer text-zinc-400 font-extrabold"
        >
          Home
        </button>
        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
        <button
          onClick={() => {
            setSelectedCategory('All');
            onNavigate('/blog');
          }}
          className={`transition-colors cursor-pointer ${!activePost ? 'text-indigo-400 font-black' : 'hover:text-white text-zinc-400 font-extrabold'}`}
        >
          Resources
        </button>
        {activePost && (
          <>
            <ChevronRight className="w-3 h-3 text-zinc-650 shrink-0" />
            <button
              onClick={() => {
                setSelectedCategory(activePost.category);
                onNavigate('/blog');
              }}
              className="hover:text-white text-indigo-400 transition-colors cursor-pointer bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10"
            >
              {activePost.category}
            </button>
            <ChevronRight className="w-3 h-3 text-zinc-650 shrink-0" />
            <span className="text-zinc-300 font-extrabold truncate max-w-[150px] sm:max-w-xs normal-case tracking-normal">
              {activePost.title}
            </span>
          </>
        )}
      </nav>
    );
  };

  // Single Article Reader View
  if (activePost) {
    return (
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
        
        {/* Subtle Breadcrumb for SEO navigation */}
        <Breadcrumb />

        {/* Back navigation */}
        <button
          onClick={() => onNavigate('/blog')}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white mb-8 transition-colors border border-zinc-800 hover:border-zinc-700 bg-[#12121b]/40 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </button>

        {/* Hero Metadata Card */}
        <div className="bg-gradient-to-br from-[#12111c] to-[#12121e] border border-zinc-800/80 p-6 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden mb-10">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-wrap items-center gap-2.5 mb-5 select-none">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-lg">
              {activePost.category}
            </span>
            <div className="w-1.2 h-1.2 bg-zinc-500 rounded-full"></div>
            <span className="text-zinc-400 font-mono text-[11px] font-bold">
              {formatDate(activePost.createdAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight lead-tight mb-6">
            {activePost.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 border-t border-zinc-800/80 pt-6">
            <div className="flex items-center gap-2 text-zinc-300 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-zinc-700 flex items-center justify-center font-extrabold text-[10px] uppercase text-zinc-200">
                {activePost.author.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black leading-none">Written by</p>
                <p className="font-bold text-zinc-300 mt-1">{activePost.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono font-bold text-zinc-400">
              <div className="flex items-center gap-1.5 bg-zinc-800/30 px-2.5 py-1 rounded-lg border border-zinc-800">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{activePost.readTime}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-800/30 px-2.5 py-1 rounded-lg border border-zinc-800">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                <span>{(activePost.views || 0) + 1} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Content Body Parse */}
        <article id="rendered-story-viewport" className="px-2 sm:px-6 text-zinc-300">
          {renderBeautifulContent(activePost.content)}

          {/* Social Moat share booster trigger */}
          <div className="mt-14 p-6 sm:p-8 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 relative overflow-hidden select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Enjoyed this marketing insight?
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-lg mt-1 font-medium">
                  We built **Pendulum** specifically to help you configure these complex touchpoints in 30 seconds. Put these guides into practice.
                </p>
              </div>
              <button
                onClick={() => onNavigate('/')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-lg shadow-indigo-600/15 border border-indigo-500 transition-all cursor-pointer"
              >
                Launch Console
              </button>
            </div>
          </div>
        </article>

        {/* Back footer */}
        <div className="mt-16 border-t border-zinc-800 pt-8 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/blog')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Articles Hub</span>
          </button>
          
          <span className="font-mono text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
            Pendulum Editorial Edition
          </span>
        </div>
      </div>
    );
  }

  // Publisher Form panel overlay / collapsible state
  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
      
      {/* Subtle Breadcrumb for SEO navigation */}
      <Breadcrumb />
      
      {/* Blog Hub Hero header */}
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-zinc-800/80 pb-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-3 py-1 rounded-full px-3.5">
            Growth Academy & Resources
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-4 font-sans uppercase">
            Pendulum Resources
          </h1>
          <p className="text-zinc-400 mt-2 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
            Guides, case studies, and tutorials on capturing double-opt-in leads, growth-hacking printed touchpoints, and driving traffic through offline-to-online funnels.
          </p>
        </div>

        {/* Creator Trigger */}
        <button
          onClick={() => {
            setIsWriting(!isWriting);
            setDraftError('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold uppercase tracking-wider text-[10px] rounded-xl border transition-all select-none cursor-pointer text-white ${
            isWriting 
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' 
              : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 shadow-lg shadow-indigo-600/15'
          }`}
        >
          {isWriting ? (
            <>
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel Draft</span>
            </>
          ) : (
            <>
              <PenTool className="w-4 h-4 text-indigo-300" />
              <span>Write Article</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Panel collapsible block */}
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-10"
          >
            <div className="bg-[#12121b]/90 border border-zinc-800 p-6 sm:p-8 rounded-2xl">
              <h3 className="text-base font-extrabold uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-400" />
                Draft New SEO Resource
              </h3>

              {publishSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-450 animate-bounce" />
                  <p className="font-extrabold text-sm">Article Published Successfully!</p>
                  <p className="text-xs text-zinc-400 font-medium font-sans">Your new growth manual is live on the routing engine servers.</p>
                </div>
              ) : (
                <form onSubmit={handlePublish} className="space-y-4">
                  {draftError && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 w-4 text-red-400 shrink-0" />
                      <span className="font-semibold">{draftError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Article Title</label>
                      <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="e.g. Retail Box QR Strategies"
                        className="w-full bg-[#1c1c2b] border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Category</label>
                      <select
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                        className="w-full bg-[#1c1c2b] border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                      >
                        <option value="Marketing Strategy">Marketing Strategy</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="B2B & Enterprise">B2B & Enterprise</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Author</label>
                      <input
                        type="text"
                        value={draftAuthor}
                        onChange={(e) => setDraftAuthor(e.target.value)}
                        placeholder="Team Pendulum"
                        className="w-full bg-[#1c1c2b] border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Short Excerpt (Brief Summary)</label>
                      <input
                        type="text"
                        value={draftExcerpt}
                        onChange={(e) => setDraftExcerpt(e.target.value)}
                        placeholder="Most businesses print QR codes incorrectly..."
                        className="w-full bg-[#1c1c2b] border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                      Article Content (Supports simple formatting and headers like ## Title)
                    </label>
                    <textarea
                      rows={8}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder={`## Write your beautiful heading\n\nExplain how things work. Use bullet lists:\n- Benefit 1\n- Benefit 2\n\nPrint simple tables:\n| Campaign | Result |\n| Offline flyer | 25% CTR |\n| Lawn Sign | 13% CTR |`}
                      className="w-full bg-[#1c1c2b] border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[10px] px-6 py-3 rounded-xl border border-emerald-500 transition-all cursor-pointer shadow-lg shadow-emerald-600/10 active:scale-[0.98]"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-100" />
                      <span>Publish live</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories slider / Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 bg-[#13121c]/40 border border-zinc-850 p-2 rounded-2xl">
        <div className="flex gap-1 overflow-x-auto select-none no-scrollbar shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Search bar */}
        <div className="relative w-full max-w-sm sm:w-auto flex items-center bg-[#13121a] rounded-xl border border-zinc-800 px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides/articles..."
            className="bg-transparent border-none text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none w-full font-bold"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Syncing resources hub...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl bg-[#12121b]/40">
          <BookOpen className="w-10 h-10 text-zinc-650 mx-auto mb-3" />
          <h4 className="font-extrabold text-[#f4f4f5] tracking-tight">No articles found</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Try adjusting your search filters or browse other categories to read growth marketing case studies.
          </p>
        </div>
      ) : (
        // Grid cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gradient-to-b from-[#12121c]/90 to-[#0e0d16] border border-zinc-850 hover:border-zinc-700 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all group flex flex-col flex-1 h-full cursor-pointer select-none"
                onClick={() => handlePostClick(post)}
              >
                {/* Visual Accent header */}
                <div className="bg-[#191929]/70 px-5 py-4 border-b border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-3 font-mono text-[9px] font-bold text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-650" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-3 line-clamp-3 leading-relaxed font-sans font-medium">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-900 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-zinc-400 tracking-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {post.author}
                    </span>

                    <div className="flex items-center gap-2 font-mono text-[9px] font-bold text-zinc-500">
                      <div className="flex items-center gap-1 bg-zinc-900/60 pl-1.5 pr-2 py-0.5 rounded border border-zinc-850">
                        <Eye className="w-3 h-3 text-zinc-600" />
                        <span>{post.views || 0} views</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
