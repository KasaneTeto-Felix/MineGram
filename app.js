// ====================================================================
// app.js (FULL INTEGRATED VERSION)
// ====================================================================

// 1. KONFIGURASI SUPABASE (Ganti dengan data milik lu bray)
const SUPABASE_URL = "https://tixjlrflmthhgfrmxrcw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Wb9GS5ZO1kI9QFS6x2mnBA_4-aZn5ow"; 

// Inisialisasi Supabase Client menggunakan nama variabel non-bentrok
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. SELEKTOR ELEMENT HTML UTAMA
const btnLogin = document.getElementById('btn-login');
const authButtonsDiv = document.getElementById('auth-buttons');
const createPostBox = document.getElementById('create-post-box');
const postContent = document.getElementById('post-content');
const postImageInput = document.getElementById('post-image');
const fileNamePreview = document.getElementById('file-name-preview');
const btnSubmitPost = document.getElementById('btn-submit-post');
const feedContainer = document.getElementById('feed-container');

// SELEKTOR ELEMENT CUSTOM MODAL AUTH
const authModal = document.getElementById('auth-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
const registerFields = document.getElementById('register-fields');
const btnModalSubmit = document.getElementById('btn-modal-submit');
const toggleAuthText = document.getElementById('toggle-auth-text');

// State Aplikasi
let currentUser = null;
let userProfile = null;
let isLoginMode = true; // true = Login, false = Register

// 3. EVENT LISTENERS UTAMA
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    loadFeed();
});

// Deteksi file screenshot saat dipilih
postImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNamePreview.textContent = `📸 ${e.target.files[0].name}`;
    } else {
        fileNamePreview.textContent = "Gak ada gambar dipilih";
    }
});

// Submit postingan baru
btnSubmitPost.addEventListener('click', handleCreatePost);


// ====================================================================
// 4. LOGIKA CUSTOM MODAL AUTH (LOGIN & REGISTER)
// ====================================================================

// Fungsi membuka modal ketika tombol login di navbar diklik
function handleAuthAction() {
    isLoginMode = true;
    switchAuthMode();
    authModal.style.display = 'flex';
}

// Tutup modal via tombol X
btnCloseModal.addEventListener('click', () => {
    authModal.style.display = 'none';
});

// Mengubah tampilan form antara mode Login dan Register
function switchAuthMode() {
    if (isLoginMode) {
        modalTitle.textContent = "Minecraft Sign In";
        registerFields.style.display = "none";
        btnModalSubmit.textContent = "Sign In ⚔️";
        toggleAuthText.innerHTML = `Belum punya akun? <a href="#" id="link-switch-auth">Daftar Akun Baru</a>`;
        
        document.getElementById('link-switch-auth').addEventListener('click', (e) => {
            e.preventDefault(); isLoginMode = false; switchAuthMode();
        });
    } else {
        modalTitle.textContent = "Create New Player";
        registerFields.style.display = "block";
        btnModalSubmit.textContent = "Register Account 📜";
        toggleAuthText.innerHTML = `Sudah punya akun? <a href="#" id="link-switch-auth">Login di sini</a>`;
        
        document.getElementById('link-switch-auth').addEventListener('click', (e) => {
            e.preventDefault(); isLoginMode = true; switchAuthMode();
        });
    }
}

// Handler Submit Data Form Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    btnModalSubmit.disabled = true;
    btnModalSubmit.textContent = "Processing... ⏳";

    if (isLoginMode) {
        // --- PROSES AUTH LOGIN ---
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert(`Gagal Login: ${error.message}`);
            btnModalSubmit.disabled = false;
            btnModalSubmit.textContent = "Sign In ⚔️";
        } else {
            window.location.reload();
        }
    } else {
        // --- PROSES AUTH REGISTER ---
        const username = document.getElementById('auth-username').value.trim();
        const mcUsername = document.getElementById('auth-mc-username').value.trim() || "Steve";
        
        if (!username) {
            alert("Username sosmed wajib diisi bray!");
            btnModalSubmit.disabled = false;
            btnModalSubmit.textContent = "Register Account 📜";
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { username: username, minecraft_username: mcUsername }
            }
        });

        if (error) {
            alert(`Gagal Daftar: ${error.message}`);
            btnModalSubmit.disabled = false;
            btnModalSubmit.textContent = "Register Account 📜";
        } else {
            alert("Pendaftaran Sukses bray! Silakan langsung login pake akun baru lu.");
            isLoginMode = true;
            switchAuthMode();
            btnModalSubmit.disabled = false;
        }
    }
});

// Cek Sesi Pengguna saat Page di-load
async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        // Tarik data profil pendukung dari public.profiles
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        userProfile = profile;
        updateAuthUI(true);
    } else {
        currentUser = null;
        userProfile = null;
        updateAuthUI(false);
    }
}

// Memperbarui UI Elemen tombol navigasi atas & kotak pos berdasarkan status login
function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        const avatarSrc = userProfile?.avatar_url || `https://minotar.net/helm/${userProfile?.minecraft_username || 'Steve'}/100.png`;
        
        authButtonsDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${avatarSrc}" class="avatar" style="width:30px; height:30px; margin:0;">
                <span><strong>${userProfile?.username}</strong></span>
                <button id="btn-logout" class="mc-button-secondary" style="padding: 5px 10px;">Logout</button>
            </div>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => {
            supabaseClient.auth.signOut().then(() => window.location.reload());
        });
        createPostBox.style.display = "block"; 
        authModal.style.display = 'none'; 
    } else {
        authButtonsDiv.innerHTML = `<button id="btn-login" class="mc-button">Login / Register</button>`;
        document.getElementById('btn-login').addEventListener('click', handleAuthAction);
        createPostBox.style.display = "none"; 
    }
}


// ====================================================================
// 5. LOGIKA POSTING (UPLOAD SCREENSHOT & INSERT DATABASE)
// ====================================================================
async function handleCreatePost() {
    const content = postContent.value.trim();
    if (!content) return alert("Isi dulu text postingannya bray!");
    
    btnSubmitPost.disabled = true;
    btnSubmitPost.textContent = "Posting... ⏳";
    
    let uploadedImageUrl = null;
    const imageFile = postImageInput.files[0];

    // Proses upload jika user melampirkan screenshot gambar
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`; 
        
        const { data: storageData, error: storageError } = await supabaseClient.storage
            .from('post-images')
            .upload(fileName, imageFile);

        if (storageError) {
            alert(`Gagal upload gambar: ${storageError.message}`);
            btnSubmitPost.disabled = false;
            btnSubmitPost.textContent = "Post 🚀";
            return;
        }

        // Dapatkan Public URL berhubung status bucket post-images diatur ke PUBLIC
        const { data: { publicUrl } } = supabaseClient.storage
            .from('post-images')
            .getPublicUrl(fileName);
            
        uploadedImageUrl = publicUrl;
    }

    // Insert baris data ke tabel posts
    const { error: insertError } = await supabaseClient
        .from('posts')
        .insert([
            {
                user_id: currentUser.id,
                content: content,
                image_url: uploadedImageUrl
            }
        ]);

    if (insertError) {
        alert(`Gagal membuat postingan: ${insertError.message}`);
    } else {
        // Pembersihan form
        postContent.value = "";
        postImageInput.value = "";
        fileNamePreview.textContent = "Gak ada gambar dipilih";
        loadFeed(); // Refresh postingan terupdate
    }

    btnSubmitPost.disabled = false;
    btnSubmitPost.textContent = "Post 🚀";
}


// ====================================================================
// 6. LOGIKA LOAD FEED (GET POSTS DENGAN RELATION PROFILES)
// ====================================================================
async function loadFeed() {
    feedContainer.innerHTML = '<div class="loading">Loading feed dari world... 🔄</div>';

    // Mengambil data posts serta data profile pembuatnya via foreign key relation
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            id, created_at, content, image_url, likes_count,
            profiles (username, minecraft_username, avatar_url)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<div class="loading" style="color:red;">Gagal memuat feed: ${error.message}</div>`;
        return;
    }

    if (posts.length === 0) {
        feedContainer.innerHTML = '<div class="loading">Belum ada petualang yang posting nih. Jadi yang pertama! ⛏️</div>';
        return;
    }

    feedContainer.innerHTML = ""; 

    // Render list post ke element feed
    posts.forEach(post => {
        const profile = post.profiles;
        const avatarSrc = profile?.avatar_url || `https://minotar.net/helm/${profile?.minecraft_username || 'Steve'}/100.png`;
        const postTime = new Date(post.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-header">
                <img src="${avatarSrc}" class="avatar" alt="${profile?.username}">
                <div class="user-info">
                    <h4>${profile?.username || 'Gamer Keren'}</h4>
                    <span>${postTime}</span>
                </div>
            </div>
            <div class="post-content">
                <p>${escapeHTML(post.content)}</p>
            </div>
            ${post.image_url ? `<img src="${post.image_url}" class="post-image-render" alt="Minecraft Screenshot">` : ''}
            <div class="post-footer">
                <button class="action-btn" onclick="handleLike('${post.id}')">
                    ❤️ <span>${post.likes_count || 0}</span> Likes
                </button>
                <button class="action-btn" onclick="alert('Fitur komen otw bray, fokus feed dulu!')">
                    💬 Comment
                </button>
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

// Proteksi XSS injeksi HTML tag mencurigakan
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Fungsi Trigger Like
function handleLike(postId) {
    alert(`Lu nge-like post: ${postId}. Fitur database likes akan kita sempurnakan di langkah berikutnya bray!`);
}