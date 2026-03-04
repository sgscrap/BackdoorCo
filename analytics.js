(function () {
    'use strict';

    const STORAGE_KEY = 'bd_analytics';
    const SESSION_KEY = 'bd_session';
    const CONFIG = {
        storeName: 'Backdoor',
        version: '1.0',
        sessionTimeout: 30 * 60 * 1000, // 30 min
    };

    /* ══════════════════════════════════════
       UTILITIES
    ══════════════════════════════════════ */
    function generateId(len = 16) {
        return Array.from(crypto.getRandomValues(new Uint8Array(len)))
            .map(b => b.toString(16).padStart(2, '0')).join('').substring(0, len);
    }

    function getStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : initStorage();
        } catch { return initStorage(); }
    }

    function saveStorage(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { }
    }

    function initStorage() {
        const data = {
            visitorId: generateId(),
            firstVisit: Date.now(),
            visits: [],
            pageViews: [],
            events: [],
            referrers: [],
            devices: [],
            locations: [],
            totalSessions: 0,
            totalPageViews: 0,
        };
        saveStorage(data);
        return data;
    }

    /* ══════════════════════════════════════
       SESSION MANAGEMENT
    ══════════════════════════════════════ */
    function getOrCreateSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
                const session = JSON.parse(raw);
                if (Date.now() - session.lastActivity < CONFIG.sessionTimeout) {
                    session.lastActivity = Date.now();
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                    return { session, isNew: false };
                }
            }
        } catch { }

        const session = {
            id: generateId(),
            startTime: Date.now(),
            lastActivity: Date.now(),
            pageCount: 0,
            isNew: true,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { session, isNew: true };
    }

    function updateSession() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
                const session = JSON.parse(raw);
                session.lastActivity = Date.now();
                session.pageCount++;
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
                return session;
            }
        } catch { }
        return null;
    }

    /* ══════════════════════════════════════
       REFERRER DETECTION
    ══════════════════════════════════════ */
    function parseReferrer() {
        const ref = document.referrer;

        if (!ref || ref === '') {
            const utmSource = getUTMParam('utm_source');
            if (utmSource) return { source: utmSource, medium: getUTMParam('utm_medium') || 'campaign', raw: 'UTM' };
            return { source: 'Direct', medium: 'direct', raw: '' };
        }

        try {
            const url = new URL(ref);
            const host = url.hostname.replace('www.', '').toLowerCase();

            const socials = {
                'instagram.com': { source: 'Instagram', medium: 'social' },
                'l.instagram.com': { source: 'Instagram', medium: 'social' },
                'facebook.com': { source: 'Facebook', medium: 'social' },
                'fb.com': { source: 'Facebook', medium: 'social' },
                'm.facebook.com': { source: 'Facebook', medium: 'social' },
                'twitter.com': { source: 'Twitter/X', medium: 'social' },
                't.co': { source: 'Twitter/X', medium: 'social' },
                'x.com': { source: 'Twitter/X', medium: 'social' },
                'tiktok.com': { source: 'TikTok', medium: 'social' },
                'youtube.com': { source: 'YouTube', medium: 'social' },
                'youtu.be': { source: 'YouTube', medium: 'social' },
                'pinterest.com': { source: 'Pinterest', medium: 'social' },
                'reddit.com': { source: 'Reddit', medium: 'social' },
                'snapchat.com': { source: 'Snapchat', medium: 'social' },
                'discord.com': { source: 'Discord', medium: 'social' },
                'discord.gg': { source: 'Discord', medium: 'social' },
                'whatsapp.com': { source: 'WhatsApp', medium: 'social' },
                'telegram.org': { source: 'Telegram', medium: 'social' },
                'threads.net': { source: 'Threads', medium: 'social' },
                'linktr.ee': { source: 'Linktree', medium: 'social' },
            };

            const search = {
                'google.com': { source: 'Google', medium: 'organic' },
                'bing.com': { source: 'Bing', medium: 'organic' },
                'yahoo.com': { source: 'Yahoo', medium: 'organic' },
                'duckduckgo.com': { source: 'DuckDuckGo', medium: 'organic' },
                'ecosia.org': { source: 'Ecosia', medium: 'organic' },
                'baidu.com': { source: 'Baidu', medium: 'organic' },
            };

            const resell = {
                'goat.com': { source: 'GOAT', medium: 'marketplace' },
                'stockx.com': { source: 'StockX', medium: 'marketplace' },
                'flightclub.com': { source: 'FlightClub', medium: 'marketplace' },
                'kickscrew.com': { source: 'KicksCrew', medium: 'marketplace' },
                'klekt.com': { source: 'Klekt', medium: 'marketplace' },
            };

            if (socials[host]) return { ...socials[host], raw: ref };
            if (search[host]) return { ...search[host], raw: ref };
            if (resell[host]) return { ...resell[host], raw: ref };

            if (host === window.location.hostname.replace('www.', '')) {
                return { source: 'Internal', medium: 'internal', raw: ref };
            }

            return { source: host, medium: 'referral', raw: ref };
        } catch {
            return { source: 'Unknown', medium: 'unknown', raw: ref };
        }
    }

    /* ══════════════════════════════════════
       UTM PARAMETERS
    ══════════════════════════════════════ */
    function getUTMParam(param) {
        return new URLSearchParams(window.location.search).get(param) || '';
    }

    function getAllUTM() {
        return {
            source: getUTMParam('utm_source'),
            medium: getUTMParam('utm_medium'),
            campaign: getUTMParam('utm_campaign'),
            term: getUTMParam('utm_term'),
            content: getUTMParam('utm_content'),
        };
    }

    /* ══════════════════════════════════════
       DEVICE & BROWSER DETECTION
    ══════════════════════════════════════ */
    function getDeviceInfo() {
        const ua = navigator.userAgent;

        let deviceType = 'Desktop';
        if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'Tablet';
        else if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) deviceType = 'Mobile';

        let os = 'Unknown';
        if (/windows/i.test(ua)) os = 'Windows';
        else if (/mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) os = 'macOS';
        else if (/iphone/i.test(ua)) os = 'iOS (iPhone)';
        else if (/ipad/i.test(ua)) os = 'iOS (iPad)';
        else if (/android/i.test(ua)) os = 'Android';
        else if (/linux/i.test(ua)) os = 'Linux';

        let browser = 'Unknown';
        if (/edg\//i.test(ua)) browser = 'Edge';
        else if (/opr\//i.test(ua)) browser = 'Opera';
        else if (/chrome/i.test(ua)) browser = 'Chrome';
        else if (/safari/i.test(ua)) browser = 'Safari';
        else if (/firefox/i.test(ua)) browser = 'Firefox';
        else if (/msie|trident/i.test(ua)) browser = 'IE';

        return {
            type: deviceType,
            os,
            browser,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language || 'unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
            cores: navigator.hardwareConcurrency || 0,
            touch: navigator.maxTouchPoints > 0,
        };
    }

    /* ══════════════════════════════════════
       GEO LOCATION (IP-based, free API)
    ══════════════════════════════════════ */
    async function fetchGeoData() {
        try {
            const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
            const data = await res.json();
            return {
                ip: data.ip || 'unknown',
                city: data.city || 'Unknown',
                region: data.region || 'Unknown',
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'XX',
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                isp: data.org || 'Unknown',
                timezone: data.timezone || 'unknown',
            };
        } catch {
            return {
                ip: 'blocked', city: 'Unknown', region: 'Unknown',
                country: 'Unknown', countryCode: 'XX',
                latitude: 0, longitude: 0, isp: 'Unknown', timezone: 'unknown',
            };
        }
    }

    /* ══════════════════════════════════════
       PAGE TIMING
    ══════════════════════════════════════ */
    function getLoadTime() {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) return Math.round(nav.loadEventEnd - nav.startTime);
        } catch { }
        return 0;
    }

    let pageStartTime = Date.now();
    let timeOnPage = 0;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            timeOnPage += Date.now() - pageStartTime;
        } else {
            pageStartTime = Date.now();
        }
    });

    window.addEventListener('beforeunload', () => {
        timeOnPage += Date.now() - pageStartTime;
        const data = getStorage();
        if (data.pageViews.length) {
            data.pageViews[data.pageViews.length - 1].timeOnPage = timeOnPage;
            saveStorage(data);
        }
    });

    /* ══════════════════════════════════════
       SCROLL DEPTH TRACKING
    ══════════════════════════════════════ */
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
        const scrolled = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        if (scrolled > maxScroll) maxScroll = Math.min(scrolled, 100);
    }, { passive: true });

    /* ══════════════════════════════════════
       CLICK TRACKING
    ══════════════════════════════════════ */
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button, [data-track]');
        if (!target) return;

        const label =
            target.dataset.track ||
            target.textContent?.trim().substring(0, 50) ||
            target.href ||
            'unknown';

        trackEvent('click', {
            element: target.tagName.toLowerCase(),
            label,
            href: target.href || null,
            page: window.location.pathname,
        });
    }, { passive: true });

    /* ══════════════════════════════════════
       MAIN TRACK FUNCTION
    ══════════════════════════════════════ */
    async function trackPageView() {
        const data = getStorage();
        const { session, isNew } = getOrCreateSession();
        const referrer = parseReferrer();
        const device = getDeviceInfo();
        const utm = getAllUTM();
        const geo = await fetchGeoData();

        updateSession();

        const pageView = {
            id: generateId(8),
            sessionId: session.id,
            visitorId: data.visitorId,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            page: window.location.pathname,
            title: document.title,
            url: window.location.href,
            referrer,
            device,
            geo,
            utm,
            loadTime: getLoadTime(),
            timeOnPage: 0,
            scrollDepth: 0,
            isNewSession: isNew,
            isNewVisitor: data.visits.length === 0,
        };

        data.pageViews.push(pageView);
        data.totalPageViews++;

        if (isNew) {
            data.visits.push({
                sessionId: session.id,
                timestamp: Date.now(),
                referrer,
                device,
                geo,
                utm,
                landingPage: window.location.pathname,
            });
            data.totalSessions++;
        }

        if (data.pageViews.length > 500) {
            data.pageViews = data.pageViews.slice(-500);
        }

        if (data.visits.length > 200) {
            data.visits = data.visits.slice(-200);
        }

        saveStorage(data);

        window.addEventListener('beforeunload', () => {
            const stored = getStorage();
            const last = stored.pageViews[stored.pageViews.length - 1];
            if (last && last.id === pageView.id) {
                last.scrollDepth = maxScroll;
                last.timeOnPage = timeOnPage + (Date.now() - pageStartTime);
                saveStorage(stored);
            }
        });

        console.log('[Backdoor Analytics] Tracked:', pageView.page, '|', referrer.source);
    }

    /* ══════════════════════════════════════
       EVENT TRACKING (Public API)
    ══════════════════════════════════════ */
    function trackEvent(name, props = {}) {
        const data = getStorage();
        data.events.push({
            id: generateId(8),
            name,
            props,
            timestamp: Date.now(),
            page: window.location.pathname,
            visitorId: data.visitorId,
        });
        if (data.events.length > 300) data.events = data.events.slice(-300);
        saveStorage(data);
    }

    /* ══════════════════════════════════════
       PUBLIC API
    ══════════════════════════════════════ */
    window.BDAnalytics = {
        track: trackEvent,
        getData: getStorage,
        clearData: () => { localStorage.removeItem(STORAGE_KEY); },
        identify: (userId, traits = {}) => {
            const data = getStorage();
            data.userId = userId;
            data.userTraits = traits;
            saveStorage(data);
        },
    };

    // Handle SPA navigation
    let lastPath = window.location.pathname;
    const observer = new MutationObserver(() => {
        if (window.location.pathname !== lastPath) {
            lastPath = window.location.pathname;
            trackPageView();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial track
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }

})();
