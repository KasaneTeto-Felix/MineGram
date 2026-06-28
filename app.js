// ====================================================================
// app.js (COMPLETE FULL VERSION)
// ====================================================================

const SUPABASE_URL = "https://tixjlrflmthhgfrmxrcw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Wb9GS5ZO1kI9QFS6x2mnBA_4-aZn5ow"; 

const ADMIN_ID = "6e096c43-30ad-4955-baf5-d679f282c90d";

// Ganti inisialisasi yang lama dengan ini:
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true, // WAJIB untuk menjaga sesi di Android/Acode
        autoRefreshToken: true
    }
});

// DOM ELEMENTS
const btnLogin = document.getElementById('btn-login');
const authButtonsDiv = document.getElementById('auth-buttons');
const postContent = document.getElementById('post-content');
const postImageInput = document.getElementById('post-image');
const fileNamePreview = document.getElementById('file-name-preview');
const btnSubmitPost = document.getElementById('btn-submit-post');
const feedContainer = document.getElementById('feed-container');
const postModal = document.getElementById('post-modal');
const btnClosePost = document.getElementById('btn-close-post');
const authModal = document.getElementById('auth-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
const registerFields = document.getElementById('register-fields');
const btnModalSubmit = document.getElementById('btn-modal-submit');
const toggleAuthText = document.getElementById('toggle-auth-text');

let User = null;
let userProfile = null;
let isLoginMode = true;

// HELPER
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

/// Pastikan bagian ini ada di app.js lu
document.addEventListener('DOMContentLoaded', async () => {
    const btnSubmitPost = document.getElementById('btn-submit-post');
    if (btnSubmitPost) {
        btnSubmitPost.addEventListener('click', handleCreatePost);
    }
    // 1. Pasang semua Event Listener terlebih dahulu
    btnClosePost.addEventListener('click', () => {
        postModal.style.display = 'none';
        resetNav(); // Reset nav ke home
    });

    postImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNamePreview.textContent = file.name; 
        } else {
            fileNamePreview.textContent = "No file";
        }
    });

    // 2. Sekarang baru jalankan logic loading & fetch
    // (Ini dipisah supaya tidak tersangkut di dalam event listener di atas)
    showLoading();

    try {
        // Load semuanya secara paralel agar cepat
        await Promise.all([
            checkUserSession(), // Load Sesi & Profil
            loadFeed()          // Load Postingan
        ]);

        // Setelah semuanya ready, update UI spesifik
        setupAdminNav(); 
        console.log("Semua komponen berhasil dimuat!");
        
    } catch (err) {
        console.error("Gagal memuat aplikasi:", err);
    } finally {
        // Hilangkan loading hanya setelah semuanya selesai
        hideLoading();
    }
});

async function handleAuthSuccess(user) {
    User = user;
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    userProfile = profile;
    updateAuthUI(true);
    setupAdminNav();
}

document.querySelector('.bottom-nav').addEventListener('click', (e) => {
    const targetItem = e.target.closest('.nav-item');
    if (!targetItem) return;

    e.preventDefault();

    // 1. Update UI (Class Active)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    targetItem.classList.add('active');

    // 2. Routing Aksi
    const action = targetItem.getAttribute('data-action');

    switch (action) {
        case 'home':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (typeof loadFeed === 'function') loadFeed();
            break;

        case 'post':
            const postModal = document.getElementById('post-modal');
            if (!User) {
                showNotification("Login Terlebih Dahulu!");
                handleAuthAction();
                resetNav();
            } else if (postModal) {
                postModal.style.display = 'flex';
            } else {
                console.error("Elemen 'post-modal' tidak ditemukan di HTML!");
            }
            break;

        // ... di dalam switch(action) { ... }
        case 'admin':
        // Lu bisa arahin ke halaman admin atau munculin modal
            showNotification("Welcome, Admin!") ;
            openAdminPanel();
            // window.location.href = '/admin-panel.html';
            break;

        case 'profile':
            console.log("Tombol Profile diklik!"); 
            if (!User) {
                showNotification("Login Terlebih Dahulu");
                handleAuthAction();
                resetNav();
            } else {
                // FIX: Panggil function-nya di sini!
                openEditProfile();
            }
            break;
    }
});

// AUTH
function handleAuthAction() { isLoginMode = true; switchAuthMode(); authModal.style.display = 'flex'; }

btnCloseModal.addEventListener('click', () => { 
    authModal.style.display = 'none'; 
    resetNav(); // <--- TAMBAHIN INI: Biar nav balik ke Home pas modal ditutup
});

function switchAuthMode() {
    modalTitle.textContent = isLoginMode ? "Minecraft Sign In" : "Create New Player";
    registerFields.style.display = isLoginMode ? "none" : "block";
    btnModalSubmit.textContent = isLoginMode ? "Sign In ⚔️" : "Register Account 📜";
    toggleAuthText.innerHTML = isLoginMode ? `Belum punya akun? <a href="#" id="link-switch-auth">Daftar Akun Baru</a>` : `Sudah punya akun? <a href="#" id="link-switch-auth">Login di sini</a>`;
    document.getElementById('link-switch-auth').onclick = (e) => { e.preventDefault(); isLoginMode = !isLoginMode; switchAuthMode(); };
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    btnModalSubmit.disabled = true;

    if (isLoginMode) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showNotification(error.message); btnModalSubmit.disabled = false; } else window.location.reload();
    } else {
        const username = document.getElementById('auth-username').value.trim();
        const mcUsername = document.getElementById('auth-mc-username').value.trim() || "Steve";
        const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username, minecraft_username: mcUsername } } });
        if (error) { showNotification(error.message); btnModalSubmit.disabled = false; } else { showNotification("Sukses! Silakan login."); isLoginMode = true; switchAuthMode(); btnModalSubmit.disabled = false; }
    }
});

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        User = session.user;
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', User.id)
            .single();
        userProfile = profile;
        updateAuthUI(true);
        setupAdminNav();
    } else {
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        const avatarSrc = userProfile?.avatar_url || `https://minotar.net/helm/${userProfile?.minecraft_username || 'Steve'}/100.png`;
        
        // Perubahan di sini:
        // 1. Bungkus avatar dan username dalam div dengan onclick="openEditProfile()"
        // 2. Tambahkan cursor: pointer biar user tau itu bisa diklik
        authButtonsDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="openEditProfile()">
                <img src="${avatarSrc}" class="avatar" style="width:30px; height:30px; margin:0;">
                <span><strong>${userProfile?.username}</strong></span>
            </div>
            <button id="btn-logout" class="mc-button-secondary" style="padding: 5px 10px; margin-left: 10px;">Logout</button>
        `;
        
        // Logika logout tetap aman
        document.getElementById('btn-logout').onclick = () => supabaseClient.auth.signOut().then(() => window.location.reload());
        
        if (authModal) authModal.style.display = 'none';
    } else {
        authButtonsDiv.innerHTML = `<button id="btn-login" class="mc-button">Login / Register</button>`;
        document.getElementById('btn-login').onclick = handleAuthAction;
    }
}

// Ganti fungsi lama dengan ini di app.js
async function handleCreatePost() {
    const content = postContent.value.trim(); // Ambil file
    if (!content) return showNotification("Isi text dulu bray!", "error");
    
    btnSubmitPost.disabled = true;
    btnSubmitPost.textContent = "Posting... ⏳";
    
    let uploadedImageUrl = null;
    const imageFile = postImageInput.files[0];
    
    // Tetap upload gambar di client-side (karena file-nya ada di browser)
    if (imageFile) {
        const fileName = `${User.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
        const { data, error } = await supabaseClient.storage.from('post-images').upload(fileName, imageFile);
        
        if (error) { 
            showNotification("Gagal upload: " + error.message, "error"); 
            btnSubmitPost.disabled = false; 
            btnSubmitPost.textContent = "Post 🚀";
            return; 
        }
        uploadedImageUrl = supabaseClient.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    }

    // PAKAI RPC: Kirim data ke fungsi SQL yang kita buat tadi
    const { error } = await supabaseClient.rpc('secure_create_post', { 
        p_content: content, 
        p_image_url: uploadedImageUrl 
    });

    if (error) { 
        console.error("RPC Error:", error);
        showNotification("Gagal post: " + error.message, "error"); 
    } else { 
        postModal.style.display = 'none'; 
        postContent.value = ""; 
        postImageInput.value = ""; 
        fileNamePreview.textContent = "No file"; 
        
        loadFeed(); 
        resetNav(); 
        showNotification("Berhasil di-post, bray! 🚀", "success");
    }
    
    btnSubmitPost.disabled = false; 
    btnSubmitPost.textContent = "Post 🚀";
}

// FEED & INTERACTION
async function loadFeed() {
    //showLoading();
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '<div class="loading">Memuat feed...</div>';
    
    // 1. Fetch data dulu
    let { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            id, created_at, content, image_url, is_pinned,
           profiles!posts_user_id_fkey (username, avatar_url, is_verified)
        `)
        .order('is_pinned', { ascending: false, nullsFirst: false }) // <--- BIAR PIN SELALU DI ATAS
        .order('created_at', { ascending: false });
     // query = query.order('created_at', { ascending: false });
      // query = query.limit(6);

    // 2. Cek error di sini, SEBELUM melakukan looping
    if (error) {
        console.error("DEBUG ERROR FEED:", error);
        feedContainer.innerHTML = `<div style="color:red; padding:20px;">Gagal memuat: ${error.message}</div>`;
        hideLoading();
        return;
    }

    // Pakai (posts || []) biar kalau null dia jadi array kosong []
    posts = (posts || []).slice(0, 6);

    // 3. Bersihkan container setelah data sukses di-load
    feedContainer.innerHTML = '';

    // 4. Looping cuma SATU KALI
    for (const post of posts) {
        // Fetch count secara efisien atau gunakan join jika memungkinkan
        const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        const { count: commentsCount } = await supabaseClient.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        
        let isLiked = false;
        if (User) {
            const { data: likeData } = await supabaseClient.from('likes').select('id').eq('post_id', post.id).eq('user_id', User.id).maybeSingle();
            if (likeData) isLiked = true;
        }

        const card = document.createElement('div');
        card.className = 'post-card';
        const isVerified = post.profiles?.is_verified;
        // Ganti bagian ini di dalam loop loadFeed

        const pinIcon = post.is_pinned ? '📌 ' : ''; // <--- Bikin icon Pin

        const badge = isVerified ? `
            <img src="verified.png" style="width:16px; height:16px; margin-left:5px; vertical-align:middle;" alt="Verified">` : '';
            
        card.innerHTML = `
            <div class="post-header">
                <img src="${post.profiles?.avatar_url || 'https://minotar.net/helm/Steve/100.png'}" class="avatar">
                <h4>${post.profiles?.username || 'Gamer'} ${badge}</h4>
            </div>
            <div class="post-content">${escapeHTML(post.content)}</div>
            ${post.image_url ? `<img src="${post.image_url}" class="post-image-render">` : ''}
            
            <div class="post-footer" style="padding: 10px; display: flex; gap: 15px;">
                <button class="action-btn" onclick="handleLike('${post.id}', this)" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? '#ff0000' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>${likesCount || 0}</span>
                </button>
                <button class="action-btn" onclick="toggleCommentSection('${post.id}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span id="comment-count-${post.id}">${commentsCount || 0}</span>
                </button>
            </div>

            <div id="comment-section-${post.id}" style="display: none; padding: 15px; background: rgba(0, 0, 0, 0.4); border-top: 1px solid #333; margin-top: 5px;">
                <div id="comments-list-${post.id}" style="max-height: 200px; overflow-y: auto; margin-bottom: 10px; min-height: 20px;">
                    <p style="color:#666; font-size:0.8rem;">Loading komen...</p>
                </div>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="comment-input-${post.id}" placeholder="Komen bray..." style="flex-grow:1; padding:8px; border-radius:4px; background:#1a1a1a; color:white; border:1px solid #444;">
                    <button onclick="submitComment('${post.id}')" class="mc-button-secondary">Send</button>
                </div>
            </div>
        `;
        feedContainer.appendChild(card);
        
        // Load comment untuk post ini
        await loadComments(post.id);
    }
    
    //hideLoading();
}

// LIKES & COMMENTS LOGIC
async function handleLike(postId, btn) {
    if (!User) return showNotification("Login dulu bray!");
    const svg = btn.querySelector('svg');
    const span = btn.querySelector('span');
    const { data: existingLike } = await supabaseClient.from('likes').select('id').eq('post_id', postId).eq('user_id', User.id).maybeSingle();

    if (existingLike) {
        await supabaseClient.from('likes').delete().eq('id', existingLike.id);
        svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    } else {
        await supabaseClient.from('likes').insert([{ post_id: postId, user_id: User.id }]);
        svg.setAttribute('fill', '#ff0000'); svg.setAttribute('stroke', '#ff0000');
    }
    const { count } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    span.textContent = count || 0;
}

async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return showNotification("Isi komennya bray!");
    if (!User) return showNotification("Login dulu buat komen!");

    // 1. Ekstrak semua mention (regex buat cari @username)
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    const taggedUsernames = mentions ? [...new Set(mentions.map(m => m.replace('@', '')))] : [];

    // 2. Kirim komen ke database
    const { error } = await supabaseClient
        .from('comments')
        .insert([{ post_id: postId, user_id: User.id, content }]);

    if (error) {
        showNotification("Gagal kirim: " + error.message);
    } else {
        input.value = "";
        await loadComments(postId);
        await updateCommentCount(postId);

        // 3. JIKA ADA TAG, PROSES NOTIFIKASI
        if (taggedUsernames.length > 0) {
            processMentions(taggedUsernames, postId);
        }
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;
    
    // PERBAIKAN: Tambahkan 'id' di select biar c.id nggak undefined
    const { data: comments, error } = await supabaseClient
        .from('comments')
        .select(`
            id, content, 
            profiles (username, avatar_url, minecraft_username, is_verified)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error("Error load komen:", error);
        list.innerHTML = "Gagal load komen.";
        return;
    }
    
    if (comments.length === 0) {
        list.innerHTML = `<p style="color:#666; font-size:0.8rem;">Belum ada komen, tulis yang pertama!</p>`;
    } else {
        // PERBAIKAN: Pakai Promise.all untuk fetch like count di setiap komentar
        list.innerHTML = (await Promise.all(comments.map(async (c) => {
            const avatarSrc = c.profiles?.avatar_url || `https://minotar.net/helm/${c.profiles?.minecraft_username || 'Steve'}/100.png`;
            const isVerified = c.profiles?.is_verified;
            const badge = isVerified ? `<img src="verified.png" style="width:16px; height:16px; margin-left:5px; vertical-align:middle;" alt="Verified">` : '';            
            let isCommentLiked = false;
            if (User) {
    // Cek ke DB status like user ini untuk komentar 'c'
                const { data: userLike } = await supabaseClient
                    .from('comment_likes')
                    .select('id')
                    .eq('comment_id', c.id)
                    .eq('user_id', User.id)
                    .maybeSingle();
                if (userLike) isCommentLiked = true;
            }
            // Fetch Like Count
            const { count: likeCount } = await supabaseClient
                .from('comment_likes')
                .select('*', { count: 'exact', head: true })
                .eq('comment_id', c.id);
            
            return `
            <div style="margin:10px 0; display:flex; align-items:flex-start; gap:10px;">
                <img src="${avatarSrc}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid #444;">
                <div style="display:flex; flex-direction:column;">
                    <b style="color:#55ff55; font-size:0.85rem;">${c.profiles?.username || 'Gamer'} ${badge}</b>
                    <span style="color:#ddd; font-size:0.85rem; word-break:break-word;">${escapeHTML(c.content)}</span>
                    
                    <!-- TOMBOL LIKE & REPLY (SVG ICON) -->
                    <div style="display:flex; gap:12px; margin-top:5px;">
                        <button class="btn-like-comment" data-comment-id="${c.id}" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:3px; color:#888; font-size:0.75rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${isCommentLiked ? '#ff0000' : 'none'}" stroke="${isCommentLiked ? '#ff0000' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>${likeCount && likeCount > 0 ? likeCount : 'Like'}</span>
                        </button>
                        <button onclick="setReply('${c.profiles?.username || 'User'}', '${postId}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:3px; color:#888; font-size:0.75rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"></path></svg>
                            Reply
                        </button>
                    </div>
                </div>
            </div>
            `;
        }))).join('');
    }
    list.scrollTop = list.scrollHeight;
    setupLikeListeners(postId);
}

async function updateCommentCount(postId) {
    const { count } = await supabaseClient.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const span = document.getElementById(`comment-count-${postId}`);
    if (span) span.textContent = count || 0;
}

function toggleCommentSection(postId) {
    const section = document.getElementById(`comment-section-${postId}`);
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        loadComments(postId); 
    } else {
        section.style.display = 'none';
    }
}

// ====================================================
// FINAL PROFILE EDIT MODULE
// ====================================================
let cropper = null;

// Buka Modal
function openEditProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.zIndex = '999999'; // Pastikan paling depan
        const usernameInput = document.getElementById('edit-username');
        if (usernameInput) usernameInput.value = userProfile?.username || '';
        console.log("Modal display sudah di-set ke flex!");
        // modal.style.display = 'flex';
        // Isi Data
        document.getElementById('edit-username').value = userProfile?.username || '';
        document.getElementById('edit-mc-username').value = userProfile?.minecraft_username || '';
        document.getElementById('edit-bio').value = userProfile?.bio || '';
        document.getElementById('profile-preview').src = userProfile?.avatar_url || 'https://minotar.net/helm/Steve/100.png';
    }
}

// Tutup Modal
function closeEditProfile() {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('cropper-modal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    resetNav();
}

// Simpan Data
async function saveProfile() {
    const btnSave = document.querySelector('.btn-save');
    if (btnSave) {
        btnSave.disabled = true; 
        btnSave.textContent = "Menyimpan...";
    }

    try {
        // 1. Update ke Supabase
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                username: document.getElementById('edit-username').value,
                minecraft_username: document.getElementById('edit-mc-username').value,
                bio: document.getElementById('edit-bio').value,
                avatar_url: document.getElementById('profile-preview').src,
                updated_at: new Date().toISOString()
            })
            .eq('id', User.id);

        if (error) throw error;

        // 2. Update data lokal agar UI berubah
        userProfile = {
            ...userProfile,
            username: document.getElementById('edit-username').value,
            minecraft_username: document.getElementById('edit-mc-username').value,
            bio: document.getElementById('edit-bio').value,
            avatar_url: document.getElementById('profile-preview').src
        };
        
        showNotification("Profil berhasil diperbarui!");
        resetNav();
        // Tutup modal setelah sukses
        document.getElementById('profile-modal').style.display = 'none';
        
    } catch (err) {
        showNotification("Gagal: " + err.message);
        if (btnSave) {
            btnSave.disabled = false; 
            btnSave.textContent = "Selesai";
        }
    }
}

// Handle Upload File
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    
    if (!fileInput) return;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const modal = document.getElementById('cropper-modal');
            const img = document.getElementById('image-to-crop');
            // FIX: Deklarasikan elemennya di sini
            const profileModal = document.getElementById('profile-modal'); 

            if (modal && img) {
                // Sembunyiin profil biar gak numpuk
                if (profileModal) profileModal.style.display = 'none'; 
                
                modal.style.display = 'flex';
                img.src = event.target.result;

                if (typeof Cropper !== 'undefined') {
                    if (window.cropperInstance) window.cropperInstance.destroy();
                    window.cropperInstance = new Cropper(img, { aspectRatio: 1, viewMode: 1 });
                }
            }
        };
        reader.readAsDataURL(file);
    });
});

// Handle Crop
async function cropAndUpload() {
    // Gunakan window.cropperInstance biar sinkron sama yang diinisialisasi
    const activeCropper = window.cropperInstance;
    
    if (!Cropper) {
        console.error("Gagal save: Cropper instance tidak ditemukan!");
        showNotification("Gagal: Cropper belum aktif.");
        return;
    }

    console.log("Memulai proses crop & upload...");

    activeCropper.getCroppedCanvas().toBlob(async (blob) => {
        if (!blob) {
            console.error("Gagal buat blob!");
            return;
        }

        const fileName = `${User.id}.png`;
        
        // Upload ke Supabase
        const { error } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: true
            });
        if (error) {
            console.error("Error upload:", error);
            showNotification("Gagal upload: " + error.message);
            return;
        }
        
        // Ambil URL publik
        const { data } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
        
        // Update UI
        document.getElementById('profile-preview').src = data.publicUrl;
        
        // Tutup modal dan munculin balik profile-modal
        document.getElementById('cropper-modal').style.display = 'none';
        document.getElementById('profile-modal').style.display = 'flex';
        
        // Cleanup
        Cropper.destroy();
        window.cropperInstance = null;
        console.log("Sukses update avatar!");
    });
}

let isNotificationActive = false; // Flag penanda status

function showNotification(message) {
    // 1. CEK: Kalau lagi aktif, langsung stop (return)
    if (isNotificationActive) {
        console.warn("Notif lagi jalan, skip!");
        return; 
    }

    // 2. AKTIFKAN: Set flag ke true
    isNotificationActive = true;

    // 3. JALANIN LOGIC NOTIF LU
    const notif = document.getElementById('notification-id'); // Sesuaikan ID lu
    notif.textContent = message;
    notif.style.display = 'block';

    // 4. RESET: Balikin ke false setelah durasi selesai
    setTimeout(() => {
        notif.style.display = 'none';
        isNotificationActive = false; // Penting! Biar bisa dipake lagi nanti
    }, 3000); // 3 detik durasi
}

// Reset Nav
function resetNav() {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const homeBtn = document.querySelector('[data-action="home"]');
    if (homeBtn) homeBtn.classList.add('active');
}

// --- ADMIN MODULE (Pterodactyl Style) ---

function setupAdminNav() {
    if (User && User.id === ADMIN_ID) {
        const nav = document.querySelector('.bottom-nav');
        if (document.querySelector('[data-action="admin"]')) return;
        const adminBtn = document.createElement('div');
        adminBtn.className = 'nav-item';
        adminBtn.setAttribute('data-action', 'admin');
        adminBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg><span>Admin</span>`;
        nav.appendChild(adminBtn);
    }
}

/**
 * OPEN ADMIN PANEL - FULL VERSION (PRO UI)
 * Menggunakan struktur Card untuk mobile agar tidak "padat"
 */
async function openAdminPanel(tab = 'dashboard') {
    if (!User || User.id !== ADMIN_ID) return;

    const modal = document.getElementById('admin-modal');
    modal.style.display = 'flex';
    const contentDiv = document.getElementById('admin-content');
    
    contentDiv.innerHTML = `
        <div class="pt-tabs" style="margin-bottom: 20px; display:flex; gap:10px;">
            <button class="pt-tab-btn ${tab === 'dashboard' ? 'active' : ''}" onclick="openAdminPanel('dashboard')">Dashboard</button>
            <button class="pt-tab-btn ${tab === 'users' ? 'active' : ''}" onclick="openAdminPanel('users')">Users</button>
            <button class="pt-tab-btn ${tab === 'posts' ? 'active' : ''}" onclick="openAdminPanel('posts')">Posts</button>
        </div>
        <div id="tab-data">Memuat data...</div>
    `;

    const dataContainer = document.getElementById('tab-data');

    try {
        // --- TAB DASHBOARD ---
        if (tab === 'dashboard') {
            const { count: users } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
            const { count: posts } = await supabaseClient.from('posts').select('*', { count: 'exact', head: true });
            dataContainer.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:10px;">
                    <div style="background:#1c2125; padding:15px; border-radius:6px; border:1px solid #282c31;">
                        <small style="color:#888;">Total Users</small>
                        <div style="font-size:24px; color:#fff; font-weight:bold;">${users}</div>
                    </div>
                    <div style="background:#1c2125; padding:15px; border-radius:6px; border:1px solid #282c31;">
                        <small style="color:#888;">Total Posts</small>
                        <div style="font-size:24px; color:#fff; font-weight:bold;">${posts}</div>
                    </div>
                </div>
            `;
        } 
        
        // --- TAB USERS ---
        else if (tab === 'users') {
            const { data, error } = await supabaseClient.from('profiles').select('id, username, minecraft_username, is_verified');
            if (error) throw error;
            
            dataContainer.innerHTML = `
                <div class="pt-user-list" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                    ${data.map(u => `
                        <div class="pt-user-row" style="background:#1c2125; border:1px solid #282c31; padding:12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                            <div class="pt-user-info" style="display:flex; flex-direction:column; gap:2px;">
                                <span style="color:#fff; font-weight:500;">${u.username} ${u.is_verified ? '✅' : ''}</span>
                                <small style="color:#007bff; font-size:11px;">MC: ${u.minecraft_username}</small>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <button onclick="toggleVerify('${u.id}', ${!!u.is_verified})" class="pt-btn-primary">${u.is_verified ? 'Unverify' : 'Verify'}</button>
                                <button onclick="adminDeleteUser('${u.id}')" class="pt-btn-danger">Hapus</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // --- TAB POSTS ---
        else if (tab === 'posts') {
            const { data, error } = await supabaseClient
                .from('posts')
                .select(`id, content, is_pinned, profiles!posts_user_id_fkey(username)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            dataContainer.innerHTML = `
                <div class="pt-user-list" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                    ${data.map(p => `
                        <div class="pt-user-row" style="background:#1c2125; border:1px solid #282c31; padding:12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="overflow:hidden; margin-right:10px;">
                                <div style="color:#fff; font-weight:500;">${p.profiles?.username || 'Anon'} ${p.is_pinned ? '📌' : ''}</div>
                                <small style="color:#888; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:180px;">${p.content}</small>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <button onclick="togglePinPost('${p.id}', ${!!p.is_pinned})" class="pt-btn-warning">${p.is_pinned ? 'Unpin' : 'Pin'}</button>
                                <button onclick="adminDeletePost('${p.id}')" class="pt-btn-danger">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (err) {
        dataContainer.innerHTML = `<div style="color:#ff8e8e; padding:20px;">Error: ${err.message}</div>`;
    }
}

async function adminDeletePost(postId) {
    showConfirm("Yakin mau hapus post ini, bray?", async () => {
        try {
            const { error } = await supabaseClient.rpc('admin_delete_post', { p_post_id: postId });
            if (error) throw error;
            showNotification("Post berhasil dihapus!", "success");
            openAdminPanel('posts'); 
            loadFeed(); 
        } catch (err) {
            showNotification("Gagal hapus: " + err.message, "error");
        }
    });
}

async function adminDeleteUser(userId) {
    showConfirm("PERINGATAN: Hapus user ini? Semua datanya bakal ilang!", async () => {
        try {
            const { error } = await supabaseClient.rpc('admin_delete_user', { p_user_id: userId });
            if (error) throw error;
            showNotification("User berhasil dihapus!", "success");
            openAdminPanel('users');
        } catch (err) {
            showNotification("Gagal hapus user: " + err.message, "error");
        }
    });
}

function showConfirm(message, onConfirmAction) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-msg').textContent = message;
    modal.style.display = 'flex';
    document.getElementById('btn-yes').onclick = () => { modal.style.display = 'none'; onConfirmAction(); };
    document.getElementById('btn-no').onclick = () => { modal.style.display = 'none'; };
}

// Panggil ini pas mulai proses
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Panggil ini pas proses selesai
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function closeAdminPanel() {
    const adminModal = document.getElementById('admin-modal');
    if (adminModal) {
        adminModal.style.display = 'none'; // Sembunyiin modal
    }
    resetNav(); // <--- INI BIAR BALIK KE HOME
    console.log("Admin Panel ditutup, Navigasi di-reset.");
}

// Pakai RPC biar tembus blokiran RLS
async function toggleVerify(userId, currentStatus) {
    const { error } = await supabaseClient.rpc('admin_toggle_verify', { p_user_id: userId, p_status: !currentStatus });
    if (error) showNotification("Gagal Verify: " + error.message);
    else { showNotification("Status Verified diupdate!"); openAdminPanel('users'); }
}

async function togglePinPost(postId, currentStatus) {
    const { error } = await supabaseClient.rpc('admin_toggle_pin', { p_post_id: postId, p_status: !currentStatus });
    if (error) showNotification("Gagal Pin: " + error.message);
    else { showNotification("Status Pin diupdate!"); openAdminPanel('posts'); loadFeed(); }
}

// Tambahin parameter postId biar bisa auto-refresh UI
async function likeComment(commentId, btn) {
    if (!User) return showNotification("Login dlu bray!");
    
    const svg = btn.querySelector('svg');
    const span = btn.querySelector('span');
    const isLiked = svg.getAttribute('fill') === '#ff0000';

    if (isLiked) {
        // --- PROSES UNLIKE ---
        const { error } = await supabaseClient
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', User.id);
        
        if (!error) {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            let val = parseInt(span.innerText);
            span.innerText = (val - 1 <= 0) ? 'Like' : val - 1;
        }
    } else {
        // --- PROSES LIKE ---
        // Kita insert, kalau database nemu duplikat karena constraint di atas, dia bakal error
        const { error } = await supabaseClient
            .from('comment_likes')
            .insert([{ comment_id: commentId, user_id: User.id }]);
        
        if (!error) {
            svg.setAttribute('fill', '#ff0000');
            svg.setAttribute('stroke', '#ff0000');
            let val = parseInt(span.innerText) || 0;
            span.innerText = val + 1;
        } else {
            console.error("Gagal karena duplikat:", error);
        }
    }
}

// Fitur Reply (Fokus ke input)
function setReply(username, postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) {
        input.value = `@${username} `;
        input.focus();
    }
}

function setupLikeListeners(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;

    list.querySelectorAll('.btn-like-comment').forEach(btn => {
        btn.onclick = async () => {
            const commentId = btn.getAttribute('data-comment-id');
            await likeComment(commentId, btn);
        };
    });
}

async function processMentions(usernames, postId) {
    for (const username of usernames) {
        // Cari ID user berdasarkan username
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, username')
            .eq('username', username)
            .maybeSingle();

        if (profile && profile.id !== User.id) {
            // Panggil notif UI
            showNotification(`@${profile.username} berhasil di-mention!`);

            // (OPSIONAL) Kalau lo punya tabel 'notifications' di Supabase, insert di sini:
            /*
            await supabaseClient.from('notifications').insert([{
                user_id: profile.id, // User yang ditag
                sender_id: User.id,
                post_id: postId,
                message: `${userProfile.username} menyebut Anda dalam komentar.`
            }]);
            */
        }
    }
}