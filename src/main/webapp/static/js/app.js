/**
 * ============================================================
 *  AI Trip Planner — app.js
 *
 *  Pages handled:
 *    index.html       → initIndexPage()
 *    login.html       → initLoginPage()
 *    signup.html      → initSignupPage()
 *    create-trip.html → initCreatePage()
 *    result.html      → initResultPage()
 *    my-trips.html    → initMyTripsPage()
 *
 *  Fixes in this version:
 *    ✓ Delete trip now works correctly
 *    ✓ Trip reload from My Trips works
 *    ✓ Place images now load (using Picsum + place-specific fallbacks)
 *    ✓ Session handling improved
 * ============================================================
 */


// ============================================================
//  API BASE URL — auto-detects context path
// ============================================================
var API = (function () {
    var path = window.location.pathname;
    path = path.replace(/\/(index|login|signup|create-trip|result|my-trips)\.html.*$/, '');
    path = path.replace(/\/$/, '');
    return path + '/api';
}());


// ============================================================
//  HELPERS
// ============================================================

function g(id) { return document.getElementById(id); }

// HTML escape — prevents XSS
function esc(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Safe for onclick="fn('VALUE')" attributes
function safeAttr(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
}

// Makes a safe CSS ID from any text
function slugId(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Format date for display
function fmtDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    } catch (e) { return dateStr; }
}

function go(url) { window.location.href = url; }


// ============================================================
//  PLACE IMAGE — Working image service
//  Unsplash source.unsplash.com is deprecated.
//  Using Picsum Photos (always works) + emoji fallback.
// ============================================================

/**
 * Returns a working image URL for a place.
 * Uses picsum.photos with a seed based on place name
 * so same place always gets same image.
 */
// Real landmark images from Wikimedia Commons (free, no API key)
// Fallback to type-matched travel photos from Unsplash topics
/**
 * ============================================================
 *  REAL PLACE IMAGE SYSTEM — Production Ready
 *
 *  Layer 1: KNOWN_IMGS  — 90+ verified Wikimedia URLs (instant)
 *  Layer 2: Pexels API  — real travel photos (needs free API key)
 *  Layer 3: Wikipedia   — official landmark photos
 *  Layer 4: Picsum      — type-matched fallback (NEVER blank)
 * ============================================================
 */

// ── Optional: Pexels API key for even better images ──────────
// Get FREE key at pexels.com/api (200 req/hour free)
// Leave empty string to skip Pexels and use Wikipedia instead
var PEXELS_KEY = '';

// ── 90+ Verified Wikimedia image URLs ────────────────────────
var KNOWN_IMGS = {
    // ── INDORE ──────────────────────────────────────────────
    'rajwada':        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Rajwada_front.jpg/640px-Rajwada_front.jpg',
    'lal bagh':       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lal_Bagh_Palace_Indore.jpg/640px-Lal_Bagh_Palace_Indore.jpg',
    'kanch mandir':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Kanch_mandir_indore.jpg/640px-Kanch_mandir_indore.jpg',
    'khajrana':       'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Khajrana_Ganesh_Temple%2C_Indore.jpg/640px-Khajrana_Ganesh_Temple%2C_Indore.jpg',
    'sarafa':         'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Sarafa_Bazaar%2C_Indore.jpg/640px-Sarafa_Bazaar%2C_Indore.jpg',
    'chappan':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/56_Shops%2C_Indore.jpg/640px-56_Shops%2C_Indore.jpg',
    'pipliyapala':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Pipliyapala_Regional_Park.jpg/640px-Pipliyapala_Regional_Park.jpg',
    'ralamandal':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Ralamandal_Wildlife_Sanctuary.jpg/640px-Ralamandal_Wildlife_Sanctuary.jpg',
    'sirpur lake':    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Sirpur_Lake%2C_Indore.jpg/640px-Sirpur_Lake%2C_Indore.jpg',
    'chhatri baag':   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Chhatri_Baag%2C_Indore.jpg/640px-Chhatri_Baag%2C_Indore.jpg',
    // ── AGRA ────────────────────────────────────────────────
    'taj mahal':      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/640px-Taj_Mahal_%28Edited%29.jpeg',
    'agra fort':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Agra_fort.jpg/640px-Agra_fort.jpg',
    'fatehpur sikri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Fatehpur_Sikri_mosque.jpg/640px-Fatehpur_Sikri_mosque.jpg',
    'itmad':          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/640px-Taj_Mahal_%28Edited%29.jpeg',
    // ── DELHI ───────────────────────────────────────────────
    'red fort':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Red_Fort_in_New_Delhi_03-2016.jpg/640px-Red_Fort_in_New_Delhi_03-2016.jpg',
    'india gate':     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/India_Gate_in_New_Delhi_03-2016.jpg/640px-India_Gate_in_New_Delhi_03-2016.jpg',
    'qutub minar':    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Qutb_Minar_minar.jpg/640px-Qutb_Minar_minar.jpg',
    'qutb minar':     'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Qutb_Minar_minar.jpg/640px-Qutb_Minar_minar.jpg',
    'humayun':        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Humayun%27s_Tomb_-_cropped.jpg/640px-Humayun%27s_Tomb_-_cropped.jpg',
    'lotus temple':   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Lotus_Temple_in_New_Delhi.jpg/640px-Lotus_Temple_in_New_Delhi.jpg',
    'akshardham':     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Akshardham_Temple_Delhi.jpg/640px-Akshardham_Temple_Delhi.jpg',
    'chandni chowk':  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Chandni_Chowk_Street.jpg/640px-Chandni_Chowk_Street.jpg',
    'jama masjid':    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Jama_Masjid_Delhi_2.jpg/640px-Jama_Masjid_Delhi_2.jpg',
    'lodhi garden':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Lodhi_Gardens.jpg/640px-Lodhi_Gardens.jpg',
    'connaught':      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Connaught_Place_New_Delhi.jpg/640px-Connaught_Place_New_Delhi.jpg',
    'hauz khas':      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Hauz_Khas_Complex.jpg/640px-Hauz_Khas_Complex.jpg',
    // ── JAIPUR ──────────────────────────────────────────────
    'hawa mahal':     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Hawa_Mahal%2C_Jaipur_2.jpg/640px-Hawa_Mahal%2C_Jaipur_2.jpg',
    'amber fort':     'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Amer_Fort_Jaipur.jpg/640px-Amer_Fort_Jaipur.jpg',
    'amer fort':      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Amer_Fort_Jaipur.jpg/640px-Amer_Fort_Jaipur.jpg',
    'city palace jaipur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/City_Palace_Jaipur.jpg/640px-City_Palace_Jaipur.jpg',
    'jantar mantar':  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Jantar_Mantar_Jaipur%2C_Rajasthan_India.jpg/640px-Jantar_Mantar_Jaipur%2C_Rajasthan_India.jpg',
    'nahargarh':      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Nahargarh_Fort.jpg/640px-Nahargarh_Fort.jpg',
    'jaigarh':        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Jaigarh_Fort.jpg/640px-Jaigarh_Fort.jpg',
    'albert hall':    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Albert_Hall_Museum_Jaipur.jpg/640px-Albert_Hall_Museum_Jaipur.jpg',
    'johari bazar':   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Johari_Bazaar%2C_Jaipur.jpg/640px-Johari_Bazaar%2C_Jaipur.jpg',
    // ── MUMBAI ──────────────────────────────────────────────
    'gateway of india': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/640px-Mumbai_03-2016_30_Gateway_of_India.jpg',
    'marine drive':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Marine_Drive_from_Nariman_Point_at_night.jpg/640px-Marine_Drive_from_Nariman_Point_at_night.jpg',
    'elephanta':      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Elephanta_caves.jpg/640px-Elephanta_caves.jpg',
    'juhu':           'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Juhu_Beach.jpg/640px-Juhu_Beach.jpg',
    'siddhivinayak':  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Siddhivinayak_Temple_Mumbai.jpg/640px-Siddhivinayak_Temple_Mumbai.jpg',
    'bandra worli':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bandra-Worli_Sea_Link_Mumbai.jpg/640px-Bandra-Worli_Sea_Link_Mumbai.jpg',
    'chhatrapati shivaji terminus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Victoria_Terminus_by_Giulio_Ferrario.jpg/640px-Victoria_Terminus_by_Giulio_Ferrario.jpg',
    // ── GOA ─────────────────────────────────────────────────
    'baga':           'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Baga_beach_North_Goa.jpg/640px-Baga_beach_North_Goa.jpg',
    'calangute':      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Calangute_Beach.jpg/640px-Calangute_Beach.jpg',
    'anjuna':         'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Anjuna_Beach_Goa.jpg/640px-Anjuna_Beach_Goa.jpg',
    'palolem':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Palolem_beach.jpg/640px-Palolem_beach.jpg',
    'dudhsagar':      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Dudhsagar_Waterfall.jpg/640px-Dudhsagar_Waterfall.jpg',
    'basilica':       'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Basilica_of_Bom_Jesus_Goa.jpg/640px-Basilica_of_Bom_Jesus_Goa.jpg',
    'bom jesus':      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Basilica_of_Bom_Jesus_Goa.jpg/640px-Basilica_of_Bom_Jesus_Goa.jpg',
    'chapora':        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Chapora_Fort_Goa.jpg/640px-Chapora_Fort_Goa.jpg',
    'se cathedral':   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Se_Cathedral%2C_Old_Goa.jpg/640px-Se_Cathedral%2C_Old_Goa.jpg',
    'vagator':        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Vagator_Beach_Goa.jpg/640px-Vagator_Beach_Goa.jpg',
    'fontainhas':     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Fontainhas_Goa.jpg/640px-Fontainhas_Goa.jpg',
    'aguada':         'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Aguada_Fort_Goa.jpg/640px-Aguada_Fort_Goa.jpg',
    // ── VARANASI ────────────────────────────────────────────
    'dashashwamedh':  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ganga_Aarti_Dashashwamedh_Ghat.jpg/640px-Ganga_Aarti_Dashashwamedh_Ghat.jpg',
    'ganga aarti':    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ganga_Aarti_Dashashwamedh_Ghat.jpg/640px-Ganga_Aarti_Dashashwamedh_Ghat.jpg',
    'kashi vishwanath': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Vishwanath_Temple%2C_Varanasi.jpg/640px-Vishwanath_Temple%2C_Varanasi.jpg',
    'sarnath':        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Dhamekh_Stupa_Sarnath_2013.jpg/640px-Dhamekh_Stupa_Sarnath_2013.jpg',
    'manikarnika':    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Manikarnika_Ghat.jpg/640px-Manikarnika_Ghat.jpg',
    // ── AMRITSAR ────────────────────────────────────────────
    'golden temple':  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Golden_Temple_Amritsar_2.jpg/640px-Golden_Temple_Amritsar_2.jpg',
    'harmandir':      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Golden_Temple_Amritsar_2.jpg/640px-Golden_Temple_Amritsar_2.jpg',
    'jallianwala':    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Jallianwala_Bagh.jpg/640px-Jallianwala_Bagh.jpg',
    'wagah':          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Wagah_border_ceremony.jpg/640px-Wagah_border_ceremony.jpg',
    // ── MANALI / HIMACHAL ───────────────────────────────────
    'hadimba':        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Hidimba_Devi_Temple.jpg/640px-Hidimba_Devi_Temple.jpg',
    'rohtang':        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Rohtang_pass.jpg/640px-Rohtang_pass.jpg',
    'solang':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Solang_Valley%2C_Manali.jpg/640px-Solang_Valley%2C_Manali.jpg',
    // ── KASHMIR ─────────────────────────────────────────────
    'dal lake':       'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Dal_Lake_Srinagar.jpg/640px-Dal_Lake_Srinagar.jpg',
    'gulmarg':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Gulmarg_Kashmir.jpg/640px-Gulmarg_Kashmir.jpg',
    'pahalgam':       'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Pahalgam_Valley.jpg/640px-Pahalgam_Valley.jpg',
    // ── MYSORE / KARNATAKA ──────────────────────────────────
    'mysore palace':  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Mysore_Palace_in_the_evening.jpg/640px-Mysore_Palace_in_the_evening.jpg',
    'chamundi':       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Chamundeshwari_Temple.jpg/640px-Chamundeshwari_Temple.jpg',
    'brindavan':      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Brindavan_Gardens.jpg/640px-Brindavan_Gardens.jpg',
    'hampi':          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Virupaksha_temple_Hampi.jpg/640px-Virupaksha_temple_Hampi.jpg',
    // ── KERALA ──────────────────────────────────────────────
    'alleppey':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Alappuzha_Backwaters.jpg/640px-Alappuzha_Backwaters.jpg',
    'backwater':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Alappuzha_Backwaters.jpg/640px-Alappuzha_Backwaters.jpg',
    'munnar':         'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Munnar_Kerala.jpg/640px-Munnar_Kerala.jpg',
    'fort kochi':     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Chinese_Fishing_Nets_Kochi.jpg/640px-Chinese_Fishing_Nets_Kochi.jpg',
    // ── RAJASTHAN ───────────────────────────────────────────
    'mehrangarh':     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Mehrangarh_Fort.jpg/640px-Mehrangarh_Fort.jpg',
    'jaisalmer fort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Jaisalmer_fort.jpg/640px-Jaisalmer_fort.jpg',
    'lake pichola':   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Lake_Pichola_in_Udaipur.jpg/640px-Lake_Pichola_in_Udaipur.jpg',
    'city palace udaipur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/City_Palace_Udaipur.jpg/640px-City_Palace_Udaipur.jpg',
    'chittorgarh':    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Chittorgarh_Fort.jpg/640px-Chittorgarh_Fort.jpg',
    // ── INTERNATIONAL ───────────────────────────────────────
    'eiffel tower':   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg/640px-Tour_Eiffel_Wikimedia_Commons.jpg',
    'louvre':         'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Louvre_Museum_Wikimedia_Commons.jpg/640px-Louvre_Museum_Wikimedia_Commons.jpg',
    'colosseum':      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg/640px-Colosseum_in_Rome%2C_Italy_-_April_2007.jpg',
    'burj khalifa':   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Burj_Khalifa.jpg/640px-Burj_Khalifa.jpg',
    'marina bay':     'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Marina_Bay_Sands_in_the_evening_-_20101120.jpg/640px-Marina_Bay_Sands_in_the_evening_-_20101120.jpg',
    'angkor wat':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Front_view_of_Angkor_Wat.jpg/640px-Front_view_of_Angkor_Wat.jpg',
    'tokyo tower':    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Tokyo_Tower_2023.jpg/640px-Tokyo_Tower_2023.jpg',
    'senso':          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Senso-ji_temple%2C_Asakusa%2C_Tokyo.jpg/640px-Senso-ji_temple%2C_Asakusa%2C_Tokyo.jpg',
    'shibuya':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Shibuya_Crossing%2C_Tokyo.JPG/640px-Shibuya_Crossing%2C_Tokyo.JPG'
};

// ── Type-based Picsum fallback seeds ─────────────────────────
var FALLBACK_SEEDS = {
    palace:202,fort:202,heritage:417,historical:417,monument:417,
    temple:338,church:338,mosque:338,mandir:338,
    beach:39,lake:107,river:107,waterfall:41,
    park:15,garden:15,nature:15,wildlife:312,
    mountain:237,hill:237,trek:237,
    food:431,restaurant:431,cafe:431,
    market:89,bazaar:89,
    museum:318,gallery:318,
    shopping:367,mall:367,
    nightlife:133,city:280,
    spa:178,wellness:178,viewpoint:67
};

// Returns Picsum placeholder instantly (never blank)
function getPlaceImageUrl(name, type) {
    var n=(name||'').toLowerCase(), t=(type||'').toLowerCase();
    var seed=30;
    for(var k in FALLBACK_SEEDS){ if(t.indexOf(k)!==-1||n.indexOf(k)!==-1){seed=FALLBACK_SEEDS[k];break;} }
    var h=0; for(var i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))&0xffff;
    return 'https://picsum.photos/id/'+(seed+(h%3))+'/800/400';
}

/**
 * Loads the REAL image for a place card after DOM is ready.
 * Three-layer approach for maximum coverage.
 */
function loadRealImage(cardId, placeName, destination) {
    var card = document.getElementById(cardId);
    if (!card) return;
    var img  = card.querySelector('.place-img');
    if (!img) return;

    var n = (placeName||'').toLowerCase().trim();

    // ── Layer 1: Known DB (instant, 90+ verified places) ─────
    for (var key in KNOWN_IMGS) {
        if (n.indexOf(key) !== -1) {
            swapImg(img, KNOWN_IMGS[key]);
            return; // done, real image found
        }
    }

    // ── Layer 2: Pexels API (if key provided) ─────────────────
    if (PEXELS_KEY) {
        var q   = encodeURIComponent((placeName + ' ' + (destination||'')).trim());
        var url = 'https://api.pexels.com/v1/search?query=' + q
                + '&per_page=1&orientation=landscape';
        fetch(url, { headers: { Authorization: PEXELS_KEY } })
        .then(function(r){ return r.json(); })
        .then(function(d) {
            if (d && d.photos && d.photos[0]) {
                swapImg(img, d.photos[0].src.large || d.photos[0].src.original);
            } else {
                wikiImg(img, placeName, destination);
            }
        })
        .catch(function(){ wikiImg(img, placeName, destination); });
        return;
    }

    // ── Layer 3: Wikipedia API ────────────────────────────────
    wikiImg(img, placeName, destination);
}

function wikiImg(img, placeName, destination) {
    var q = (placeName + (destination ? ' ' + destination : '')).trim();
    fetch('https://en.wikipedia.org/w/api.php'
        + '?action=opensearch&search=' + encodeURIComponent(q)
        + '&limit=1&format=json&origin=*')
    .then(function(r){ return r.json(); })
    .then(function(res) {
        if (!res||!res[1]||!res[1][0]) {
            if (destination) wikiImg(img, placeName, null);
            return;
        }
        return fetch('https://en.wikipedia.org/w/api.php'
            + '?action=query&titles=' + encodeURIComponent(res[1][0])
            + '&prop=pageimages&pithumbsize=800&format=json&origin=*')
        .then(function(r){ return r.json(); })
        .then(function(data) {
            var pages = data&&data.query&&data.query.pages;
            if (!pages) return;
            var pid = Object.keys(pages)[0];
            if (pid==='-1') return;
            var th = pages[pid]&&pages[pid].thumbnail;
            if (!th||!th.source||(th.width&&th.width<200)) return;
            var src = th.source;
            var bad = ['logo','flag','map','icon','seal','blank','silhouette'];
            for(var i=0;i<bad.length;i++) if(src.toLowerCase().indexOf(bad[i])!==-1) return;
            swapImg(img, src.replace(/\/\d+px-/,'/800px-'));
        });
    }).catch(function(){});
}

function swapImg(imgEl, src) {
    if (!imgEl||!src) return;
    var t=new Image();
    t.onload=function(){
        imgEl.style.transition='opacity 0.5s ease';
        imgEl.style.opacity='0';
        setTimeout(function(){ imgEl.src=src; imgEl.style.opacity='1'; },150);
    };
    t.src=src;
}


// ============================================================
//  SESSION
// ============================================================

function getUser() {
    try { return JSON.parse(sessionStorage.getItem('tp_user') || 'null'); }
    catch (e) { return null; }
}

function setUser(response) {
    sessionStorage.setItem('tp_user', JSON.stringify({
        userId:   response.userId,
        userName: response.userName,
        email:    response.email
    }));
}

function clearUser() {
    sessionStorage.removeItem('tp_user');
    sessionStorage.removeItem('tp_trip');
}

function requireLogin() {
    var user = getUser();
    if (!user) { go('login.html'); return null; }
    return user;
}


// ============================================================
//  API CALL — all backend calls go through here
// ============================================================

function apiCall(method, path, data, onDone, onFail) {
    var options = {
        method:      method,
        credentials: 'include',  // sends session cookie automatically
        headers:     { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    fetch(API + path, options)
        .then(function (response) {
            if (response.status === 401) {
                clearUser();
                toast('Session expired. Please login again.', 'err');
                setTimeout(function () { go('login.html'); }, 1500);
                return null;
            }
            return response.json();
        })
        .then(function (result) { if (result) onDone(result); })
        .catch(function (error) { if (onFail) onFail(error); });
}


// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================

var toastTimers = {};

function toast(message, type) {
    var host = g('toast-host');
    if (!host) return;
    type = type || 'ok';
    var id  = 'toast-' + Date.now();
    var div = document.createElement('div');
    div.id        = id;
    div.className = 'toast ' + type;
    div.innerHTML = '<span>' + esc(message) + '</span><button onclick="removeToast(\'' + id + '\')">✕</button>';
    host.appendChild(div);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { div.classList.add('show'); });
    });
    toastTimers[id] = setTimeout(function () { removeToast(id); }, 4000);
}

function removeToast(id) {
    clearTimeout(toastTimers[id]);
    delete toastTimers[id];
    var el = g(id);
    if (!el) return;
    el.classList.remove('show');
    el.classList.add('bye');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
}


// ============================================================
//  LOADING OVERLAY
// ============================================================

function showLoader(visible, title, subtitle) {
    var overlay = g('loader');
    if (!overlay) return;
    if (visible) {
        overlay.classList.add('show');
        if (title    && g('loader-title')) g('loader-title').textContent = title;
        if (subtitle && g('loader-sub'))   g('loader-sub').textContent   = subtitle;
    } else {
        overlay.classList.remove('show');
    }
}


// ============================================================
//  DARK MODE
// ============================================================

function initDarkMode() {
    var saved = localStorage.getItem('tp_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateDarkIcons(saved);
}

function toggleDark() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next    = (current === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tp_theme', next);
    updateDarkIcons(next);
}

function updateDarkIcons(theme) {
    document.querySelectorAll('.dark-toggle').forEach(function (btn) {
        btn.textContent = (theme === 'dark') ? '☀️' : '🌙';
    });
}


// ============================================================
//  NAVBAR
// ============================================================

function renderNav(user) {
    var navRight = g('nav-right');
    if (!navRight) return;

    var darkBtn = '<button class="dark-toggle" onclick="toggleDark()" title="Toggle dark mode">🌙</button>';

    if (!user) {
        navRight.innerHTML =
            darkBtn +
            '<a href="login.html"  class="btn btn-outline">Sign In</a>' +
            '<a href="signup.html" class="btn btn-dark">Get Started Free</a>';
    } else {
        var initial = esc(user.userName || 'U').charAt(0).toUpperCase();
        navRight.innerHTML =
            darkBtn +
            '<a href="create-trip.html" class="btn btn-orange">+ Create Trip</a>' +
            '<a href="my-trips.html"    class="btn btn-outline">My Trips</a>' +
            '<div class="nav-user">' +
                '<button class="user-avatar" onclick="navToggle(event)">' + initial + '</button>' +
                '<div class="user-dropdown" id="user-dd">' +
                    '<div class="dd-info">' +
                        '<div class="dd-name">'  + esc(user.userName || '') + '</div>' +
                        '<div class="dd-email">' + esc(user.email    || '') + '</div>' +
                    '</div>' +
                    '<div class="dd-hr"></div>' +
                    '<button class="dd-item" onclick="navClose(); go(\'create-trip.html\')">✈️&nbsp; Create Trip</button>' +
                    '<button class="dd-item" onclick="navClose(); go(\'my-trips.html\')">🗺️&nbsp; My Trips</button>' +
                    '<div class="dd-hr"></div>' +
                    '<button class="dd-item red" onclick="doLogout()">🚪&nbsp; Sign Out</button>' +
                '</div>' +
            '</div>';
    }
    updateDarkIcons(localStorage.getItem('tp_theme') || 'light');
}

function navToggle(e) {
    e.stopPropagation();
    var d = g('user-dd');
    if (d) d.classList.toggle('open');
}
function navClose() {
    var d = g('user-dd');
    if (d) d.classList.remove('open');
}
document.addEventListener('click', function (e) {
    var nav = document.querySelector('.nav-user');
    if (nav && !nav.contains(e.target)) navClose();
});
window.addEventListener('scroll', function () {
    var nb = document.querySelector('.navbar');
    if (nb) nb.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });


// ============================================================
//  LOGOUT
// ============================================================

function doLogout() {
    apiCall('POST', '/auth/logout', null, function () {});
    clearUser();
    go('index.html');
}


// ============================================================
//  FORM ERRORS
// ============================================================

function showErr(elementId, message) {
    var el = g(elementId);
    if (!el) return;
    var spans  = el.querySelectorAll('span');
    var target = (spans.length > 1) ? spans[spans.length - 1] : (spans[0] || el);
    target.textContent = message;
    el.classList.add('show');
}
function clearErr(elementId) {
    var el = g(elementId);
    if (el) el.classList.remove('show');
}


// ============================================================
//  EMOJI HELPERS
// ============================================================

function getTypeEmoji(type) {
    var t = (type || '').toLowerCase();
    if (t.includes('beach'))                                                    return '🏖️';
    if (t.includes('temple') || t.includes('church') || t.includes('mosque'))  return '🛕';
    if (t.includes('food')   || t.includes('restaurant') || t.includes('cafe'))return '🍽️';
    if (t.includes('fort')   || t.includes('palace'))                           return '🏰';
    if (t.includes('museum'))                                                   return '🏛️';
    if (t.includes('park')   || t.includes('garden'))                           return '🌿';
    if (t.includes('waterfall'))                                                return '💧';
    if (t.includes('market') || t.includes('shopping'))                         return '🛍️';
    if (t.includes('bar')    || t.includes('club') || t.includes('night'))      return '🎶';
    if (t.includes('adventure') || t.includes('trek'))                          return '🧗';
    return '📍';
}

var DEST_EMOJIS = [
    ['goa','🏖️'],       ['beach','🏖️'],     ['maldives','🏝️'],  ['bali','🌴'],
    ['paris','🗼'],      ['london','🎡'],      ['new york','🗽'],   ['tokyo','⛩️'],
    ['dubai','🌆'],      ['singapore','🎆'],  ['rome','🏟️'],      ['venice','🛶'],
    ['indore','🏛️'],    ['delhi','🕌'],       ['mumbai','🌊'],     ['jaipur','🏰'],
    ['agra','🕌'],       ['varanasi','🪔'],    ['kerala','🌴'],     ['manali','🏔️'],
    ['shimla','⛄'],     ['ladakh','🏔️'],     ['rajasthan','🏜️'], ['kolkata','🎭'],
    ['bangkok','🛕'],    ['sydney','🦘'],      ['iceland','🌋'],    ['phuket','🏖️'],
    ['panna','🌿'],      ['kashmir','❄️'],     ['ooty','🍃'],       ['munnar','☕'],
    ['khargone','🏛️'],  ['ujjain','🛕'],      ['bhopal','🏙️']
];

function getDestEmoji(destination) {
    var lower = (destination || '').toLowerCase();
    for (var i = 0; i < DEST_EMOJIS.length; i++) {
        if (lower.indexOf(DEST_EMOJIS[i][0]) !== -1) return DEST_EMOJIS[i][1];
    }
    return '✈️';
}


// ============================================================
//  PAGE: index.html
// ============================================================

function initIndexPage() {
    initDarkMode();
    renderNav(getUser());
}


// ============================================================
//  PAGE: login.html
// ============================================================

function initLoginPage() {
    initDarkMode();
    if (getUser()) { go('create-trip.html'); return; }
    renderNav(null);
    var form = g('login-form');
    if (!form) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); doLogin(); });
}

function doLogin() {
    var email    = g('l-email')    ? g('l-email').value.trim() : '';
    var password = g('l-password') ? g('l-password').value     : '';
    var btn      = g('btn-login');
    clearErr('login-error');
    if (!email)    { showErr('login-error', 'Please enter your email');    return; }
    if (!password) { showErr('login-error', 'Please enter your password'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    showLoader(true, 'Signing in...', 'Please wait');
    apiCall('POST', '/auth/login', { email: email, password: password },
        function (r) {
            showLoader(false);
            if (r.success) {
                setUser(r);
                toast('Welcome back, ' + (r.userName || '') + '! ✈', 'ok');
                var redirect = sessionStorage.getItem('redirect_after_login');
                sessionStorage.removeItem('redirect_after_login');
                setTimeout(function () { go(redirect || 'create-trip.html'); }, 500);
            } else {
                showErr('login-error', r.message || 'Login failed');
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }
            }
        },
        function () {
            showLoader(false);
            showErr('login-error', 'Cannot reach server. Is Tomcat running?');
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In →'; }
        }
    );
}


// ============================================================
//  PAGE: signup.html
// ============================================================

function initSignupPage() {
    initDarkMode();
    if (getUser()) { go('create-trip.html'); return; }
    renderNav(null);
    var form = g('signup-form');
    if (!form) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); doSignup(); });
}

function doSignup() {
    var name     = g('s-name')     ? g('s-name').value.trim()     : '';
    var email    = g('s-email')    ? g('s-email').value.trim()    : '';
    var password = g('s-password') ? g('s-password').value        : '';
    var confirm  = g('s-confirm')  ? g('s-confirm').value         : '';
    var btn      = g('btn-signup');
    clearErr('signup-error');
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var passStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!name || name.length < 2) { showErr('signup-error', 'Please enter your full name (min 2 characters)'); return; }
    if (!email)                   { showErr('signup-error', 'Please enter your email address');                 return; }
    if (!emailRegex.test(email))  { showErr('signup-error', 'Please enter a valid email (e.g. name@gmail.com)'); return; }
    if (password.length < 8)      { showErr('signup-error', 'Password must be at least 8 characters');         return; }
    if (!passStrong.test(password)){ showErr('signup-error', 'Password must have uppercase, lowercase and a number'); return; }
    if (password !== confirm)      { showErr('signup-error', 'Passwords do not match — please re-enter');       return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }
    showLoader(true, 'Creating your account...', 'Setting up your profile');
    apiCall('POST', '/auth/register', { name: name, email: email, password: password },
        function (r) {
            showLoader(false);
            if (r.success) {
                setUser(r);
                toast('Welcome, ' + (r.userName || name) + '! 🎉', 'ok');
                setTimeout(function () { go('create-trip.html'); }, 500);
            } else {
                showErr('signup-error', r.message || 'Registration failed');
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
            }
        },
        function () {
            showLoader(false);
            showErr('signup-error', 'Cannot reach server. Is Tomcat running?');
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account →'; }
        }
    );
}


// ============================================================
//  PAGE: create-trip.html
// ============================================================

var selectedBudget     = null;
var selectedTravelType = null;

function initCreatePage() {
    initDarkMode();
    var user = requireLogin();
    if (!user) return;
    renderNav(user);

    // Budget card selection
    document.querySelectorAll('[data-group="budget"]').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('[data-group="budget"]').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            selectedBudget = card.getAttribute('data-val');
        });
    });

    // Travel type card selection
    document.querySelectorAll('[data-group="type"]').forEach(function (card) {
        card.addEventListener('click', function () {
            document.querySelectorAll('[data-group="type"]').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
            selectedTravelType = card.getAttribute('data-val');
        });
    });

    // Interest chip checkboxes
    document.querySelectorAll('.int-chip input[type="checkbox"]').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            var chip = checkbox.parentElement;
            while (chip && !chip.classList.contains('int-chip')) chip = chip.parentElement;
            if (chip) {
                if (checkbox.checked) chip.classList.add('active');
                else                  chip.classList.remove('active');
            }
        });
    });

    // Generate button
    var btn = g('btn-generate');
    if (btn) btn.addEventListener('click', function () { doGenerate(btn); });
}

function doGenerate(btn) {
    var destination = g('inp-dest') ? g('inp-dest').value.trim()        : '';
    var days        = g('inp-days') ? parseInt(g('inp-days').value, 10) : 0;
    var travelDate  = g('inp-date') ? g('inp-date').value               : '';
    var interests   = [];
    document.querySelectorAll('.int-chip input[type="checkbox"]').forEach(function (cb) {
        if (cb.checked) interests.push(cb.value);
    });

    if (!destination)              { toast('Please enter a destination', 'err');               return; }
    if (!days || days < 1 || days > 30) { toast('Days must be between 1 and 30', 'err');      return; }
    if (!selectedBudget)           { toast('Please select a budget level', 'err');             return; }
    if (!selectedTravelType)       { toast('Please select who you are traveling with', 'err'); return; }
    if (interests.length === 0)    { toast('Please select at least one interest', 'err');      return; }

    if (btn) btn.disabled = true;
    showLoader(true, 'Planning trip to ' + destination + '...', '✨ AI is crafting your itinerary');

    apiCall('POST', '/trips/generate', {
        destination: destination,
        days:        days,
        budget:      selectedBudget,
        travelType:  selectedTravelType,
        interests:   interests,
        travelDate:  travelDate
    },
        function (r) {
            showLoader(false);
            if (btn) btn.disabled = false;
            if (r.success) {
                sessionStorage.setItem('tp_trip', JSON.stringify(r));
                go('result.html');
            } else {
                toast(r.message || 'Generation failed. Check your Gemini API key.', 'err');
            }
        },
        function (e) {
            showLoader(false);
            if (btn) btn.disabled = false;
            toast('Server error: ' + (e && e.message ? e.message : 'unknown'), 'err');
        }
    );
}


// ============================================================
//  PAGE: result.html
//  Left: itinerary with place cards + images
//  Right: Leaflet map with orange pin
// ============================================================

var leafletMap  = null;
var mapMarkers  = [];
var currentTrip = null;

function initResultPage() {
    initDarkMode();
    var user = requireLogin();
    if (!user) return;
    renderNav(user);

    var urlParams = new URLSearchParams(window.location.search);
    var tripId    = urlParams.get('id');
    var savedTrip = sessionStorage.getItem('tp_trip');

    if (tripId) {
        // Load from server — trip opened from My Trips page
        loadTripFromServer(parseInt(tripId, 10));
    } else if (savedTrip) {
        // Show just-generated trip
        try { showItinerary(JSON.parse(savedTrip)); }
        catch (e) { go('my-trips.html'); }
    } else {
        go('my-trips.html');
    }
}

/**
 * Load a specific trip by ID from the backend
 * FIX: Added better error handling — shows specific error message
 */
function loadTripFromServer(id) {
    showLoader(true, 'Loading trip...', 'Please wait...');

    // ── Step 1: Check if user is logged in (client-side) ──────
    var user = getUser();
    if (!user) {
        showLoader(false);
        sessionStorage.setItem('redirect_after_login', 'result.html?id=' + id);
        toast('Please login to view this trip', 'err');
        setTimeout(function(){ go('login.html'); }, 1500);
        return;
    }

    // ── Step 2: Call backend GET /api/trips/{id} ──────────────
    fetch(API + '/trips/' + id, {
        method:      'GET',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' }
    })
    .then(function(res) {
        // Session expired on server
        if (res.status === 401 || res.status === 403) {
            showLoader(false);
            clearUser();
            sessionStorage.setItem('redirect_after_login', 'result.html?id=' + id);
            toast('Session expired. Please login again.', 'err');
            setTimeout(function(){ go('login.html'); }, 1500);
            return null;
        }
        // Server error — try to get JSON message if possible
        if (!res.ok) {
            return res.json().catch(function() {
                throw new Error('HTTP ' + res.status);
            }).then(function(errBody) {
                throw new Error(errBody.message || 'HTTP ' + res.status);
            });
        }
        return res.json();
    })
    .then(function(r) {
        if (!r) return;
        showLoader(false);

        if (!r.success) {
            // Trip not found or access denied
            var msg = r.message || 'Trip not found';
            toast(msg, 'err');
            setTimeout(function(){ go('my-trips.html'); }, 2500);
            return;
        }

        // ── Step 3: Validate itinerary data ───────────────────
        var itinerary = r.itinerary;
        if (typeof itinerary === 'string') {
            try { itinerary = JSON.parse(itinerary); }
            catch(ex) {
                toast('Trip data is corrupted. Redirecting...', 'err');
                setTimeout(function(){ go('my-trips.html'); }, 2500);
                return;
            }
        }
        if (!Array.isArray(itinerary) || itinerary.length === 0) {
            toast('This trip has no itinerary data.', 'err');
            setTimeout(function(){ go('my-trips.html'); }, 2500);
            return;
        }

        r.itinerary = itinerary; // normalized
        showItinerary(r);
    })
    .catch(function(e) {
        showLoader(false);
        var msg = (e && e.message) ? e.message : 'Unknown error';
        if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1) {
            toast('Cannot reach server. Is Tomcat running?', 'err');
        } else if (msg.indexOf('500') !== -1) {
            toast('Server error loading trip. Check Eclipse console for details.', 'err');
        } else {
            toast('Error: ' + msg, 'err');
        }
    });
}

/**
 * Render the itinerary on screen
 * FIX: Images now use picsum.photos instead of broken Unsplash source API
 */
function showItinerary(data) {
    currentTrip = data;

    // Fill destination header
    var destEl = g('itin-dest');
    if (destEl) destEl.textContent = data.destination || '';

    // Chips: "2 days", "Cheap", "Solo"
    var chipsEl = g('itin-chips');
    if (chipsEl) {
        var d = data.days || 0;
        chipsEl.innerHTML =
            '<span class="chip chip-black">' + d + ' day' + (d !== 1 ? 's' : '') + '</span>' +
            '<span class="chip chip-orange">' + esc(data.budget     || '') + '</span>' +
            '<span class="chip chip-gray">'   + esc(data.travelType || '') + '</span>';
    }

    // PDF and Share buttons
    var actionsEl = g('itin-actions');
    if (actionsEl) {
        actionsEl.innerHTML =
            '<button class="btn-pdf"   onclick="downloadPDF()">📄 PDF</button>' +
            '<button class="btn-share" onclick="openShareModal()">🔗 Share</button>';
    }

    // Parse itinerary JSON
    var itinerary;
    try {
        itinerary = (typeof data.itinerary === 'string')
            ? JSON.parse(data.itinerary) : data.itinerary;
    } catch (e) {
        toast('Could not read itinerary data', 'err');
        return;
    }

    if (!Array.isArray(itinerary) || itinerary.length === 0) {
        toast('Itinerary is empty', 'err');
        return;
    }

    // Build HTML for all days and places
    var html = '';
    itinerary.forEach(function (day) {
        var places = Array.isArray(day.places) ? day.places : [];
        html += '<div class="day-block">';
        html += '<div class="day-badge">DAY ' + day.day + '</div>';
        if (day.theme) html += '<div class="day-theme">' + esc(day.theme) + '</div>';

        // Show daily budget header
        if (day.dailyBudget) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--orange-d);background:var(--orange-bg);padding:6px 12px;border-radius:999px;display:inline-block;margin-bottom:10px;">💵 ' + esc(day.dailyBudget) + '</div>';
        }

        places.forEach(function (place) {
            var cardId   = 'pc-' + slugId(place.name);
            var safeName = safeAttr(place.name);
            var safeDest = safeAttr(data.destination || '');
            var safeType = safeAttr(place.type || '');
            var emoji    = getTypeEmoji(place.type);
            // Use Google Places URL if available, else type-matched fallback
            var imageUrl = (place.placeImageUrl && place.placeImageUrl.trim())
                ? place.placeImageUrl
                : getPlaceImageUrl(place.name, place.type);

            // Check if this is an "interest not available" notice card
            var isUnavailable = place.isUnavailable === true ||
                                (place.type || '').toUpperCase() === 'NOT_AVAILABLE' ||
                                (place.type || '').toLowerCase().includes('not available') ||
                                (place.name || '').toLowerCase().includes('not available');

            if (isUnavailable) {
                // Beautiful "not available" warning card with alternatives
                html +=
                    '<div style="border:2px dashed #f97316;border-radius:14px;background:linear-gradient(135deg,#fff7ed,#fff);margin-bottom:12px;overflow:hidden;">' +
                        '<div style="background:#f97316;padding:10px 16px;display:flex;align-items:center;gap:10px;">' +
                            '<span style="font-size:20px;">🚫</span>' +
                            '<div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:.3px;">Interest Not Available Here</div>' +
                            '<span style="margin-left:auto;background:rgba(255,255,255,.25);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">' + esc((place.type||'').replace('NOT_AVAILABLE','').trim() || 'NOT AVAILABLE') + '</span>' +
                        '</div>' +
                        '<div style="padding:14px 16px;">' +
                            '<div style="font-size:14px;font-weight:800;color:#c2410c;margin-bottom:6px;">' + esc(place.name || 'Not Available') + '</div>' +
                            (place.unavailableReason ? '<div style="font-size:12px;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:8px;margin-bottom:10px;border-left:3px solid #f59e0b;">⚠️ ' + esc(place.unavailableReason) + '</div>' : '') +
                            (place.description ? '<div style="font-size:13px;color:#78350f;line-height:1.6;margin-bottom:10px;">' + esc(place.description) + '</div>' : '') +
                            (place.suggestedAlternative ? '<div style="font-size:12px;font-weight:600;color:#166534;background:#dcfce7;padding:10px 14px;border-radius:10px;border-left:3px solid #22c55e;line-height:1.6;">✅ <strong>Best Alternative:</strong> ' + esc(place.suggestedAlternative) + '</div>' : '') +
                            (place.tip ? '<div style="font-size:12px;color:#1e40af;background:#dbeafe;padding:8px 12px;border-radius:8px;margin-top:8px;">💡 ' + esc(place.tip) + '</div>' : '') +
                        '</div>' +
                    '</div>';
            } else {
                // Normal place card
                var timeColor = '#64748b'; var timeBg = '#f1f5f9';
                if ((place.timeOfDay||'').toLowerCase() === 'morning')   { timeColor='#92400e'; timeBg='#fef3c7'; }
                if ((place.timeOfDay||'').toLowerCase() === 'afternoon') { timeColor='#1e40af'; timeBg='#dbeafe'; }
                if ((place.timeOfDay||'').toLowerCase() === 'evening')   { timeColor='#6b21a8'; timeBg='#f3e8ff'; }

                html +=
                    '<div class="place-card" id="' + cardId + '">' +
                        '<div class="place-img-wrap">' +
                            '<img class="place-img" loading="lazy" ' +
                                 'src="' + imageUrl + '" ' +
                                 'alt="' + esc(place.name) + '" ' +
                                 'onerror="this.parentElement.innerHTML=\'<div class=\\\'place-img-skeleton\\\'>' + emoji + '</div>\'" />' +
                        '</div>' +
                        '<div class="place-body">' +
                            (place.travelFromPrevious && place.travelFromPrevious !== 'Starting point' && place.travelFromPrevious !== ''
                                ? '<div style="font-size:11px;color:var(--text-2);margin-bottom:8px;padding:5px 8px;background:var(--surface);border-radius:6px;border-left:3px solid var(--orange)">🚗 ' + esc(place.travelFromPrevious) + '</div>'
                                : '') +
                            '<div class="place-top">' +
                                '<div class="place-name">' + esc(place.name) + '</div>' +
                                '<span class="place-type">' + esc(place.type||'') + '</span>' +
                            '</div>' +
                            '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
                                (place.timeOfDay ? '<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:' + timeBg + ';color:' + timeColor + '">' + esc(place.timeOfDay) + '</span>' : '') +
                                (place.duration  ? '<span style="font-size:11px;color:var(--text-2);padding:3px 8px;background:var(--surface);border-radius:999px">⏱ ' + esc(place.duration) + '</span>' : '') +
                                (place.bestTime  ? '<span style="font-size:11px;color:var(--text-2);padding:3px 8px;background:var(--surface);border-radius:999px">🕐 ' + esc(place.bestTime) + '</span>' : '') +
                            '</div>' +
                            '<div class="place-desc">' + esc(place.description||'') + '</div>' +
                            '<div class="place-meta">' +
                                (place.estimatedCost ? '<span class="place-meta-item">💰 ' + esc(place.estimatedCost) + '</span>' : '') +
                            '</div>' +
                            (place.tip          ? '<div style="font-size:12px;color:#166534;background:#dcfce7;padding:6px 10px;border-radius:6px;margin-bottom:8px;">💡 ' + esc(place.tip) + '</div>' : '') +
                            (place.seasonalNote ? '<div style="font-size:12px;color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;margin-bottom:8px;">🌤 ' + esc(place.seasonalNote) + '</div>' : '') +
                            '<div class="place-actions">' +
                                '<button class="btn-view" onclick="viewOnMap(\'' + safeName + '\', \'' + safeDest + '\', \'' + safeType + '\')">📍 View on Map</button>' +
                                '<button class="btn-nav"  onclick="openGoogleMaps(\'' + safeName + '\', \'' + safeDest + '\')">🧭 Navigate</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
            }
        });
        html += '</div>';
    });

    var container = g('itin-days');
    if (container) container.innerHTML = html;

    // ── Load real Wikipedia images for each place ──────────────
    // Slight delay so DOM is ready, then load real images async
    setTimeout(function() {
        itinerary.forEach(function(day) {
            var places = Array.isArray(day.places) ? day.places : [];
            places.forEach(function(place) {
                if (!place.isUnavailable &&
                    (place.type||'').toUpperCase() !== 'NOT_AVAILABLE') {
                    var cardId = 'pc-' + slugId(place.name);
                    // Only load Wikipedia image if no Google Places URL
                    if (!place.placeImageUrl || !place.placeImageUrl.trim()) {
                        loadRealImage(cardId, place.name, data.destination || '');
                    }
                }
            });
        });
    }, 200);

    // Init map and pin first place
    setTimeout(function () {
        initLeafletMap();
        if (itinerary[0] && itinerary[0].places && itinerary[0].places[0]) {
            var first = itinerary[0].places[0];
            viewOnMap(first.name, data.destination || '', first.type || '');
        }
    }, 300);
}

function goBackToTrips() { go('my-trips.html'); }

// Smart back button — always goes to the right page
function handleBack() {
    var from = sessionStorage.getItem('came_from');
    sessionStorage.removeItem('came_from');
    if (from === 'my-trips') {
        go('my-trips.html');
    } else if (window.history.length > 2) {
        window.history.back();
    } else {
        go('my-trips.html');
    }
}


// ============================================================
//  LEAFLET MAP
// ============================================================

function initLeafletMap() {
    if (leafletMap) return;
    var el = g('trip-map');
    if (!el) return;
    leafletMap = L.map('trip-map', { center: [20.59, 78.96], zoom: 5 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(leafletMap);
}

function viewOnMap(placeName, destination, placeType) {
    if (!leafletMap) initLeafletMap();
    if (!leafletMap) return;

    // Highlight the matching card on the left panel
    document.querySelectorAll('.place-card').forEach(function (c) { c.classList.remove('highlighted'); });
    var card = g('pc-' + slugId(placeName));
    if (card) { card.classList.add('highlighted'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

    // Search for coordinates using Nominatim (free geocoding)
    var query = placeName + (destination && destination !== placeName ? ', ' + destination : '');
    fetch(
        'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1',
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'AITripPlanner/1.0' } }
    )
    .then(function (r) { return r.json(); })
    .then(function (results) {
        if (results && results.length > 0) {
            dropMapPin(+results[0].lat, +results[0].lon, placeName, placeType);
        } else if (destination) {
            // Fallback: search just the destination city
            fetch(
                'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(destination) + '&format=json&limit=1',
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'AITripPlanner/1.0' } }
            )
            .then(function (r) { return r.json(); })
            .then(function (fb) {
                if (fb && fb.length > 0) dropMapPin(+fb[0].lat, +fb[0].lon, placeName, placeType);
                else toast('Location not found on map', 'err');
            });
        } else {
            toast('Location not found on map', 'err');
        }
    })
    .catch(function () { toast('Map lookup failed', 'err'); });
}

function dropMapPin(lat, lon, placeName, placeType) {
    // Remove old markers
    mapMarkers.forEach(function (m) { leafletMap.removeLayer(m); });
    mapMarkers = [];

    // Orange circle icon
    var icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(249,115,22,0.7)"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9]
    });

    var popup =
        '<b style="font-family:sans-serif;font-size:14px">' + esc(placeName) + '</b>' +
        (placeType ? '<br><span style="font-size:12px;color:#64748b">' + esc(placeType) + '</span>' : '');

    var marker = L.marker([lat, lon], { icon: icon })
        .addTo(leafletMap)
        .bindPopup(popup, { offset: [0, -4] })
        .openPopup();

    mapMarkers.push(marker);
    leafletMap.flyTo([lat, lon], 15, { duration: 1.2 });

    // Update floating info card
    var infoCard = g('map-info');
    if (g('map-place-name')) g('map-place-name').textContent = placeName;
    if (g('map-place-sub'))  g('map-place-sub').textContent  = placeType || '';
    if (infoCard) infoCard.classList.add('show');
}

function closeMapInfo() {
    var c = g('map-info');
    if (c) c.classList.remove('show');
}

function openGoogleMaps(placeName, destination) {
    var query = placeName + (destination ? ', ' + destination : '');
    window.open('https://www.google.com/maps?q=' + encodeURIComponent(query), '_blank');
}


// ============================================================
//  PDF DOWNLOAD
// ============================================================

function downloadPDF() {
    if (!currentTrip) { toast('No trip data to export', 'err'); return; }
    var data = currentTrip;
    var itinerary;
    try {
        itinerary = (typeof data.itinerary === 'string')
            ? JSON.parse(data.itinerary) : data.itinerary;
    } catch (e) { toast('Cannot generate PDF', 'err'); return; }

    var dest      = (data.destination || 'Trip');
    var days      = data.days || (Array.isArray(itinerary) ? itinerary.length : 0);
    var budget    = data.budget || '';
    var tType     = data.travelType || '';
    var tDate     = data.travelDate || '';
    var genOn     = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

    // Count places
    var totalPlaces = 0;
    if (Array.isArray(itinerary)) itinerary.forEach(function(d){ if(Array.isArray(d.places)) totalPlaces += d.places.length; });

    var H = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + esc(dest) + ' Travel Guide</title>';
    H += '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';
    H += '<style>';
    H += '*{margin:0;padding:0;box-sizing:border-box;}';
    H += 'body{font-family:"Inter",sans-serif;color:#1a1a2e;background:#fff;font-size:13px;line-height:1.6;}';

    // COVER
    H += '.cover{min-height:100vh;background:linear-gradient(160deg,#0f172a 0%,#1e293b 40%,#0f172a 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:60px 60px 70px;position:relative;overflow:hidden;page-break-after:always;}';
    H += '.cover::before{content:"";position:absolute;top:0;right:0;width:500px;height:500px;background:radial-gradient(circle at 70% 30%,rgba(249,115,22,.3),transparent 60%);pointer-events:none;}';
    H += '.cover::after{content:"";position:absolute;bottom:0;left:0;width:400px;height:400px;background:radial-gradient(circle at 20% 80%,rgba(249,115,22,.15),transparent 60%);pointer-events:none;}';
    H += '.cover-logo{position:absolute;top:50px;left:60px;font-size:13px;font-weight:700;letter-spacing:3px;color:rgba(249,115,22,.9);text-transform:uppercase;z-index:1;}';
    H += '.cover-content{position:relative;z-index:1;}';
    H += '.cover-label{font-size:12px;font-weight:700;letter-spacing:4px;color:rgba(249,115,22,.8);text-transform:uppercase;margin-bottom:20px;}';
    H += '.cover-dest{font-family:"Playfair Display",serif;font-size:72px;font-weight:900;color:#fff;line-height:1;letter-spacing:-2px;text-transform:uppercase;margin-bottom:8px;}';
    H += '.cover-sub{font-size:18px;color:rgba(255,255,255,.5);margin-bottom:40px;font-weight:400;}';
    H += '.cover-tags{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:50px;}';
    H += '.tag{padding:8px 20px;border-radius:999px;font-size:12px;font-weight:700;}';
    H += '.tag-o{background:#f97316;color:#fff;}';
    H += '.tag-w{background:rgba(255,255,255,.1);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.2);}';
    H += '.cover-divider{height:1px;background:linear-gradient(90deg,rgba(249,115,22,.5),transparent);margin-bottom:30px;}';
    H += '.cover-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}';
    H += '.stat-box{border-top:2px solid rgba(249,115,22,.4);padding-top:14px;}';
    H += '.stat-label{font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:4px;}';
    H += '.stat-val{font-family:"Playfair Display",serif;font-size:22px;font-weight:700;color:#fff;}';

    // DAY SECTION
    H += '.page{padding:50px 60px;min-height:100vh;}';
    H += '.day-section{margin-bottom:48px;page-break-inside:avoid;}';
    H += '.day-hdr{display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #f1f5f9;}';
    H += '.day-badge{background:#f97316;color:#fff;font-size:10px;font-weight:900;letter-spacing:2px;padding:6px 16px;border-radius:999px;text-transform:uppercase;white-space:nowrap;}';
    H += '.day-theme{font-family:"Playfair Display",serif;font-size:20px;font-weight:700;color:#0f172a;flex:1;}';
    H += '.day-budget{background:#fff7ed;color:#c2410c;font-size:11px;font-weight:700;padding:5px 14px;border-radius:999px;border:1px solid #fed7aa;white-space:nowrap;}';

    // TIME SLOTS
    H += '.slot{margin-bottom:20px;}';
    H += '.slot-hdr{display:flex;align-items:center;gap:10px;margin-bottom:12px;}';
    H += '.slot-hdr::after{content:"";flex:1;height:1px;background:#e2e8f0;}';
    H += '.slot-label{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:3px 12px;border-radius:999px;}';
    H += '.m-label{background:#fef3c7;color:#92400e;}';
    H += '.a-label{background:#dbeafe;color:#1e40af;}';
    H += '.e-label{background:#f3e8ff;color:#6b21a8;}';

    // PLACE CARD
    H += '.place{background:#fafafa;border:1px solid #e8ecf0;border-radius:12px;padding:16px 18px;margin-bottom:10px;break-inside:avoid;position:relative;}';
    H += '.place-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px;}';
    H += '.place-name{font-size:15px;font-weight:800;color:#0f172a;line-height:1.3;}';
    H += '.place-type{background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap;}';
    H += '.travel-from{font-size:11px;color:#94a3b8;margin-bottom:6px;display:flex;align-items:center;gap:6px;}';
    H += '.place-desc{font-size:12px;color:#475569;line-height:1.6;margin-bottom:10px;}';
    H += '.meta-row{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px;}';
    H += '.meta-item{font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;}';
    H += '.tip{background:#f0fdf4;border-left:3px solid #22c55e;padding:7px 12px;border-radius:0 8px 8px 0;font-size:11px;color:#166534;margin-bottom:6px;}';
    H += '.seasonal{background:#fefce8;border-left:3px solid #eab308;padding:7px 12px;border-radius:0 8px 8px 0;font-size:11px;color:#713f12;margin-bottom:6px;}';
    H += '.maps-btn{display:inline-block;background:#f97316;color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:999px;text-decoration:none;margin-top:4px;}';

    // UNAVAILABLE CARD
    H += '.unavail{background:#fff7ed;border:2px dashed #f97316;border-radius:12px;padding:16px 18px;margin-bottom:10px;}';
    H += '.unavail-title{font-size:14px;font-weight:800;color:#c2410c;margin-bottom:6px;}';
    H += '.unavail-alt{background:#dcfce7;border-left:3px solid #22c55e;padding:7px 12px;border-radius:0 8px 8px 0;font-size:11px;color:#166534;margin-top:8px;}';

    // FOOTER
    H += '.pdf-footer{text-align:center;padding:30px 60px 40px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;}';
    H += '.pdf-footer strong{color:#f97316;}';

    H += '@media print{';
    H += '.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact;min-height:100vh;}';
    H += '.day-section{page-break-inside:avoid;}';
    H += '.place{break-inside:avoid;}';
    H += 'body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}';
    H += '}';
    H += '</style></head><body>';

    // ── COVER PAGE ───────────────────────────────────────
    H += '<div class="cover">';
    H += '<div class="cover-logo">✈ AI Trip Planner</div>';
    H += '<div class="cover-content">';
    H += '<div class="cover-label">Your Personalized Travel Guide</div>';
    H += '<div class="cover-dest">' + esc(dest) + '</div>';
    H += '<div class="cover-sub">' + days + '-Day ' + esc(budget) + ' Trip' + (tType ? ' • ' + esc(tType) : '') + '</div>';
    H += '<div class="cover-tags">';
    H += '<span class="tag tag-o">📅 ' + (tDate || 'Flexible Date') + '</span>';
    H += '<span class="tag tag-w">🗓 ' + days + ' Day' + (days>1?'s':'') + '</span>';
    H += '<span class="tag tag-w">💰 ' + esc(budget) + '</span>';
    if (tType) H += '<span class="tag tag-w">👥 ' + esc(tType) + '</span>';
    H += '</div>';
    H += '<div class="cover-divider"></div>';
    H += '<div class="cover-stats">';
    H += '<div class="stat-box"><div class="stat-label">Destination</div><div class="stat-val">' + esc(dest) + '</div></div>';
    H += '<div class="stat-box"><div class="stat-label">Duration</div><div class="stat-val">' + days + ' Days</div></div>';
    H += '<div class="stat-box"><div class="stat-label">Spots</div><div class="stat-val">' + totalPlaces + '</div></div>';
    H += '<div class="stat-box"><div class="stat-label">Budget</div><div class="stat-val">' + esc(budget) + '</div></div>';
    H += '</div></div></div>';

    // ── ITINERARY PAGES ──────────────────────────────────
    H += '<div class="page">';

    if (Array.isArray(itinerary)) {
        itinerary.forEach(function(day) {
            var places    = Array.isArray(day.places) ? day.places : [];
            var morning   = places.filter(function(p){ return (p.timeOfDay||'').toLowerCase().includes('morning');   });
            var afternoon = places.filter(function(p){ return (p.timeOfDay||'').toLowerCase().includes('afternoon'); });
            var evening   = places.filter(function(p){ return (p.timeOfDay||'').toLowerCase().includes('evening');   });
            var others    = places.filter(function(p){ var t=(p.timeOfDay||'').toLowerCase(); return !t.includes('morning')&&!t.includes('afternoon')&&!t.includes('evening'); });

            H += '<div class="day-section">';
            H += '<div class="day-hdr">';
            H += '<span class="day-badge">DAY ' + day.day + '</span>';
            if (day.theme) H += '<span class="day-theme">' + esc(day.theme) + '</span>';
            if (day.dailyBudget) H += '<span class="day-budget">💵 ' + esc(day.dailyBudget) + '</span>';
            H += '</div>';

            function renderSlot(list, label, slotClass) {
                if (!list || list.length === 0) return '';
                var s = '<div class="slot">';
                s += '<div class="slot-hdr"><span class="slot-label ' + slotClass + '">' + label + '</span></div>';
                list.forEach(function(p, idx) {
                    var isNA = p.isUnavailable === true || (p.type||'').toUpperCase() === 'NOT_AVAILABLE';
                    if (isNA) {
                        s += '<div class="unavail">';
                        s += '<div style="font-size:12px;font-weight:700;color:#f97316;margin-bottom:4px;">🚫 Not Available In This City</div>';
                        s += '<div class="unavail-title">' + esc(p.name||'') + '</div>';
                        if (p.unavailableReason) s += '<div style="font-size:11px;color:#92400e;margin-bottom:6px;">' + esc(p.unavailableReason) + '</div>';
                        if (p.description) s += '<div style="font-size:11px;color:#78350f;">' + esc(p.description) + '</div>';
                        if (p.suggestedAlternative) s += '<div class="unavail-alt">✅ Alternative: ' + esc(p.suggestedAlternative) + '</div>';
                        s += '</div>';
                    } else {
                        s += '<div class="place">';
                        if (p.travelFromPrevious && p.travelFromPrevious !== 'Starting point' && p.travelFromPrevious !== '')
                            s += '<div class="travel-from">🚗 ' + esc(p.travelFromPrevious) + '</div>';
                        s += '<div class="place-top">';
                        s += '<div class="place-name">' + (idx+1) + '. ' + esc(p.name||'') + '</div>';
                        if (p.type) s += '<span class="place-type">' + esc(p.type) + '</span>';
                        s += '</div>';
                        if (p.description) s += '<div class="place-desc">' + esc(p.description) + '</div>';
                        s += '<div class="meta-row">';
                        if (p.bestTime)      s += '<span class="meta-item">🕐 ' + esc(p.bestTime) + '</span>';
                        if (p.duration)      s += '<span class="meta-item">⏱ ' + esc(p.duration) + '</span>';
                        if (p.estimatedCost) s += '<span class="meta-item">💰 ' + esc(p.estimatedCost) + '</span>';
                        s += '</div>';
                        if (p.tip && p.tip.trim()) s += '<div class="tip">💡 ' + esc(p.tip) + '</div>';
                        if (p.seasonalNote && p.seasonalNote.trim()) s += '<div class="seasonal">🌤 ' + esc(p.seasonalNote) + '</div>';
                        var mapsQ = encodeURIComponent((p.name||'') + (dest ? ', '+dest : ''));
                        s += '<a class="maps-btn" href="https://maps.google.com?q=' + mapsQ + '">📍 View on Google Maps</a>';
                        s += '</div>';
                    }
                });
                s += '</div>';
                return s;
            }

            H += renderSlot(morning,   '☀️  Morning',   'm-label');
            H += renderSlot(afternoon, '🌤  Afternoon', 'a-label');
            H += renderSlot(evening,   '🌙  Evening',   'e-label');
            H += renderSlot(others,    '📍  Places',    'm-label');
            H += '</div>';
        });
    }

    H += '</div>';
    H += '<div class="pdf-footer">Generated by <strong>AI Trip Planner</strong> • Powered by Gemini AI • ' + genOn + '</div>';
    H += '</body></html>';

    var win = window.open('', '_blank');
    if (!win) { toast('Allow pop-ups to generate PDF', 'err'); return; }
    win.document.write(H);
    win.document.close();
    setTimeout(function(){ win.print(); }, 800);
    toast('PDF ready! → Click Print → Save as PDF 📄', 'ok');
}

// ============================================================
//  TRIP SHARING
// ============================================================

function openShareModal() {
    var modal = g('share-modal');
    if (!modal) return;

    var tripId = currentTrip && (currentTrip.tripId || currentTrip.id);
    if (!tripId) {
        toast('Save the trip first to share it', 'err');
        return;
    }

    // Build absolute shareable URL
    var base = window.location.origin + window.location.pathname.replace('result.html','') + 'result.html';
    var url  = base + '?id=' + tripId;

    var input = g('share-link-input');
    if (input) input.value = url;
    modal.classList.add('show');

    // Auto-select the link text
    setTimeout(function() { if (input) { input.select(); input.setSelectionRange(0,99999); } }, 100);
}

function closeShareModal() {
    var modal = g('share-modal');
    if (modal) modal.classList.remove('show');
}

function copyShareLink() {
    var input = g('share-link-input');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    try {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value).then(function () { toast('Link copied! 🔗', 'ok'); });
        } else {
            document.execCommand('copy');
            toast('Link copied! 🔗', 'ok');
        }
    } catch (e) { toast('Please copy the link manually', 'err'); }
}


// ============================================================
//  PAGE: my-trips.html
// ============================================================

function initMyTripsPage() {
    initDarkMode();
    var user = requireLogin();
    if (!user) return;
    renderNav(user);
    loadMyTrips();
}

function loadMyTrips() {
    var listDiv = g('trips-list');
    if (!listDiv) return;

    listDiv.innerHTML = buildSkeletonCards(3);

    var user = getUser();
    if (!user) { go('login.html'); return; }

    apiCall('GET', '/trips/my', null,
        function (r) {
            if (r.success) {
                renderTripCards(r.trips || []);
            } else {
                if (r.message && r.message.indexOf('login') !== -1) {
                    clearUser();
                    toast('Session expired. Please login again.', 'err');
                    setTimeout(function () { go('login.html'); }, 1500);
                } else {
                    toast('Error loading trips: ' + (r.message || 'Unknown error'), 'err');
                    renderTripCards([]);
                }
            }
        },
        function () {
            toast('Cannot reach server. Is Tomcat running?', 'err');
            renderTripCards([]);
        }
    );
}

function buildSkeletonCards(count) {
    var html = '<div class="trips-grid">';
    for (var i = 0; i < count; i++) {
        html +=
            '<div class="trip-card">' +
                '<div class="tc-thumb pulse" style="background:#1e293b"></div>' +
                '<div class="tc-body">' +
                    '<div class="pulse" style="height:22px;background:var(--gray-200);border-radius:6px;margin-bottom:10px"></div>' +
                    '<div class="pulse" style="height:14px;background:var(--gray-100);border-radius:6px;width:60%"></div>' +
                '</div>' +
                '<div class="tc-foot">' +
                    '<div class="pulse" style="height:12px;background:var(--gray-100);border-radius:6px;width:40%"></div>' +
                '</div>' +
            '</div>';
    }
    return html + '</div>';
}

function renderTripCards(trips) {
    var listDiv = g('trips-list');
    if (!listDiv) return;

    var countEl = g('trips-cnt');
    if (countEl) {
        countEl.textContent = trips.length > 0
            ? trips.length + ' saved trip' + (trips.length !== 1 ? 's' : '')
            : 'Your saved AI-generated travel itineraries';
    }

    if (!trips || trips.length === 0) {
        listDiv.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">🗺️</div>' +
                '<div class="empty-h">No trips yet</div>' +
                '<div class="empty-p">Create your first AI-powered itinerary and start exploring!</div>' +
                '<a href="create-trip.html" class="btn btn-dark btn-lg">+ Create Your First Trip</a>' +
            '</div>';
        return;
    }

    var html = '<div class="trips-grid">';
    trips.forEach(function (trip) {
        var days = trip.days || 0;
        var dest = trip.destination || '';
        var destLower = dest.toLowerCase();

        // Destination-specific background images
        var imgSeed = 'travel1';
        if (destLower.includes('goa'))         imgSeed = 'beach10';
        else if (destLower.includes('manali') || destLower.includes('shimla') || destLower.includes('ladakh') || destLower.includes('kashmir')) imgSeed = 'mountain10';
        else if (destLower.includes('rajasthan') || destLower.includes('jaipur') || destLower.includes('jodhpur') || destLower.includes('jaisalmer')) imgSeed = 'castle10';
        else if (destLower.includes('kerala') || destLower.includes('munnar') || destLower.includes('coorg')) imgSeed = 'nature15';
        else if (destLower.includes('varanasi') || destLower.includes('rishikesh') || destLower.includes('haridwar')) imgSeed = 'temple10';
        else if (destLower.includes('delhi'))   imgSeed = 'city10';
        else if (destLower.includes('mumbai'))  imgSeed = 'city15';
        else if (destLower.includes('indore') || destLower.includes('bhopal')) imgSeed = 'city20';
        else if (destLower.includes('agra'))    imgSeed = 'castle15';
        else if (destLower.includes('puri') || destLower.includes('andaman')) imgSeed = 'beach15';
        else {
            var s = 0;
            for (var i = 0; i < destLower.length; i++) s = (s * 31 + destLower.charCodeAt(i)) % 30;
            imgSeed = 'travel' + (Math.abs(s) + 1);
        }
        var imgUrl = 'https://picsum.photos/seed/' + imgSeed + '/600/300';

        html +=
            '<div class="trip-card" onclick="openSavedTrip(' + trip.id + ')">' +

                // Thumbnail with real destination image
                '<div class="tc-thumb" style="position:relative;background-image:url(' + imgUrl + ');background-size:cover;background-position:center;">' +
                    '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.6) 100%);"></div>' +
                    '<div class="tc-days-badge" style="position:relative;z-index:1;">' + days + ' day' + (days !== 1 ? 's' : '') + '</div>' +
                    '<button class="tc-del-btn" style="z-index:2;" onclick="event.stopPropagation(); deleteSavedTrip(' + trip.id + ')" title="Delete">🗑</button>' +
                    '<div style="position:absolute;bottom:14px;left:16px;right:16px;z-index:1;">' +
                        '<div style="font-size:20px;font-weight:900;color:#fff;text-transform:capitalize;text-shadow:0 2px 8px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(dest) + '</div>' +
                    '</div>' +
                '</div>' +

                // Card body
                '<div class="tc-body" style="padding:14px 18px 0;">' +
                    '<div class="tc-chips">' +
                        '<span class="chip chip-orange">' + esc(trip.budget || '') + '</span>' +
                        '<span class="chip chip-gray">'   + esc(trip.travelType || '') + '</span>' +
                        '<span class="chip chip-black">'  + days + 'd</span>' +
                    '</div>' +
                '</div>' +

                // Footer
                '<div class="tc-foot">' +
                    '<div class="tc-date">📅 ' + fmtDate(trip.createdAt) + '</div>' +
                    '<div class="tc-arrow" style="background:var(--orange);color:#fff;">→</div>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    listDiv.innerHTML = html;
}

function openSavedTrip(tripId) {
    sessionStorage.removeItem('tp_trip');
    // Remember we came from My Trips (for back button)
    sessionStorage.setItem('came_from', 'my-trips');
    go('result.html?id=' + tripId);
}

/**
 * ✅ FIX: Delete trip
 * Uses fetch directly to ensure DELETE method works properly
 * Some browsers have issues with fetch DELETE through wrapper
 */
function deleteSavedTrip(tripId) {
    if (!confirm('Delete this trip? This cannot be undone.')) return;

    // Show deleting state
    toast('Deleting trip...', 'ok');

    fetch(API + '/trips/' + tripId, {
        method:      'DELETE',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' }
    })
    .then(function (response) {
        if (response.status === 401) {
            clearUser();
            toast('Session expired. Please login again.', 'err');
            setTimeout(function () { go('login.html'); }, 1500);
            return null;
        }
        return response.json();
    })
    .then(function (r) {
        if (!r) return;
        if (r.success) {
            toast('Trip deleted ✓', 'ok');
            loadMyTrips(); // refresh list
        } else {
            toast('Could not delete: ' + (r.message || 'Unknown error'), 'err');
        }
    })
    .catch(function (e) {
        toast('Delete failed. Is Tomcat running?', 'err');
    });
}