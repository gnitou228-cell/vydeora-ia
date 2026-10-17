/**
 * VYDEORA — Video Editor Workspace & Timeline Controller
 */

(function () {
  'use strict';

  let isPlaying = false;
  let currentTime = 14; // seconds
  const totalDuration = 62; // 1:02
  let playInterval = null;

  function initEditor() {
    const playPauseBtn = document.getElementById('editorPlayPauseBtn');
    const playhead = document.getElementById('timelinePlayhead');
    const timeDisplay = document.getElementById('editorTimeDisplay');
    const subtitleInput = document.getElementById('editorSubtitleInput');
    const subtitleOverlay = document.getElementById('editorSubtitleOverlay');
    const aspectBtns = document.querySelectorAll('.aspect-btn');
    const videoFrame = document.getElementById('videoFrameContainer');
    const exportBtn = document.getElementById('editorExportBtn');
    const exportModal = document.getElementById('exportModal');
    const exportModalClose = document.getElementById('exportModalClose');
    const startExportDownloadBtn = document.getElementById('startExportDownloadBtn');

    // Aspect Ratio switching
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ratio = btn.getAttribute('data-ratio');
        if (videoFrame) {
          videoFrame.className = `video-frame-container ratio-${ratio.replace(':', '-')}`;
        }
        if (window.VYDEORA) window.VYDEORA.showToast(`Format vidéo modifié : ${ratio}`);
      });
    });

    // Subtitle live edit
    if (subtitleInput && subtitleOverlay) {
      subtitleInput.addEventListener('input', () => {
        subtitleOverlay.innerText = subtitleInput.value || 'Votre texte de sous-titre ici';
      });
    }

    // Play / Pause Logic
    function formatTime(secs) {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function updateTimeUI() {
      if (timeDisplay) {
        timeDisplay.innerText = `${formatTime(currentTime)} / ${formatTime(totalDuration)}`;
      }
      if (playhead) {
        const pct = (currentTime / totalDuration) * 100;
        playhead.style.left = `${pct}%`;
      }
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          playPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          `;
          playInterval = setInterval(() => {
            currentTime += 0.5;
            if (currentTime >= totalDuration) {
              currentTime = 0;
            }
            updateTimeUI();
          }, 500);
        } else {
          playPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          `;
          clearInterval(playInterval);
        }
      });
    }

    // Export Modal
    if (exportBtn && exportModal) {
      exportBtn.addEventListener('click', () => {
        exportModal.classList.add('active');
      });
    }

    if (exportModalClose && exportModal) {
      exportModalClose.addEventListener('click', () => {
        exportModal.classList.remove('active');
      });
    }

    if (startExportDownloadBtn && exportModal) {
      startExportDownloadBtn.addEventListener('click', () => {
        startExportDownloadBtn.disabled = true;
        startExportDownloadBtn.innerText = 'Encodage MP4 1080p en cours (78%)...';
        setTimeout(() => {
          startExportDownloadBtn.disabled = false;
          startExportDownloadBtn.innerText = 'Télécharger la vidéo MP4';
          exportModal.classList.remove('active');
          if (window.VYDEORA) window.VYDEORA.showToast('Vidéo exportée avec succès ! Téléchargement démarré.');
        }, 1200);
      });
    }

    updateTimeUI();
  }

  document.addEventListener('DOMContentLoaded', initEditor);
})();
