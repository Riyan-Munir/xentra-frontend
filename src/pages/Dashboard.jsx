import React, { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { AlertCircle, CheckCircle, Clock, Info, LogOut, ShieldAlert, Menu } from 'lucide-react';
import { profileService } from '../services/profileService';
import { guildService } from '../services/guildService';
import { checkPendingHacking, dismissHacking, captchaVerify, fetchCaptchaChallenge } from '../services/api';

// Common Components (always needed, eager)
import Sidebar from '../components/dashboard/common/Sidebar';
import RoleSwitcher from '../components/dashboard/common/RoleSwitcher';
import Skeleton from '../components/common/Skeleton';
import CaptchaChallenge from '../components/dashboard/common/CaptchaChallenge';

// Lazy-loaded section components, each is a separate chunk loaded on demand
const ClientOverview = lazy(() => import('../components/dashboard/client/Overview'));
const ClientSettings = lazy(() => import('../components/dashboard/client/ProfileSettings'));
const ClientJobs = lazy(() => import('../components/dashboard/client/Jobs'));

const FreelancerOverview = lazy(() => import('../components/dashboard/freelancer/Overview'));
const FreelancerSettings = lazy(() => import('../components/dashboard/freelancer/ProfileSettings'));
const FreelancerPortfolio = lazy(() => import('../components/dashboard/freelancer/FreelancerPortfolio'));
const FreelancerApplications = lazy(() => import('../components/dashboard/freelancer/Applications'));

const AdminOverview = lazy(() => import('../components/dashboard/server_admin/Overview'));
const AdminSettings = lazy(() => import('../components/dashboard/server_admin/ProfileSettings'));
const AdminConfigure = lazy(() => import('../components/dashboard/server_admin/Configure'));

const ChatRooms = lazy(() => import('../components/dashboard/common/ChatRoom'));
const Wallets = lazy(() => import('../components/dashboard/common/Wallets'));
const Premium = lazy(() => import('../components/dashboard/common/Premium'));

/* ============================================================
   Section-Specific Constant Skeletons
   Each matches the structure/layout of its real section component.
   These are used for BOTH Suspense fallback AND isSectionLoading.
   ============================================================ */

/* ─── Overview Skeleton (client / freelancer) ─────────────────────
   Matches RoleOverview layout:
     layout-middle → RoleProfile + stats-grid-right (2×2)
     layout-bottom → scrollable-content-card with centered empty state
   ──────────────────────────────────────────────────────────────── */
const overviewSkeleton = () => (
  <div className="fade-in flex-col gap-20">
    <div className="layout-middle">
      <div className="profile-card-horizontal flex-1">
        <div className="skeleton-profile-avatar" />
        <div className="profile-info-horizontal">
          <div className="profile-header-row">
            <div className="skeleton-line skeleton-profile-username" />
            <div className="skeleton-line skeleton-profile-status" />
          </div>
          <div className="level-meta-row">
            <div className="skeleton-line skeleton-profile-level-tag" />
            <div className="skeleton-line skeleton-profile-tier-tag" />
          </div>
          <div className="exp-row-container">
            <div className="exp-bar-compact">
              <div className="skeleton-line skeleton-profile-exp-fill" />
            </div>
            <div className="skeleton-line skeleton-profile-exp-text" />
          </div>
        </div>
      </div>
      <div className="stats-grid-right">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="compact-stat-card">
            <Skeleton template="stat" />
          </div>
        ))}
      </div>
    </div>
    <div className="layout-bottom">
      <div className="scrollable-content-card flex-col">
        <div className="skeleton-line skel-w-60pct skel-h-20 skel-r-4 mb-20" />
        <div className="flex-1 flex-col flex-center opacity-50 py-40">
          <div className="skeleton-bottom-icon" />
          <div className="skeleton-bottom-text" />
        </div>
      </div>
    </div>
  </div>
);

/* ─── Settings Skeleton (all roles) ──────────────────────────────
   Matches settings-grid → card(s) with form-header-row + form-group
   cardCount: 3 for client/freelancer, 1 for server_admin
   ──────────────────────────────────────────────────────────────── */
const settingsSkeleton = (cardCount = 3) => (
  <div className="fade-in settings-grid">
    {Array.from({ length: cardCount }, (_, i) => (
      <div key={i} className="card">
        <div className="form-header-row">
          <Skeleton template="text" lines={1} />
          {(i === 0 || i === 1) && <Skeleton template="text" lines={1} />}
        </div>
        <div className="form-group skeleton-setting-grid">
          <Skeleton template="form" />
        </div>
      </div>
    ))}
    {cardCount === 1 && <div></div>}
  </div>
);

/* ─── Portfolio Skeleton (freelancer) ────────────────────────────
   Matches FreelancerPortfolio layout:
     layout-bottom → scrollable-content-card → p-24 flex-col
       header: title + field tag + edit button
       skills: "My Expertises" + skill tag pills
       projects: horizontal-scroll project cards (320px min-width, 160px image)
   ──────────────────────────────────────────────────────────────── */
const portfolioSkeleton = () => (
  <div className="layout-bottom flex-1 minh-0 flex-col pos-relative skeleton-portfolio-wrapper portfolio-wrapper mx-auto">
    <div className="scrollable-content-card hide-scrollbar pos-relative flex-1 overflow-y-auto">
      <div className="p-24 flex-col pb-40">

        {/* Header: title + field tag + edit button */}
        <div className="mb-40">
          <div className="flex-between items-flex-start">
            <div className="flex-1">
              <div className="flex-row items-center gap-12 flex-wrap mb-20">
                <div className="skeleton-line skel-w-60pct skel-h-32 skel-r-4" />
                <div className="skeleton-skill-tag" />
              </div>
            </div>
            <div className="skeleton-line skel-w-120 skel-h-24 skel-r-8" />
          </div>
          <div className="skeleton-line mt-16 mb-16 skel-w-70pct skel-h-14 skel-r-4" />
          <div className="skeleton-line skel-w-45pct skel-h-14 skel-r-4" />
        </div>

        {/* Skills section */}
        <div className="mb-32">
          <div className="skeleton-line mb-12 skel-w-100 skel-h-12 skel-r-4" />
          <div className="flex-row flex-wrap gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-skill-tag skeleton-line" />
            ))}
          </div>
        </div>

        {/* Projects section */}
        <div className="flex-col">
          <div className="flex-between mb-20">
            <div className="skeleton-line skel-w-120 skel-h-12 skel-r-4" />
          </div>
          <div className="project-hscroll-container">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-project-card">
                <div className="skeleton-project-image skeleton-line" />
                <div className="p-16 flex-1 flex-col gap-8">
                  <div className="skeleton-line skel-w-60pct skel-h-16 skel-r-4" />
                  <div className="skeleton-line skel-w-90pct skel-h-12 skel-r-4" />
                  <div className="skeleton-line skel-w-70pct skel-h-12 skel-r-4" />
                  <div className="flex-row flex-wrap gap-4 mb-12 mt-4">
                    <div className="skeleton-line skel-w-40 skel-h-18 skel-r-4" />
                    <div className="skeleton-line skel-w-50 skel-h-18 skel-r-4" />
                  </div>
                  <div className="skeleton-line skel-w-full skel-h-24 skel-r-8" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </div>
);

/* ─── Applications Skeleton (freelancer) ─────────────────────────
   Matches Applications layout:
     flex-col → header + limit card + grid of browse-fixed-panels
     browse-fixed-panel (480px) → scrollable-content-card → filter bar + listings
   ──────────────────────────────────────────────────────────────── */
const applicationsSkeleton = () => (
  <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar skeleton-section-scroll">

    {/* Header */}
    <div className="flex-between flex-shrink-0">
      <div className="skeleton-line skel-w-160 skel-h-28 skel-r-4" />
    </div>

    {/* Application Limit card */}
    <div className="grid gap-20 flex-shrink-0 skeleton-grid-single">
      <div className="glass flex-col gap-16 p-20">
        <div className="flex-between items-flex-start">
          <div className="flex-col gap-4">
            <div className="skeleton-line skel-w-120 skel-h-14 skel-r-4" />
            <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
          </div>
          <div className="skeleton-line skel-w-40 skel-h-24 skel-r-4" />
        </div>
        <div className="skeleton-limit-bar-track">
          <div className="skeleton-limit-bar-fill" />
        </div>
        <div className="flex-between">
          <div className="skeleton-line skel-w-60 skel-h-12 skel-r-4" />
          <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
        </div>
      </div>
    </div>

    {/* Two browse-fixed-panels side by side */}
    <div className="grid gap-20 minh-0 skeleton-grid-single">
      <div className="browse-fixed-panel">
        <div className="scrollable-content-card">
          <div className="flex-between mb-16 flex-shrink-0">
            <div className="skeleton-line skel-w-160 skel-h-18 skel-r-4" />
            <div className="flex-row gap-8">
              <div className="skeleton-line skel-w-60 skel-h-24 skel-r-8" />
              <div className="skeleton-line skel-w-70 skel-h-24 skel-r-8" />
            </div>
          </div>
          <div className="flex-col gap-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-listing-row">
                <div className="skeleton-listing-icon skeleton-line" />
                <div className="flex-1 flex-col gap-4">
                  <div className="skeleton-line skel-w-45pct skel-h-14 skel-r-4" />
                  <div className="flex-row gap-8">
                    <div className="skeleton-line skel-w-70 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-50 skel-h-12 skel-r-4" />
                  </div>
                </div>
                <div className="skeleton-line skel-w-60 skel-h-24 skel-r-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="browse-fixed-panel">
        <div className="scrollable-content-card">
          <div className="skeleton-line mb-16 skel-w-140 skel-h-18 skel-r-4" />
          <div className="flex-col gap-12">
            {[1, 2].map(i => (
              <div key={i} className="skeleton-listing-row">
                <div className="skeleton-listing-icon skeleton-line" />
                <div className="flex-1 flex-col gap-4">
                  <div className="skeleton-line skel-w-40pct skel-h-14 skel-r-4" />
                  <div className="flex-row gap-8">
                    <div className="skeleton-line skel-w-60 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
                  </div>
                </div>
                <div className="skeleton-line skel-w-60 skel-h-24 skel-r-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

  </div>
);

/* ─── Jobs Skeleton (client) ─────────────────────────────────────
   Matches Jobs layout:
     flex-col → header + limit card + grid of jobs-fixed-panels
     jobs-fixed-panel (420px) → scrollable-content-card → listings
   ──────────────────────────────────────────────────────────────── */
const jobsSkeleton = () => (
  <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar skeleton-section-scroll">

    {/* Header */}
    <div className="flex-between flex-shrink-0">
      <div className="skeleton-line skel-w-140 skel-h-28 skel-r-4" />
      <div className="skeleton-line skel-w-120 skel-h-24 skel-r-8" />
    </div>

    {/* Job Posting Limit card */}
    <div className="grid gap-20 flex-shrink-0 skeleton-grid-single">
      <div className="glass flex-col gap-16 p-20">
        <div className="flex-between items-flex-start">
          <div className="flex-col gap-4">
            <div className="skeleton-line skel-w-100 skel-h-14 skel-r-4" />
            <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
          </div>
          <div className="skeleton-line skel-w-40 skel-h-24 skel-r-4" />
        </div>
        <div className="skeleton-limit-bar-track">
          <div className="skeleton-limit-bar-fill" />
        </div>
        <div className="flex-between">
          <div className="skeleton-line skel-w-60 skel-h-12 skel-r-4" />
          <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
        </div>
      </div>
    </div>

    {/* Two jobs-fixed-panels */}
    <div className="grid gap-20 skeleton-grid-single">

      {/* Active Listings */}
      <div className="jobs-fixed-panel">
        <div className="scrollable-content-card">
          <div className="skeleton-line mb-16 skel-w-120 skel-h-18 skel-r-4" />
          <div className="flex-col gap-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-listing-row">
                <div className="skeleton-listing-icon skeleton-line" />
                <div className="flex-1 flex-col gap-4">
                  <div className="flex-row items-center gap-8">
                    <div className="skeleton-line skel-w-40pct skel-h-14 skel-r-4" />
                    <div className="skeleton-line skel-w-50 skel-h-18 skel-r-4" />
                  </div>
                  <div className="flex-row gap-8">
                    <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-60 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-70 skel-h-12 skel-r-4" />
                  </div>
                </div>
                <div className="skeleton-line skel-w-50 skel-h-24 skel-r-6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Freelancer Applications */}
      <div className="jobs-fixed-panel">
        <div className="scrollable-content-card">
          <div className="flex-between mb-16 flex-shrink-0">
            <div className="skeleton-line skel-w-160 skel-h-18 skel-r-4" />
            <div className="skeleton-line skel-w-120 skel-h-24 skel-r-8" />
          </div>
          <div className="flex-col gap-12">
            {[1, 2].map(i => (
              <div key={i} className="skeleton-listing-row">
                <div className="skeleton-listing-icon skeleton-line" />
                <div className="flex-1 flex-col gap-4">
                  <div className="flex-row items-center gap-8">
                    <div className="skeleton-line skel-w-35pct skel-h-14 skel-r-4" />
                    <div className="skeleton-line skel-w-60 skel-h-18 skel-r-4" />
                  </div>
                  <div className="flex-row gap-8">
                    <div className="skeleton-line skel-w-70 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-50 skel-h-12 skel-r-4" />
                    <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4" />
                  </div>
                </div>
                <div className="flex-row gap-8">
                  <div className="skeleton-line skel-w-55 skel-h-24 skel-r-6" />
                  <div className="skeleton-line skel-w-70 skel-h-24 skel-r-6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>

  </div>
);

/* ─── Admin Overview Skeleton ────────────────────────────────────
   Matches server_admin/Overview layout:
     layout-middle → AdminProfile + stats-grid-right (2×2)
     layout-bottom → scrollable-content-card → server-section-header + server-card-grid
   ──────────────────────────────────────────────────────────────── */
const adminOverviewSkeleton = () => (
  <div className="fade-in flex-col gap-20">
    <div className="layout-middle">
      <div className="profile-card-horizontal flex-1">
        <div className="skeleton-profile-avatar" />
        <div className="profile-info-horizontal">
          <div className="profile-header-row">
            <div className="skeleton-line skeleton-profile-username" />
            <div className="skeleton-line skeleton-profile-status" />
          </div>
          <div className="level-meta-row">
            <div className="skeleton-line skeleton-profile-level-tag" />
          </div>
        </div>
      </div>
      <div className="stats-grid-right">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="compact-stat-card">
            <Skeleton template="stat" />
          </div>
        ))}
      </div>
    </div>
    <div className="layout-bottom">
      <div className="scrollable-content-card">
        {/* Server section header */}
        <div className="skeleton-server-header">
          <div className="flex-row items-center gap-8">
            <Skeleton template="circle" />
            <div className="skeleton-line skel-w-140 skel-h-18 skel-r-4" />
          </div>
          <div className="skeleton-line skel-w-80 skel-h-24 skel-r-6" />
        </div>
        <div className="server-card-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card server-card">
              <div className="server-card-row">
                <Skeleton template="circle" />
                <div className="flex-1">
                  <Skeleton template="text" lines={2} />
                </div>
              </div>
              <div className="server-card-actions flex-row gap-8">
                <div className="skeleton-line skel-w-80 skel-h-24 skel-r-6" />
                <div className="skeleton-line skel-w-40 skel-h-24 skel-r-6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Configure Skeleton (server_admin) ──────────────────────────
   Matches Configure layout:
     settings-grid → card (Server Configuration) + card glass (Server Isolation)
   ──────────────────────────────────────────────────────────────── */
const configureSkeleton = () => (
  <div className="fade-in settings-grid">
    <div className="card">
      <div className="form-header-row">
        <div className="skeleton-line skel-w-140 skel-h-18 skel-r-4" />
        <Skeleton template="circle" />
      </div>
      <div className="form-group skeleton-setting-grid">
        <Skeleton template="form" />
      </div>
      <div className="form-group skeleton-setting-grid">
        <Skeleton template="form" />
      </div>
    </div>
    <div className="card glass flex-col flex-center text-center opacity-80 p-24">
      <Skeleton template="circle" />
      <div className="mt-16">
        <div className="skeleton-line skel-w-100 skel-h-14 skel-r-4 mx-auto" />
      </div>
      <div className="mt-8">
        <div className="skeleton-line skel-w-80 skel-h-12 skel-r-4 mx-auto" />
      </div>
    </div>
  </div>
);

const chatroomsSkeleton = () => (
  <div className="fade-in skel-chat-container" style={{
    height: 'calc(100vh - 80px)',
    maxHeight: 900,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  }}>
    {/* Header, matches .chatHeader exactly: min-height 52px, padding 12px 16px */}
    <div className="flex-row items-center gap-12" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, minHeight: 52, background: 'rgba(17,24,39,0.6)' }}>
      {/* Hamburger skeleton, hidden on desktop via CSS, visible on mobile */}
      <div className="skel-hamburger skeleton-line" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="skeleton-line" style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton-line" style={{ width: 80, height: 10, borderRadius: 4 }} />
      </div>
      <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
    </div>
    {/* Body, flex row, side menu + chat area */}
    <div className="flex-row" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Side menu, matches .sideMenu: width 280px, always visible on desktop */}
      <div className="skel-side-menu" style={{
        width: 280,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'rgba(17,24,39,0.85)',
      }}>
        <div className="flex-row items-center justify-between" style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="skeleton-line" style={{ width: 60, height: 14, borderRadius: 4 }} />
          <div className="skeleton-line" style={{ width: 24, height: 24, borderRadius: 6 }} />
        </div>
        <div className="flex-row gap-8" style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="skeleton-line" style={{ flex: 1, height: 32, borderRadius: 6 }} />
          <div className="skeleton-line" style={{ flex: 1, height: 32, borderRadius: 6 }} />
        </div>
        <div style={{ flex: 1, padding: '8px 0', overflow: 'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-row items-center gap-12" style={{ padding: '12px 16px' }}>
              <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="skeleton-line" style={{ height: 12, borderRadius: 4, marginBottom: 6, width: `${55 + (i % 3) * 12}%` }} />
                <div className="skeleton-line" style={{ height: 10, borderRadius: 4, width: `${35 + (i % 2) * 15}%` }} />
              </div>
              <div className="skeleton-line" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
      {/* Chat area, messages start from top, no gap after header */}
      <div className="flex-1" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {[
          { minW: 180, maxW: '55%', right: false },
          { minW: 200, maxW: '50%', right: true },
          { minW: 160, maxW: '45%', right: false },
          { minW: 190, maxW: '48%', right: true },
          { minW: 170, maxW: '50%', right: false },
          { minW: 175, maxW: '52%', right: false },
          { minW: 195, maxW: '47%', right: true },
          { minW: 185, maxW: '50%', right: true },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '75%', marginLeft: r.right ? 'auto' : undefined, flexShrink: 0 }}>
            {!r.right && <div className="skeleton-line" style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '50%', flexShrink: 0 }} />}
            <div className="skeleton-line" style={{ height: 48, minWidth: r.minW, maxWidth: r.maxW, borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 12px', flexShrink: 1 }}>
              <div className="skeleton-line" style={{ height: 10, width: '85%', borderRadius: 4 }} />
              <div className="skeleton-line" style={{ height: 10, width: '55%', borderRadius: 4 }} />
            </div>
            {r.right && <div className="skeleton-line" style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '50%', flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Returns the correct constant skeleton for the given section and role */
const premiumSkeleton = () => (
  <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar skeleton-section-scroll">

    {/* Header — matches other section skeletons (no icon, single title line + button) */}
    <div className="flex-between flex-shrink-0">
      <div className="skeleton-line skel-w-140 skel-h-28 skel-r-4" />
      <div className="skeleton-line skel-w-90 skel-h-28 skel-r-8" />
    </div>

    {/* Cards grid skeleton — shorter than real cards, no premium styles */}
    <div className="premium-cards-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="premium-skeleton-card">
          <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: '35%', height: 16, marginBottom: 6 }} />
          <div className="skeleton-line" style={{ width: '40%', height: 22, marginBottom: 10 }} />
          <div className="skeleton-text-block" style={{ gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="skeleton-line" style={{ width: `${60 + j * 5}%`, height: 10 }} />
            ))}
          </div>
          <div className="skeleton-line" style={{ width: '100%', height: 32, borderRadius: 8 }} />
        </div>
      ))}
    </div>

    {/* Chart skeleton — matches premium-chart-container fixed height */}
    <div className="skeleton-card" style={{ minHeight: 320, maxHeight: 380, padding: 16 }}>
      <div className="skeleton-line skel-w-160 skel-h-16 mb-16" />
      {[1, 2, 3, 4, 5, 6].map((j) => (
        <div key={j} className="flex-between mb-8">
          <div className="skeleton-line" style={{ width: '50%', height: 14 }} />
          <div className="skeleton-line" style={{ width: 24, height: 14, borderRadius: 4 }} />
          <div className="skeleton-line" style={{ width: 24, height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  </div>
);

const walletsSkeleton = () => (
  <div className="fade-in flex-col gap-20 flex-1 minh-0 overflow-y-auto hide-scrollbar skeleton-section-scroll">

    {/* Header */}
    <div className="flex-between flex-shrink-0">
      <div className="skeleton-line skel-w-140 skel-h-28 skel-r-4" />
      <div className="skeleton-line skel-w-120 skel-h-24 skel-r-8" />
    </div>

    {/* wallets-fixed-panel with 2 ATM-card-sized skeletons */}
    <div className="wallets-fixed-panel">
      <div className="scrollable-content-card">
        <div className="wallet-grid">
          {[1, 2].map(i => (
            <div key={i} className="wallet-card wallet-card--verified wallet-card-animate"
              style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
              <div className="wallet-card-inner">
                {/* Top row: chip + logo */}
                <div className="flex-between items-flex-start">
                  <div className="flex-row items-center gap-8">
                    <div className="skeleton-line" style={{ width: 36, height: 28, borderRadius: 6 }} />
                    <div className="skeleton-line" style={{ width: 60, height: 12, borderRadius: 4 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: 70, height: 20, borderRadius: 6 }} />
                </div>
                {/* Address */}
                <div className="mt-16">
                  <div className="skeleton-line" style={{ width: 240, height: 16, borderRadius: 4 }} />
                </div>
                {/* Divider */}
                <div className="wallet-card-divider" />
                {/* Footer */}
                <div className="flex-between">
                  <div className="flex-col gap-4">
                    <div className="skeleton-line" style={{ width: 100, height: 12, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 80, height: 10, borderRadius: 4 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: 60, height: 14, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

  </div>
);

const getSectionSkeleton = (section, role) => {
  if (section === 'overview') {
    return role === 'server_admin' ? adminOverviewSkeleton() : overviewSkeleton();
  }
  if (section === 'settings') {
    const cardCount = role === 'server_admin' ? 1 : 4;
    return settingsSkeleton(cardCount);
  }
  if (section === 'portfolio') return portfolioSkeleton();
  if (section === 'applications') return applicationsSkeleton();
  if (section === 'jobs') return jobsSkeleton();
  if (section === 'wallets') return walletsSkeleton();
  if (section === 'configure') return configureSkeleton();
  if (section === 'chatrooms') return chatroomsSkeleton();
  if (section === 'premium') return premiumSkeleton();
  return overviewSkeleton();
};

// Toast component extracted, defined outside Dashboard to avoid re-creation
const Toast = React.memo(({ message, type = 'error', forceVanish, onRemove }) => {
  const [isVanishing, setIsVanishing] = useState(false);

  useEffect(() => {
    if (forceVanish) {
      setIsVanishing(true);
      const timer = setTimeout(onRemove, 800);
      return () => clearTimeout(timer);
    }
  }, [forceVanish, onRemove]);

  useEffect(() => {
    if (!isVanishing) {
      const timer = setTimeout(() => setIsVanishing(true), 1200);
      const removeTimer = setTimeout(onRemove, 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(removeTimer);
      };
    }
  }, [onRemove, isVanishing]);

  return (
    <div className={`toast-card ${type} ${isVanishing ? 'vanishing' : ''}`}>
      {type === 'success' ? (
        <CheckCircle className="toast-icon" size={18} />
      ) : type === 'info' ? (
        <Info className="toast-icon" size={18} />
      ) : (
        <AlertCircle className="toast-icon" size={18} />
      )}
      <span>{message}</span>
    </div>
  );
});

// ── Session expires after 15 minutes of UI inactivity ───────────
// Timer resets on: mousedown, keydown, scroll, touchstart
const SESSION_EXPIRY_MS = 15 * 60 * 1000;

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [servers, setServers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Session Expired State ──────────────────────────────────────
  const [sessionExpired, setSessionExpired] = useState(false);

  // ── Pending Hacking Notification Popup ─────────────────────────
  const [hackingState, setHackingState] = useState({
    loading: true,
    pending_count: 0,
    has_pending: false,
    latest: null,
    dismissing: false,
  });

  // ── Captcha Challenge State ────────────────────────────────────
  const [captchaState, setCaptchaState] = useState({
    required: false,
    siteKey: '',
    error: null,
  });

  // ── Role-Switch Captcha State ────────────────────────────────
  // When the user tries to switch roles, we first show a captcha challenge.
  // On success we proceed with the Discord OAuth redirect.
  const [roleSwitchCaptcha, setRoleSwitchCaptcha] = useState({
    required: false,
    siteKey: '',
    pendingRole: null,
    error: null,
  });

  const addNotification = useCallback((message, type = 'error') => {
    const id = Date.now();
    setNotifications(prev => {
      const newList = [...prev, { id, message, type }];
      return newList.map((n, i) => i < newList.length - 3 ? { ...n, forceVanish: true } : n);
    });
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getInitialRole = () => {
    const role = localStorage.getItem('selected_role');
    if (!role || role === 'undefined') return 'freelancer';
    return role;
  };

  const [currentRole, setCurrentRole] = useState(getInitialRole());
  const [activeSection, setActiveSection] = useState(localStorage.getItem('active_section') || 'overview');
  const [selectedGuildId, setSelectedGuildId] = useState(localStorage.getItem('selected_guild_id') || null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [triggerTremble, setTriggerTremble] = useState(0);

  useEffect(() => {
    localStorage.setItem('active_section', activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (selectedGuildId) {
      localStorage.setItem('selected_guild_id', selectedGuildId);
    } else {
      localStorage.removeItem('selected_guild_id');
    }
  }, [selectedGuildId]);

  const handleNavigationAttempt = useCallback((action) => {
    if (hasUnsavedChanges) {
      setTriggerTremble(prev => prev + 1);
      return;
    }
    action();
  }, [hasUnsavedChanges]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isServersLoading, setIsServersLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSectionLoading, setIsSectionLoading] = useState(false);

  const fetchProfile = useCallback(async (isSectionRefresh = false) => {
    // ── Never fetch while a hacking alert is active ─────────────────────────────────
    if (hackingState.has_pending) return;
    // ───────────────────────────────────────────────────────────────────────────────
    if (isSectionRefresh) {
      setIsSectionLoading(true);
    } else {
      setIsProfileLoading(true);
    }
    try {
      if (!localStorage.getItem('access_token')) {
        handleLogout();
        return;
      }

      if (!currentRole || currentRole === 'undefined') {
        console.warn('Skipping profile fetch: role is undefined');
        return;
      }

      // ── DEBUG DELAY: Remove after skeleton review ──────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // ───────────────────────────────────────────────────────────────────────────

      const data = await profileService.getMe(currentRole, !isSectionRefresh);
      setProfile(data);
    } catch (err) {
      // ── Hacking notification block, don't logout, show modal ──
      if (err.response?.data?.require_dismiss) {
        setHackingState((prev) => ({ ...prev, has_pending: true, loading: false }));
        setIsProfileLoading(false);
        return;
      }
      // ── Ban block, redirect to banned page ──
      if (err.response?.status === 403 && err.response?.data?.is_banned) {
        window.location.href = '/banned';
        return;
      }
      console.error('Failed to fetch profile:', err);
      handleLogout();
    } finally {
      setIsProfileLoading(false);
      setIsSectionLoading(false);
    }
  }, [currentRole, hackingState.has_pending]);

  const fetchServers = useCallback(async (forceRefresh = false) => {
    if (currentRole !== 'server_admin') return;
    // Never fetch while a hacking alert is active
    if (hackingState.has_pending) return;
    try {
      if (forceRefresh) setIsRefreshing(true);
      setIsServersLoading(true);

      // ── DEBUG DELAY: Remove after skeleton review ──────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // ───────────────────────────────────────────────────────────────────────────

      const data = await guildService.getMyServers(forceRefresh);
      setServers(data);
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      if (forceRefresh) setIsRefreshing(false);
      setIsServersLoading(false);
    }
  }, [currentRole, hackingState.has_pending]);

  // ── Check for pending hacking notifications on mount ─────────
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    checkPendingHacking()
      .then((data) => {
        setHackingState((prev) => ({
          ...prev,
          loading: false,
          pending_count: data.pending_count ?? 0,
          has_pending: data.has_pending ?? false,
          latest: data.latest ?? null,
        }));
      })
      .catch(() => {
        // If the endpoint fails (e.g., network error), don't block user
        setHackingState((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  // ── Listen for global hacking-alert events fired by api.js interceptor ──
  // This catches 403+require_dismiss from ANY component's API call instantly.
  useEffect(() => {
    const handler = (e) => {
      setHackingState((prev) => ({
        ...prev,
        loading: false,
        has_pending: true,
        pending_count: (prev.pending_count || 0) + 1,
        latest: e.detail?.latest ?? prev.latest,
      }));
      // Clear stale profile data so no cached content is visible
      setProfile(null);
    };
    window.addEventListener('xentra:hacking_alert', handler);
    return () => window.removeEventListener('xentra:hacking_alert', handler);
  }, []);

  // ── Listen for captcha challenge events from api.js interceptor ──
  // When the WAF blocks an anonymous request, the 403 response includes
  // require_captcha:true and the site key to render the Turnstile widget.
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setCaptchaState({
        required: true,
        siteKey: detail.captcha_site_key || '',
        error: null,
      });
    };
    window.addEventListener('xentra:captcha_required', handler);
    return () => window.removeEventListener('xentra:captcha_required', handler);
  }, []);

  // ── Captcha verify handler ─────────────────────────────────────
  // Called by CaptchaChallenge when the user completes the Turnstile widget.
  // Posts the token to the backend, and if successful, clears the captcha state.
  const handleCaptchaVerified = useCallback(async (token) => {
    setCaptchaState((prev) => ({ ...prev, error: null }));
    try {
      await captchaVerify(token);
      // Verification succeeded, dismiss the overlay
      setCaptchaState({ required: false, siteKey: '', error: null });
      // Optionally re-fetch profile/data now that WAF will let requests through
      fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed. Please try again.';
      setCaptchaState((prev) => ({ ...prev, error: msg }));
    }
  }, [fetchProfile]);

  // ── Captcha dismiss handler ────────────────────────────────────
  // Called when the user clicks Cancel on the captcha overlay.
  const handleCaptchaDismiss = useCallback(() => {
    setCaptchaState({ required: false, siteKey: '', error: null });
  }, []);

  // ── 15-Minute UI Inactivity Timer ──────────────────────────────
  // Session expires only when there's no user interaction on the UI
  // (mousedown, keydown, scroll, touchstart) for 15 continuous minutes.
  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = useCallback(() => {
    if (sessionExpired) return;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setSessionExpired(true);
    }, SESSION_EXPIRY_MS);
  }, [sessionExpired]);

  useEffect(() => {
    resetInactivityTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [resetInactivityTimer]);

  // ── Dismiss handler ─────────────────────────────────────────
  const handleDismissHacking = useCallback(async () => {
    setHackingState((prev) => ({ ...prev, dismissing: true }));
    try {
      await dismissHacking();
      setHackingState({
        loading: false,
        pending_count: 0,
        has_pending: false,
        latest: null,
        dismissing: false,
      });
      // Re-fetch profile now that middleware allows it through
      const data = await profileService.getMe(currentRole, true);
      setProfile(data);
    } catch (err) {
      setHackingState((prev) => ({ ...prev, dismissing: false }));
      addNotification('Failed to dismiss notification. Please try again.', 'error');
    }
  }, [addNotification, currentRole]);

  useEffect(() => {
    fetchProfile();
    if (currentRole === 'server_admin') {
      fetchServers();
    }
  }, [currentRole]);

  useEffect(() => {
    setHasUnsavedChanges(false);
    if (profile) {
      fetchProfile(true);
    }
  }, [activeSection]);

  const handleUpdateProfile = useCallback(async (data) => {
    setIsSaving(true);
    try {
      await profileService.updateMe(currentRole, data);
      await fetchProfile();
      addNotification('Profile updated successfully!', 'success');
      setHasUnsavedChanges(false);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Update failed';
      if (err.response?.data?.redirect === 'overview') {
        addNotification(errMsg, 'error');
        setActiveSection('overview');
        return;
      }
      addNotification(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentRole, fetchProfile, addNotification]);

  const switchRole = useCallback((role) => {
    localStorage.setItem('selected_role', role);
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_DISCORD_REDIRECT_URI);
    const scope = encodeURIComponent('identify email guilds');
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${role}`;
  }, []);

  // ── Role-Switch Captcha: fetch site key, then show modal ─────
  const initiateRoleSwitch = useCallback(async (role) => {
    try {
      const data = await fetchCaptchaChallenge();
      setRoleSwitchCaptcha({
        required: true,
        siteKey: data.site_key || '',
        pendingRole: role,
        error: null,
      });
    } catch {
      // If captcha endpoint fails, fall through to direct switch
      switchRole(role);
    }
  }, [switchRole]);

  const handleRoleSwitchCaptchaVerified = useCallback(async (token) => {
    setRoleSwitchCaptcha((prev) => ({ ...prev, error: null }));
    try {
      await captchaVerify(token);
      const { pendingRole } = roleSwitchCaptcha;
      setRoleSwitchCaptcha({ required: false, siteKey: '', pendingRole: null, error: null });
      if (pendingRole) switchRole(pendingRole);
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed. Please try again.';
      setRoleSwitchCaptcha((prev) => ({ ...prev, error: msg }));
    }
  }, [roleSwitchCaptcha, switchRole]);

  const handleRoleSwitchCaptchaDismiss = useCallback(() => {
    setRoleSwitchCaptcha({ required: false, siteKey: '', pendingRole: null, error: null });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = '/login';
  }, []);

  const handleGoToConfigure = useCallback((guildId) => {
    handleNavigationAttempt(() => {
      setSelectedGuildId(guildId);
      setActiveSection('configure');
    });
  }, [handleNavigationAttempt]);

  const avatarUrl = useMemo(() =>
    localStorage.getItem('discord_avatar')
      ? `https://cdn.discordapp.com/avatars/${localStorage.getItem('discord_id')}/${localStorage.getItem('discord_avatar')}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`,
    []);

  const renderedSection = useMemo(() => {
    // ── While hacking alert is active: return a locked placeholder ─────────────
    // This prevents ANY section component from mounting and making API calls.
    if (hackingState.has_pending) {
      return (
        <div className="flex-col flex-center gap-16" style={{ minHeight: 300, opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
          <ShieldAlert size={64} />
          <p style={{ fontSize: 16, textAlign: 'center', maxWidth: 340 }}>
            Dashboard locked, acknowledge the security alert to continue.
          </p>
        </div>
      );
    }
    // ───────────────────────────────────────────────────────────────

    const commonProps = {
      profile,
      setHasUnsavedChanges,
      triggerTremble,
      addNotification,
      fetchProfile,
      isSubmitting: isSaving,
      isProfileLoading
    };

    const profileProps = {
      profile,
      currentRole,
      onSwitchRole: (role) => handleNavigationAttempt(() => initiateRoleSwitch(role)),
      avatarUrl,
      isSubmitting: isSaving
    };

    if (currentRole === 'client') {
      switch (activeSection) {
        case 'overview': return <ClientOverview {...profileProps} />;
        case 'settings': return <ClientSettings {...commonProps} onUpdate={handleUpdateProfile} onNavigate={setActiveSection} />;
        case 'jobs': return <ClientJobs {...commonProps} />;
        case 'wallets': return <Wallets currentRole={currentRole} addNotification={addNotification} />;
        case 'chatrooms': return <ChatRooms profile={profile} currentRole={currentRole} />;
        case 'premium': return <Premium {...commonProps} currentRole={currentRole} />;
        default: return <ClientOverview {...profileProps} />;
      }
    } else if (currentRole === 'freelancer') {
      switch (activeSection) {
        case 'overview': return <FreelancerOverview {...profileProps} />;
        case 'settings': return <FreelancerSettings {...commonProps} onUpdate={handleUpdateProfile} onNavigate={setActiveSection} />;
        case 'portfolio': return <FreelancerPortfolio {...commonProps} fetchProfile={fetchProfile} />;
        case 'applications': return <FreelancerApplications {...commonProps} onNavigate={setActiveSection} />;
        case 'wallets': return <Wallets currentRole={currentRole} addNotification={addNotification} />;
        case 'chatrooms': return <ChatRooms profile={profile} currentRole={currentRole} />;
        case 'premium': return <Premium {...commonProps} currentRole={currentRole} />;
        default: return <FreelancerOverview {...profileProps} />;
      }
    } else if (currentRole === 'server_admin') {
      switch (activeSection) {
        case 'overview': return <AdminOverview {...profileProps} servers={servers} onConfigure={handleGoToConfigure} onRefreshServers={() => fetchServers(true)} isRefreshing={isRefreshing} isServersLoading={isServersLoading} />;
        case 'settings': return <AdminSettings {...commonProps} onUpdate={handleUpdateProfile} />;
        case 'configure': return <AdminConfigure servers={servers} selectedGuildId={selectedGuildId} setHasUnsavedChanges={setHasUnsavedChanges} triggerTremble={triggerTremble} addNotification={addNotification} isSubmitting={isSaving} />;
        default: return <AdminOverview {...profileProps} servers={servers} onConfigure={handleGoToConfigure} isRefreshing={isRefreshing} isServersLoading={isServersLoading} />;
      }
    }
  }, [hackingState.has_pending, profile, currentRole, activeSection, servers, selectedGuildId, isSaving, isProfileLoading,
    isRefreshing, isServersLoading, avatarUrl, handleNavigationAttempt, handleUpdateProfile,
    fetchProfile, addNotification, handleGoToConfigure, fetchServers]);

  // ── Captcha Challenge Modal (WAF) ──────────────────────────────
  const captchaModal = captchaState.required ? (
    <CaptchaChallenge
      siteKey={captchaState.siteKey}
      error={captchaState.error}
      onVerified={handleCaptchaVerified}
      onDismiss={handleCaptchaDismiss}
    />
  ) : null;

  // ── Role-Switch Captcha Modal ──────────────────────────────────
  const roleSwitchCaptchaModal = roleSwitchCaptcha.required ? (
    <CaptchaChallenge
      siteKey={roleSwitchCaptcha.siteKey}
      error={roleSwitchCaptcha.error}
      onVerified={handleRoleSwitchCaptchaVerified}
      onDismiss={handleRoleSwitchCaptchaDismiss}
      title="Verify Before Switching"
      description="Please complete the security check before switching your role."
    />
  ) : null;

  // ── Session Expired Modal ─────────────────────────────────────
  const sessionExpiredModal = sessionExpired ? (
    <div className="hacking-overlay">
      <div className="hacking-modal">
        <div className="hacking-modal-icon">
          <Clock size={48} />
        </div>
        <h2 className="hacking-modal-title">Session Expired</h2>
        <p className="hacking-modal-text">
          Your session has expired. Please log in again to continue.
        </p>
        <button
          className="hacking-modal-btn"
          onClick={() => { window.location.href = '/login'; }}
        >
          <LogOut size={20} />
          Go to Login
        </button>
      </div>
    </div>
  ) : null;

  // ── Hacking Notification Modal (tier-based) ───────────────────
  const getTierInfo = (tier) => {
    const tierMap = {
      1: { icon: '🔍', title: 'Security Notice', severity: 'info', msg: 'Please review your recent activity.' },
      2: { icon: '⚠️', title: 'Security Warning', severity: 'warning', msg: 'Continued suspicious activity may result in feature restrictions.' },
      3: { icon: '🚨', title: 'Security Alert, Action Required', severity: 'danger', msg: 'Some dashboard features may be restricted until this is resolved.' },
      4: { icon: '⛔', title: 'Critical Security Alert', severity: 'critical', msg: 'Your account is at risk of automatic suspension. Contact an administrator immediately.' },
    };
    return tierMap[tier] || tierMap[1];
  };

  const hackingModal = hackingState.has_pending ? (
    <div className="hacking-overlay">
      <div className="hacking-modal">
        <div className="hacking-modal-icon">
          <ShieldAlert size={48} />
        </div>
        {(() => {
          const tier = hackingState.latest?.bypass_tier || 1;
          const tierInfo = getTierInfo(tier);
          return (
            <>
              <h2 className="hacking-modal-title">{tierInfo.icon} {tierInfo.title}</h2>
              <p className="hacking-modal-text">
                Our system has detected {hackingState.pending_count > 1
                  ? `${hackingState.pending_count} security attempt(s)`
                  : 'a security attempt'} on your account.
              </p>
              {hackingState.latest && (
                <p className="hacking-modal-detail">
                  Recent: <strong>{hackingState.latest.event_type}</strong>
                  {hackingState.latest.attempt_count && (
                    <>, Total attempts: <strong>{hackingState.latest.attempt_count}</strong></>
                  )}
                  {hackingState.latest.bypass_tier && (
                    <>, Tier: <strong>{hackingState.latest.bypass_tier}</strong></>
                  )}
                </p>
              )}
              <p className="hacking-modal-note">
                {tierInfo.msg}
              </p>
              <p className="hacking-modal-dm-note">
                Please check your Discord DMs from <strong>Xentra Bot</strong> for full details.
                You must acknowledge this notification to continue using the dashboard.
              </p>
              <button
                className="hacking-modal-btn"
                onClick={handleDismissHacking}
                disabled={hackingState.dismissing}
              >
                {hackingState.dismissing ? 'Acknowledging...' : "I'll take care"}
              </button>
            </>
          );
        })()}
      </div>
    </div>
  ) : null;


  // Initial full-page loading state, no profile yet
  if (!profile) return (
    <div className="dashboard-layout">
      {hackingModal}
      {sessionExpiredModal}
      {captchaModal}
      {roleSwitchCaptchaModal}
      <div className="notification-container" />
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => handleNavigationAttempt(() => setActiveSection(section))}
        onLogout={() => handleNavigationAttempt(handleLogout)}
        currentRole={currentRole}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        profile={profile}
      />
      <main className="main-content">
        <div className="dashboard-view-container">
          <div className="layout-header">
            <button
              className="btn btn-secondary mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <RoleSwitcher
              currentRole={currentRole}
              onSwitch={(role) => handleNavigationAttempt(() => initiateRoleSwitch(role))}
            />
          </div>
          {getSectionSkeleton(activeSection, currentRole)}
        </div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-layout">
      {hackingModal}
      {sessionExpiredModal}
      {captchaModal}
      {roleSwitchCaptchaModal}
      <div className="notification-container">
        {notifications.map(n => (
          <Toast
            key={n.id}
            message={n.message}
            type={n.type}
            forceVanish={n.forceVanish}
            onRemove={() => removeNotification(n.id)}
          />
        ))}
      </div>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => handleNavigationAttempt(() => setActiveSection(section))}
        onLogout={() => handleNavigationAttempt(handleLogout)}
        currentRole={currentRole}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        profile={profile}
      />

      <main className="main-content">
        <div className="dashboard-view-container">
          <div className="layout-header">
            <button
              className="btn btn-secondary mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <RoleSwitcher
              currentRole={currentRole}
              onSwitch={(role) => handleNavigationAttempt(() => initiateRoleSwitch(role))}
            />
          </div>
          <Suspense fallback={getSectionSkeleton(activeSection, currentRole)}>
            {isSectionLoading ? getSectionSkeleton(activeSection, currentRole) : renderedSection}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
