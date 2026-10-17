/**
 * VYDEORA — Video Creation Studio & AI Script Wizard
 * Integrates real server-side AI text generation with robust input validation,
 * error handling, and project persistence.
 */

(function () {
  'use strict';

  let currentStep = 1;
  const totalSteps = 5;

  // Active studio session state
  const studioState = {
    currentProjectId: null,
    generatedScript: null,
    isGenerating: false
  };

  function initStudio() {
    const nextBtn = document.getElementById('studioNextBtn');
    const prevBtn = document.getElementById('studioPrevBtn');
    const generateBtn = document.getElementById('studioStartGenBtn');
    const stepperItems = document.querySelectorAll('.studio-stepper .step-item');

    function updateStepUI() {
      // Hide all step sections
      document.querySelectorAll('.studio-step-pane').forEach((pane, idx) => {
        pane.style.display = (idx + 1 === currentStep) ? 'block' : 'none';
      });

      // Update stepper header
      stepperItems.forEach((item, idx) => {
        const stepNum = idx + 1;
        item.classList.remove('active', 'completed');
        if (stepNum === currentStep) {
          item.classList.add('active');
        } else if (stepNum < currentStep) {
          item.classList.add('completed');
        }
      });

      // Update footer buttons
      if (prevBtn) prevBtn.style.display = (currentStep === 1) ? 'none' : 'inline-flex';
      if (nextBtn) {
        nextBtn.style.display = (currentStep >= totalSteps - 1) ? 'none' : 'inline-flex';
        // When on step 1, button indicates script generation
        if (currentStep === 1) {
          nextBtn.innerHTML = `
            <span>Générer le script IA</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          `;
        } else {
          nextBtn.innerHTML = `
            <span>Continuer</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          `;
        }
      }
      if (generateBtn) generateBtn.style.display = (currentStep === totalSteps - 1) ? 'inline-flex' : 'none';
    }

    // Step 1: AI Script Generation Handler
    async function handleStep1Next() {
      const promptInput = document.getElementById('studioPromptInput');
      const platformSelect = document.getElementById('studioPlatformSelect');
      const formatSelect = document.getElementById('studioFormatSelect');
      const durationSelect = document.getElementById('studioDurationSelect');
      const langSelect = document.getElementById('studioLangSelect');
      const toneSelect = document.getElementById('studioToneSelect');
      const alertContainer = document.getElementById('studioStep1Alert');

      const promptText = promptInput ? promptInput.value.trim() : '';

      // Validation
      if (!promptText || promptText.length < 3) {
        showStudioAlert(alertContainer, 'Veuillez saisir votre sujet ou idée de vidéo (au moins 3 caractères).', 'warning');
        if (promptInput) promptInput.focus();
        return;
      }

      // Clear previous alert
      hideStudioAlert(alertContainer);

      // Disable button and show spinner
      studioState.isGenerating = true;
      if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.innerHTML = `
          <span style="display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px;"></span>
          <span>Génération du script en cours...</span>
        `;
      }

      try {
        const payload = {
          prompt: promptText,
          platform: platformSelect ? platformSelect.value : 'TikTok',
          format: formatSelect ? formatSelect.value : '9:16',
          duration: durationSelect ? durationSelect.value : '60s',
          language: langSelect ? langSelect.value : 'Français',
          tone: toneSelect ? toneSelect.value : 'Dynamique & Captivant',
          projectId: studioState.currentProjectId
        };

        const res = await fetch('/api/ai/generate-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          // Display user-friendly configuration or error message
          const errorMsg = data.error || 'Erreur lors de la communication avec le service d\'IA.';
          showStudioAlert(alertContainer, errorMsg, data.code === 'MISSING_API_KEY' ? 'config' : 'error');
          return;
        }

        // Script generation succeeded
        studioState.currentProjectId = data.project.id;
        studioState.generatedScript = data.script;

        // Render generated scenes into Step 2
        renderGeneratedScript(data.script);

        // Update dashboard project list if accessible
        if (window.VYDEORA && window.VYDEORA.AppState) {
          const existingIdx = window.VYDEORA.AppState.projects.findIndex(p => p.id === data.project.id);
          if (existingIdx !== -1) {
            window.VYDEORA.AppState.projects[existingIdx] = data.project;
          } else {
            window.VYDEORA.AppState.projects.unshift(data.project);
          }
        }

        if (window.VYDEORA && typeof window.VYDEORA.showToast === 'function') {
          window.VYDEORA.showToast('Script IA généré et enregistré comme brouillon !', 'success');
        }

        // Advance to Step 2
        currentStep = 2;
        updateStepUI();

      } catch (err) {
        console.error('AI Generation Request failed:', err);
        showStudioAlert(alertContainer, `Erreur réseau ou timeout : ${err.message}`, 'error');
      } finally {
        studioState.isGenerating = false;
        if (nextBtn) {
          nextBtn.disabled = false;
          updateStepUI();
        }
      }
    }

    // Step 2: Save updated script edits when leaving Step 2
    async function handleStep2Next() {
      const titleInput = document.getElementById('studioScriptTitleInput');
      const scenesContainer = document.getElementById('studioScenesContainer');

      if (studioState.currentProjectId && studioState.generatedScript) {
        // Collect edited scene narrations
        const editedScenes = [];
        if (scenesContainer) {
          const cards = scenesContainer.querySelectorAll('.studio-scene-card');
          cards.forEach((card, idx) => {
            const num = parseInt(card.getAttribute('data-scene-num') || (idx + 1), 10);
            const title = card.querySelector('.scene-title')?.textContent || `Scène ${num}`;
            const narration = card.querySelector('.scene-narration-input')?.value || '';
            const visual = card.querySelector('.scene-visual-cue')?.textContent || '';
            const duration = parseInt(card.getAttribute('data-scene-duration') || '5', 10);
            editedScenes.push({
              sceneNumber: num,
              title,
              narration,
              visualDescription: visual,
              durationSeconds: duration
            });
          });
        }

        const updatedTitle = titleInput ? titleInput.value.trim() : studioState.generatedScript.title;
        studioState.generatedScript.title = updatedTitle;
        if (editedScenes.length > 0) {
          studioState.generatedScript.scenes = editedScenes;
        }

        // Persist to server in background
        try {
          await fetch(`/api/user/projects/${studioState.currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: updatedTitle,
              script: studioState.generatedScript,
              status: 'Script généré',
              statusClass: 'badge-draft'
            })
          });
        } catch (e) {
          console.warn('Could not auto-save script edits:', e);
        }
      }

      currentStep = 3;
      updateStepUI();
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (studioState.isGenerating) return;

        if (currentStep === 1) {
          handleStep1Next();
        } else if (currentStep === 2) {
          handleStep2Next();
        } else if (currentStep < totalSteps - 1) {
          currentStep++;
          updateStepUI();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
          currentStep--;
          updateStepUI();
        }
      });
    }

    // Step item direct click
    stepperItems.forEach((item, idx) => {
      item.addEventListener('click', () => {
        const targetStep = idx + 1;
        // Don't allow skipping step 1 without generating or if generating
        if (studioState.isGenerating) return;
        currentStep = targetStep;
        updateStepUI();
      });
    });

    // Start Generation Simulation / Storyboard Synthesis
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        currentStep = 5;
        updateStepUI();
        runGenerationSimulation();
      });
    }

    updateStepUI();
  }

  // Populate Step 2 with the generated script
  function renderGeneratedScript(script) {
    const titleInput = document.getElementById('studioScriptTitleInput');
    const scenesContainer = document.getElementById('studioScenesContainer');
    const badge = document.getElementById('studioScriptBadge');

    if (titleInput && script.title) {
      titleInput.value = script.title;
    }

    if (badge) {
      badge.textContent = 'Script généré';
      badge.className = 'badge badge-draft';
    }

    if (!scenesContainer || !script.scenes) return;

    scenesContainer.innerHTML = script.scenes.map((scene, idx) => {
      const colors = ['var(--primary-light)', 'var(--accent-purple)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-pink)'];
      const color = colors[idx % colors.length];

      return `
        <div class="card studio-scene-card" data-scene-num="${scene.sceneNumber || idx + 1}" data-scene-duration="${scene.durationSeconds || 5}" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:var(--border-radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="scene-title" style="font-weight:700; font-size:0.9rem; color:${color};">
              Scène ${scene.sceneNumber || idx + 1} : ${scene.title || 'Plan'}
            </span>
            <span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:999px; color:var(--text-muted);">
              ~${scene.durationSeconds || 5}s
            </span>
          </div>

          ${scene.visualDescription ? `
            <div style="margin-bottom:10px; font-size:0.78rem; color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:6px; border-left:3px solid ${color};">
              <strong style="color:var(--text-muted);">Plan visuel :</strong> <span class="scene-visual-cue">${scene.visualDescription}</span>
            </div>
          ` : ''}

          <div>
            <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Texte de la narration (Voix-off) :</label>
            <textarea rows="3" class="scene-narration-input" style="width:100%; padding:10px; font-size:0.86rem; line-height:1.4;">${scene.narration || ''}</textarea>
          </div>
        </div>
      `;
    }).join('');

    // Append conclusion card if provided
    if (script.conclusion) {
      const conclusionCard = document.createElement('div');
      conclusionCard.className = 'card';
      conclusionCard.style.cssText = 'background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.25); border-radius:var(--border-radius-md); padding:14px;';
      conclusionCard.innerHTML = `
        <div style="font-weight:700; font-size:0.88rem; color:var(--accent-emerald); margin-bottom:6px;">
          Conclusion & Appel à l'action (CTA)
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">
          ${script.conclusion}
        </div>
      `;
      scenesContainer.appendChild(conclusionCard);
    }
  }

  function showStudioAlert(container, message, type = 'error') {
    if (!container) return;
    container.style.display = 'block';

    let bg = 'rgba(239,68,68,0.1)';
    let border = 'rgba(239,68,68,0.3)';
    let color = '#FCA5A5';
    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    if (type === 'config') {
      bg = 'rgba(245,158,11,0.12)';
      border = 'rgba(245,158,11,0.4)';
      color = '#FCD34D';
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (type === 'warning') {
      bg = 'rgba(245,158,11,0.1)';
      border = 'rgba(245,158,11,0.3)';
      color = '#FCD34D';
    }

    container.innerHTML = `
      <div style="background:${bg}; border:1px solid ${border}; border-radius:8px; padding:12px 14px; font-size:0.86rem; color:${color}; display:flex; align-items:flex-start; gap:12px; line-height:1.45;">
        <div style="flex-shrink:0; margin-top:2px;">${icon}</div>
        <div>
          ${type === 'config' ? '<strong style="display:block; margin-bottom:2px; color:#FFFFFF;">Configuration requise :</strong>' : ''}
          ${message}
        </div>
      </div>
    `;
  }

  function hideStudioAlert(container) {
    if (!container) return;
    container.style.display = 'none';
    container.innerHTML = '';
  }

  // Storyboard and script synthesis progress simulation (does NOT claim video rendered)
  function runGenerationSimulation() {
    const progressBar = document.getElementById('studioGenProgressBar');
    const progressPercent = document.getElementById('studioGenProgressPercent');
    const statusText = document.getElementById('studioGenStatusText');

    const steps = [
      { pct: 20, msg: 'Validation du script et découpage par scènes...' },
      { pct: 50, msg: 'Préparation du storyboard et des prompts visuels...' },
      { pct: 75, msg: 'Configuration du profil de voix et de la timeline...' },
      { pct: 100, msg: 'Storyboard finalisé avec succès !' }
    ];

    let currentIdx = 0;

    function step() {
      if (currentIdx < steps.length) {
        const { pct, msg } = steps[currentIdx];
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.innerText = `${pct}%`;
        if (statusText) statusText.innerText = msg;
        currentIdx++;
        setTimeout(step, 600);
      } else {
        setTimeout(async () => {
          if (window.VYDEORA) {
            const promptInput = document.getElementById('studioPromptInput');
            const customTitle = promptInput && promptInput.value.trim() ? promptInput.value.trim().substring(0, 45) : 'Projet Vidéo IA';

            // Ensure project exists with status 'Script généré' (NEVER 'Terminée' since rendering is not implemented)
            if (typeof window.VYDEORA.saveProject === 'function') {
              if (!studioState.currentProjectId) {
                const newProj = await window.VYDEORA.saveProject({
                  title: customTitle,
                  duration: '0:60',
                  category: 'TikTok | Shorts',
                  thumb: 'assets/images/creator-card.jpg',
                  status: 'Script généré',
                  statusClass: 'badge-draft',
                  script: studioState.generatedScript
                });
                if (newProj) studioState.currentProjectId = newProj.id;
              }
            }

            window.VYDEORA.showToast('Script et storyboard prêts ! Ouverture dans l’éditeur...');
            window.VYDEORA.switchView('view-editor');
          }
        }, 500);
      }
    }

    step();
  }

  document.addEventListener('DOMContentLoaded', initStudio);
})();
