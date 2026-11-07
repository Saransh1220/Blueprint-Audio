export type AdminTab = 'overview' | 'users' | 'specs' | 'orders' | 'licenses' | 'audit';

export interface AdminSection {
  id: AdminTab;
  label: string;
  description: string;
  /** Font Awesome icon class. */
  icon: string;
}

export interface AdminSectionGroup {
  title: string;
  sections: AdminSection[];
}

const OVERVIEW: AdminSection = {
  id: 'overview',
  label: 'Overview',
  description: 'Platform activity at a glance.',
  icon: 'fa-chart-pie',
};

export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  { title: 'Workspace', sections: [OVERVIEW] },
  {
    title: 'Manage',
    sections: [
      {
        id: 'users',
        label: 'Users',
        description: 'Accounts, roles and access.',
        icon: 'fa-users',
      },
      {
        id: 'specs',
        label: 'Catalog',
        description: 'Every beat and sample on the platform.',
        icon: 'fa-compact-disc',
      },
      {
        id: 'orders',
        label: 'Orders',
        description: 'Purchases across all producers.',
        icon: 'fa-bag-shopping',
      },
      {
        id: 'licenses',
        label: 'Licenses',
        description: 'Licenses issued to buyers.',
        icon: 'fa-file-contract',
      },
    ],
  },
  {
    title: 'Security',
    sections: [
      {
        id: 'audit',
        label: 'Audit log',
        description: 'Changes made by administrators.',
        icon: 'fa-clipboard-list',
      },
    ],
  },
];

export const ADMIN_SECTIONS: AdminSection[] = ADMIN_SECTION_GROUPS.flatMap((g) => g.sections);

export function findAdminSection(tab: AdminTab): AdminSection {
  return ADMIN_SECTIONS.find((section) => section.id === tab) ?? OVERVIEW;
}
