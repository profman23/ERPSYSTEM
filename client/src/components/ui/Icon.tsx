/**
 * Icon Component - Lucide Icons Wrapper
 *
 * Provides standardized icon sizing and common icon exports
 *
 * Usage:
 * import { Icon, HomeIcon, UsersIcon } from '@/components/ui/Icon';
 *
 * <Icon icon={Home} size="md" />
 * <HomeIcon className="text-primary" />
 */

import { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: IconSize;
}

// ═══════════════════════════════════════════════════════════════
// SIZE MAP
// ═══════════════════════════════════════════════════════════════
const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,   // Default
  lg: 24,
  xl: 32,
  '2xl': 40,
};

const sizeClassMap: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
};

// ═══════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════
export function Icon({
  icon: LucideIcon,
  size = 'md',
  className,
  ...props
}: IconProps) {
  return (
    <LucideIcon
      size={sizeMap[size]}
      className={cn(sizeClassMap[size], className)}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMON ICON RE-EXPORTS
// For convenience, re-export commonly used icons
// ═══════════════════════════════════════════════════════════════
export {
  // Navigation
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MoreHorizontal,
  MoreVertical,

  // Actions
  Plus,
  Minus,
  Edit,
  Edit2,
  Edit3,
  Pencil,
  Trash,
  Trash2,
  Save,
  Check,
  Copy,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  RotateCw,
  Settings,
  Settings2,
  Sliders,
  SlidersHorizontal,
  Maximize,
  Minimize,
  Expand,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  LogIn,
  LogOut,

  // Status
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Info,
  XCircle,
  HelpCircle,
  Loader2,
  Clock,
  Timer,
  History,

  // Users & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Fingerprint,

  // Data & Files
  Database,
  Server,
  HardDrive,
  FileText,
  File,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Image,
  FileImage,
  Paperclip,

  // Business
  Building,
  Building2,
  Briefcase,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart,
  BarChart2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Wallet,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  Package,
  Truck,
  Box,

  // Communication
  Mail,
  Phone,
  MessageSquare,
  MessageCircle,
  Send,
  Bell,
  BellOff,
  BellRing,
  Inbox,
  AtSign,

  // Theme & Display
  Sun,
  Moon,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Palette,
  Paintbrush,

  // Layout
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Columns,
  Rows,
  Grid,
  List,
  Table,
  Table2,
  Kanban,

  // Media
  Play,
  Pause,
  Stop,
  SkipBack,
  SkipForward,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  Image as ImageIcon,

  // Location & Maps
  Globe,
  Globe2,
  Map,
  MapPin,
  Navigation,
  Compass,

  // Calendar & Time
  Calendar,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  CalendarPlus,

  // Misc
  Star,
  Heart,
  Bookmark,
  Flag,
  Tag,
  Tags,
  Hash,
  Link,
  Link2,
  Unlink,
  Zap,
  Sparkles,
  Flame,
  Target,
  Award,
  Gift,
  Crown,
  Lightbulb,
  Puzzle,
  Cog,
  Wrench,
  Terminal,
  Code,
  Code2,
  Braces,
  Bug,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Github,
  Gitlab,
  Cloud,
  CloudUpload,
  CloudDownload,
  CloudOff,
  Wifi,
  WifiOff,
  Bluetooth,
  Battery,
  BatteryLow,
  BatteryFull,
  Power,
  PowerOff,
  Plug,
  Printer,
  QrCode,
  Scan,
  ScanLine,
  Maximize2,
  Minimize2,
  Move,
  GripVertical,
  GripHorizontal,
  Grip,
  LayoutTemplate,
  Layers,
  Layers2,
  Layers3,
} from 'lucide-react';

export default Icon;
