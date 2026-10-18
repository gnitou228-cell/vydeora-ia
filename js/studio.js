/**
 * VYDEORA — Video Creation Studio & AI Voice Wizard
 * Integrates real server-side AI text generation and text-to-speech voice generation (TTS),
 * with audio preview, voice selection, credit deduction, and player controls.
 */

(function () {
  'use strict';

  let currentStep = 1;
  const totalSteps = 5;

  // Active studio session state
  const studioState = {
    currentProjectId: null,
    generatedScript: null,
    selectedVoiceId: 'thomas',
    generatedAudioUrl: null,
    isGenerating: false,
    isGeneratingVoice: false
  };

  // Sample voice preview texts
  const VOICE_SAMPLES = {
    thomas: "Bienvenue sur VYDEORA ! Prêt à transformer vos idées en vidéos virales ?",
    sarah: "Aujourd'hui, découvrez comment capter l'attention dès les premières secondes.",
    lucas: "Optimisez vos résultats avec des contenus visuels percutants et clairs.",
    emma: "Voici le secret que personne ne vous a jamais révélé sur les algorithmes !"
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

      // If entering Step 3, refresh narration stats
      if (currentStep === 3) {
        updateStep3NarrationStats();
      }

      // Update footer buttons
      if (prevBtn) prevBtn.style.display = (currentStep === 1) ? 'none' : 'inline-flex';
      if (nextBtn) {
        nextBtn.style.display = (currentStep >= totalSteps - 1) ? 'none' : 'inline-flex';
        // Dynamic labels based on active step
        if (currentStep === 1) {
          nextBtn.innerHTML = `
            <span>Générer le script IA</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          `;
        } else if (currentStep === 2) {
          nextBtn.innerHTML = `
            <span>Choisir la voix IA</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          `;
        } else if (currentStep === 3) {
          nextBtn.innerHTML = `
            <span>Étape visuelle suivante</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
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

    // ========================================================================
    // STEP 1: AI Script Generation Handler
    // ========================================================================
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

    // ========================================================================
    // STEP 2: Save updated script edits when leaving Step 2
    // ========================================================================
    async function handleStep2Next() {
      const titleInput = document.getElementById('studioScriptTitleInput');
      const scenesContainer = document.getElementById('studioScenesContainer');

      if (studioState.currentProjectId && studioState.generatedScript) {
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

    // Wizard navigation click bindings
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (studioState.isGenerating || studioState.isGeneratingVoice) return;

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
        if (studioState.isGenerating || studioState.isGeneratingVoice) return;
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

    // ========================================================================
    // STEP 3: Voice Selection, Previews & Generation Handlers
    // ========================================================================
    setupStep3Listeners();

    updateStepUI();
  }

  // Extract combined narration text from Step 2 scene inputs
  function getFullNarrationText() {
    const scenesContainer = document.getElementById('studioScenesContainer');
    if (!scenesContainer) return '';

    const textareas = scenesContainer.querySelectorAll('.scene-narration-input');
    const narrations = [];
    textareas.forEach(ta => {
      const val = ta.value.trim();
      if (val) narrations.push(val);
    });

    return narrations.join(' ');
  }

  // Update narration word count and estimated duration
  function updateStep3NarrationStats() {
    const text = getFullNarrationText();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const speedSelect = document.getElementById('studioVoiceSpeedSelect');
    const speed = speedSelect ? parseFloat(speedSelect.value) || 1.0 : 1.0;

    // Standard speaking rate: ~130 words per minute
    const durationSeconds = Math.max(3, Math.ceil((words / (130 * speed)) * 60));

    const wordCountEl = document.getElementById('studioNarrationWordCount');
    const durationEl = document.getElementById('studioNarrationEstDuration');

    if (wordCountEl) {
      wordCountEl.textContent = `${words} mot${words > 1 ? 's' : ''}`;
    }
    if (durationEl) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const formatted = mins > 0 ? `${mins}m ${secs}s` : `~${durationSeconds}s`;
      durationEl.textContent = formatted;
    }
  }

  // Setup Step 3 Listeners
  function setupStep3Listeners() {
    const voiceCards = document.querySelectorAll('.voice-select-card');
    const speedSelect = document.getElementById('studioVoiceSpeedSelect');
    const volumeRange = document.getElementById('studioVoiceVolumeRange');
    const volumeVal = document.getElementById('studioVoiceVolumeVal');
    const genVoiceBtn = document.getElementById('studioVoiceGenBtn');
    const demoVoiceBtn = document.getElementById('studioVoiceDemoBtn');

    // Voice card selection
    voiceCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-preview-voice')) return;
        const voiceId = card.getAttribute('data-voice-id');
        studioState.selectedVoiceId = voiceId;

        voiceCards.forEach(c => {
          const isSelected = c.getAttribute('data-voice-id') === voiceId;
          c.classList.toggle('active', isSelected);
          c.style.borderColor = isSelected ? 'var(--primary-light)' : 'var(--border-subtle)';
          c.style.background = isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)';
          const check = c.querySelector('.voice-check-icon');
          if (check) check.style.display = isSelected ? 'inline' : 'none';
        });
      });
    });

    // Voice preview buttons (Audio sample speech)
    document.querySelectorAll('.btn-preview-voice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const voiceId = btn.getAttribute('data-voice-id');
        playVoicePreview(voiceId, btn);
      });
    });

    // Speed change listener
    if (speedSelect) {
      speedSelect.addEventListener('change', updateStep3NarrationStats);
    }

    // Volume range listener
    if (volumeRange && volumeVal) {
      volumeRange.addEventListener('input', () => {
        volumeVal.textContent = `${volumeRange.value}%`;
        const audioEl = document.getElementById('studioAudioElement');
        if (audioEl) {
          audioEl.volume = volumeRange.value / 100;
        }
      });
    }

    // Real Voice Generation
    if (genVoiceBtn) {
      genVoiceBtn.addEventListener('click', () => handleVoiceGeneration(false));
    }

    // Free Preview/Demo Voice Generation
    if (demoVoiceBtn) {
      demoVoiceBtn.addEventListener('click', () => handleVoiceGeneration(true));
    }
  }

  // Play audio sample or speech preview
  function playVoicePreview(voiceId, buttonEl) {
    const originalText = buttonEl ? buttonEl.innerHTML : '';
    if (buttonEl) {
      buttonEl.innerHTML = '<span>🔊 Lecture en cours...</span>';
      buttonEl.disabled = true;
    }

    const sampleText = VOICE_SAMPLES[voiceId] || VOICE_SAMPLES.thomas;

    // Use Web Speech API if supported for instant browser preview
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = 'fr-FR';

      if (voiceId === 'sarah' || voiceId === 'emma') {
        utterance.pitch = 1.15;
      } else {
        utterance.pitch = 0.95;
      }

      utterance.onend = () => {
        if (buttonEl) {
          buttonEl.innerHTML = originalText;
          buttonEl.disabled = false;
        }
      };

      utterance.onerror = () => {
        if (buttonEl) {
          buttonEl.innerHTML = originalText;
          buttonEl.disabled = false;
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback timeout simulation
      setTimeout(() => {
        if (buttonEl) {
          buttonEl.innerHTML = originalText;
          buttonEl.disabled = false;
        }
      }, 2500);
    }
  }

  // Execute Voice Generation API call
  async function handleVoiceGeneration(isDemo = false) {
    const alertContainer = document.getElementById('studioStep3Alert');
    const genBtn = document.getElementById('studioVoiceGenBtn');
    const demoBtn = document.getElementById('studioVoiceDemoBtn');
    const speedSelect = document.getElementById('studioVoiceSpeedSelect');

    const narrationText = getFullNarrationText();
    const speed = speedSelect ? parseFloat(speedSelect.value) || 1.0 : 1.0;

    if (!narrationText || narrationText.length < 3) {
      showStudioAlert(alertContainer, 'Veuillez saisir le texte de votre script (Étape 2) avant de générer la voix off.', 'warning');
      return;
    }

    hideStudioAlert(alertContainer);
    studioState.isGeneratingVoice = true;

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = `
        <span style="display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px;"></span>
        <span>Génération vocale IA en cours...</span>
      `;
    }
    if (demoBtn) demoBtn.disabled = true;

    try {
      const res = await fetch('/api/ai/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: narrationText,
          voiceId: studioState.selectedVoiceId || 'thomas',
          speed: speed,
          projectId: studioState.currentProjectId,
          isDemo: isDemo
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Erreur lors de la génération de la voix off.';
        showStudioAlert(alertContainer, errorMsg, data.code === 'MISSING_API_KEY' ? 'config' : 'error');
        return;
      }

      // Success
      studioState.generatedAudioUrl = data.audioUrl;

      // Update credit balance in dashboard UI
      if (data.creditsRemaining !== undefined && window.VYDEORA && window.VYDEORA.AppState) {
        if (window.VYDEORA.AppState.entitlement) {
          window.VYDEORA.AppState.entitlement.credits = data.creditsRemaining;
          window.VYDEORA.AppState.entitlement.credits_balance = data.creditsRemaining;
        }
        document.querySelectorAll('#navUserCredits, #settingsCreditCount').forEach(el => {
          el.textContent = `${data.creditsRemaining} crédits`;
        });
      }

      // Setup custom audio player
      setupCustomAudioPlayer(data.audioUrl, data.durationSeconds);

      // Update badge
      const voiceBadge = document.getElementById('studioVoiceBadge');
      if (voiceBadge) {
        voiceBadge.textContent = 'Audio synchronisé';
        voiceBadge.className = 'badge badge-success';
      }

      if (window.VYDEORA && typeof window.VYDEORA.showToast === 'function') {
        window.VYDEORA.showToast(`Voix off IA générée avec succès (${data.voice?.name || 'IA'}) !`, 'success');
      }

    } catch (err) {
      console.error('TTS request error:', err);
      showStudioAlert(alertContainer, `Erreur lors de la requête audio : ${err.message}`, 'error');
    } finally {
      studioState.isGeneratingVoice = false;
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          <span>Régénérer la voix off IA (15 crédits)</span>
        `;
      }
      if (demoBtn) demoBtn.disabled = false;
    }
  }

  // Setup the custom audio player with play/pause, time, and slider
  function setupCustomAudioPlayer(audioUrl, estimatedDuration) {
    const card = document.getElementById('studioAudioPlayerCard');
    const audioEl = document.getElementById('studioAudioElement');
    const playBtn = document.getElementById('studioAudioMainPlayBtn');
    const playIcon = document.getElementById('studioAudioPlayIcon');
    const currentEl = document.getElementById('studioAudioCurrentTime');
    const durationEl = document.getElementById('studioAudioTotalDuration');
    const seekSlider = document.getElementById('studioAudioSeekSlider');

    if (!card || !audioEl) return;

    card.style.display = 'block';
    audioEl.src = audioUrl;

    function formatTime(secs) {
      if (isNaN(secs)) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    if (durationEl) {
      durationEl.textContent = formatTime(estimatedDuration || 0);
    }

    audioEl.onloadedmetadata = () => {
      if (durationEl) {
        durationEl.textContent = formatTime(audioEl.duration);
      }
    };

    audioEl.ontimeupdate = () => {
      if (currentEl) {
        currentEl.textContent = formatTime(audioEl.currentTime);
      }
      if (seekSlider && audioEl.duration) {
        seekSlider.value = (audioEl.currentTime / audioEl.duration) * 100;
      }
    };

    audioEl.onended = () => {
      if (playIcon) playIcon.textContent = '▶';
    };

    if (playBtn) {
      playBtn.onclick = () => {
        if (audioEl.paused) {
          audioEl.play().catch(e => console.warn('Audio play prevented:', e));
          if (playIcon) playIcon.textContent = '⏸';
        } else {
          audioEl.pause();
          if (playIcon) playIcon.textContent = '▶';
        }
      };
    }

    if (seekSlider) {
      seekSlider.oninput = () => {
        if (audioEl.duration) {
          audioEl.currentTime = (seekSlider.value / 100) * audioEl.duration;
        }
      };
    }
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
      { pct: 50, msg: 'Synchronisation de la piste audio avec le storyboard...' },
      { pct: 75, msg: 'Préparation des prompts visuels et des sous-titres...' },
      { pct: 100, msg: 'Storyboard et voix off prêts avec succès !' }
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

            if (typeof window.VYDEORA.saveProject === 'function') {
              if (!studioState.currentProjectId) {
                const newProj = await window.VYDEORA.saveProject({
                  title: customTitle,
                  duration: '0:60',
                  category: 'TikTok | Shorts',
                  thumb: 'assets/images/creator-card.jpg',
                  status: studioState.generatedAudioUrl ? 'Audio prêt' : 'Script généré',
                  statusClass: studioState.generatedAudioUrl ? 'badge-info' : 'badge-draft',
                  script: studioState.generatedScript,
                  audioUrl: studioState.generatedAudioUrl
                });
                if (newProj) studioState.currentProjectId = newProj.id;
              }
            }

            window.VYDEORA.showToast('Script et voix off prêts ! Ouverture dans l’éditeur...');
            window.VYDEORA.switchView('view-editor');
          }
        }, 500);
      }
    }

    step();
  }

  document.addEventListener('DOMContentLoaded', initStudio);
})();
