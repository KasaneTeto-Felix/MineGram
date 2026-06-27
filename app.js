// app.js

// 1. KONFIGURASI SUPABASE (Ganti dengan data milik lu bray)
const SUPABASE_URL = "https://tixjlrflmthhgfrmxrcw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_Wb9GS5ZO1kI9QFS6x2mnBA_4-aZn5ow"; 

// Inisialisasi Supabase Client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. SELEKTOR ELEMENT HTML
const btnLogin = document.getElementById('btn-login');
const authButtonsDiv = document.getElementById('auth-buttons');
const createPostBox = document.getElementById('create-post-box');
const postContent = document.getElementById('post-content');
const postImageInput = document.getElementById('post-image');
const fileNamePreview = document.getElementById('file-name-preview');
const btnSubmitPost = document.getElementById('btn-submit-post');
const feedContainer = document.getElementById('feed-container');

// State User yang sedang Login
let currentUser = null;
let userProfile = null;

// 3. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    loadFeed();
});

// Deteksi kalau ada file screenshot yang dipilih
postImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileNamePreview.textContent = `📸 ${e.target.files[0].name}`;
    } else {
        fileNamePreview.textContent = "Gak ada gambar dipilih";
    }
});

// Tombol Submit Postingan
btnSubmitPost.addEventListener('click', handleCreatePost);

// Tombol Login / Logout
btnLogin.addEventListener('click', handleAuthAction);


// 4. LOGIC AUTHENTICATION (LOGIN / REGISTER)
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        // Ambil data profil dari tabel public.profiles
        const { data: profile } = await supabase
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

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        // Ambil avatar, jika di database kosong, pakai fallback Minotar (kepala Steve)
        const avatarSrc = userProfile?.avatar_url || `https://minotar.net/helm/${userProfile?.minecraft_username || 'Steve'}/100.png`;
        
        authButtonsDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${avatarSrc}" class="avatar" style="width:30px; height:30px; margin:0;">
                <span><strong>${userProfile?.username}</strong></span>
                <button id="btn-logout" class="mc-button-secondary" style="padding: 5px 10px;">Logout</button>
            </div>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => supabase.auth.signOut().then(() => window.location.reload()));
        createPostBox.style.display = "block"; // Tampilkan kotak postingan
    } else {
        authButtonsDiv.innerHTML = `<button id="btn-login" class="mc-button">Login / Register</button>`;
        document.getElementById('btn-login').addEventListener('click', handleAuthAction);
        createPostBox.style.display = "none"; // Sembunyikan kotak postingan kalau belum login
    }
}

async function handleAuthAction() {
    // Karena ini vanilla JS murni, kita pakai prompt bawaan browser untuk skenario simpel
    const email = prompt("Masukkan Email lu, bray:");
    if (!email) return;
    const password = prompt("Masukkan Password (min 6 karakter):");
    if (!password) return;

    // Coba Login dulu
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
        // Jika gagal login, asumsikan dia user baru mau daftar
        const confirmRegister = confirm("Akun gak terdaftar. Mau sekalian bikin akun baru pake email ini?");
        if (confirmRegister) {
            const username = prompt("Masukkan Username Sosmed lu:");
            const mcUsername = prompt("Masukkan Nickname/Username Minecraft lu (buat narik skin):") || "Steve";
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username: username, minecraft_username: mcUsername }
                }
            });

            if (signUpError) {
                alert(`Gagal daftar: ${signUpError.message}`);
            } else {
                alert("Pendaftaran sukses! Silakan cek email lu buat verifikasi (kalau verifikasi email aktif), lalu coba login.");
            }
        }
    } else {
        window.location.reload();
    }
}


// 5. LOGIC POSTING (UPLOAD IMAGE & INSERT DATABASE)
async function handleCreatePost() {
    const content = postContent.value.trim();
    if (!content) return alert("Isi dulu text postingannya bray!");
    
    btnSubmitPost.disabled = true;
    btnSubmitPost.textContent = "Posting... ⏳";
    
    let uploadedImageUrl = null;
    const imageFile = postImageInput.files[0];

    // Jika user mengupload gambar screenshot Minecraft
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        // Buat nama file unik biar gak tabrakan di bucket
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`; 
        
        const { data: storageData, error: storageError } = await supabase.storage
            .from('post-images')
            .upload(fileName, imageFile);

        if (storageError) {
            alert(`Gagal upload gambar: ${storageError.message}`);
            btnSubmitPost.disabled = false;
            btnSubmitPost.textContent = "Post 🚀";
            return;
        }

        // Ambil URL Publik dari file yang barusan di-upload karena bucket-nya PUBLIC
        const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);
            
        uploadedImageUrl = publicUrl;
    }

    // Masukkan data ke tabel posts
    const { error: insertError } = await supabase
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
        // Reset Form
        postContent.value = "";
        postImageInput.value = "";
        fileNamePreview.textContent = "Gak ada gambar dipilih";
        loadFeed(); // Refresh feed biar postingan baru langsung muncul
    }

    btnSubmitPost.disabled = false;
    btnSubmitPost.textContent = "Post 🚀";
}


// 6. LOGIC LOAD FEED (GET DATA POSTS JOIN PROFILES)
async function loadFeed() {
    feedContainer.innerHTML = '<div class="loading">Loading feed dari world... 🔄</div>';

    // Ambil data posts sekalian join dengan tabel profiles biar dapet data username & avatar_url
    const { data: posts, error } = await supabase
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

    feedContainer.innerHTML = ""; // Bersihkan loading

    posts.forEach(post => {
        const profile = post.profiles;
        // Fallback jika tidak ada custom avatar dari bucket profile-pictures, tembak Minotar API
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

// Fungsi pengaman biar ga kena XSS (hacker masukin script html aneh-aneh di postingan)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Fungsi dummy Like (Nanti kita sempurnakan relasinya ke tabel likes)
function handleLike(postId) {
    alert(`Lu nge-like post: ${postId}. Fitur insert ke tabel likes bakal jalan setelah auth lu lancar bray!`);
          }
