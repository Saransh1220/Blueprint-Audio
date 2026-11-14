import { isFeatureAvailable } from '../../core/config/feature-availability';

export type NavTint = 'hot' | 'cobalt' | 'lime' | 'sun' | 'lavender' | 'cream';

export interface NavMenuItem {
  label: string;
  description: string;
  /** A Font Awesome icon class, e.g. `fa-compass`. */
  icon: string;
  route: string;
  tint: NavTint;
  /** Only shown to producers. */
  producerOnly?: boolean;
}

export const BROWSE_ITEMS: readonly NavMenuItem[] = [
  {
    label: 'Explore',
    description: 'Beats and producers',
    icon: 'fa-compass',
    route: '/explore',
    tint: 'cobalt',
  },
  {
    label: 'Loops',
    description: 'Loops for your next track',
    icon: 'fa-repeat',
    route: '/loops',
    tint: 'lime',
  },
  {
    label: 'Sample packs',
    description: 'Curated sound collections',
    icon: 'fa-layer-group',
    route: '/sample-packs',
    tint: 'sun',
  },
  {
    label: 'Battles',
    description: 'Head-to-head drops',
    icon: 'fa-bolt',
    route: '/battles',
    tint: 'hot',
  },
  {
    label: 'Creator tools',
    description: 'Visualizers and more',
    icon: 'fa-wand-magic-sparkles',
    route: '/creator-tools',
    tint: 'lavender',
    producerOnly: true,
  },
];

export const STUDIO_ITEMS: readonly NavMenuItem[] = [
  {
    label: 'Overview',
    description: 'Studio at a glance',
    icon: 'fa-table-cells-large',
    route: '/studio/overview',
    tint: 'hot',
    producerOnly: true,
  },
  {
    label: 'Analytics',
    description: 'Plays and revenue trends',
    icon: 'fa-chart-simple',
    route: '/studio/analytics',
    tint: 'cobalt',
    producerOnly: true,
  },
  {
    label: 'My tracks',
    description: 'Your catalog',
    icon: 'fa-compact-disc',
    route: '/studio/tracks',
    tint: 'lime',
    producerOnly: true,
  },
  {
    label: 'Orders',
    description: 'Incoming sales',
    icon: 'fa-bag-shopping',
    route: '/studio/orders',
    tint: 'sun',
    producerOnly: true,
  },
  {
    label: 'Purchases',
    description: "Beats you've bought",
    icon: 'fa-download',
    route: '/studio/purchases',
    tint: 'lavender',
  },
  {
    label: 'Earnings',
    description: 'Payouts and balances',
    icon: 'fa-coins',
    route: '/studio/earnings',
    tint: 'cream',
    producerOnly: true,
  },
  {
    label: 'Messages',
    description: 'Inbox and buyers',
    icon: 'fa-comment',
    route: '/studio/messages',
    tint: 'cream',
  },
  {
    label: 'Profile',
    description: 'Your public page',
    icon: 'fa-user',
    route: '/studio/profile',
    tint: 'cream',
  },
];

/** The items a person can see: producers get everything, everyone else the shared ones. */
export function menuItemsFor(
  items: readonly NavMenuItem[],
  isProducer: boolean,
): readonly NavMenuItem[] {
  return items.filter(
    (item) => isFeatureAvailable(item.route) && (isProducer || !item.producerOnly),
  );
}
