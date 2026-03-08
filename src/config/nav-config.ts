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
    title: 'Product',
    url: '/dashboard/product',
    icon: 'product',
    shortcut: ['p', 'p'],
    isActive: false,
    items: []
  },
  {
    title: 'Kanban',
    url: '/dashboard/kanban',
    icon: 'kanban',
    shortcut: ['k', 'k'],
    isActive: false,
    items: []
  },
  {
    title: 'Pro',
    url: '#',
    icon: 'pro',
    isActive: true,
    items: [
      {
        title: 'Exclusive',
        url: '/dashboard/exclusive',
        icon: 'exclusive',
        shortcut: ['m', 'm']
      }
    ]
  },
  {
    title: 'System',
    url: '#',
    icon: 'settings',
    isActive: true,
    items: [
      {
        title: 'Login',
        shortcut: ['l', 'l'],
        url: '/',
        icon: 'login'
      }
    ]
  },
  {
    title: 'Auth Settings',
    url: '#',
    icon: 'auth',
    isActive: true,
    items: [
      {
        title: 'Workspaces',
        url: '/dashboard/auth-settings/workspaces',
        icon: 'workspace',
        shortcut: ['w', 's']
      },
      {
        title: 'Teams',
        url: '/dashboard/auth-settings/workspaces/team',
        icon: 'teams',
        shortcut: ['t', 'm'],
        access: { requireOrg: true }
      },
      {
        title: 'Billing',
        url: '/dashboard/auth-settings/billing',
        icon: 'billing',
        shortcut: ['b', 'b'],
        access: { requireOrg: true }
      },
      {
        title: 'Profile',
        url: '/dashboard/auth-settings/profile',
        icon: 'profile',
        shortcut: ['p', 'r']
      }
    ]
  }
];
