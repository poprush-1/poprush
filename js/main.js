(function() {
  const initApp = () => {
    // Carousel Logic (only if elements exist)
    const track = document.getElementById('carouselTrack');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    if (track) {
      const cards = track.querySelectorAll('.carousel-card');

      function updateCenterCard() {
        const trackRect = track.getBoundingClientRect();
        const trackCenter = trackRect.left + trackRect.width / 2;

        let closestCard = null;
        let minDistance = Infinity;

        cards.forEach(card => {
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(trackCenter - cardCenter);

          if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
          }

          card.classList.remove('is-active');
        });

        if (closestCard) {
          closestCard.classList.add('is-active');
        }
      }

      if (btnPrev && btnNext) {
        btnNext.onclick = () => {
          const firstCard = track.querySelector('.carousel-card');
          if (firstCard) {
            const cardWidth = firstCard.offsetWidth;
            track.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
          }
        };
        btnPrev.onclick = () => {
          const firstCard = track.querySelector('.carousel-card');
          if (firstCard) {
            const cardWidth = firstCard.offsetWidth;
            track.scrollBy({ left: -(cardWidth + 24), behavior: 'smooth' });
          }
        };
      }

      track.onscroll = updateCenterCard;
      window.onresize = updateCenterCard;
      setTimeout(updateCenterCard, 100);
    }

    // Mobile Menu Toggle - Using onclick for absolute certainty and simplicity
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (menuToggle && mobileMenu) {
      menuToggle.onclick = () => {
        const isHidden = mobileMenu.classList.toggle('hidden');
        const icon = menuToggle.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isHidden ? 'menu' : 'close';
      };
    }

    // Update Cart Badge
    window.updateCartBadge = function() {
      const cart = JSON.parse(localStorage.getItem('poprushCart') || '[]');
      const badge = document.getElementById('cartCountBadge');
      if (badge) {
        const count = cart.reduce((acc, item) => acc + item.qty, 0);
        if (count > 0) {
          badge.textContent = count;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    }

    updateCartBadge();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();