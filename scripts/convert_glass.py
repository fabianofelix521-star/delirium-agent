#!/usr/bin/env python3
"""Convert old hardcoded Tailwind styles to liquid glass CSS variable system."""

import os

# Order matters - more specific patterns first
replacements = [
    # Wrapper div
    ('min-h-screen bg-linear-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14]', 'space-y-6'),
    
    # Placeholder (before text-white)
    ('placeholder:text-white/30', 'placeholder:text-[var(--text-ghost)]'),
    ('placeholder:text-white/20', 'placeholder:text-[var(--text-ghost)]'),
    
    # Hover text (before text-white)
    ('hover:text-white/80', 'hover:text-[var(--text-primary)]'),
    ('hover:text-white/60', 'hover:text-[var(--text-muted)]'),
    ('hover:text-white', 'hover:text-[var(--text-primary)]'),
    
    # Text with opacity (before plain text-white)
    ('text-white/90', 'text-[var(--text-primary)]'),
    ('text-white/80', 'text-[var(--text-secondary)]'),
    ('text-white/70', 'text-[var(--text-secondary)]'),
    ('text-white/60', 'text-[var(--text-muted)]'),
    ('text-white/50', 'text-[var(--text-muted)]'),
    ('text-white/40', 'text-[var(--text-ghost)]'),
    ('text-white/30', 'text-[var(--text-ghost)]'),
    ('text-white/20', 'text-[var(--text-ghost)]'),

    # Plain text-white (careful: must not match above)  
    ('text-white', 'text-[var(--text-primary)]'),

    # BG + Border combined patterns (before individual)
    ('bg-white/3 border border-white/10', 'liquid-glass liquid-glass-hover'),
    ('bg-white/5 border border-white/10', 'liquid-glass'),
    
    # Hover bg (before bg-white)
    ('hover:bg-white/10', 'hover:bg-[var(--glass-bg)]'),
    ('hover:bg-white/5', 'hover:bg-[var(--glass-bg)]'),
    
    # BG opacity
    ('bg-white/10', 'bg-[var(--glass-bg)]'),
    ('bg-white/5', 'bg-[var(--glass-bg)]'),
    ('bg-white/3', 'bg-[var(--glass-bg)]'),
    
    # Hover border (before border-white)
    ('hover:border-white/20', 'hover:border-[var(--glass-border-hover)]'),
    ('hover:border-white/30', 'hover:border-[var(--glass-border-hover)]'),
    
    # Border opacity
    ('border-white/10', 'border-[var(--glass-border)]'),
    ('border-white/5', 'border-[var(--glass-border)]'),
    ('border-white/20', 'border-[var(--glass-border-hover)]'),

    # ─── CYAN ───
    ('hover:text-cyan-400', 'hover:text-[var(--accent-cyan)]'),
    ('hover:bg-cyan-500/30', 'hover:bg-[rgba(6,182,212,0.2)]'),
    ('hover:bg-cyan-500/20', 'hover:bg-[rgba(6,182,212,0.15)]'),
    ('hover:border-cyan-500/50', 'hover:border-[rgba(6,182,212,0.3)]'),
    ('focus:border-cyan-500/50', 'focus:border-[rgba(6,182,212,0.3)]'),
    ('focus:ring-cyan-500/20', 'focus:ring-[rgba(6,182,212,0.15)]'),
    ('text-cyan-400', 'text-[var(--accent-cyan)]'),
    ('text-cyan-300', 'text-[var(--accent-cyan)]'),
    ('bg-cyan-500/20', 'bg-[rgba(6,182,212,0.15)]'),
    ('bg-cyan-500/10', 'bg-[rgba(6,182,212,0.1)]'),
    ('border-cyan-500/30', 'border-[rgba(6,182,212,0.2)]'),
    ('border-cyan-500/20', 'border-[rgba(6,182,212,0.15)]'),

    # ─── EMERALD (success) ───
    ('hover:bg-emerald-500/20', 'hover:bg-[rgba(16,185,129,0.15)]'),
    ('text-emerald-400/60', 'text-[var(--success)]'),
    ('text-emerald-400', 'text-[var(--success)]'),
    ('text-emerald-300', 'text-[var(--success)]'),
    ('bg-emerald-500/20', 'bg-[rgba(16,185,129,0.15)]'),
    ('bg-emerald-500/10', 'bg-[rgba(16,185,129,0.1)]'),
    ('bg-emerald-500/5', 'bg-[rgba(16,185,129,0.05)]'),
    ('border-emerald-500/30', 'border-[rgba(16,185,129,0.2)]'),
    ('border-emerald-500/20', 'border-[rgba(16,185,129,0.15)]'),
    ('shadow-emerald-500/5', 'shadow-[rgba(16,185,129,0.05)]'),

    # ─── VIOLET ───
    ('hover:bg-violet-500/30', 'hover:bg-[rgba(139,92,246,0.2)]'),
    ('hover:bg-violet-500/20', 'hover:bg-[rgba(139,92,246,0.15)]'),
    ('focus:border-violet-500/50', 'focus:border-[rgba(139,92,246,0.3)]'),
    ('focus:ring-violet-500/20', 'focus:ring-[rgba(139,92,246,0.15)]'),
    ('text-violet-400/60', 'text-[var(--accent-violet)]'),
    ('text-violet-400', 'text-[var(--accent-violet)]'),
    ('text-violet-300', 'text-[var(--accent-violet)]'),
    ('bg-violet-500/20', 'bg-[rgba(139,92,246,0.15)]'),
    ('bg-violet-500/10', 'bg-[rgba(139,92,246,0.1)]'),
    ('bg-violet-500/5', 'bg-[rgba(139,92,246,0.05)]'),
    ('border-violet-500/30', 'border-[rgba(139,92,246,0.2)]'),
    ('border-violet-500/20', 'border-[rgba(139,92,246,0.15)]'),

    # ─── AMBER (warning) ───
    ('hover:bg-amber-500/30', 'hover:bg-[rgba(245,158,11,0.2)]'),
    ('hover:bg-amber-500/20', 'hover:bg-[rgba(245,158,11,0.15)]'),
    ('focus:border-amber-500/50', 'focus:border-[rgba(245,158,11,0.3)]'),
    ('focus:ring-amber-500/20', 'focus:ring-[rgba(245,158,11,0.15)]'),
    ('text-amber-400/70', 'text-[var(--warning)]'),
    ('text-amber-400', 'text-[var(--warning)]'),
    ('text-amber-300', 'text-[var(--warning)]'),
    ('bg-amber-500/20', 'bg-[rgba(245,158,11,0.15)]'),
    ('bg-amber-500/10', 'bg-[rgba(245,158,11,0.1)]'),
    ('bg-amber-500/5', 'bg-[rgba(245,158,11,0.05)]'),
    ('border-amber-500/30', 'border-[rgba(245,158,11,0.2)]'),
    ('border-amber-500/20', 'border-[rgba(245,158,11,0.15)]'),

    # ─── ORANGE ───
    ('hover:text-orange-400', 'hover:text-[var(--warning)]'),
    ('text-orange-400', 'text-[var(--warning)]'),
    ('text-orange-300', 'text-[var(--warning)]'),
    ('bg-orange-500/20', 'bg-[rgba(249,115,22,0.15)]'),
    ('bg-orange-500/10', 'bg-[rgba(249,115,22,0.1)]'),
    ('border-orange-500/30', 'border-[rgba(249,115,22,0.2)]'),
    ('border-orange-500/20', 'border-[rgba(249,115,22,0.15)]'),

    # ─── RED (error) ───
    ('hover:bg-red-500/20', 'hover:bg-[rgba(239,68,68,0.15)]'),
    ('hover:bg-red-500/10', 'hover:bg-[rgba(239,68,68,0.1)]'),
    ('text-red-400/60', 'text-[var(--error)]'),
    ('text-red-400', 'text-[var(--error)]'),
    ('text-red-300', 'text-[var(--error)]'),
    ('bg-red-500/20', 'bg-[rgba(239,68,68,0.15)]'),
    ('bg-red-500/10', 'bg-[rgba(239,68,68,0.1)]'),
    ('bg-red-500/5', 'bg-[rgba(239,68,68,0.05)]'),
    ('border-red-500/30', 'border-[rgba(239,68,68,0.2)]'),
    ('border-red-500/20', 'border-[rgba(239,68,68,0.15)]'),
    ('border-red-500/10', 'border-[rgba(239,68,68,0.1)]'),

    # ─── BLUE ───
    ('text-blue-400', 'text-[var(--accent-blue)]'),
    ('bg-blue-500/20', 'bg-[rgba(59,130,246,0.15)]'),
    ('bg-blue-500/10', 'bg-[rgba(59,130,246,0.1)]'),
    ('border-blue-500/30', 'border-[rgba(59,130,246,0.2)]'),

    # ─── INDIGO ───
    ('text-indigo-400', 'text-[var(--accent-indigo)]'),
    ('bg-indigo-500/20', 'bg-[rgba(99,102,241,0.15)]'),
    
    # ─── PURPLE ───
    ('text-purple-400', 'text-[var(--accent-purple)]'),
    ('bg-purple-500/20', 'bg-[rgba(168,85,247,0.15)]'),
    
    # ─── YELLOW ───
    ('text-yellow-400', 'text-[var(--warning)]'),
    ('bg-yellow-500/20', 'bg-[rgba(234,179,8,0.15)]'),
    ('border-yellow-500/30', 'border-[rgba(234,179,8,0.2)]'),
]

files = [
    'frontend/src/app/channels/page.tsx',
    'frontend/src/app/workflows/page.tsx',
    'frontend/src/app/scheduler/page.tsx',
    'frontend/src/app/hands/page.tsx',
]

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for fpath in files:
    full = os.path.join(base, fpath)
    with open(full, 'r') as f:
        content = f.read()
    
    changes = 0
    for old, new in replacements:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            changes += count
    
    with open(full, 'w') as f:
        f.write(content)
    print(f'{fpath}: {changes} replacements')

print('\nDone!')
