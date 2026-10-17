/**
 * VYDEORA — Core Application Controller & View Router
 * Multi-User Session, Dynamic User Profile, Settings, & Dashboard Integration
 */

(function () {
  'use strict';

  // Application State
  const AppState = {
    currentView: 'view-accueil',
    currentUser: null,
    profile: null,
    preferences: null,
    entitlement: null,
    projects: [],
    notifications: [],
    activity: null
  };

  // DOM Elements Cache
  const DOM = {
    sidebar: document.getElementById('appSidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
    navLinks: document.querySelectorAll('.nav-link, .mobile-nav-item'),
    viewSections: document.querySelectorAll('.app-view'),
    topbarSearchBox: document.getElementById('topbarSearchBox'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    commandPaletteModal: document.getElementById('commandPaletteModal'),
    commandPaletteClose: document.getElementById('commandPaletteClose'),
    commandInput: document.getElementById('commandPaletteInput'),
    commandResults: document.getElementById('commandResults'),
    notificationBtn: document.getElementById('notificationBtn'),
    notificationsDrawer: document.getElementById('notificationsDrawer'),
    markAllReadBtn: document.getElementById('markAllReadBtn'),
    toastContainer: document.getElementById('toastContainer'),
    heroPromptInput: document.getElementById('heroPromptInput'),
    heroPromptBtn: document.getElementById('heroPromptBtn'),
    
    // User Identity & Badges
    topbarUserDropdown: document.getElementById('topbarUserDropdown'),
    topbarDropdownMenu: document.getElementById('topbarDropdownMenu'),
    topbarUserAvatar: document.getElementById('topbarUserAvatar'),
    topbarUserName: document.getElementById('topbarUserName'),
    menuDropdownName: document.getElementById('menuDropdownName'),
    menuDropdownEmail: document.getElementById('menuDropdownEmail'),
    sidebarUserAvatar: document.getElementById('sidebarUserAvatar'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    homeUserFirstName: document.getElementById('homeUserFirstName'),
    
    // Stats & Entitlements
    statVideosCount: document.getElementById('statVideosCount'),
    statMinutesCount: document.getElementById('statMinutesCount'),
    statCreditsCount: document.getElementById('statCreditsCount'),
    statCreditsFill: document.getElementById('statCreditsFill'),
    statPendingCount: document.getElementById('statPendingCount'),
    statSavedTime: document.getElementById('statSavedTime'),
    
    // Dynamic Containers & Empty States
    recentProjectsTableBody: document.getElementById('recentProjectsTableBody'),
    recentProjectsEmptyState: document.getElementById('recentProjectsEmptyState'),
    projectsGridContainer: document.getElementById('projectsGridContainer'),
    projectsEmptyState: document.getElementById('projectsEmptyState'),
    notificationsListContainer: document.getElementById('notificationsListContainer'),
    notificationsEmptyState: document.getElementById('notificationsEmptyState'),
    notificationsUnreadCount: document.getElementById('notificationsUnreadCount'),

    // Settings Profile & Avatar
    settingsAvatarPreview: document.getElementById('settingsAvatarPreview'),
    avatarFileInput: document.getElementById('avatarFileInput'),
    avatarChooseBtn: document.getElementById('avatarChooseBtn'),
    avatarUploadBtn: document.getElementById('avatarUploadBtn'),
    avatarRemoveBtn: document.getElementById('avatarRemoveBtn'),
    avatarFileNameDisplay: document.getElementById('avatarFileNameDisplay'),
    avatarAlertContainer: document.getElementById('avatarAlertContainer'),
    
    // Settings Forms
    profileSettingsForm: document.getElementById('profileSettingsForm'),
    settingsFullName: document.getElementById('settingsFullName'),
    settingsEmail: document.getElementById('settingsEmail'),
    settingsLanguage: document.getElementById('settingsLanguage'),
    settingsTimezone: document.getElementById('settingsTimezone'),
    profileAlertContainer: document.getElementById('profileAlertContainer'),
    
    preferencesSettingsForm: document.getElementById('preferencesSettingsForm'),
    settingsDefaultFormat: document.getElementById('settingsDefaultFormat'),
    settingsDefaultVoiceLang: document.getElementById('settingsDefaultVoiceLang'),
    settingsCreatorCategory: document.getElementById('settingsCreatorCategory'),
    settingsEmailNotifyExport: document.getElementById('settingsEmailNotifyExport'),
    settingsEmailNotifyNews: document.getElementById('settingsEmailNotifyNews'),
    preferencesAlertContainer: document.getElementById('preferencesAlertContainer'),
    
    passwordSettingsForm: document.getElementById('passwordSettingsForm'),
    settingsCurrentPassword: document.getElementById('settingsCurrentPassword'),
    settingsNewPassword: document.getElementById('settingsNewPassword'),
    settingsConfirmPassword: document.getElementById('settingsConfirmPassword'),
    passwordAlertContainer: document.getElementById('passwordAlertContainer'),
    
    settingsPlanBadge: document.getElementById('settingsPlanBadge'),
    settingsUserId: document.getElementById('settingsUserId'),
    settingsCreditCount: document.getElementById('settingsCreditCount'),
    
    // Logout Buttons
    sidebarLogoutBtn: document.getElementById('sidebarLogoutBtn'),
    logoutBtnTopbar: document.getElementById('logoutBtnTopbar'),
    settingsLogoutBtn: document.getElementById('settingsLogoutBtn')
  };

  // Toast System
  function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Helper: Extract Initials from Full Name
  function getInitials(name) {
    if (!name || typeof name !== 'string') return 'VY';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Helper: Display Alert Banner
  function showAlert(container, message, type = 'success') {
    if (!container) return;
    const bg = type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    const border = type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const color = type === 'success' ? '#10B981' : '#EF4444';
    container.innerHTML = `
      <div style="background:${bg}; border:1px solid ${border}; color:${color}; padding:10px 14px; border-radius:8px; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
        </svg>
        <span>${message}</span>
      </div>
    `;
    setTimeout(() => {
      if (container) container.innerHTML = '';
    }, 4500);
  }

  // ==========================================================================
  // AUTHENTICATION & DATA BOOTSTRAP
  // ==========================================================================
  async function loadUserData() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status === 401) {
          // Unauthenticated: redirect to login
          window.location.href = `/?auth=login&redirect=${encodeURIComponent(window.location.pathname + window.location.hash)}`;
          return;
        }
        throw new Error('Failed to load user session.');
      }

      const data = await res.json();
      AppState.currentUser = data.user;
      AppState.profile = data.user;
      AppState.preferences = data.preferences || {};
      AppState.entitlement = data.entitlement || { plan: 'free', credits_balance: 100, monthly_limit: 100 };
      AppState.projects = data.projects || [];
      AppState.notifications = data.notifications || [];
      AppState.activity = data.activity || { videosGenerated: 0, totalMinutesRendered: 0, pendingJobs: 0, hoursSavedEstimate: 0 };

      renderDashboard();
    } catch (err) {
      console.error('Session initialization error:', err);
      showToast('Erreur de session. Veuillez vous reconnecter.', 'error');
      setTimeout(() => {
        window.location.href = '/?auth=login';
      }, 1500);
    }
  }

  // ==========================================================================
  // RENDER DYNAMIC DASHBOARD DATA
  // ==========================================================================
  function renderDashboard() {
    const user = AppState.currentUser;
    const entitlement = AppState.entitlement;
    const activity = AppState.activity;
    const projects = AppState.projects;
    const notifications = AppState.notifications;
    const preferences = AppState.preferences;

    if (!user) return;

    const initials = getInitials(user.fullName);
    const firstName = user.fullName ? user.fullName.split(' ')[0] : 'Créateur';

    // 1. User Identity Badges (Sidebar & Topbar)
    if (DOM.homeUserFirstName) DOM.homeUserFirstName.textContent = firstName;
    if (DOM.topbarUserName) DOM.topbarUserName.textContent = user.fullName;
    if (DOM.sidebarUserName) DOM.sidebarUserName.textContent = user.fullName;
    if (DOM.menuDropdownName) DOM.menuDropdownName.textContent = user.fullName;
    if (DOM.sidebarUserEmail) DOM.sidebarUserEmail.textContent = user.email;
    if (DOM.menuDropdownEmail) DOM.menuDropdownEmail.textContent = user.email;

    // Avatars
    renderAvatars(user.avatarUrl, initials);

    // 2. Activity Statistics & Entitlements
    const credits = entitlement ? (entitlement.credits_balance !== undefined ? entitlement.credits_balance : entitlement.creditsRemaining) : 100;
    const totalCredits = entitlement && entitlement.monthly_limit ? entitlement.monthly_limit : 100;
    const creditPercent = Math.min(100, Math.round((credits / (totalCredits || 100)) * 100));

    if (DOM.statCreditsCount) DOM.statCreditsCount.textContent = credits;
    if (DOM.statCreditsFill) DOM.statCreditsFill.style.width = `${creditPercent}%`;
    if (DOM.statVideosCount) DOM.statVideosCount.textContent = activity ? activity.videosGenerated : projects.length;
    if (DOM.statMinutesCount) DOM.statMinutesCount.textContent = activity ? `${activity.totalMinutesRendered} min` : '0 min';
    if (DOM.statPendingCount) DOM.statPendingCount.textContent = activity ? activity.pendingJobs : '0';
    if (DOM.statSavedTime) DOM.statSavedTime.textContent = activity ? `${activity.hoursSavedEstimate} h` : '0 h';

    // 3. Projects Lists (Recent on Home & Full Grid)
    renderProjects(projects);

    // 4. Notifications
    renderNotifications(notifications);

    // 5. Settings Inputs Population
    populateSettings(user, preferences, entitlement);

    // 6. Billing Section
    renderBilling(entitlement);
  }

  // Render Avatars (Photo or Initials)
  function renderAvatars(avatarUrl, initials) {
    const avatarContainers = [
      DOM.sidebarUserAvatar,
      DOM.topbarUserAvatar,
      DOM.settingsAvatarPreview
    ];

    avatarContainers.forEach(container => {
      if (!container) return;
      if (avatarUrl) {
        container.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        container.style.background = 'transparent';
      } else {
        container.textContent = initials;
        container.style.background = 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-pink) 100%)';
      }
    });

    if (DOM.avatarRemoveBtn) {
      DOM.avatarRemoveBtn.style.display = avatarUrl ? 'inline-flex' : 'none';
    }
  }

  // Render Projects (Home Table & Library Grid)
  function renderProjects(projects) {
    // A. Recent Projects on Home View
    if (DOM.recentProjectsTableBody && DOM.recentProjectsEmptyState) {
      if (!projects || projects.length === 0) {
        DOM.recentProjectsTableBody.innerHTML = '';
        DOM.recentProjectsEmptyState.style.display = 'block';
      } else {
        DOM.recentProjectsEmptyState.style.display = 'none';
        DOM.recentProjectsTableBody.innerHTML = projects.slice(0, 5).map(proj => `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:42px; height:28px; border-radius:4px; overflow:hidden; background:rgba(255,255,255,0.05); flex-shrink:0;">
                  <img src="${proj.thumb || 'assets/images/creator-card.jpg'}" alt="${proj.title}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div>
                  <div style="font-weight:600; font-size:0.86rem; color:#FFFFFF;">${proj.title}</div>
                  <div style="font-size:0.74rem; color:var(--text-muted);">${proj.category || 'TikTok 9:16'}</div>
                </div>
              </div>
            </td>
            <td><span class="badge ${proj.statusClass || 'badge-success'}">${proj.status || 'Terminée'}</span></td>
            <td style="font-size:0.82rem; color:var(--text-muted);">${proj.duration || '0:45'}</td>
            <td style="font-size:0.82rem; color:var(--text-muted);">${proj.date || 'Aujourd\'hui'}</td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" onclick="window.VYDEORA.switchView('view-editor');" title="Éditer" style="padding:4px 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="btn btn-ghost btn-sm" onclick="window.VYDEORA.deleteProject('${proj.id}');" title="Supprimer" style="padding:4px 8px; color:var(--accent-pink);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // B. Projects Library Grid
    if (DOM.projectsGridContainer && DOM.projectsEmptyState) {
      if (!projects || projects.length === 0) {
        DOM.projectsGridContainer.innerHTML = '';
        DOM.projectsEmptyState.style.display = 'block';
      } else {
        DOM.projectsEmptyState.style.display = 'none';
        DOM.projectsGridContainer.innerHTML = projects.map(proj => `
          <div class="card" style="padding:14px;">
            <div style="position:relative; border-radius:8px; overflow:hidden; aspect-ratio:16/9; margin-bottom:12px;">
              <img src="${proj.thumb || 'assets/images/creator-card.jpg'}" alt="${proj.title}" style="width:100%; height:100%; object-fit:cover;">
              <span class="badge ${proj.statusClass || 'badge-success'}" style="position:absolute; top:8px; left:8px;">${proj.status || 'Terminée'}</span>
              <span style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.8); font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:600;">${proj.duration || '0:45'}</span>
            </div>
            <h4 style="margin-bottom:4px;">${proj.title}</h4>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">${proj.date || 'Créé récemment'} • ${proj.category || 'Format standard'}</div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.VYDEORA.switchView('view-editor');">Éditer</button>
              <button class="btn btn-primary btn-sm" style="flex:1;" onclick="document.getElementById('exportModal').classList.add('active');">Exporter</button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  // Render Notifications Drawer
  function renderNotifications(notifications) {
    if (!DOM.notificationsListContainer || !DOM.notificationsEmptyState) return;

    const unread = (notifications || []).filter(n => n.unread).length;
    const dot = document.querySelector('.notification-badge-dot');

    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
    if (DOM.notificationsUnreadCount) {
      DOM.notificationsUnreadCount.textContent = `${unread} non lue${unread > 1 ? 's' : ''}`;
    }

    if (!notifications || notifications.length === 0) {
      DOM.notificationsListContainer.innerHTML = '';
      DOM.notificationsEmptyState.style.display = 'block';
    } else {
      DOM.notificationsEmptyState.style.display = 'none';
      DOM.notificationsListContainer.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.unread ? 'unread' : ''}" style="background:rgba(255,255,255,${notif.unread ? '0.04' : '0.01'}); border:1px solid var(--border-subtle); border-radius:8px; padding:12px;">
          <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary); margin-bottom:2px;">${notif.title}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">${notif.message || notif.desc}</div>
          <span style="font-size:0.72rem; color:var(--text-muted);">${notif.time || 'Récemment'}</span>
        </div>
      `).join('');
    }
  }

  // Populate Settings View
  function populateSettings(user, preferences, entitlement) {
    if (DOM.settingsFullName) DOM.settingsFullName.value = user.fullName || '';
    if (DOM.settingsEmail) DOM.settingsEmail.value = user.email || '';
    if (DOM.settingsLanguage) DOM.settingsLanguage.value = user.preferredLanguage || 'fr';
    if (DOM.settingsTimezone) DOM.settingsTimezone.value = user.timeZone || 'Europe/Paris';

    if (preferences) {
      if (DOM.settingsDefaultFormat) DOM.settingsDefaultFormat.value = preferences.defaultFormat || '9:16';
      if (DOM.settingsDefaultVoiceLang) DOM.settingsDefaultVoiceLang.value = preferences.preferredVoiceLang || 'fr';
      if (DOM.settingsCreatorCategory) DOM.settingsCreatorCategory.value = preferences.creatorCategory || 'general';
      if (DOM.settingsEmailNotifyExport) DOM.settingsEmailNotifyExport.checked = preferences.emailNotifications !== false;
      if (DOM.settingsEmailNotifyNews) DOM.settingsEmailNotifyNews.checked = preferences.productUpdates !== false;
    }

    if (DOM.settingsUserId) DOM.settingsUserId.textContent = user.id || 'usr_...';
    if (DOM.settingsPlanBadge) {
      const planName = entitlement && entitlement.plan === 'free' ? 'Plan Gratuit Découverte' : (entitlement ? entitlement.plan : 'Plan Gratuit');
      DOM.settingsPlanBadge.textContent = planName;
    }
    if (DOM.settingsCreditCount) {
      const credits = entitlement ? (entitlement.credits_balance !== undefined ? entitlement.credits_balance : entitlement.creditsRemaining) : 100;
      DOM.settingsCreditCount.textContent = `${credits} crédits`;
    }
  }

  // ==========================================================================
  // BILLING & ANNUAL DISCOUNT SWITCHER (-20%)
  // ==========================================================================
  let isDashboardAnnual = false;

  const BillingRates = {
    monthly: {
      starter: { price: 15, subnote: '&nbsp;' },
      pro: { price: 29, subnote: '&nbsp;' },
      enterprise: { price: 99, subnote: '&nbsp;' }
    },
    annual: {
      starter: { price: 12, subnote: 'Facturé 144 € / an (économie de 36 €)' },
      pro: { price: 23, subnote: 'Facturé 276 € / an (économie de 72 €)' },
      enterprise: { price: 79, subnote: 'Facturé 948 € / an (économie de 240 €)' }
    }
  };

  function updateBillingPricesUI() {
    const rates = isDashboardAnnual ? BillingRates.annual : BillingRates.monthly;
    const switchEl = document.getElementById('dashboardBillingSwitch');
    const monthlyLabel = document.getElementById('dashboardBillingMonthlyLabel');
    const annualLabel = document.getElementById('dashboardBillingAnnualLabel');

    if (switchEl) switchEl.classList.toggle('annual', isDashboardAnnual);
    if (monthlyLabel) monthlyLabel.classList.toggle('active', !isDashboardAnnual);
    if (annualLabel) annualLabel.classList.toggle('active', isDashboardAnnual);

    // Starter
    const priceStarter = document.getElementById('priceTierStarter');
    const subnoteStarter = document.getElementById('subnoteTierStarter');
    if (priceStarter) priceStarter.textContent = rates.starter.price;
    if (subnoteStarter) subnoteStarter.innerHTML = rates.starter.subnote;

    // Pro
    const pricePro = document.getElementById('priceTierPro');
    const subnotePro = document.getElementById('subnoteTierPro');
    if (pricePro) pricePro.textContent = rates.pro.price;
    if (subnotePro) subnotePro.innerHTML = rates.pro.subnote;

    // Enterprise
    const priceEnterprise = document.getElementById('priceTierEnterprise');
    const subnoteEnterprise = document.getElementById('subnoteTierEnterprise');
    if (priceEnterprise) priceEnterprise.textContent = rates.enterprise.price;
    if (subnoteEnterprise) subnoteEnterprise.innerHTML = rates.enterprise.subnote;
  }

  function renderBilling(entitlement) {
    const activeTitle = document.getElementById('billingActivePlanTitle');
    const activeSubtitle = document.getElementById('billingActivePlanSubtitle');

    const plan = (entitlement && entitlement.plan) ? entitlement.plan.toLowerCase() : 'free';
    const credits = entitlement ? (entitlement.credits_balance !== undefined ? entitlement.credits_balance : entitlement.creditsRemaining || 100) : 100;

    if (activeTitle) {
      if (plan === 'free' || plan === 'gratuit') {
        activeTitle.textContent = `Plan Gratuit Découverte — ${credits} crédits disponibles`;
      } else if (plan === 'starter') {
        activeTitle.textContent = `Plan Starter — ${credits} crédits disponibles`;
      } else if (plan === 'pro') {
        activeTitle.textContent = `Plan Pro — ${credits} crédits disponibles`;
      } else if (plan === 'entreprise' || plan === 'enterprise') {
        activeTitle.textContent = `Plan Entreprise — ${credits} crédits disponibles`;
      } else {
        activeTitle.textContent = `Forfait Actif — ${credits} crédits`;
      }
    }

    if (activeSubtitle) {
      if (plan === 'free' || plan === 'gratuit') {
        activeSubtitle.textContent = '100 crédits de démarrage inclus • Sans engagement ni carte requise';
      } else {
        activeSubtitle.textContent = 'Renouvellement automatique mensuel • Accès prioritaire actif';
      }
    }

    // Update buttons according to current plan
    const btnFree = document.getElementById('btnTierFree');
    const btnStarter = document.getElementById('btnTierStarter');
    const btnPro = document.getElementById('btnTierPro');
    const btnEnterprise = document.getElementById('btnTierEnterprise');

    if (btnFree) {
      btnFree.disabled = (plan === 'free' || plan === 'gratuit');
      btnFree.textContent = (plan === 'free' || plan === 'gratuit') ? 'Forfait actuel' : 'Revenir à Gratuit';
    }
    if (btnStarter) {
      btnStarter.disabled = (plan === 'starter');
      btnStarter.textContent = (plan === 'starter') ? 'Forfait actuel' : 'Choisir Starter';
    }
    if (btnPro) {
      btnPro.disabled = (plan === 'pro');
      btnPro.textContent = (plan === 'pro') ? 'Forfait actuel' : 'Passer à Pro';
    }
    if (btnEnterprise) {
      btnEnterprise.disabled = (plan === 'entreprise' || plan === 'enterprise');
      btnEnterprise.textContent = (plan === 'entreprise' || plan === 'enterprise') ? 'Forfait actuel' : 'Passer à Entreprise';
    }

    updateBillingPricesUI();
  }

  function initBillingCycleSwitcher() {
    const switchEl = document.getElementById('dashboardBillingSwitch');
    const monthlyLabel = document.getElementById('dashboardBillingMonthlyLabel');
    const annualLabel = document.getElementById('dashboardBillingAnnualLabel');

    if (switchEl) {
      switchEl.addEventListener('click', () => {
        isDashboardAnnual = !isDashboardAnnual;
        updateBillingPricesUI();
        showToast(isDashboardAnnual ? 'Tarification annuelle appliquée (-20% de réduction) !' : 'Tarification mensuelle standard.');
      });
    }

    if (monthlyLabel) {
      monthlyLabel.addEventListener('click', () => {
        if (isDashboardAnnual) {
          isDashboardAnnual = false;
          updateBillingPricesUI();
          showToast('Tarification mensuelle standard.');
        }
      });
    }

    if (annualLabel) {
      annualLabel.addEventListener('click', () => {
        if (!isDashboardAnnual) {
          isDashboardAnnual = true;
          updateBillingPricesUI();
          showToast('Tarification annuelle appliquée (-20% de réduction) !');
        }
      });
    }

    // Tier buttons click feedback
    ['btnTierStarter', 'btnTierPro', 'btnTierEnterprise'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          const tierName = btnId.replace('btnTier', '');
          const cycle = isDashboardAnnual ? 'annuel (-20%)' : 'mensuel';
          showToast(`Redirection vers le paiement sécurisé pour le plan ${tierName.toUpperCase()} en ${cycle}...`);
        });
      }
    });
  }

  // ==========================================================================
  // PROFILE & AVATAR HANDLERS
  // ==========================================================================
  let selectedAvatarBase64 = null;

  function initAvatarHandlers() {
    if (DOM.avatarChooseBtn && DOM.avatarFileInput) {
      DOM.avatarChooseBtn.addEventListener('click', () => {
        DOM.avatarFileInput.click();
      });
    }

    if (DOM.avatarFileInput) {
      DOM.avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          showAlert(DOM.avatarAlertContainer, 'Format non supporté. Veuillez choisir un fichier JPG, PNG ou WEBP.', 'error');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showAlert(DOM.avatarAlertContainer, 'Le fichier dépasse la taille maximale de 5 Mo.', 'error');
          return;
        }

        if (DOM.avatarFileNameDisplay) {
          DOM.avatarFileNameDisplay.textContent = `${file.name} (${Math.round(file.size / 1024)} Ko)`;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          selectedAvatarBase64 = loadEvent.target.result;
          if (DOM.settingsAvatarPreview) {
            DOM.settingsAvatarPreview.innerHTML = `<img src="${selectedAvatarBase64}" alt="Aperçu" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
          }
          if (DOM.avatarUploadBtn) DOM.avatarUploadBtn.style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
      });
    }

    if (DOM.avatarUploadBtn) {
      DOM.avatarUploadBtn.addEventListener('click', async () => {
        if (!selectedAvatarBase64) return;
        DOM.avatarUploadBtn.disabled = true;
        DOM.avatarUploadBtn.textContent = 'Téléversement...';

        try {
          const res = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: selectedAvatarBase64 })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi de la photo.');

          // Update State
          AppState.currentUser.avatarUrl = data.avatarUrl;
          renderAvatars(data.avatarUrl, getInitials(AppState.currentUser.fullName));
          showAlert(DOM.avatarAlertContainer, 'Photo de profil mise à jour avec succès !', 'success');
          showToast('Photo de profil enregistrée !');

          DOM.avatarUploadBtn.style.display = 'none';
          DOM.avatarUploadBtn.disabled = false;
          DOM.avatarUploadBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>
            <span>Confirmer l'envoi</span>
          `;
          if (DOM.avatarFileNameDisplay) DOM.avatarFileNameDisplay.textContent = 'Photo enregistrée';
          selectedAvatarBase64 = null;
        } catch (err) {
          showAlert(DOM.avatarAlertContainer, err.message, 'error');
          DOM.avatarUploadBtn.disabled = false;
          DOM.avatarUploadBtn.textContent = 'Réessayer';
        }
      });
    }

    if (DOM.avatarRemoveBtn) {
      DOM.avatarRemoveBtn.addEventListener('click', async () => {
        if (!confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) return;

        try {
          const res = await fetch('/api/user/avatar', { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression.');

          AppState.currentUser.avatarUrl = null;
          renderAvatars(null, getInitials(AppState.currentUser.fullName));
          showAlert(DOM.avatarAlertContainer, 'Photo supprimée, avatar par défaut restauré.', 'success');
          showToast('Photo de profil supprimée');
          if (DOM.avatarFileNameDisplay) DOM.avatarFileNameDisplay.textContent = 'Aucun fichier sélectionné';
          if (DOM.avatarUploadBtn) DOM.avatarUploadBtn.style.display = 'none';
          selectedAvatarBase64 = null;
        } catch (err) {
          showAlert(DOM.avatarAlertContainer, err.message, 'error');
        }
      });
    }
  }

  // ==========================================================================
  // SETTINGS FORMS HANDLERS (PROFILE, PREFERENCES, PASSWORD)
  // ==========================================================================
  function initSettingsForms() {
    // 1. Profile Information
    if (DOM.profileSettingsForm) {
      DOM.profileSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = DOM.settingsFullName ? DOM.settingsFullName.value.trim() : '';
        const preferredLanguage = DOM.settingsLanguage ? DOM.settingsLanguage.value : 'fr';
        const timeZone = DOM.settingsTimezone ? DOM.settingsTimezone.value : 'Europe/Paris';

        try {
          const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, preferredLanguage, timeZone })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour.');

          AppState.currentUser.fullName = fullName;
          AppState.currentUser.preferredLanguage = preferredLanguage;
          AppState.currentUser.timeZone = timeZone;

          const initials = getInitials(fullName);
          const firstName = fullName.split(' ')[0];

          if (DOM.topbarUserName) DOM.topbarUserName.textContent = fullName;
          if (DOM.sidebarUserName) DOM.sidebarUserName.textContent = fullName;
          if (DOM.menuDropdownName) DOM.menuDropdownName.textContent = fullName;
          if (DOM.homeUserFirstName) DOM.homeUserFirstName.textContent = firstName;
          renderAvatars(AppState.currentUser.avatarUrl, initials);

          showAlert(DOM.profileAlertContainer, 'Profil mis à jour avec succès !', 'success');
          showToast('Profil enregistré !');
        } catch (err) {
          showAlert(DOM.profileAlertContainer, err.message, 'error');
        }
      });
    }

    // 2. Creation Preferences
    if (DOM.preferencesSettingsForm) {
      DOM.preferencesSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const defaultFormat = DOM.settingsDefaultFormat ? DOM.settingsDefaultFormat.value : '9:16';
        const preferredVoiceLang = DOM.settingsDefaultVoiceLang ? DOM.settingsDefaultVoiceLang.value : 'fr';
        const creatorCategory = DOM.settingsCreatorCategory ? DOM.settingsCreatorCategory.value : 'general';
        const emailNotifications = DOM.settingsEmailNotifyExport ? DOM.settingsEmailNotifyExport.checked : true;
        const productUpdates = DOM.settingsEmailNotifyNews ? DOM.settingsEmailNotifyNews.checked : true;

        try {
          const res = await fetch('/api/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ defaultFormat, preferredVoiceLang, creatorCategory, emailNotifications, productUpdates })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour.');

          AppState.preferences = data.preferences || { defaultFormat, preferredVoiceLang, creatorCategory, emailNotifications, productUpdates };
          showAlert(DOM.preferencesAlertContainer, 'Préférences enregistrées avec succès !', 'success');
          showToast('Préférences vidéo mises à jour !');
        } catch (err) {
          showAlert(DOM.preferencesAlertContainer, err.message, 'error');
        }
      });
    }

    // 3. Password Security
    if (DOM.passwordSettingsForm) {
      DOM.passwordSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = DOM.settingsCurrentPassword ? DOM.settingsCurrentPassword.value : '';
        const newPassword = DOM.settingsNewPassword ? DOM.settingsNewPassword.value : '';
        const newPasswordConfirm = DOM.settingsConfirmPassword ? DOM.settingsConfirmPassword.value : '';

        if (newPassword !== newPasswordConfirm) {
          showAlert(DOM.passwordAlertContainer, 'La confirmation du nouveau mot de passe ne correspond pas.', 'error');
          return;
        }

        try {
          const res = await fetch('/api/user/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de mot de passe.');

          showAlert(DOM.passwordAlertContainer, 'Mot de passe modifié avec succès !', 'success');
          showToast('Sécurité mise à jour !');
          DOM.passwordSettingsForm.reset();
        } catch (err) {
          showAlert(DOM.passwordAlertContainer, err.message, 'error');
        }
      });
    }
  }

  // ==========================================================================
  // LOGOUT HANDLER (FROM ALL LOCATIONS)
  // ==========================================================================
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.warn('Logout fetch warning:', err);
    }
    // Invalidate local storage/state and redirect to landing page
    AppState.currentUser = null;
    window.location.replace('/?logged_out=1');
  }

  function initLogoutTriggers() {
    if (DOM.sidebarLogoutBtn) DOM.sidebarLogoutBtn.addEventListener('click', handleLogout);
    if (DOM.logoutBtnTopbar) DOM.logoutBtnTopbar.addEventListener('click', handleLogout);
    if (DOM.settingsLogoutBtn) DOM.settingsLogoutBtn.addEventListener('click', handleLogout);
  }

  // Topbar Dropdown Toggle
  function initTopbarDropdown() {
    if (DOM.topbarUserDropdown && DOM.topbarDropdownMenu) {
      DOM.topbarUserDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.topbarDropdownMenu.classList.toggle('active');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!DOM.topbarUserDropdown.contains(e.target)) {
          DOM.topbarDropdownMenu.classList.remove('active');
        }
      });

      // Dropdown items view switcher
      DOM.topbarDropdownMenu.querySelectorAll('.dropdown-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
          const view = item.getAttribute('data-view');
          DOM.topbarDropdownMenu.classList.remove('active');
          switchView(view);
        });
      });
    }
  }

  // ==========================================================================
  // NAVIGATION & VIEW ROUTING
  // ==========================================================================
  function switchView(targetViewId) {
    if (!targetViewId) return;
    
    // Deactivate all views
    DOM.viewSections.forEach(section => {
      section.classList.remove('active');
    });

    // Activate target view
    const targetElement = document.getElementById(targetViewId);
    if (targetElement) {
      targetElement.classList.add('active');
      AppState.currentView = targetViewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active state in sidebar and bottom navigation
    DOM.navLinks.forEach(link => {
      const linkView = link.getAttribute('data-view');
      if (linkView === targetViewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    closeSidebar();
  }

  function openSidebar() {
    if (DOM.sidebar) DOM.sidebar.classList.add('open');
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (DOM.sidebar) DOM.sidebar.classList.remove('open');
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openCommandPalette() {
    if (DOM.commandPaletteModal) {
      DOM.commandPaletteModal.classList.add('active');
      if (DOM.commandInput) {
        DOM.commandInput.value = '';
        setTimeout(() => DOM.commandInput.focus(), 100);
      }
    }
  }

  function closeCommandPalette() {
    if (DOM.commandPaletteModal) {
      DOM.commandPaletteModal.classList.remove('active');
    }
  }

  function toggleNotifications() {
    if (DOM.notificationsDrawer) {
      DOM.notificationsDrawer.classList.toggle('active');
    }
  }

  // ==========================================================================
  // PROJECT PERSISTENCE HELPERS
  // ==========================================================================
  async function saveProject(projectData) {
    try {
      const res = await fetch('/api/user/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de création de projet.');

      if (data.project) {
        AppState.projects.unshift(data.project);
        renderProjects(AppState.projects);
        showToast(`Projet "${data.project.title}" sauvegardé !`, 'success');
      }
      return data.project;
    } catch (err) {
      console.error('Save project error:', err);
      showToast(err.message, 'error');
    }
  }

  async function deleteProject(projectId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce projet ?')) return;

    try {
      const res = await fetch(`/api/user/projects/${projectId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression.');

      AppState.projects = AppState.projects.filter(p => p.id !== projectId);
      renderProjects(AppState.projects);
      showToast('Projet supprimé.', 'info');
    } catch (err) {
      console.error('Delete project error:', err);
      showToast(err.message, 'error');
    }
  }

  // Mark all notifications read
  async function markAllNotificationsRead() {
    try {
      await fetch('/api/user/notifications/mark-read', { method: 'PUT' });
      AppState.notifications.forEach(n => { n.unread = false; });
      renderNotifications(AppState.notifications);
      showToast('Toutes les notifications sont marquées comme lues');
    } catch (err) {
      console.error('Mark read error:', err);
    }
  }

  // ==========================================================================
  // EVENT LISTENERS INITIALIZATION
  // ==========================================================================
  function initEventListeners() {
    // Nav links click
    DOM.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const viewId = link.getAttribute('data-view');
        if (viewId) {
          e.preventDefault();
          switchView(viewId);
        }
      });
    });

    // Sidebar User Profile click -> Settings
    const sidebarProfileBtn = document.getElementById('sidebarUserProfileBtn');
    if (sidebarProfileBtn) {
      sidebarProfileBtn.addEventListener('click', () => {
        switchView('view-settings');
      });
    }

    // Sidebar Mobile Drawer toggles
    if (DOM.hamburgerBtn) DOM.hamburgerBtn.addEventListener('click', openSidebar);
    if (DOM.sidebarCloseBtn) DOM.sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeSidebar);

    // Keyboard Shortcuts (Ctrl + K / Cmd + K)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') {
        closeCommandPalette();
        closeSidebar();
        if (DOM.notificationsDrawer) DOM.notificationsDrawer.classList.remove('active');
        if (DOM.topbarDropdownMenu) DOM.topbarDropdownMenu.classList.remove('active');
      }
    });

    // Topbar Search triggers
    if (DOM.topbarSearchBox) DOM.topbarSearchBox.addEventListener('click', openCommandPalette);
    if (DOM.mobileSearchBtn) DOM.mobileSearchBtn.addEventListener('click', openCommandPalette);
    if (DOM.commandPaletteClose) DOM.commandPaletteClose.addEventListener('click', closeCommandPalette);

    // Notification bell trigger & mark read
    if (DOM.notificationBtn) DOM.notificationBtn.addEventListener('click', toggleNotifications);
    if (DOM.markAllReadBtn) DOM.markAllReadBtn.addEventListener('click', markAllNotificationsRead);

    // Hero Prompt Submit
    if (DOM.heroPromptBtn) DOM.heroPromptBtn.addEventListener('click', handleHeroPromptSubmit);
    if (DOM.heroPromptInput) {
      DOM.heroPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleHeroPromptSubmit();
      });
    }

    // Delegate quick start action clicks
    document.querySelectorAll('[data-quick-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-quick-action');
        switchView('view-studio');
        showToast(`Assistant de création démarré (${action})`);
      });
    });

    // Hash Navigation
    const HashMap = {
      '#accueil': 'view-accueil',
      '#studio': 'view-studio',
      '#editor': 'view-editor',
      '#projets': 'view-projects',
      '#modeles': 'view-templates',
      '#mediatheque': 'view-media',
      '#voix': 'view-voices',
      '#utilisation': 'view-analytics',
      '#abonnement': 'view-billing',
      '#parametres': 'view-settings',
      '#public': 'view-public',
      '#aide': 'view-help'
    };

    function handleHash() {
      const hash = window.location.hash || '#accueil';
      if (HashMap[hash]) {
        switchView(HashMap[hash]);
      }
    }

    handleHash();
    window.addEventListener('hashchange', handleHash);
  }

  function handleHeroPromptSubmit() {
    const promptText = DOM.heroPromptInput ? DOM.heroPromptInput.value.trim() : '';
    if (!promptText) {
      showToast('Veuillez décrire votre idée de vidéo...', 'warning');
      if (DOM.heroPromptInput) DOM.heroPromptInput.focus();
      return;
    }

    switchView('view-studio');
    const studioInput = document.getElementById('studioPromptInput');
    if (studioInput) studioInput.value = promptText;
    showToast('Idée transmise au Studio IA !');
  }

  // Global Exports for view sub-controllers
  window.VYDEORA = {
    AppState,
    switchView,
    showToast,
    openCommandPalette,
    closeCommandPalette,
    saveProject,
    deleteProject,
    loadUserData
  };

  // Bootstrap when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initTopbarDropdown();
    initAvatarHandlers();
    initSettingsForms();
    initLogoutTriggers();
    initBillingCycleSwitcher();
    loadUserData();
  });

})();
