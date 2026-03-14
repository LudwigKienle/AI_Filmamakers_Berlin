/* ============================================
   AI Filmmakers Berlin — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_FORM_SUCCESS_MESSAGE = "You're on the list. We'll email you when the next event is confirmed.";

    // ----- Page Loader -----
    const pageLoader = document.getElementById('pageLoader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            pageLoader.classList.add('loaded');
        }, 2000);
    });
    // Fallback: hide loader after 4s even if load event didn't fire
    setTimeout(() => {
        pageLoader.classList.add('loaded');
    }, 4000);

    // ----- Navbar Scroll Effect -----
    const navbar = document.getElementById('navbar');

    const handleScroll = () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ----- Mobile Navigation -----
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ----- Smooth Scroll for Anchor Links -----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ----- Back to Top Button -----
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 600) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }, { passive: true });

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ----- Scroll Reveal Animations -----
    const revealElements = document.querySelectorAll(
        '.feature-card, .past-event-card, .organizer-card, .community-stat-card, .showcase-card, ' +
        '.about-text, .about-features, .community-text, .community-stats-grid, ' +
        '.next-event, .join-card, .section-header, .about-image-wrapper, .founder-card'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ----- Animated Number Counters -----
    function animateCounter(el) {
        const text = el.textContent.trim();
        const match = text.match(/^(\d+)(\+?)$/);
        if (!match) return; // Skip non-numeric like "2024"

        const target = parseInt(match[1], 10);
        const suffix = match[2] || '';
        const duration = 1500;
        const start = performance.now();

        el.textContent = '0' + suffix;

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const numbers = entry.target.querySelectorAll('.stat-number');
                numbers.forEach(el => animateCounter(el));
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }

    // ----- Hero Particles -----
    const particlesContainer = document.getElementById('heroParticles');

    function createParticles() {
        const count = window.innerWidth < 768 ? 12 : 25;
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 8}s`;
            particle.style.animationDuration = `${7 + Math.random() * 6}s`;

            const size = 1 + Math.random() * 2.5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            const colors = [
                'rgba(0, 200, 240, 0.5)',
                'rgba(0, 200, 240, 0.3)',
                'rgba(168, 85, 247, 0.35)',
                'rgba(245, 158, 66, 0.25)'
            ];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];

            particlesContainer.appendChild(particle);
        }
    }

    createParticles();

    // ----- Notify Form -----
    const notifyFrame = document.getElementById('notifySubmitFrame');
    const notifyForms = document.querySelectorAll('.notify-form');
    let notifyFrameReady = false;
    let activeNotifyForm = null;

    if (notifyFrame && notifyForms.length > 0) {
        notifyFrame.addEventListener('load', () => {
            if (!notifyFrameReady) {
                notifyFrameReady = true;
                return;
            }

            if (!activeNotifyForm) {
                return;
            }

            const status = activeNotifyForm.parentElement.querySelector('.notify-status');
            const button = activeNotifyForm.querySelector('button[type="submit"]');
            const buttonLabel = button?.querySelector('span');

            activeNotifyForm.reset();

            if (button) {
                button.disabled = false;
            }

            if (buttonLabel) {
                buttonLabel.textContent = 'Notify me';
            }

            if (status) {
                status.textContent = GOOGLE_FORM_SUCCESS_MESSAGE;
                status.dataset.state = 'success';
            }

            activeNotifyForm = null;
        });

        notifyForms.forEach(form => {
            const emailInput = form.querySelector('input[type="email"]');
            const button = form.querySelector('button[type="submit"]');
            const buttonLabel = button?.querySelector('span');
            const status = form.parentElement.querySelector('.notify-status');

            form.addEventListener('submit', (e) => {
                if (!(emailInput instanceof HTMLInputElement)) {
                    return;
                }

                emailInput.value = emailInput.value.trim();

                if (!emailInput.checkValidity()) {
                    e.preventDefault();

                    if (status) {
                        status.textContent = 'Please enter a valid email address.';
                        status.dataset.state = 'error';
                    }

                    emailInput.focus();
                    return;
                }

                activeNotifyForm = form;

                if (button) {
                    button.disabled = true;
                }

                if (buttonLabel) {
                    buttonLabel.textContent = 'Saving...';
                }

                if (status) {
                    status.textContent = 'Saving your email...';
                    status.dataset.state = '';
                }
            });

            emailInput?.addEventListener('input', () => {
                if (status?.dataset.state === 'error') {
                    status.textContent = '';
                    status.dataset.state = '';
                }
            });
        });
    }

    // ----- Active Nav Link Highlighting -----
    const sections = document.querySelectorAll('section[id]');
    const navLinksAll = document.querySelectorAll('.nav-links a[href^="#"]');

    const highlightNav = () => {
        let scrollY = window.scrollY + 200;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinksAll.forEach(link => {
                    link.style.color = '';
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.style.color = 'var(--text-primary)';
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ----- Stagger Reveal for Grid Items -----
    const staggerContainers = document.querySelectorAll(
        '.about-features, .past-events-grid, .community-stats-grid, .showcase-grid'
    );

    staggerContainers.forEach(container => {
        const staggerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        child.style.transitionDelay = `${index * 0.1}s`;
                        child.classList.add('visible');
                    });
                    staggerObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        staggerObserver.observe(container);
    });

    // ----- Parallax for Background Orbs -----
    const orbs = document.querySelectorAll('.bg-orb');

    if (orbs.length > 0 && window.innerWidth > 768) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    orbs.forEach((orb, i) => {
                        const speed = 0.03 + (i * 0.01);
                        orb.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ----- Magnetic Hover for Buttons -----
    if (window.innerWidth > 768) {
        document.querySelectorAll('.hero-actions .btn-primary').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12 - 2}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

});
