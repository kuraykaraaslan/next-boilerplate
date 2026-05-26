'use client'
import { useState } from 'react'
import { Badge } from '@/modules_next/common/ui/Badge'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShoppingCart, faBars, faMagnifyingGlass, faXmark, faHeart, faUser,
} from '@fortawesome/free-solid-svg-icons'
import type { BlockDefinition } from '../types'

type NavItem = { label?: string; href?: string }

function NavBarCommerce(rawProps: Record<string, unknown>) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  const logoText = (rawProps.logoText as string) || 'Shop'
  const logoAccent = (rawProps.logoAccent as string) || 'Flow'
  const navItems = ((rawProps.navItems as NavItem[]) || []).filter((i) => i?.label)
  const searchEnabled = rawProps.searchEnabled !== false
  const wishlistEnabled = rawProps.wishlistEnabled !== false
  const accountHref = (rawProps.accountHref as string) || '/account'
  const cartHref = (rawProps.cartHref as string) || '/cart'
  const cartCount = Number(rawProps.cartCount) || 0

  return (
    <header className="sticky top-0 z-50 bg-[var(--success-fg)] shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} className="w-5 h-5" aria-hidden="true" />
          </button>

          <a href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-[var(--text-inverse)]">
            {logoText}<span className="text-[var(--warning)]">{logoAccent}</span>
          </a>

          <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Main navigation">
            {navItems.map((item, idx) => (
              <a
                key={`${item.label}-${idx}`}
                href={item.href ?? '#'}
                className="px-3 py-2 rounded text-sm font-medium text-[var(--text-inverse)]/80 hover:text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex-1" />

          {searchEnabled && (
            searchOpen ? (
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="flex flex-1 items-center rounded-lg bg-[var(--text-inverse)] px-3 py-1.5 shadow-inner">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 mr-2" aria-hidden="true" />
                  <input
                    autoFocus
                    type="search"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
                    aria-label="Search products"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-[var(--text-inverse)]/70 hover:text-[var(--text-inverse)] transition-colors"
                  aria-label="Close search"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded text-[var(--text-inverse)]/80 hover:text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
                aria-label="Open search"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} className="w-4 h-4" aria-hidden="true" />
              </button>
            )
          )}

          {wishlistEnabled && (
            <a
              href="/wishlist"
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded text-[var(--text-inverse)]/80 hover:text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
              aria-label="Wishlist"
            >
              <FontAwesomeIcon icon={faHeart} className="w-4 h-4" aria-hidden="true" />
            </a>
          )}

          <a
            href={accountHref}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded text-[var(--text-inverse)]/80 hover:text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
            aria-label="Account"
          >
            <FontAwesomeIcon icon={faUser} className="w-4 h-4" aria-hidden="true" />
          </a>

          <a
            href={cartHref}
            className="relative flex items-center justify-center w-9 h-9 rounded text-[var(--text-inverse)]/80 hover:text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
            aria-label={`Cart, ${cartCount} items`}
          >
            <FontAwesomeIcon icon={faShoppingCart} className="w-4 h-4" aria-hidden="true" />
            {cartCount > 0 && (
              <Badge
                variant="warning"
                size="sm"
                className="absolute -top-1 -right-1 !px-1.5 !py-0 !text-[9px] !min-w-[16px] !h-4 flex items-center justify-center"
              >
                {cartCount}
              </Badge>
            )}
          </a>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[var(--success-fg)] border-t border-[var(--success)]">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item, idx) => (
              <a
                key={`m-${item.label}-${idx}`}
                href={item.href ?? '#'}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded text-sm font-medium text-[var(--text-inverse)] hover:bg-[var(--success)] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

export const NavBarCommerceDefinition: BlockDefinition = {
  type: 'NavBarCommerce',
  label: 'Nav: Commerce',
  description: 'E-commerce header with logo, links, search, wishlist, account and cart badge',
  category: 'Navigation',
  defaultProps: {
    logoText: 'Shop',
    logoAccent: 'Flow',
    searchEnabled: true,
    wishlistEnabled: true,
    accountHref: '/account',
    cartHref: '/cart',
    cartCount: 0,
    navItems: [
      { label: 'Home',     href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Deals',    href: '/deals' },
      { label: 'Orders',   href: '/orders' },
    ],
  },
  schema: {
    logoText:        { label: 'Logo Text',      type: 'text', placeholder: 'Shop' },
    logoAccent:      { label: 'Logo Accent',    type: 'text', placeholder: 'Flow' },
    searchEnabled:   { label: 'Search Bar',     type: 'boolean' },
    wishlistEnabled: { label: 'Wishlist Icon',  type: 'boolean' },
    accountHref:     { label: 'Account URL',    type: 'url',  placeholder: '/account' },
    cartHref:        { label: 'Cart URL',       type: 'url',  placeholder: '/cart' },
    cartCount:       { label: 'Cart Badge Count', type: 'number', min: 0 },
    navItems: {
      label: 'Nav Items',
      type: 'repeater',
      fields: {
        label: { label: 'Label', type: 'text', placeholder: 'Products' },
        href:  { label: 'URL',   type: 'url',  placeholder: '/products' },
      },
    },
  },
  Component: NavBarCommerce as unknown as BlockDefinition['Component'],
}

export default NavBarCommerce
