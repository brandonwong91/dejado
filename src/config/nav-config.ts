import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: []
  },
  {
    title: 'Articles',
    url: '/articles',
    icon: 'article',
    shortcut: ['a', 'r'],
    isActive: false,
    items: []
  },
  {
    title: 'Payments',
    url: '/payments',
    icon: 'billing',
    shortcut: ['p', 'y'],
    isActive: false,
    items: []
  },
  {
    title: 'Purchases',
    url: '/purchases',
    icon: 'purchase',
    shortcut: ['p', 'r'],
    isActive: false,
    items: []
  },
  {
    title: 'Workouts',
    url: '/workouts',
    icon: 'workout',
    shortcut: ['w', 'k'],
    isActive: false,
    items: []
  },
  {
    title: 'AI',
    url: '#',
    icon: 'aiFeed',
    isActive: true,
    items: [
      {
        title: 'Feed',
        url: '/ai/feed',
        icon: 'aiFeed',
        shortcut: ['a', 'i']
      },
      {
        title: 'Games',
        url: '/ai/games',
        icon: 'puzzle',
        shortcut: ['a', 'g']
      },
      {
        title: 'Fortune',
        url: '/ai/fortune',
        icon: 'fortune',
        shortcut: ['a', 'f']
      },
      {
        title: 'Your profile',
        url: '/profile/insights',
        icon: 'fingerprint',
        shortcut: ['a', 'y']
      }
    ]
  },
  {
    title: 'Explore',
    url: '/explore',
    icon: 'search',
    shortcut: ['e', 'x'],
    isActive: false,
    items: []
  },
  {
    title: 'Lists',
    url: '/lists',
    icon: 'list',
    shortcut: ['l', 's'],
    isActive: false,
    items: []
  },
  // {
  //   title: 'Product',
  //   url: '/dashboard/product',
  //   icon: 'product',
  //   shortcut: ['p', 'p'],
  //   isActive: false,
  //   items: []
  // },
  // {
  //   title: 'Kanban',
  //   url: '/dashboard/kanban',
  //   icon: 'kanban',
  //   shortcut: ['k', 'k'],
  //   isActive: false,
  //   items: []
  // },
  // {
  //   title: 'Pro',
  //   url: '#',
  //   icon: 'pro',
  //   isActive: true,
  //   items: [
  //     {
  //       title: 'Exclusive',
  //       url: '/dashboard/exclusive',
  //       icon: 'exclusive',
  //       shortcut: ['m', 'm']
  //     }
  //   ]
  // },
  {
    title: 'Auth Settings',
    url: '#',
    icon: 'auth',
    isActive: true,
    items: [
      {
        title: 'Workspaces',
        url: '/auth-settings/workspaces',
        icon: 'workspace',
        shortcut: ['w', 's']
      },
      {
        title: 'Teams',
        url: '/auth-settings/workspaces/team',
        icon: 'teams',
        shortcut: ['t', 'm'],
        access: { requireOrg: true }
      },
      {
        title: 'Billing',
        url: '/auth-settings/billing',
        icon: 'billing',
        shortcut: ['b', 'b'],
        access: { requireOrg: true }
      },
      {
        title: 'Profile',
        url: '/auth-settings/profile',
        icon: 'profile',
        shortcut: ['p', 'r']
      }
    ]
  }
];
