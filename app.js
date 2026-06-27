// ====================================================================
// app.js (COMPLETE FULL VERSION)
// ====================================================================

const SUPABASE_URL = "https://tixjlrflmthhgfrmxrcw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Wb9GS5ZO1kI9QFS6x2mnBA_4-aZn5ow"; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

let currentUser = null;
let userProfile = null;
let isLoginMode = true;

// HELPER
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// INIT
// Di dalam file app.js, cari bagian ini:
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserSession(); 
    loadFeed();               

    if (btnClosePost) {
        btnClosePost.addEventListener('click', () => {
            postModal.style.display = 'none'; // Sembunyiin modal
            resetNav(); // Balikin nav ke Home
        });
    }
    // -----------------------------
});

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
            if (!currentUser) {
                showNotification("Login Terlebih Dahulu!");
                handleAuthAction();
            } else if (postModal) {
                postModal.style.display = 'flex';
            } else {
                console.error("Elemen 'post-modal' tidak ditemukan di HTML!");
            }
            break;

        case 'profile':
            console.log("Tombol Profile diklik!"); 
            if (!currentUser) {
                showNotification("Login Terlebih Dahulu");
                handleAuthAction();
            } else {
                // FIX: Panggil function-nya di sini!
                openEditProfile();
            }
            break;
    }
});

// AUTH
function handleAuthAction() { isLoginMode = true; switchAuthMode(); authModal.style.display = 'flex'; }
btnCloseModal.addEventListener('click', () => { authModal.style.display = 'none'; });

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
        currentUser = session.user;
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
        userProfile = profile;
        updateAuthUI(true);
    } else updateAuthUI(false);
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        const avatarSrc = userProfile?.avatar_url || `https://minotar.net/helm/${userProfile?.minecraft_username || 'Steve'}/100.png`;
        authButtonsDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><img src="${avatarSrc}" class="avatar" style="width:30px; height:30px; margin:0;"><span><strong>${userProfile?.username}</strong></span><button id="btn-logout" class="mc-button-secondary" style="padding: 5px 10px;">Logout</button></div>`;
        document.getElementById('btn-logout').onclick = () => supabaseClient.auth.signOut().then(() => window.location.reload());
        authModal.style.display = 'none';
    } else {
        authButtonsDiv.innerHTML = `<button id="btn-login" class="mc-button">Login / Register</button>`;
        document.getElementById('btn-login').onclick = handleAuthAction;
    }
}

// POSTING
async function handleCreatePost() {
    const content = postContent.value.trim();
    if (!content) return showNotification("Isi text dulu bray!", "error");
    
    btnSubmitPost.disabled = true;
    btnSubmitPost.textContent = "Posting... ⏳";
    
    let uploadedImageUrl = null;
    const imageFile = postImageInput.files[0];
    
    if (imageFile) {
        const fileName = `${currentUser.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
        const { data, error } = await supabaseClient.storage.from('post-images').upload(fileName, imageFile);
        
        if (error) { 
            showNotification("Gagal upload: " + error.message, "error"); 
            btnSubmitPost.disabled = false; 
            return; 
        }
        uploadedImageUrl = supabaseClient.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabaseClient.from('posts').insert([{ 
        user_id: currentUser.id, 
        content, 
        image_url: uploadedImageUrl 
    }]);

    if (error) { 
        showNotification("Gagal post: " + error.message, "error"); 
    } else { 
        postModal.style.display = 'none'; 
        postContent.value = ""; 
        postImageInput.value = ""; // Bersihin input file
        fileNamePreview.textContent = "No file"; // Reset label file
        
        loadFeed(); 
        resetNav(); // PANGGIL INI BIAR NAV BALIK KE HOME
        showNotification("Berhasil di-post, bray! 🚀", "success");
    }
    
    btnSubmitPost.disabled = false; 
    btnSubmitPost.textContent = "Post 🚀";
}

// FEED & INTERACTION
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '<div class="loading">Memuat feed...</div>';
    
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            id, created_at, content, image_url,
            profiles!posts_user_id_fkey (username, avatar_url, is_verified)
        `)
        .order('created_at', { ascending: false });

    feedContainer.innerHTML = '';

    if (error) {
        console.error("DEBUG ERROR FEED:", error); // <-- LIHAT INI DI CONSOLE
        feedContainer.innerHTML = `Gagal memuat: ${error.message}`;
        return;
    }

    for (const post of posts) {
        const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        const { count: commentsCount } = await supabaseClient.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        
        let isLiked = false;
        if (currentUser) {
            const { data: likeData } = await supabaseClient.from('likes').select('id').eq('post_id', post.id).eq('user_id', currentUser.id).maybeSingle();
            if (likeData) isLiked = true;
        }

        const card = document.createElement('div');
        card.className = 'post-card';
        const isVerified = post.profiles?.is_verified;
        const badge = isVerified ? `
<svg style="width:16px; height:16px; margin-left:5px; vertical-align:middle;" viewBox="0 0 24 24" fill="#007bff">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
</svg>` : '';
        card.innerHTML = `
            <div class="post-header">
                <img src="${post.profiles?.avatar_url || 'https://minotar.net/helm/Steve/100.png'}" class="avatar">
                <h4>${post.profiles?.username || 'Gamer'} ${badge}</h4>
            </div>
            <div class="post-content">${escapeHTML(post.content)}</div>
            ${post.image_url ? `<img src="${post.image_url}" class="post-image-render">` : ''}
            
            <div class="post-footer" style="padding: 10px; display: flex; gap: 15px;">
                <button class="action-btn" onclick="handleLike('${post.id}', this)" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:5px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? '#ff0000' : 'none'}" stroke="${isLiked ? '#ff0000' : 'currentColor'}" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
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
        loadComments(post.id);
    }
}

// LIKES & COMMENTS LOGIC
async function handleLike(postId, btn) {
    if (!currentUser) return showNotification("Login dulu bray!");
    const svg = btn.querySelector('svg');
    const span = btn.querySelector('span');
    const { data: existingLike } = await supabaseClient.from('likes').select('id').eq('post_id', postId).eq('user_id', currentUser.id).maybeSingle();

    if (existingLike) {
        await supabaseClient.from('likes').delete().eq('id', existingLike.id);
        svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    } else {
        await supabaseClient.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
        svg.setAttribute('fill', '#ff0000'); svg.setAttribute('stroke', '#ff0000');
    }
    const { count } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    span.textContent = count || 0;
}

async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return showNotification("Isi komennya bray!");
    if (!currentUser) return showNotification("Login dulu buat komen!");

    const { error } = await supabaseClient.from('comments').insert([{ post_id: postId, user_id: currentUser.id, content }]);
    if (error) { showNotification("Gagal kirim: " + error.message); } 
    else { 
        input.value = ""; 
        await loadComments(postId); 
        await updateCommentCount(postId); 
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;
    
    // Kita tambahin avatar_url & minecraft_username ke query
    const { data: comments, error } = await supabaseClient
        .from('comments')
        .select(`
            content, 
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
        // const isVerified = c.profiles?.is_verified;
        // const badge = isVerified ? `<span style="color:#55ff55; font-size:0.7rem; margin-left:3px;">✔</span>` : '';
        const isVerified = post.profiles?.is_verified;
        const badge = isVerified ? `
<svg style="width:16px; height:16px; margin-left:5px; vertical-align:middle;" viewBox="0 0 24 24" fill="#007bff">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
</svg>` : '';
        list.innerHTML = comments.map(c => {
            // Logika: Pakai avatar_url kalau ada, kalau nggak pakai minotar
            const avatarSrc = c.profiles?.avatar_url || `https://minotar.net/helm/${c.profiles?.minecraft_username || 'Steve'}/100.png`;
            
            return `
                <div style="margin:10px 0; display:flex; align-items:flex-start; gap:10px;">
                    <img src="${avatarSrc}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid #444;">
                    <div style="display:flex; flex-direction:column;">
                        <b style="color:#55ff55; font-size:0.85rem;">${c.profiles?.username || 'Gamer'} ${badge}</b>
                        <span style="color:#ddd; font-size:0.85rem; word-break:break-word;">${escapeHTML(c.content)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    list.scrollTop = list.scrollHeight;
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
    btnSave.disabled = true; btnSave.textContent = "Menyimpan...";

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                username: document.getElementById('edit-username').value,
                minecraft_username: document.getElementById('edit-mc-username').value,
                bio: document.getElementById('edit-bio').value,
                avatar_url: document.getElementById('profile-preview').src,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);

        if (error) throw error;
        showNotification("Profil berhasil diperbarui!");
        location.reload();
    } catch (err) {
        showNotification("Gagal: " + err.message);
        btnSave.disabled = false; btnSave.textContent = "Selesai";
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
    const currentCropper = window.cropperInstance;
    
    if (!currentCropper) {
        console.error("Gagal save: Cropper instance tidak ditemukan!");
        showNotification("Gagal: Cropper belum aktif.");
        return;
    }

    console.log("Memulai proses crop & upload...");

    currentCropper.getCroppedCanvas().toBlob(async (blob) => {
        if (!blob) {
            console.error("Gagal buat blob!");
            return;
        }

        const fileName = `${currentUser.id}_${Date.now()}.png`;
        
        // Upload ke Supabase
        const { error } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, blob);

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
        currentCropper.destroy();
        window.cropperInstance = null;
        console.log("Sukses update avatar!");
    });
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : '❌'}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove setelah 3 detik
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Reset Nav
function resetNav() {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const homeBtn = document.querySelector('[data-action="home"]');
    if (homeBtn) homeBtn.classList.add('active');
}