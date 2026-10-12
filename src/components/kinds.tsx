import {
  BookOpen,
  Calendar,
  Castle,
  Coins,
  Compass,
  Flame,
  Globe,
  Hourglass,
  Landmark,
  Layers,
  Leaf,
  Library,
  MapPin,
  Palette,
  Quote,
  Route,
  Scroll,
  Shovel,
  Sparkles,
  Swords,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { EntityKind } from '@/shared/types.ts'

export const KIND_ICON: Record<EntityKind, LucideIcon> = {
  article: BookOpen,
  epoch: Hourglass,
  theme: Layers,
  person: User,
  place: MapPin,
  event: Calendar,
  polity: Castle,
  culture: Users,
  term: Quote,
  source: Library,
  region: Globe,
  route: Route,
}

export const THEME_ICON: Record<string, LucideIcon> = {
  landmark: Landmark,
  swords: Swords,
  coins: Coins,
  sparkles: Sparkles,
  users: Users,
  compass: Compass,
  palette: Palette,
  leaf: Leaf,
  flame: Flame,
  shovel: Shovel,
  scroll: Scroll,
}

export function KindIcon({ kind, size = 16, className }: { kind: EntityKind; size?: number; className?: string }) {
  const Icon = KIND_ICON[kind]
  return <Icon size={size} className={className} aria-hidden />
}
