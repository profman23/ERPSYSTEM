/**
 * StyledIcon — Renders icons based on the active InterfaceStyle
 *
 * - default: renders the Lucide icon as-is
 * - playful: renders an emoji from the mapping (falls back to sparkles)
 * - elegant: renders the Lucide icon with thinner strokes and subtle opacity
 *
 * Usage:
 *   <StyledIcon icon={MapPin} emoji="📍" className="w-5 h-5" />
 *
 * The `emoji` prop is optional — a built-in map covers 100+ icons.
 * For sidebar/page header use, always pass `emoji` for guaranteed correctness.
 */

import { type LucideIcon, type LucideProps } from 'lucide-react';
import { useInterfaceStyle } from '@/contexts/InterfaceStyleContext';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// EMOJI MAP — Maps Lucide icon displayName → emoji
// ═══════════════════════════════════════════════════════════════
const EMOJI_MAP: Record<string, string> = {
  // Navigation
  LayoutDashboard: '📊', Home: '🏠', Menu: '☰', X: '✖️',
  ChevronDown: '▼', ChevronUp: '▲', ChevronLeft: '◀', ChevronRight: '▶',
  ArrowLeft: '⬅️', ArrowRight: '➡️', ArrowUp: '⬆️', ArrowDown: '⬇️',
  ExternalLink: '🔗', MoreHorizontal: '•••', MoreVertical: '⋮',
  PanelLeftClose: '◀️', PanelLeftOpen: '▶️',

  // Actions
  Plus: '➕', Minus: '➖', Edit: '✏️', Edit2: '✏️', Edit3: '✏️', Pencil: '✏️',
  Trash: '🗑️', Trash2: '🗑️', Save: '💾', Check: '✅',
  Copy: '📋', Download: '⬇️', Upload: '⬆️', Search: '🔍',
  Filter: '🔽', RefreshCw: '🔄', RotateCw: '🔄',
  Settings: '⚙️', Settings2: '⚙️', Sliders: '🎚️', SlidersHorizontal: '🎚️',
  Eye: '👁️', EyeOff: '🙈', Lock: '🔒', Unlock: '🔓',
  LogIn: '🔑', LogOut: '🚪', Maximize: '🔲', Minimize: '🔳',

  // Status
  AlertCircle: '⚠️', AlertTriangle: '⚠️', CheckCircle: '✅', CheckCircle2: '✅',
  Info: '💡', XCircle: '❌', HelpCircle: '❓',
  Loader2: '⏳', Clock: '🕐', Timer: '⏱️', History: '📜',

  // Users & Auth
  User: '👤', Users: '👥', UserPlus: '👤', UserMinus: '👤',
  UserCheck: '👤', UserX: '👤', UserCog: '⚙️',
  Shield: '🛡️', ShieldCheck: '🛡️', ShieldAlert: '🛡️',
  Key: '🔑', Fingerprint: '👆',

  // Data & Files
  Database: '🗃️', Server: '🖥️', HardDrive: '💽',
  FileText: '📄', File: '📄', Files: '📄',
  Folder: '📁', FolderOpen: '📂', FolderPlus: '📁',
  Image: '🖼️', FileImage: '🖼️', Paperclip: '📎',

  // Business
  Building: '🏗️', Building2: '🏢', Briefcase: '💼',
  CreditCard: '💳', DollarSign: '💲',
  TrendingUp: '📈', TrendingDown: '📉',
  BarChart: '📊', BarChart2: '📊', BarChart3: '📊', PieChart: '🥧', LineChart: '📈',
  Activity: '📈', Wallet: '👛', Receipt: '🧾',
  ShoppingCart: '🛒', ShoppingBag: '🛍️', Package: '📦',
  Truck: '🚚', Box: '📦',

  // Communication
  Mail: '📧', Phone: '📱', MessageSquare: '💬', MessageCircle: '💬',
  Send: '📤', Bell: '🔔', BellOff: '🔕', BellRing: '🔔',
  Inbox: '📥', AtSign: '📧',

  // Theme & Display
  Sun: '☀️', Moon: '🌙', Monitor: '🖥️', Laptop: '💻',
  Smartphone: '📱', Tablet: '📱', Palette: '🎨', Paintbrush: '🖌️',

  // Layout
  LayoutGrid: '📐', LayoutList: '📋', Columns: '📊',
  Grid: '📐', List: '📋', Table: '📊', Table2: '📊', Kanban: '📋',

  // Location & Maps
  Globe: '🌍', Globe2: '🌍', Map: '🗺️', MapPin: '📍',
  Navigation: '🧭', Compass: '🧭',

  // Calendar & Time
  Calendar: '📅', CalendarDays: '📅', CalendarCheck: '📅',
  CalendarX: '📅', CalendarPlus: '📅',

  // Misc
  Star: '⭐', Heart: '❤️', Bookmark: '🔖', Flag: '🚩',
  Tag: '🏷️', Tags: '🏷️', Hash: '#️⃣', Link: '🔗', Link2: '🔗',
  Zap: '⚡', Sparkles: '✨', Flame: '🔥', Target: '🎯',
  Award: '🏆', Gift: '🎁', Crown: '👑', Lightbulb: '💡',
  Puzzle: '🧩', Cog: '⚙️', Wrench: '🔧', Terminal: '💻',
  Code: '💻', Code2: '💻', Bug: '🐛',
  GitBranch: '🌿', GitCommit: '📌', GitMerge: '🔀', GitPullRequest: '📥',
  Cloud: '☁️', CloudUpload: '☁️', CloudDownload: '☁️', CloudOff: '☁️',
  Power: '⚡', PowerOff: '⚡', Plug: '🔌',
  Printer: '🖨️', QrCode: '📱', Scan: '📷',
  GripVertical: '⠿', GripHorizontal: '⠿', Grip: '⠿',
  Layers: '📚', Layers2: '📚', Layers3: '📚',
  Type: '🔤', Contact: '📇',
};

// ═══════════════════════════════════════════════════════════════
// STYLED ICON COMPONENT
// ═══════════════════════════════════════════════════════════════

interface StyledIconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
  /** Override emoji for playful mode */
  emoji?: string;
}

/**
 * Extracts width in pixels from Tailwind class like "w-5" → 20, "w-8" → 32
 */
function extractSizePx(className?: string, fallback = 20): number {
  if (!className) return fallback;
  const match = className.match(/\bw-(\d+(?:\.\d+)?)\b/);
  if (match) return parseFloat(match[1]) * 4;
  return fallback;
}

export function StyledIcon({
  icon: LucideIconComponent,
  emoji,
  className,
  style: inlineStyle,
  ...props
}: StyledIconProps) {
  const { interfaceStyle } = useInterfaceStyle();

  if (interfaceStyle === 'playful') {
    const iconName = LucideIconComponent.displayName || '';
    const emojiChar = emoji || EMOJI_MAP[iconName] || '✨';
    const sizePx = extractSizePx(className, (props.size as number) || 20);

    return (
      <span
        className={cn('inline-flex items-center justify-center leading-none select-none flex-shrink-0')}
        style={{
          fontSize: `${sizePx * 0.85}px`,
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          lineHeight: 1,
          overflow: 'visible',
          ...inlineStyle,
        }}
        role="img"
        aria-label={iconName}
      >
        {emojiChar}
      </span>
    );
  }

  if (interfaceStyle === 'elegant') {
    return (
      <LucideIconComponent
        className={cn(className)}
        strokeWidth={1.25}
        style={{ ...inlineStyle }}
        {...props}
      />
    );
  }

  // Default — standard Lucide
  return <LucideIconComponent className={className} style={inlineStyle} {...props} />;
}

export default StyledIcon;
