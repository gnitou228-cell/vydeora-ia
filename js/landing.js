/**
 * VYDEORA — Master Landing Page Interactions & Conversion Engine
 */

(function () {
  'use strict';

  // State
  let isAnnualBilling = false;

  const PricingData = {
    monthly: {
      free: { price: '0', period: '/mois' },
      starter: { price: '9 500', period: '/mois' },
      pro: { price: '19 000', period: '/mois' },
      enterprise: { price: '59 000', period: '/mois' }
    },
    annual: {
      free: { price: '0', period: '/mois' },
      starter: { price: '7 500', period: '/mois (facturé annuellement)' },
      pro: { price: '15 000', period: '/mois (facturé annuellement)' },
      enterprise: { price: '47 000', period: '/mois (facturé annuellement)' }
    }
  };

  function trackEvent(eventName, payload = {}) {
    console.log(`📊 [VYDEORA Analytics] ${eventName}`, payload);
  }

  // DOM Elements
  const header = document.getElementById('landingHeader');
  const hamburgerBtn = document.getElementById('landingHamburger');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerCloseBtn = document.getElementById('drawerClose');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const billingSwitch = document.getElementById('billingSwitch');
  const monthlyLabel = document.getElementById('monthlyLabel');
  const annualLabel = document.getElementById('annualLabel');
  const authModal = document.getElementById('authModal');
  const authModalClose = document.getElementById('authModalClose');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const demoModal = document.getElementById('demoModal');
  const demoModalClose = document.getElementById('demoModalClose');
  const demoModalTitle = document.getElementById('demoModalTitle');
  const demoModalCategory = document.getElementById('demoModalCategory');
  const demoModalDesc = document.getElementById('demoModalDesc');
  const demoModalImage = document.getElementById('demoModalImage');

  // Sticky Header Scroll Effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      if (header) header.classList.add('scrolled');
    } else {
      if (header) header.classList.remove('scrolled');
    }
  });

  // Mobile Drawer
  function openDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('open');
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  document.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Pricing Toggle
  function updatePricingUI() {
    const data = isAnnualBilling ? PricingData.annual : PricingData.monthly;
    
    if (billingSwitch) {
      billingSwitch.classList.toggle('annual', isAnnualBilling);
    }
    if (monthlyLabel) monthlyLabel.classList.toggle('active', !isAnnualBilling);
    if (annualLabel) annualLabel.classList.toggle('active', isAnnualBilling);

    for (const [planKey, planVals] of Object.entries(data)) {
      const priceNumEl = document.getElementById(`price-${planKey}`);
      const pricePeriodEl = document.getElementById(`period-${planKey}`);
      if (priceNumEl) priceNumEl.innerText = planVals.price;
      if (pricePeriodEl) pricePeriodEl.innerText = planVals.period;
    }

    trackEvent('pricing_toggle', { isAnnual: isAnnualBilling });
  }

  if (billingSwitch) {
    billingSwitch.addEventListener('click', () => {
      isAnnualBilling = !isAnnualBilling;
      updatePricingUI();
    });
  }

  if (monthlyLabel) {
    monthlyLabel.addEventListener('click', () => {
      isAnnualBilling = false;
      updatePricingUI();
    });
  }

  if (annualLabel) {
    annualLabel.addEventListener('click', () => {
      isAnnualBilling = true;
      updatePricingUI();
    });
  }

  // Showcase Filters
  const filterChips = document.querySelectorAll('.filter-chip');
  const showcaseCards = document.querySelectorAll('.showcase-card');

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const category = chip.getAttribute('data-category');

      showcaseCards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'all' || cardCat === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      trackEvent('showcase_filter_change', { category });
    });
  });

  // Showcase Card Click -> Demo Modal
  showcaseCards.forEach(card => {
    card.addEventListener('click', () => {
      const title = card.getAttribute('data-title');
      const category = card.getAttribute('data-category-label');
      const desc = card.getAttribute('data-desc');
      const img = card.querySelector('img') ? card.querySelector('img').src : '';

      if (demoModalTitle) demoModalTitle.innerText = title;
      if (demoModalCategory) demoModalCategory.innerText = category;
      if (demoModalDesc) demoModalDesc.innerText = desc;
      if (demoModalImage) demoModalImage.src = img;

      if (demoModal) demoModal.classList.add('active');
      trackEvent('showcase_card_view', { title });
    });
  });

  if (demoModalClose && demoModal) {
    demoModalClose.addEventListener('click', () => {
      demoModal.classList.remove('active');
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        // Close others
        faqItems.forEach(i => i.classList.remove('open'));
        if (!wasOpen) {
          item.classList.add('open');
          trackEvent('faq_expand', { question: questionBtn.innerText.trim() });
        }
      });
    }
  });

  // Auth Modal
  function openAuth(mode = 'signup') {
    if (!authModal) return;
    authModal.classList.add('active');
    switchAuthTab(mode);
    trackEvent('auth_modal_open', { mode });
  }

  function closeAuth() {
    if (authModal) authModal.classList.remove('active');
  }

  function switchAuthTab(mode) {
    if (mode === 'login') {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabSignup) tabSignup.classList.remove('active');
      if (loginForm) loginForm.style.display = 'flex';
      if (signupForm) signupForm.style.display = 'none';
    } else {
      if (tabSignup) tabSignup.classList.add('active');
      if (tabLogin) tabLogin.classList.remove('active');
      if (signupForm) signupForm.style.display = 'flex';
      if (loginForm) loginForm.style.display = 'none';
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => switchAuthTab('signup'));
  if (authModalClose) authModalClose.addEventListener('click', closeAuth);

  // Trigger Auth from buttons
  document.querySelectorAll('[data-auth-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = btn.getAttribute('data-auth-trigger');
      openAuth(mode);
    });
  });

  // Helper to show auth error
  function showAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  function hideAuthError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  // Handle Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthError('loginError');

      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      const submitBtn = document.getElementById('loginSubmitBtn') || loginForm.querySelector('button[type="submit"]');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        showAuthError('loginError', 'Veuillez renseigner votre email et mot de passe.');
        return;
      }

      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Connexion en cours...</span>';
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          showAuthError('loginError', data.error || 'Erreur de connexion. Vérifiez vos identifiants.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
          return;
        }

        trackEvent('login_success', { userId: data.user.id });
        
        // Redirect to intended route or default dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect') || '/app';
        window.location.href = redirectUrl;

      } catch (err) {
        console.error('Login request failed:', err);
        showAuthError('loginError', 'Impossible de joindre le serveur. Veuillez réessayer.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // Handle Sign Up Form Submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthError('signupError');

      const fullNameInput = document.getElementById('signupFullName');
      const emailInput = document.getElementById('signupEmail');
      const passwordInput = document.getElementById('signupPassword');
      const passwordConfirmInput = document.getElementById('signupPasswordConfirm');
      const termsInput = document.getElementById('signupTerms');
      const submitBtn = document.getElementById('signupSubmitBtn') || signupForm.querySelector('button[type="submit"]');

      const fullName = fullNameInput ? fullNameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value : '';
      const terms = termsInput ? termsInput.checked : false;

      // Client-side validations
      if (!fullName || fullName.length < 2) {
        showAuthError('signupError', 'Veuillez saisir votre nom complet (au moins 2 caractères).');
        if (fullNameInput) fullNameInput.focus();
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthError('signupError', 'Veuillez saisir une adresse e-mail valide.');
        if (emailInput) emailInput.focus();
        return;
      }

      if (!password || password.length < 8) {
        showAuthError('signupError', 'Le mot de passe doit comporter au moins 8 caractères.');
        if (passwordInput) passwordInput.focus();
        return;
      }

      if (password !== passwordConfirm) {
        showAuthError('signupError', 'Les mots de passe ne correspondent pas.');
        if (passwordConfirmInput) passwordConfirmInput.focus();
        return;
      }

      if (!terms) {
        showAuthError('signupError', 'Vous devez accepter les conditions d\'utilisation pour continuer.');
        return;
      }

      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Création de votre compte...</span>';
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            password,
            passwordConfirm,
            terms
          })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          showAuthError('signupError', data.error || 'Erreur lors de l\'inscription.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
          }
          return;
        }

        trackEvent('signup_success', { userId: data.user.id });
        
        // Redirect to Studio onboarding with 100 free credits
        window.location.href = '/app#studio';

      } catch (err) {
        console.error('Registration request failed:', err);
        showAuthError('signupError', 'Impossible de joindre le serveur. Veuillez réessayer.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // Handle URL Query Parameters (e.g. ?auth=login or ?auth=signup)
  window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authAction = urlParams.get('auth');
    if (authAction === 'login' || authAction === 'signup') {
      openAuth(authAction);
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Track Hero Primary CTA
  const heroPrimaryCta = document.getElementById('heroPrimaryCta');
  if (heroPrimaryCta) {
    heroPrimaryCta.addEventListener('click', () => {
      trackEvent('hero_primary_cta_click');
    });
  }

  // Initialize
  updatePricingUI();

})();
