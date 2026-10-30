// Sahl Frontend Script & API Handlers

// STATE MANAGEMENT
let activeView = 'home';
let currentSelectedListingForBuy = null;
let currentUser = null;
let pendingPostAdIntent = false;

let listingsData = [];
let stationsData = [];

// API ENDPOINT CONSTANT (Flask Backend)
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// INITIALIZATION ON LOAD
window.addEventListener('DOMContentLoaded', () => {
    fetchListings();
    fetchStations();
});

// BACKEND API INTEGRATIONS WITH FALLBACK DATA
async function fetchListings() {
    try {
        const response = await fetch(`${API_BASE_URL}/listings`);
        if (response.ok) {
            listingsData = await response.json();
        } else {
            throw new Error('API request failed');
        }
    } catch (e) {
        console.warn('Backend API offline. Using static client fallback data.', e);
        listingsData = getFallbackListings();
    }
    renderFeaturedListings();
    renderBrowsePage();
}

async function fetchStations() {
    try {
        const response = await fetch(`${API_BASE_URL}/stations`);
        if (response.ok) {
            stationsData = await response.json();
        } else {
            throw new Error('API request failed');
        }
    } catch (e) {
        console.warn('Backend API offline. Using static station fallback data.', e);
        stationsData = getFallbackStations();
    }
    renderStationsList(stationsData);
}

// ROUTER / VIEW SWITCHING LOGIC
function navigateTo(viewId) {
    activeView = viewId;
    document.querySelectorAll('.spa-view').forEach(view => {
        view.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    if (viewId !== 'auth' && !pendingPostAdIntent) {
        hideAuthNotice();
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-sahl-600', 'font-bold');
    });
    const activeBtn = document.getElementById(`nav-${viewId}`);
    if (activeBtn) {
        activeBtn.classList.add('text-sahl-600', 'font-bold');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// SUB-TAB SWITCHING
function switchStationTab(tab) {
    const expSub = document.getElementById('subtab-explorer');
    const trackSub = document.getElementById('subtab-tracker');
    const btnExp = document.getElementById('tab-btn-explorer');
    const btnTrack = document.getElementById('tab-btn-tracker');

    if (tab === 'explorer') {
        expSub.classList.remove('hidden');
        trackSub.classList.add('hidden');
        btnExp.className = "px-4 py-2 rounded-lg bg-white text-sahl-700 shadow-sm transition-all";
        btnTrack.className = "px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition-all";
    } else {
        expSub.classList.add('hidden');
        trackSub.classList.remove('hidden');
        btnTrack.className = "px-4 py-2 rounded-lg bg-white text-sahl-700 shadow-sm transition-all";
        btnExp.className = "px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition-all";
    }
}

// AUTH GUARD & POST AD MODAL
function openPostAdModal() {
    if (!currentUser) {
        pendingPostAdIntent = true;
        showAuthNotice("Please sign in or create an account to post a classified ad on Sahl.");
        showToast("Account required to post an ad", "error");
        navigateTo('auth');
        return;
    }
    document.getElementById('post-ad-modal').classList.remove('hidden');
}

function closePostAdModal() {
    document.getElementById('post-ad-modal').classList.add('hidden');
}

function showAuthNotice(msg) {
    const banner = document.getElementById('auth-notice-banner');
    const msgEl = document.getElementById('auth-notice-message');
    if (banner && msgEl) {
        msgEl.innerText = msg;
        banner.classList.remove('hidden');
    }
}

function hideAuthNotice() {
    const banner = document.getElementById('auth-notice-banner');
    if (banner) {
        banner.classList.add('hidden');
    }
}

async function handlePostAdSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
        showToast("Your session expired. Please sign in again.", "error");
        closePostAdModal();
        navigateTo('auth');
        return;
    }

    const title = document.getElementById('post-title').value;
    const price = parseFloat(document.getElementById('post-price').value);
    const category = document.getElementById('post-category').value;
    const condition = document.getElementById('post-condition').value;
    const gov = document.getElementById('post-gov').value;

    const newListing = {
        title,
        category,
        price,
        condition,
        gov,
        station: `${gov} Station Drop-Off`,
        seller: currentUser.name,
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60"
    };

    try {
        const response = await fetch(`${API_BASE_URL}/listings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newListing)
        });
        if (response.ok) {
            const savedItem = await response.json();
            listingsData.unshift(savedItem);
        } else {
            throw new Error('Failed to post');
        }
    } catch (e) {
        newListing.id = Date.now();
        newListing.views = 1;
        newListing.verified = true;
        listingsData.unshift(newListing);
    }

    renderFeaturedListings();
    renderBrowsePage();
    closePostAdModal();
    showToast("Ad published successfully! Take item to Sahl Station for barcode label.", "success");
}

// RENDER & FILTER FUNCTIONS
function renderFeaturedListings() {
    const grid = document.getElementById('home-featured-grid');
    if (!grid) return;
    const featured = listingsData.slice(0, 4);
    grid.innerHTML = featured.map(item => createListingCardHTML(item)).join('');
}

function renderBrowsePage() {
    const grid = document.getElementById('browse-grid');
    if (!grid) return;
    const selectedCat = document.getElementById('browse-category-filter')?.value || 'All';
    const filtered = selectedCat === 'All' 
        ? listingsData 
        : listingsData.filter(i => i.category === selectedCat);

    grid.innerHTML = filtered.map(item => createListingCardHTML(item)).join('');
}

function filterByCategory(cat) {
    const catSelect = document.getElementById('browse-category-filter');
    if (catSelect) catSelect.value = cat;
    navigateTo('browse');
    renderBrowsePage();
}

function filterListingsByGov(gov) {
    navigateTo('browse');
    const grid = document.getElementById('browse-grid');
    if (!grid) return;
    const filtered = gov === 'All' ? listingsData : listingsData.filter(i => i.gov === gov);
    grid.innerHTML = filtered.map(item => createListingCardHTML(item)).join('');
}

function handleGlobalSearch(query) {
    if (!query) {
        renderBrowsePage();
        return;
    }
    navigateTo('browse');
    const grid = document.getElementById('browse-grid');
    if (!grid) return;
    const q = query.toLowerCase();
    const matches = listingsData.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q) ||
        item.gov.toLowerCase().includes(q)
    );
    grid.innerHTML = matches.map(item => createListingCardHTML(item)).join('');
}

function createListingCardHTML(item) {
    return `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
                <div class="relative h-48 overflow-hidden bg-slate-100">
                    <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/400x300/f1f5f9/0f172a?text=Sahl+Listing'">
                    <span class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        ${item.gov} Gov
                    </span>
                    <span class="absolute top-3 right-3 bg-sahl-gold text-slate-900 text-[10px] font-extrabold px-2 py-1 rounded-full shadow">
                        Escrow Protected
                    </span>
                </div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between text-[11px] text-slate-500">
                        <span class="bg-slate-100 px-2 py-0.5 rounded font-medium">${item.category}</span>
                        <span><i class="fa-solid fa-eye mr-1"></i>${item.views || 1} views</span>
                    </div>
                    <h3 class="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-sahl-600 transition-colors">${item.title}</h3>
                    <p class="text-xs text-slate-500"><i class="fa-solid fa-store text-sahl-600 mr-1"></i>${item.station}</p>
                </div>
            </div>
            <div class="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block uppercase">Price</span>
                    <span class="text-base font-extrabold text-sahl-navy">${Number(item.price).toLocaleString()} <span class="text-xs font-normal text-slate-500">EGP</span></span>
                </div>
                <button onclick="openBuyModal(${item.id})" class="bg-sahl-600 hover:bg-sahl-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow transition-all flex items-center gap-1.5">
                    <i class="fa-solid fa-shield-halved text-sahl-gold"></i>
                    <span>Buy Escrow</span>
                </button>
            </div>
        </div>
    `;
}

// AUTHENTICATION LOGIC
function toggleAuthMode(mode) {
    const isSignUp = mode === 'signup';
    document.getElementById('signup-extra-fields').classList.toggle('hidden', !isSignUp);
    document.getElementById('auth-submit-btn').innerText = isSignUp ? "Create Account & Verify ID" : "Sign In";

    document.getElementById('auth-tab-signin').className = isSignUp 
        ? "flex-1 text-center font-bold text-slate-400 pb-2 hover:text-slate-700 transition-all" 
        : "flex-1 text-center font-bold text-sahl-600 border-b-2 border-sahl-600 pb-2 transition-all";

    document.getElementById('auth-tab-signup').className = isSignUp 
        ? "flex-1 text-center font-bold text-sahl-600 border-b-2 border-sahl-600 pb-2 transition-all" 
        : "flex-1 text-center font-bold text-slate-400 pb-2 hover:text-slate-700 transition-all";
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const identity = document.getElementById('auth-identity').value;
    const password = document.getElementById('auth-password').value;
    const nameInput = document.getElementById('auth-fullname')?.value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, password })
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        } else {
            currentUser = { name: nameInput || identity || "Ahmed Mahmoud" };
        }
    } catch (err) {
        currentUser = { name: nameInput || identity || "Ahmed Mahmoud" };
    }

    document.getElementById('user-btn-label').innerText = currentUser.name.split(' ')[0];
    hideAuthNotice();
    showToast(`Signed in successfully as ${currentUser.name}`, "success");

    if (pendingPostAdIntent) {
        pendingPostAdIntent = false;
        navigateTo('home');
        openPostAdModal();
    } else {
        navigateTo('home');
    }
}

function filterStationsByGov(gov) {
    let filtered = stationsData;
    if (gov !== 'All') {
        filtered = stationsData.filter(s => s.gov === gov);
    }
    renderStationsList(filtered);
}

function renderStationsList(list) {
    const grid = document.getElementById('stations-grid');
    const countLabel = document.getElementById('station-count');
    if (countLabel) countLabel.innerText = list.length;

    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-8 text-center text-slate-400">
                <i class="fa-solid fa-building-circle-exclamation text-3xl mb-2"></i>
                <p class="font-semibold text-xs">No station partner listed in selected governorate yet.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = list.map(st => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sahl-600 transition-all space-y-3">
            <div class="flex items-start justify-between">
                <div>
                    <span class="bg-sahl-100 text-sahl-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">${st.gov} Governorate</span>
                    <h3 class="font-bold text-slate-900 text-sm mt-1">${st.name}</h3>
                </div>
                <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">${st.status}</span>
            </div>

            <p class="text-xs text-slate-500 leading-relaxed"><i class="fa-solid fa-map-pin text-sahl-600 mr-1"></i>${st.address}</p>

            <div class="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-600">
                <div class="flex items-center justify-between">
                    <span><i class="fa-regular fa-clock mr-1 text-slate-400"></i> Hours:</span>
                    <span class="font-semibold text-slate-800">${st.hours}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span><i class="fa-solid fa-cubes mr-1 text-slate-400"></i> Locker Capacity:</span>
                    <span class="font-semibold text-sahl-700">${st.capacity}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span><i class="fa-solid fa-phone mr-1 text-slate-400"></i> Contact:</span>
                    <span class="font-mono text-slate-700">${st.phone}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// TRACKING SIMULATOR LOGIC
function setTrackingSample(code) {
    const input = document.getElementById('tracking-input');
    if (input) input.value = code;
    performTrackingSearch();
}

async function performTrackingSearch() {
    const code = document.getElementById('tracking-input')?.value.trim().toUpperCase();
    const box = document.getElementById('tracking-result-box');
    if (!code || !box) return;

    let record = null;
    try {
        const response = await fetch(`${API_BASE_URL}/track/${code}`);
        if (response.ok) {
            record = await response.json();
        } else {
            record = getFallbackTrackingData()[code];
        }
    } catch (e) {
        record = getFallbackTrackingData()[code];
    }

    if (!record) {
        showToast(`Tracking code "${code}" not found. Try SAHL-1001.`, 'error');
        box.classList.add('hidden');
        return;
    }

    box.classList.remove('hidden');
    document.getElementById('track-id-disp').innerText = code;
    document.getElementById('track-item-name').innerText = record.item;
    document.getElementById('track-price-disp').innerText = record.price;
    document.getElementById('track-status-pill').innerText = record.status;

    const stepsContainer = document.getElementById('tracking-timeline-steps');
    stepsContainer.innerHTML = record.steps.map(step => `
        <div class="relative pl-2">
            <div class="absolute -left-[31px] top-0 w-4 h-4 rounded-full ${step.done ? 'bg-sahl-600 ring-4 ring-sahl-100' : 'bg-slate-300'} border-2 border-white"></div>
            <span class="text-[10px] font-bold ${step.done ? 'text-sahl-700' : 'text-slate-400'} uppercase">${step.time}</span>
            <h5 class="font-bold text-xs text-slate-800 mt-0.5">${step.title}</h5>
            <p class="text-[11px] text-slate-500 mt-0.5">${step.desc}</p>
        </div>
    `).join('');

    showToast(`Tracking loaded for parcel ${code}`, 'success');
}

// BUY & ESCROW MODAL LOGIC
function openBuyModal(itemId) {
    const item = listingsData.find(i => i.id === itemId);
    if (!item) return;

    currentSelectedListingForBuy = item;
    document.getElementById('buy-modal-title').innerText = item.title;
    document.getElementById('buy-modal-seller').innerText = `Seller: ${item.seller} • Drop-off Station: ${item.station}`;
    document.getElementById('buy-modal-price').innerText = `${item.price.toLocaleString()} EGP`;

    const escrowFee = Math.round(item.price * 0.03);
    const shipFee = 120;
    const total = item.price + shipFee + escrowFee;

    document.getElementById('buy-modal-escrowfee').innerText = `${escrowFee.toLocaleString()} EGP`;
    document.getElementById('buy-modal-total').innerText = `${total.toLocaleString()} EGP`;

    document.getElementById('buy-modal').classList.remove('hidden');
}

function closeBuyModal() {
    document.getElementById('buy-modal').classList.add('hidden');
}

function confirmEscrowPurchase() {
    closeBuyModal();
    const station = document.getElementById('buy-modal-station-select')?.value;
    showToast(`Purchase request created! Payment held in Sahl Escrow. Track parcel at ${station}.`, 'success');
}

// TOAST NOTIFICATIONS
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-sahl-navy border-sahl-500' : 'bg-slate-900 border-rose-500';

    toast.className = `${bgColor} text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-l-4 flex items-center gap-3 transform transition-all duration-300 pointer-events-auto`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-sahl-gold' : 'fa-circle-exclamation text-rose-400'} text-base"></i>
        <span class="font-medium">${msg}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// STATIC FALLBACK DATA GENERATORS
function getFallbackListings() {
    return [
        {
            id: 101,
            title: "Apple iPhone 13 Pro (128GB) - Sierra Blue",
            category: "Mobile Phones",
            price: 21500,
            condition: "Like New",
            gov: "Cairo",
            station: "Nasr City Station #04",
            seller: "Omar Hassan",
            image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500&auto=format&fit=crop&q=60",
            views: 142,
            verified: true
        },
        {
            id: 102,
            title: "Sony PlayStation 5 Console + 2 Controllers",
            category: "Electronics",
            price: 24000,
            condition: "Like New",
            gov: "Alexandria",
            station: "Smouha Station #01",
            seller: "Mahmoud Zaki",
            image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&auto=format&fit=crop&q=60",
            views: 289,
            verified: true
        },
        {
            id: 103,
            title: "Dell XPS 15 Laptop (Core i7, 16GB RAM, 512GB SSD)",
            category: "Electronics",
            price: 32000,
            condition: "Good Condition",
            gov: "Giza",
            station: "Dokki Hub #02",
            seller: "Nour El-Din",
            image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60",
            views: 95,
            verified: true
        },
        {
            id: 104,
            title: "Chicco Lightweight Baby Stroller - Foldable",
            category: "Baby Items",
            price: 2800,
            condition: "Good Condition",
            gov: "Faiyum",
            station: "Faiyum Central #01",
            seller: "Sarah Ahmed",
            image: "https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?w=500&auto=format&fit=crop&q=60",
            views: 54,
            verified: true
        },
        {
            id: 105,
            title: "IKEA Modern Dining Table + 4 Chairs Set",
            category: "Home & Furniture",
            price: 6500,
            condition: "Like New",
            gov: "Sharqia",
            station: "Zagazig Station #01",
            seller: "Khaled Mostafa",
            image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=500&auto=format&fit=crop&q=60",
            views: 110,
            verified: true
        },
        {
            id: 106,
            title: "Nike Air Jordan 1 Retro High - Size 43",
            category: "Fashion",
            price: 3400,
            condition: "Like New",
            gov: "Luxor",
            station: "Luxor Hub #01",
            seller: "Youssef Ibrahim",
            image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=500&auto=format&fit=crop&q=60",
            views: 78,
            verified: true
        }
    ];
}

function getFallbackStations() {
    return [
        {
            name: "Nasr City Central Station Hub",
            gov: "Cairo",
            address: "45 Abbas El Akkad St, Ground Floor",
            hours: "09:00 AM - 11:00 PM (7 Days)",
            capacity: "High Capacity (300+ parcels)",
            status: "Operational",
            phone: "+20 100 123 4567"
        },
        {
            name: "Dokki Station Branch",
            gov: "Giza",
            address: "12 El Tahrir Street, Dokki",
            hours: "10:00 AM - 10:00 PM (Mon-Sat)",
            capacity: "Medium Capacity (150 parcels)",
            status: "Operational",
            phone: "+20 100 234 5678"
        },
        {
            name: "Smouha Hub Station",
            gov: "Alexandria",
            address: "Victor Emanuel Square, Smouha",
            hours: "09:30 AM - 10:30 PM (7 Days)",
            capacity: "High Capacity (250 parcels)",
            status: "Operational",
            phone: "+20 103 345 6789"
        },
        {
            name: "Faiyum City Center Partner Station",
            gov: "Faiyum",
            address: "El Bosta Street, Near Faiyum Post Office",
            hours: "10:00 AM - 09:00 PM",
            capacity: "Normal Capacity (100 parcels)",
            status: "Operational",
            phone: "+20 104 456 7890"
        },
        {
            name: "Luxor Station Drop-Off",
            gov: "Luxor",
            address: "Al Mahatta Street, Opposite Train Station",
            hours: "09:00 AM - 09:00 PM",
            capacity: "Normal Capacity (80 parcels)",
            status: "Operational",
            phone: "+20 105 567 8901"
        },
        {
            name: "Zagazig University Hub",
            gov: "Sharqia",
            address: "Al Galaa Street, Zagazig",
            hours: "09:00 AM - 10:00 PM",
            capacity: "High Capacity",
            status: "Operational",
            phone: "+20 106 678 9012"
        }
    ];
}

function getFallbackTrackingData() {
    return {
        "SAHL-1001": {
            item: "iPhone 13 Pro (128GB)",
            price: "21,500 EGP",
            status: "In Transit",
            steps: [
                { time: "Today, 10:15 AM", title: "Dropped off at Nasr City Station", desc: "Inspection completed & tamper-evident bag sealed.", done: true },
                { time: "Today, 02:30 PM", title: "Escrow Payment Locked", desc: "Buyer deposit of 21,500 EGP secured.", done: true },
                { time: "Today, 05:00 PM", title: "Dispatched via Regional Courier", desc: "En route to Smouha Alex Station Hub.", done: true },
                { time: "Expected Tomorrow", title: "Ready for Pickup at Alex Station", desc: "Buyer notification pending.", done: false }
            ]
        },
        "SAHL-1002": {
            item: "Sony PlayStation 5 Console",
            price: "24,000 EGP",
            status: "Ready for Pickup",
            steps: [
                { time: "Yesterday, 11:00 AM", title: "Dropped off at Smouha Station", desc: "Hardware check passed.", done: true },
                { time: "Yesterday, 01:20 PM", title: "Escrow Locked", desc: "Funds held in safe Sahl Escrow.", done: true },
                { time: "Today, 09:00 AM", title: "Arrived at Destination Station", desc: "Dokki Hub #02 Giza.", done: true },
                { time: "Today, 09:15 AM", title: "Ready for Buyer Inspection", desc: "SMS code sent to buyer.", done: true }
            ]
        },
        "SAHL-1003": {
            item: "Dell XPS 15 Laptop",
            price: "32,000 EGP",
            status: "Completed",
            steps: [
                { time: "Oct 28, 09:00 AM", title: "Dropped off at Station", desc: "Checked & weighed.", done: true },
                { time: "Oct 28, 04:00 PM", title: "Arrived at Station", desc: "Transferred successfully.", done: true },
                { time: "Oct 29, 02:00 PM", title: "Inspected & Collected by Buyer", desc: "Buyer verified laptop condition.", done: true },
                { time: "Oct 29, 02:05 PM", title: "Escrow Released to Seller", desc: "32,000 EGP paid to seller bank account.", done: true }
            ]
        }
    };
}