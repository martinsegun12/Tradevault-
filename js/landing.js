// Landing Page Animations
document.addEventListener('DOMContentLoaded', () => {
    // Hero entrance animations
    const tl = gsap.timeline();

    tl.from('.nav-bar', {
        y: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
    })
    .from('.hero-badge', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out'
    }, '-=0.4')
    .from('.hero-title', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
    }, '-=0.3')
    .from('.hero-subtitle', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out'
    }, '-=0.5')
    .from('.hero-cta', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out'
    }, '-=0.4')
    .from('.stat-item', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.out'
    }, '-=0.3')
    .from('.floating-card', {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'back.out(1.7)'
    }, '-=0.8');

    // Floating cards continuous animation
    gsap.to('.card-1', {
        y: -15,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
    gsap.to('.card-2', {
        y: 15,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
    gsap.to('.card-3', {
        y: -10,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    // Counter animation
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-count'));
        const isDecimal = target % 1 !== 0;

        gsap.to(counter, {
            innerHTML: target,
            duration: 2,
            ease: 'power2.out',
            snap: { innerHTML: isDecimal ? 0.1 : 1 },
            onUpdate: function() {
                const val = parseFloat(counter.innerHTML);
                if (isDecimal) {
                    counter.innerHTML = val.toFixed(1) + 'M';
                } else if (target > 1000) {
                    counter.innerHTML = val.toLocaleString() + '+';
                } else {
                    counter.innerHTML = Math.round(val) + '%';
                }
            }
        });
    });

    // Scroll-triggered animations for features
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.fromTo(entry.target, 
                    { y: 40, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
                );
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });

    // Pricing card animation
    const pricingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.fromTo(entry.target,
                    { scale: 0.9, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
                );
                pricingObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const pricingCard = document.querySelector('.pricing-card');
    if (pricingCard) pricingObserver.observe(pricingCard);
});

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}
