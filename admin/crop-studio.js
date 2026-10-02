/* ============================================================
   Crop Studio — shared drag-to-position image cropper
   ------------------------------------------------------------
   A classic (non-module) script on purpose: /admin.html is a
   non-module page and cannot `import` anything, while /admin/products.html
   loads its own bundle as an ES module. A plain classic script is the
   only form both can consume, so this engine publishes itself as
   `window.CropStudio` and each page drives its own DOM with it.

   Load it BEFORE the page script (classic scripts run in order, and
   module scripts are deferred, so it is always available in time).

   Geometry is tracked in SOURCE-IMAGE PIXELS, never display pixels:
   the marquee survives window resizes and the bake math needs no
   rescaling. Crops are exported as PNG so transparency is preserved
   and repeated re-crops do not compound compression artifacts.

   On load the marquee is auto-framed on the subject (see Subject
   detection below) instead of sitting on the geometric centre, and
   falls back to the centred box whenever the image gives no usable
   subject.
   ============================================================ */
(function (global) {
    'use strict';

    const MIN_PX = 32;
    const DEFAULT_MAX_SIDE = 1600;
    const SETTLE_MS = 140;
    const ARROW_STEP_PX = 8;

    // ── Pure geometry ──────────────────────────────────────────
    // Exported so they can be unit tested without a DOM.

    function parseAspectValue(value) {
        const raw = String(value == null ? '' : value).trim().toLowerCase();
        if (!raw || raw === 'original' || raw === 'free' || raw === 'freeform') return null;
        if (raw.includes('/')) {
            const parts = raw.split('/').map(Number);
            if (parts.length === 2 && isFinite(parts[0]) && isFinite(parts[1]) && parts[0] > 0 && parts[1] > 0) {
                return parts[0] / parts[1];
            }
            return null;
        }
        const numeric = Number(raw);
        return isFinite(numeric) && numeric > 0 ? numeric : null;
    }

    function fullCropRegion(width, height) {
        return { sx: 0, sy: 0, sw: width, sh: height };
    }

    function isFullImageRegion(region, width, height) {
        return Boolean(region)
            && region.sx === 0
            && region.sy === 0
            && region.sw === width
            && region.sh === height;
    }

    function largestCropRegion(width, height, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return fullCropRegion(width, height);
        let sw = width;
        let sh = width / ratio;
        if (sh > height) {
            sh = height;
            sw = height * ratio;
        }
        sw = Math.max(1, Math.min(width, sw));
        sh = Math.max(1, Math.min(height, sh));
        return {
            sx: Math.round((width - sw) / 2),
            sy: Math.round((height - sh) / 2),
            sw: Math.round(sw),
            sh: Math.round(sh)
        };
    }

    // Shrinks a region until it fits the image, re-deriving one side from the
    // ratio so a locked aspect stays exact after clamping.
    function fitCropRegionInBounds(region, width, height, ratio, minPx) {
        const minSize = Math.max(1, Math.min(isFinite(minPx) ? minPx : MIN_PX, width, height));
        let sw = region.sw;
        let sh = region.sh;

        if (isFinite(ratio) && ratio > 0) {
            const maxWidth = Math.min(width, height * ratio);
            if (sw > maxWidth) {
                sw = maxWidth;
                sh = sw / ratio;
            }
            if (sh > height) {
                sh = height;
                sw = sh * ratio;
            }
        }

        sw = Math.min(width, Math.max(minSize, sw));
        sh = Math.min(height, Math.max(minSize, sh));
        if (isFinite(ratio) && ratio > 0) sh = sw / ratio;

        return {
            sx: Math.round(Math.min(Math.max(0, region.sx), Math.max(0, width - sw))),
            sy: Math.round(Math.min(Math.max(0, region.sy), Math.max(0, height - sh))),
            sw: Math.round(sw),
            sh: Math.round(sh)
        };
    }

    function moveCropRegion(start, deltaX, deltaY, width, height, minPx) {
        return fitCropRegionInBounds({
            sx: start.sx + deltaX,
            sy: start.sy + deltaY,
            sw: start.sw,
            sh: start.sh
        }, width, height, null, minPx);
    }

    function resizeCropRegion(start, handle, deltaX, deltaY, width, height, ratio, minPx) {
        const minSize = isFinite(minPx) ? minPx : MIN_PX;
        let left = start.sx;
        let top = start.sy;
        let right = start.sx + start.sw;
        let bottom = start.sy + start.sh;

        if (handle.includes('w')) left += deltaX;
        if (handle.includes('e')) right += deltaX;
        if (handle.includes('n')) top += deltaY;
        if (handle.includes('s')) bottom += deltaY;

        // Never let an edge cross the opposite one.
        if (right - left < minSize) {
            if (handle.includes('w')) left = right - minSize;
            else right = left + minSize;
        }
        if (bottom - top < minSize) {
            if (handle.includes('n')) top = bottom - minSize;
            else bottom = top + minSize;
        }

        left = Math.max(0, left);
        top = Math.max(0, top);
        right = Math.min(width, right);
        bottom = Math.min(height, bottom);

        let sw = right - left;
        let sh = bottom - top;

        if (isFinite(ratio) && ratio > 0) {
            // Edge handles drive one axis; corners follow whichever axis moved more.
            if (handle === 'e' || handle === 'w') {
                sh = sw / ratio;
            } else if (handle === 'n' || handle === 's') {
                sw = sh * ratio;
            } else if (sw / sh > ratio) {
                sw = sh * ratio;
            } else {
                sh = sw / ratio;
            }
            // Re-anchor so the opposite edge/corner stays put.
            if (handle.includes('w')) left = right - sw; else right = left + sw;
            if (handle.includes('n')) top = bottom - sh; else bottom = top + sh;
        }

        return fitCropRegionInBounds({ sx: left, sy: top, sw: sw, sh: sh }, width, height, ratio, minSize);
    }

    // Closest supported frame, so an off-preset free-form crop still maps onto
    // the nearest storefront card aspect instead of falling through to nothing.
    function nearestPreset(ratio, presets) {
        if (!isFinite(ratio) || ratio <= 0) return null;
        let best = null;
        (presets || []).forEach((preset) => {
            if (!preset || !isFinite(preset.ratio)) return;
            const distance = Math.abs(preset.ratio - ratio);
            if (!best || distance < best.distance) best = { preset: preset, distance: distance };
        });
        return best ? best.preset : null;
    }

    // ── Subject detection ──────────────────────────────────────
    // Product shots are almost always a subject on a flat-ish backdrop, so the
    // detector reads the four corners, calls their colour "background", and boxes
    // whatever differs from it. Transparent PNGs skip the guess entirely: alpha
    // already says where the subject is. Every part of this is a heuristic, so
    // each failure path returns null and the caller falls back to the geometric
    // centre rather than starting on a wrong crop.

    const DETECT_MAX_SAMPLE = 256;      // longest side of the scratch canvas
    const DETECT_TOLERANCE = 26;        // RGB distance still counted as backdrop
    const DETECT_CORNER_RATIO = 0.06;   // corner patch, share of the short side
    const DETECT_CORNER_SPREAD = 60;    // corners this far apart = no flat backdrop
    const DETECT_TRIM_SHARE = 0.04;     // share of the peak needed to keep a line
    const DETECT_MIN_COVERAGE = 0.004;  // below this the "subject" is a speck
    const DETECT_FULL_COVERAGE = 0.985; // above this the subject fills the frame
    const DETECT_ALPHA_MIN = 24;
    const DETECT_TRANSPARENT_SHARE = 0.02;
    const DETECT_PADDING = 0.04;        // breathing room, share of the longest side

    function detectOption(options, key, fallback) {
        const value = options ? options[key] : undefined;
        return isFinite(value) ? value : fallback;
    }

    function colourGap(a, b) {
        const dr = a.r - b.r;
        const dg = a.g - b.g;
        const db = a.b - b.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // Mean colour of the four corner patches plus how noisy they are, or null
    // when the corners disagree enough that there is no flat backdrop to key on.
    function backdropColour(data, width, height, options) {
        const patch = Math.max(1, Math.round(
            Math.min(width, height) * detectOption(options, 'cornerRatio', DETECT_CORNER_RATIO)
        ));
        const origins = [
            [0, 0],
            [width - patch, 0],
            [0, height - patch],
            [width - patch, height - patch]
        ];
        const patchSize = patch * patch;
        const corners = origins.map((corner) => {
            let r = 0;
            let g = 0;
            let b = 0;
            for (let y = corner[1]; y < corner[1] + patch; y += 1) {
                for (let x = corner[0]; x < corner[0] + patch; x += 1) {
                    const i = (y * width + x) * 4;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }
            }
            return { r: r / patchSize, g: g / patchSize, b: b / patchSize };
        });

        const allowed = detectOption(options, 'cornerSpread', DETECT_CORNER_SPREAD);
        let widest = 0;
        for (let a = 0; a < corners.length; a += 1) {
            for (let b = a + 1; b < corners.length; b += 1) {
                widest = Math.max(widest, colourGap(corners[a], corners[b]));
            }
        }
        if (widest > allowed) return null;

        const colour = { r: 0, g: 0, b: 0 };
        corners.forEach((corner) => {
            colour.r += corner.r / corners.length;
            colour.g += corner.g / corners.length;
            colour.b += corner.b / corners.length;
        });
        // A textured sweep needs more slack than a seamless one, so the noise
        // in the corners widens the tolerance (the scan applies the widening).
        colour.spread = corners.reduce((sum, corner) => sum + colourGap(corner, colour), 0) / corners.length;
        return colour;
    }

    // Bounding box of the subject in `imageData` pixels, or null when the image
    // gives no confident answer (blank, full-bleed photo, unreadable pixels).
    // Takes a plain { width, height, data } so it is unit testable in Node.
    function detectSubjectRegion(imageData, options) {
        if (!imageData) return null;
        const width = Math.round(Number(imageData.width) || 0);
        const height = Math.round(Number(imageData.height) || 0);
        const data = imageData.data;
        if (width < 4 || height < 4 || !data || data.length < width * height * 4) return null;
        const total = width * height;

        const alphaMin = detectOption(options, 'alphaMin', DETECT_ALPHA_MIN);
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] < alphaMin) transparent += 1;
        const byAlpha = transparent / total > detectOption(options, 'transparentShare', DETECT_TRANSPARENT_SHARE)
            && transparent < total;

        const backdrop = byAlpha ? null : backdropColour(data, width, height, options);
        if (!byAlpha && !backdrop) return null;

        const tolerance = Math.max(
            detectOption(options, 'tolerance', DETECT_TOLERANCE),
            backdrop ? backdrop.spread * 2.5 : 0
        );
        const limit = tolerance * tolerance;

        // One pass: each pixel updates the column and row histograms, which are
        // then trimmed so a stray speck cannot stretch the box across the image.
        const columnHits = new Uint32Array(width);
        const rowHits = new Uint32Array(height);
        let foreground = 0;
        for (let y = 0; y < height; y += 1) {
            let hits = 0;
            for (let x = 0; x < width; x += 1) {
                const i = (y * width + x) * 4;
                let subject;
                if (data[i + 3] < alphaMin) {
                    subject = false;
                } else if (byAlpha) {
                    subject = true;
                } else {
                    const dr = data[i] - backdrop.r;
                    const dg = data[i + 1] - backdrop.g;
                    const db = data[i + 2] - backdrop.b;
                    subject = dr * dr + dg * dg + db * db > limit;
                }
                if (subject) {
                    columnHits[x] += 1;
                    hits += 1;
                }
            }
            rowHits[y] = hits;
            foreground += hits;
        }

        if (foreground / total < detectOption(options, 'minCoverage', DETECT_MIN_COVERAGE)) return null;

        const trim = detectOption(options, 'trimShare', DETECT_TRIM_SHARE);
        let columnPeak = 0;
        for (let x = 0; x < width; x += 1) if (columnHits[x] > columnPeak) columnPeak = columnHits[x];
        let rowPeak = 0;
        for (let y = 0; y < height; y += 1) if (rowHits[y] > rowPeak) rowPeak = rowHits[y];
        const columnMin = Math.max(1, Math.round(columnPeak * trim));
        const rowMin = Math.max(1, Math.round(rowPeak * trim));

        let left = -1;
        let right = -1;
        let top = -1;
        let bottom = -1;
        for (let x = 0; x < width; x += 1) {
            if (columnHits[x] < columnMin) continue;
            if (left < 0) left = x;
            right = x;
        }
        for (let y = 0; y < height; y += 1) {
            if (rowHits[y] < rowMin) continue;
            if (top < 0) top = y;
            bottom = y;
        }
        if (left < 0 || top < 0) return null;

        const sw = right - left + 1;
        const sh = bottom - top + 1;
        // A subject that already fills the frame is no framing hint at all.
        if (sw * sh >= total * detectOption(options, 'fullCoverage', DETECT_FULL_COVERAGE)) return null;
        return { sx: left, sy: top, sw: sw, sh: sh };
    }

    // Turns a detected subject box into a marquee region: a little breathing
    // room, the locked aspect framed around it, then the usual bounds clamp so
    // the result is always draggable and always on-ratio.
    function subjectCropRegion(subject, width, height, ratio, minPx, padding) {
        if (!subject) return null;
        const boxW = Number(subject.sw);
        const boxH = Number(subject.sh);
        if (!isFinite(boxW) || !isFinite(boxH) || boxW < 1 || boxH < 1) return null;

        const grow = Math.max(0, isFinite(padding) ? padding : DETECT_PADDING) * Math.max(boxW, boxH);
        let sx = Number(subject.sx) - grow;
        let sy = Number(subject.sy) - grow;
        let sw = boxW + grow * 2;
        let sh = boxH + grow * 2;
        if (sx < 0) {
            sw += sx;
            sx = 0;
        }
        if (sy < 0) {
            sh += sy;
            sy = 0;
        }
        if (sx + sw > width) sw = width - sx;
        if (sy + sh > height) sh = height - sy;
        if (sw < 1 || sh < 1) return null;

        if (isFinite(ratio) && ratio > 0) {
            // Smallest frame of the locked aspect that still contains the whole
            // subject: a square card of a tall bottle should show the bottle,
            // not its middle. The image bounds win when the subject is too
            // extreme for the aspect (see the clamp below).
            let framedW = sw;
            let framedH = sh;
            if (framedW / framedH < ratio) framedW = framedH * ratio;
            else framedH = framedW / ratio;
            sx -= (framedW - sw) / 2;
            sy -= (framedH - sh) / 2;
            sw = framedW;
            sh = framedH;
        }

        return fitCropRegionInBounds({ sx: sx, sy: sy, sw: sw, sh: sh }, width, height, ratio, minPx);
    }

    // Where the marquee starts, as data rather than DOM side effects so the
    // decision (and the "was this auto-framed?" answer) can be unit tested:
    // the subject when `subject` is a usable box, otherwise the biggest region
    // the locked aspect allows, with autoFramed reporting which branch won.
    function resolveDefaultRegion(subject, width, height, ratio, minPx, padding) {
        if (subject) {
            const framed = subjectCropRegion(subject, width, height, ratio, minPx, padding);
            if (framed) return { region: framed, autoFramed: true };
        }
        return { region: largestCropRegion(width, height, ratio), autoFramed: false };
    }

    // Lossless export: PNG keeps transparency and adds no generation loss.
    function cropDataUrlToPng(dataUrl, region, maxSide) {
        const limit = isFinite(maxSide) ? maxSide : DEFAULT_MAX_SIDE;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.max(region.sw, region.sh) > limit
                    ? limit / Math.max(region.sw, region.sh)
                    : 1;
                const outW = Math.max(1, Math.round(region.sw * scale));
                const outH = Math.max(1, Math.round(region.sh * scale));

                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, region.sx, region.sy, region.sw, region.sh, 0, 0, outW, outH);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas could not encode the crop'));
                }, 'image/png');
            };
            img.onerror = () => reject(new Error('Could not load that image for cropping'));
            img.src = dataUrl;
        });
    }

    // Draws the image small, asks the pure detector where the subject is, and
    // maps that box back to source pixels. Returns null whenever the browser
    // will not hand us pixels (no DOM, cross-origin taint, decode failure) so
    // callers can fall back instead of failing.
    function detectImageSubject(img, options) {
        if (typeof document === 'undefined' || !img) return null;
        const width = Math.round(Number(img.naturalWidth) || 0);
        const height = Math.round(Number(img.naturalHeight) || 0);
        if (!width || !height) return null;

        const maxSampleSide = detectOption(options, 'maxSampleSide', DETECT_MAX_SAMPLE);
        const scale = Math.min(1, maxSampleSide / Math.max(width, height));
        const sampleW = Math.max(1, Math.round(width * scale));
        const sampleH = Math.max(1, Math.round(height * scale));

        let sampled = null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = sampleW;
            canvas.height = sampleH;
            const context = canvas.getContext('2d');
            if (!context) return null;
            context.drawImage(img, 0, 0, sampleW, sampleH);
            sampled = context.getImageData(0, 0, sampleW, sampleH);
        } catch (error) {
            // A tainted canvas throws by design; there is nothing to detect.
            return null;
        }

        const subject = detectSubjectRegion(sampled, options);
        if (!subject) return null;

        const scaleX = width / sampleW;
        const scaleY = height / sampleH;
        const sx = Math.max(0, Math.min(width - 1, Math.floor(subject.sx * scaleX)));
        const sy = Math.max(0, Math.min(height - 1, Math.floor(subject.sy * scaleY)));
        const right = Math.max(sx + 1, Math.min(width, Math.ceil((subject.sx + subject.sw) * scaleX)));
        const bottom = Math.max(sy + 1, Math.min(height, Math.ceil((subject.sy + subject.sh) * scaleY)));
        return { sx: sx, sy: sy, sw: right - sx, sh: bottom - sy };
    }

    // ── Instance ───────────────────────────────────────────────

    function create(config) {
        const cfg = config || {};
        const stage = cfg.stage || null;
        const viewport = cfg.viewport || null;
        const image = cfg.image || null;
        const marquee = cfg.marquee || null;
        const readout = cfg.readout || null;

        const minPx = isFinite(cfg.minPx) ? cfg.minPx : MIN_PX;
        const maxSide = isFinite(cfg.maxSide) ? cfg.maxSide : DEFAULT_MAX_SIDE;
        // On by default: a product shot should open framed on its subject. Pass
        // autoDetect: false for the old geometric centring.
        const autoDetect = cfg.autoDetect !== false;

        let ratio = isFinite(cfg.ratio) ? cfg.ratio : null;
        let region = null;
        // True while the marquee still sits where subject detection put it; any
        // manual move, resize or nudge flips it back to false.
        let autoFramed = false;
        let dataUrl = '';
        let size = { width: 0, height: 0 };
        let drag = null;
        let settleTimer = null;
        let bakeToken = 0;
        let destroyed = false;

        const emit = (payload) => {
            if (typeof cfg.onCropChange === 'function') cfg.onCropChange(payload);
        };
        const fail = (message) => {
            if (typeof cfg.onError === 'function') cfg.onError(message);
        };

        // Source pixels per CSS pixel; recomputed per gesture so a resized
        // window cannot skew the drag.
        function source() {
            if (!image) return null;
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            if (!width || !height) return null;
            const displayed = viewport ? viewport.getBoundingClientRect().width : 0;
            return {
                width: width,
                height: height,
                scale: displayed > 0 ? width / displayed : 1
            };
        }

        function setStageVisible(visible) {
            if (stage) stage.classList.toggle('hidden', !visible);
        }

        function render() {
            if (!marquee || !region || !size.width) return;
            const { sx, sy, sw, sh } = region;
            marquee.style.left = `${(sx / size.width) * 100}%`;
            marquee.style.top = `${(sy / size.height) * 100}%`;
            marquee.style.width = `${(sw / size.width) * 100}%`;
            marquee.style.height = `${(sh / size.height) * 100}%`;

            if (readout) {
                const isFull = isFullImageRegion(region, size.width, size.height);
                readout.textContent = isFull
                    ? `Full image · ${size.width}×${size.height}px — the original file uploads untouched`
                    : `${autoFramed ? 'Auto-framed on the subject · ' : ''}Crop ${sw}×${sh}px of ${size.width}×${size.height}px — lossless PNG`;
            }
        }

        function settle() {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => { void bake(); }, SETTLE_MS);
        }

        async function bake() {
            if (destroyed || !region || !size.width) return;
            const width = size.width;
            const height = size.height;
            const isFull = isFullImageRegion(region, width, height);
            const snapshot = { sx: region.sx, sy: region.sy, sw: region.sw, sh: region.sh };

            if (isFull) {
                emit({
                    region: snapshot,
                    width: width,
                    height: height,
                    isFull: true,
                    autoFramed: autoFramed,
                    blob: null
                });
                return;
            }

            if (typeof cfg.onRendering === 'function') cfg.onRendering(snapshot);
            const token = ++bakeToken;
            try {
                const blob = await cropDataUrlToPng(dataUrl, snapshot, maxSide);
                // A newer crop landed while this one was encoding.
                if (destroyed || token !== bakeToken) return;
                emit({
                    region: snapshot,
                    width: width,
                    height: height,
                    isFull: false,
                    autoFramed: autoFramed,
                    blob: blob
                });
            } catch (error) {
                if (destroyed || token !== bakeToken) return;
                fail(error.message);
            }
        }

        // Where the marquee starts: on the subject when we can see it, otherwise
        // the biggest box the locked aspect allows. Tracks the outcome so the
        // marquee can advertise that it was auto-framed.
        function defaultRegion() {
            const subject = autoDetect && image
                ? detectImageSubject(image, { maxSampleSide: DETECT_MAX_SAMPLE })
                : null;
            const resolved = resolveDefaultRegion(subject, size.width, size.height, ratio, minPx, DETECT_PADDING);
            autoFramed = resolved.autoFramed;
            return resolved.region;
        }

        function resetToDefault() {
            if (!size.width) return;
            region = defaultRegion();
            render();
            settle();
        }

        function onPointerMove(event) {
            if (!drag) return;
            const src = source();
            if (!src) return;
            const deltaX = (event.clientX - drag.startX) * drag.scale;
            const deltaY = (event.clientY - drag.startY) * drag.scale;

            region = drag.mode === 'move'
                ? moveCropRegion(drag.startRegion, deltaX, deltaY, src.width, src.height, minPx)
                : resizeCropRegion(drag.startRegion, drag.handle, deltaX, deltaY, src.width, src.height, ratio, minPx);
            autoFramed = false;

            render();
        }

        function onPointerUp() {
            if (!drag) return;
            drag = null;
            if (marquee) marquee.classList.remove('is-dragging');
            global.removeEventListener('pointermove', onPointerMove);
            global.removeEventListener('pointerup', onPointerUp);
            global.removeEventListener('pointercancel', onPointerUp);
            settle();
        }

        function onPointerDown(event) {
            const src = source();
            if (!src || !region) return;
            if (event.button !== undefined && event.button !== 0) return;
            event.preventDefault();

            const handle = event.target && event.target.closest
                ? (event.target.closest('[data-handle]') || {}).dataset
                : null;

            drag = {
                mode: handle ? 'resize' : 'move',
                handle: handle ? handle.handle : '',
                startRegion: { sx: region.sx, sy: region.sy, sw: region.sw, sh: region.sh },
                startX: event.clientX,
                startY: event.clientY,
                scale: src.scale
            };
            if (marquee) marquee.classList.add('is-dragging');

            // Tracked on window rather than via pointer capture so drags that
            // leave the marquee keep working.
            global.addEventListener('pointermove', onPointerMove);
            global.addEventListener('pointerup', onPointerUp);
            global.addEventListener('pointercancel', onPointerUp);
        }

        function onKeyDown(event) {
            if (!region) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(event.key) === -1) return;
            const src = source();
            if (!src) return;

            event.preventDefault();
            const step = (event.ctrlKey || event.metaKey) ? 1 : ARROW_STEP_PX;
            const deltaX = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
            const deltaY = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;

            region = event.shiftKey
                ? resizeCropRegion(region, 'se', deltaX, deltaY, src.width, src.height, ratio, minPx)
                : moveCropRegion(region, deltaX, deltaY, src.width, src.height, minPx);
            autoFramed = false;

            render();
            settle();
        }

        if (marquee) {
            marquee.addEventListener('pointerdown', onPointerDown);
            marquee.addEventListener('keydown', onKeyDown);
        }

        // Re-picking the same file keeps the same src, so `onload` would never
        // fire again — hence the explicit `complete` check.
        function loadSource(url) {
            if (!image) return;
            const initialise = () => {
                const width = image.naturalWidth;
                const height = image.naturalHeight;
                if (!width || !height) {
                    setStageVisible(false);
                    fail('Could not read that image\u2019s dimensions.');
                    return;
                }
                size = { width: width, height: height };
                region = defaultRegion();
                setStageVisible(true);
                render();
                settle();
            };

            image.onload = initialise;
            image.onerror = () => {
                setStageVisible(false);
                fail('Could not load that image for cropping.');
            };
            image.src = url;

            if (image.complete && image.naturalWidth > 0 && image.getAttribute('src') === url) initialise();
        }

        return {
            /** Load a data/blob URL as the crop source and re-frame the box. */
            setImage(url) {
                if (destroyed) return;
                dataUrl = String(url || '');
                bakeToken += 1;
                if (!dataUrl) {
                    this.clear();
                    return;
                }
                loadSource(dataUrl);
            },
            /** Change the locked aspect (null = free-form) and re-frame. */
            setRatio(nextRatio) {
                ratio = isFinite(nextRatio) && nextRatio > 0 ? nextRatio : null;
                if (size.width) resetToDefault();
            },
            getRatio() { return ratio; },
            /** Re-frame on the subject, or re-centre when there is none. */
            resetRegion() { resetToDefault(); },
            /**
             * Re-run subject detection and re-frame the marquee on it. Returns
             * true when a subject was found and framed, false when nothing was
             * confident enough and the box was merely re-centred.
             */
            frameSubject() {
                if (!size.width) return false;
                resetToDefault();
                return autoFramed;
            },
            /** True while the marquee is still where subject detection placed it. */
            isAutoFramed() { return autoFramed; },
            /** The detected subject box in source pixels, or null. Never moves the marquee. */
            detectSubject() {
                if (!image || !size.width) return null;
                return detectImageSubject(image, { maxSampleSide: DETECT_MAX_SAMPLE });
            },
            /** Tear down: no image, no region, stage hidden. Does not emit. */
            clear() {
                clearTimeout(settleTimer);
                settleTimer = null;
                bakeToken += 1;
                dataUrl = '';
                size = { width: 0, height: 0 };
                region = null;
                autoFramed = false;
                drag = null;
                if (image) image.removeAttribute('src');
                setStageVisible(false);
            },
            getRegion() { return region ? { sx: region.sx, sy: region.sy, sw: region.sw, sh: region.sh } : null; },
            getImageSize() { return { width: size.width, height: size.height }; },
            destroy() {
                destroyed = true;
                clearTimeout(settleTimer);
                // Guarded so the Node (geometry-only) consumer can tear down too.
                if (typeof global.removeEventListener === 'function') {
                    global.removeEventListener('pointermove', onPointerMove);
                    global.removeEventListener('pointerup', onPointerUp);
                    global.removeEventListener('pointercancel', onPointerUp);
                }
                if (marquee) {
                    marquee.removeEventListener('pointerdown', onPointerDown);
                    marquee.removeEventListener('keydown', onKeyDown);
                }
            }
        };
    }

    const CropStudio = {
        MIN_PX: MIN_PX,
        DEFAULT_MAX_SIDE: DEFAULT_MAX_SIDE,
        ARROW_STEP_PX: ARROW_STEP_PX,
        DETECT_MAX_SAMPLE: DETECT_MAX_SAMPLE,
        DETECT_PADDING: DETECT_PADDING,
        parseAspectValue: parseAspectValue,
        fullCropRegion: fullCropRegion,
        isFullImageRegion: isFullImageRegion,
        largestCropRegion: largestCropRegion,
        fitCropRegionInBounds: fitCropRegionInBounds,
        moveCropRegion: moveCropRegion,
        resizeCropRegion: resizeCropRegion,
        nearestPreset: nearestPreset,
        detectSubjectRegion: detectSubjectRegion,
        subjectCropRegion: subjectCropRegion,
        resolveDefaultRegion: resolveDefaultRegion,
        detectImageSubject: detectImageSubject,
        cropDataUrlToPng: cropDataUrlToPng,
        create: create
    };

    global.CropStudio = CropStudio;

    // Also export for Node so the geometry can be unit tested without a DOM.
    if (typeof module !== 'undefined' && module.exports) module.exports = CropStudio;
})(typeof window !== 'undefined' ? window : globalThis);
