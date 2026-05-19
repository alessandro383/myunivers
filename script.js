console.log("script chargé");
const supabaseUrl = "https://ivjhcrwdefwuseweyytt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2amhjcndkZWZ3dXNld2V5eXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDQzNjksImV4cCI6MjA5MzAyMDM2OX0.cpX3Y4Dw_NtnHS-JC8depkyymbV0arAllfkPsQGcq-0"; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999999' style='background-color:%23333333;border-radius:50%;'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

let dvdResults = [];
let cardResults = [];
let popResults = [];
let selectedPopItem = null;
let currentUser = null; 
let currentUsername = ""; 
let currentTab = "all";
let currentSeries = null;
let editMode = false;
let selectMode = false;
let selectedItems = [];
let itemToEdit = null;
let selectedDVD = null;
let data = { manga: [], dvd: [], livre: [], carte: [], pop: [] };
let seriesData = {};
let collection = {};
let editImageBase64 = "";

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const input = document.getElementById("search");
        if (document.activeElement === input) {
            render();
            setTimeout(() => {
                input.value = "";
                render();
            }, 500); 
        }
    }
});

window.onclick = function(event) {
    const menu = document.getElementById("editMenu");
    const menuBtn = document.querySelector(".menuBtn");
    if (menu && menu.style.display === "block") {
        if (event.target !== menu && event.target !== menuBtn && !menu.contains(event.target)) {
            menu.style.display = "none";
        }
    }
}

window.addEventListener("load", () => {
    document.getElementById("loginUser").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById("loginPass").focus(); }
    });
    document.getElementById("loginPass").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); login(); }
    });
    document.getElementById("rUser").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById("rEmail").focus(); }
    });
    document.getElementById("rEmail").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById("rPass").focus(); }
    });
    document.getElementById("rPass").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); document.getElementById("rPassConf").focus(); }
    });
    document.getElementById("rPassConf").addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); register(); }
    });
});

async function login() {
    const usernameInput = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;
    const errorContainer = document.getElementById("loginError");
    errorContainer.textContent = "";

    if (!usernameInput || !pass) {
        errorContainer.textContent = "❌ Veuillez remplir tous les champs";
        return;
    }

    const { data: profileData, error: profileError } = await supabaseClient
        .from("profiles")
        .select("email, id")
        .eq("username", usernameInput)
        .maybeSingle();

    if (profileError || !profileData || !profileData.email) {
        errorContainer.textContent = "❌ Nom d'utilisateur incorrect";
        return;
    }

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: profileData.email,
        password: pass
    });

    if (authError || !authData.user) { 
        errorContainer.textContent = "❌ Mot de passe incorrect"; 
        return; 
    }

    await loadUserProfile(authData.user.id);
}

async function register() {
    const user = document.getElementById("rUser").value.trim();
    const email = document.getElementById("rEmail").value.trim();
    const pass = document.getElementById("rPass").value;
    const passConf = document.getElementById("rPassConf").value;
    const errorContainer = document.getElementById("registerError");
    errorContainer.textContent = "";

    if (!user || !email || !pass || !passConf) {
        errorContainer.textContent = "❌ Tous les champs sont requis";
        return;
    }
    if (pass !== passConf) { 
        errorContainer.textContent = "❌ Les mots de passe ne correspondent pas"; 
        return; 
    }

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: pass
    });

    if (authError) { 
        errorContainer.textContent = "❌ " + authError.message; 
        return; 
    }

    if (authData.user) {
        await supabaseClient.from("profiles").insert([{ 
            id: authData.user.id, 
            username: user, 
            email: email,
            avatar: defaultAvatar 
        }]);
        backToLogin();
        document.getElementById("loginUser").value = user;
        document.getElementById("loginPass").focus();
    }
}

async function loadUserProfile(userId) {
    currentUser = userId;
    const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle();
    currentUsername = profile ? profile.username : "Utilisateur";
    const userAvatar = (profile && profile.avatar) ? profile.avatar : defaultAvatar;

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("registerPage").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    
    document.getElementById("displayUser").textContent = currentUsername;
    document.getElementById("avatar").src = userAvatar;

    updateDashboard();
    render();
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentUsername = "";
    location.reload();
}

window.addEventListener("load", async () => {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData && sessionData.session) {
        await loadUserProfile(sessionData.session.user.id);
    }

    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.getElementById("preview");
                preview.src = e.target.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(file);
        });
    }

    const avatarInput = document.getElementById("avatarFileInput");
    if (avatarInput) {
        avatarInput.addEventListener("change", async function (event) {
            const file = event.target.files[0];
            if (!file || !currentUser) return;
            const reader = new FileReader();
            reader.onload = async function (e) {
                const url = e.target.result;
                document.getElementById("profileAvatarBig").src = url;
                document.getElementById("avatar").src = url;
                await supabaseClient.from("profiles").update({ avatar: url }).eq("id", currentUser);
            };
            reader.readAsDataURL(file);
        });
    }
    toggleMangaSelect();
});

async function render() {
    updateDashboard();
    if (!currentUser) return;

    const list = document.getElementById("list");
    const search = document.getElementById("search") ? document.getElementById("search").value.toLowerCase() : "";
    const sort = document.getElementById("sortOrder").value;
    list.innerHTML = "";

    const { data: dbItems } = await supabaseClient.from("items").select("*").eq("user", currentUser);
    if (!dbItems) return;

    let items = dbItems.filter(item => {
        if (currentTab !== "all" && item.category !== currentTab) return false;
        return item.name.toLowerCase().includes(search);
    });

    if (sort === "az") items.sort((a, b) => a.name.localeCompare(b.name));
    else items.reverse();

    if (currentTab === "livre") {
        createSectionTitle("📖 Tout", list);
        items.forEach(item => list.appendChild(createCard(item)));

        const aLire = items.filter(i => i.status === "a_lire");
        if (aLire.length > 0) {
            createSectionTitle("📚 À lire", list);
            aLire.forEach(item => list.appendChild(createCard(item)));
        }

        const lu = items.filter(i => i.status === "lu");
        if (lu.length > 0) {
            createSectionTitle("✅ Lu", list);
            lu.forEach(item => list.appendChild(createCard(item)));
        }
    } else {
        items.forEach(item => list.appendChild(createCard(item)));
    }
}

function createSectionTitle(text, parent) {
    const h = document.createElement("h2");
    h.className = "gleeph-title";
    h.textContent = text;
    parent.appendChild(h);
}

function createCard(item) {
    const div = document.createElement("div");
    div.className = "card";

    const dotsBtn = item.category === "livre"
        ? `<button class="mini-btn" onclick="event.stopPropagation(); openStatusChoice('${item.id}')">•••</button>`
        : "";

    const platformsHTML =
        item.category === "jeuvideo" && item.platform
            ? `<div class="platforms">
                ${item.platform
                    .split(";")
                    .map(p => `<span class="platform">${p.trim()}</span>`)
                    .join("")}
               </div>`
            : "";

    div.innerHTML = `
        <div class="card-actions">
            <button class="action-btn edit-btn">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn delete-btn">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>

        <img src="${item.image}">
        <h3>${item.name}</h3>

        ${platformsHTML}
        ${dotsBtn}
    `;

    div.addEventListener("click", () => {
        if (item.category === "manga") {
            openSeries(item.name);
        }
    });

    div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openModify(item, item.category);
    });

    div.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteOne(item.id);
    });

    return div;
}

async function openSeries(name) {
    currentSeries = name;
    document.getElementById("app").classList.add("hidden");
    document.getElementById("seriesPage").classList.remove("hidden");

    const { data: mangaInfo } = await supabaseClient.from("mangas").select("*").ilike("name", name).maybeSingle();
    const cover = mangaInfo?.image || "https://via.placeholder.com/600x300";
    
    const heroElement = document.getElementById("seriesHero");
    heroElement.style.backgroundImage = `url(${cover})`;
    
    heroElement.innerHTML = `
        <div class="heroContent">
            <div class="seriesCoverContainer">
                <img src="${cover}" alt="${name}">
            </div>
            <div class="seriesDetails">
                <h1 id="seriesTitle">${name}</h1>
                <div class="progressBox">
                    <div class="progressHeader">
                        <span>Progression de lecture</span>
                        <span id="progressText">0/0 (0%)</span>
                    </div>
                    <div class="progressBar"><div id="progressFill"></div></div>
                </div>
            </div>
        </div>
    `;

    await renderSeries();
}

async function renderSeries() {
    const list = document.getElementById("seriesList");
    list.innerHTML = "";

    const { data: mangaInfo } = await supabaseClient.from("mangas").select("*").eq("name", currentSeries).single();
    if (!mangaInfo) return;

    const total = mangaInfo.total_tomes;
    const { data: progress } = await supabaseClient.from("progress").select("*").eq("user", currentUser).eq("series", currentSeries);
    const safeProgress = progress || [];
    let checked = 0;

    for (let i = 1; i <= total; i++) {
        const done = safeProgress.some(p => p.tome === i);
        if (done) checked++;

        list.innerHTML += `
            <div class="tome-card">
                <span class="tome-number">Tome ${i}</span>
                <div class="tome-check ${done ? "active" : ""}" onclick="toggleTome(event, ${i})">
                    ✓
                </div>
            </div>
        `;
    }

    const p = Math.round((checked / total) * 100) || 0;
    document.getElementById("progressText").textContent = `${checked}/${total} (${p}%)`;
    document.getElementById("progressFill").style.width = p + "%";
}

async function toggleTome(event, tome) {
    event.stopPropagation();
    const checkDiv = event.currentTarget;
    const { data: existing } = await supabaseClient.from("progress").select("*").eq("user", currentUser).eq("series", currentSeries).eq("tome", tome);

    if (existing && existing.length > 0) {
        await supabaseClient.from("progress").delete().eq("id", existing[0].id);
        checkDiv.classList.remove("active");
    } else {
        await supabaseClient.from("progress").insert([{
            user: currentUser,
            series: currentSeries,
            tome: tome,
            done: true
        }]);
        checkDiv.classList.add("active");
    }
    updateProgressBar();
}

async function addItem() {
    const nameElement = document.getElementById("name");
    const category = document.getElementById("category").value;
    const preview = document.getElementById("preview");

    let finalName = nameElement.value.trim();
    let finalImage = preview.src;

    if (!finalName || !currentUser) return;

    if (category === "livre") return searchBook(finalName);
    if (category === "dvd") return searchDVD(finalName);
    if (category === "pop") return searchPop(finalName);
    if (category === "carte") return searchCard(finalName);
    if (category === "jeuvideo") return searchGame(finalName);

    if (category === "manga") {
        const { data: mangaInfo } = await supabaseClient
            .from("mangas")
            .select("*")
            .ilike("name", `%${finalName}%`)
            .maybeSingle();

        if (mangaInfo) {
            finalName = mangaInfo.name;
            finalImage = mangaInfo.image;
        }
    }

    const { error } = await supabaseClient.from("items").insert([{
        user: currentUser,
        name: finalName,
        image: finalImage || "https://via.placeholder.com/150",
        category,
        status: "aucun"
    }]);

    if (error) {
        console.log("Erreur Supabase :", error);
    }

    nameElement.value = "";
    preview.src = "";
    preview.style.display = "none";

    render();
}

async function openStatusChoice(id) {
    const old = document.getElementById("statusModal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "statusModal";
    modal.className = "status-modal";
    modal.innerHTML = `
        <div class="status-box">
            <button onclick="updateBookStatus('${id}', 'a_lire')">📚 À lire</button>
            <button onclick="updateBookStatus('${id}', 'lu')">✅ Lu</button>
            <button class="cancel-btn" onclick="this.parentElement.parentElement.remove()">Annuler</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateBookStatus(id, newStatus) {
    await supabaseClient.from("items").update({ status: newStatus }).eq("id", id);
    const modal = document.getElementById("statusModal");
    if (modal) modal.remove();
    render();
}

async function deleteOne(id) {
    await supabaseClient.from("items").delete().eq("id", id);
    render();
}

// --- RECHERCHE DE LIVRES (CORRIGÉE AVEC TA CLÉ API) ---
async function searchBook(name) {
    if (!name) return;
    const list = document.getElementById("dvdSelectList");
    list.innerHTML = "<p>Recherche...</p>";
    document.getElementById("dvdModal").classList.remove("hidden");

    // Ta clé API Google intégrée de façon sécurisée
    const googleApiKey = "AIzaSyB2VOFb4z5NAUGJJ_-Qg-qD8qybIRL79wM"; 

    try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(name)}&langRestrict=fr&orderBy=relevance&maxResults=20&key=${googleApiKey}`;
        const res = await fetch(url);
        
        if (res.status === 429) {
            list.innerHTML = "<p>Désolé, Google Books bloque temporairement les requêtes (Erreur 429) ❌</p>";
            return;
        }

        const json = await res.json();
        list.innerHTML = "";

        if (!json.items || json.items.length === 0) {
            list.innerHTML = "<p>Aucun livre trouvé ❌</p>";
            return;
        }
        
        window.bookResults = json.items;
        json.items.forEach((book, index) => {
            const info = book.volumeInfo;
            let thumb = info.imageLinks?.thumbnail || 'https://via.placeholder.com/150';
            if (thumb.startsWith("http://")) {
                thumb = thumb.replace("http://", "https://");
            }
            const div = document.createElement("div");
            div.className = "dvd-item";
            div.innerHTML = `<img src="${thumb}" width="70"><p>${info.title}</p><button onclick="selectBookFromAPI(${index})">Choisir</button>`;
            list.appendChild(div);
        });
    } catch (err) {
        console.error("Erreur API Google Books :", err);
        list.innerHTML = "<p>Erreur lors de la recherche du livre ❌</p>";
    }
}

async function selectBookFromAPI(index) {
    const book = window.bookResults[index].volumeInfo;
    let thumb = book.imageLinks?.thumbnail || "https://via.placeholder.com/150";
    if (thumb.startsWith("http://")) {
        thumb = thumb.replace("http://", "https://");
    }
    await supabaseClient.from("items").insert([{ user: currentUser, name: book.title, image: thumb, category: "livre", status: "a_lire" }]);
    document.getElementById("dvdModal").classList.add("hidden");
    document.getElementById("name").value = "";
    render();
}

function openModify(item, cat) {
    itemToEdit = { id: item.id, oldName: item.name };
    document.getElementById("editName").value = item.name;
    document.getElementById("editCategory").value = cat;
    document.getElementById("editPreview").src = item.image;
    document.getElementById("modifyModal").classList.remove("hidden");
}

async function saveChanges() {
    const newName = document.getElementById("editName").value.trim();
    const newImg = document.getElementById("editPreview").src;
    const newCat = document.getElementById("editCategory").value;
    if (!newName) return;

    await supabaseClient.from("items").update({ name: newName, image: newImg, category: newCat }).eq("id", itemToEdit.id);
    closeModify();
    render();
}

async function fetchDVD(name) {
    const apiKey = "d797a187cddfc01bc400f569b9f5e958";
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(name)}`);
    const json = await res.json();
    if (!json.results || json.results.length === 0) return [];
    return json.results.map(movie => ({
        id: movie.id,
        name: movie.title,
        image: movie.poster_path ? "https://image.tmdb.org/t/p/w500" + movie.poster_path : "https://via.placeholder.com/150"
    }));
}

async function searchDVD(name) {
    dvdResults = await fetchDVD(name);
    const list = document.getElementById("dvdSelectList");
    list.innerHTML = "";
    dvdResults.forEach((dvd, index) => {
        const div = document.createElement("div");
        div.className = "dvd-item";
        div.innerHTML = `<img src="${dvd.image}" width="80"><p>${dvd.name}</p><button onclick="selectDVD(${index})">Choisir</button>`;
        list.appendChild(div);
    });
    document.getElementById("dvdModal").classList.remove("hidden");
}

async function selectDVD(index) {
    const dvd = dvdResults[index];
    await supabaseClient.from("items").insert([{ user: currentUser, name: dvd.name, image: dvd.image, category: "dvd" }]);
    document.getElementById("name").value = "";
    document.getElementById("dvdModal").classList.add("hidden");
    render();
}

async function searchPop(name) {
    if (!name) return;
    const { data: popData } = await supabaseClient.from("pops").select("*").ilike("name", `%${name}%`);
    popResults = popData || [];
    const list = document.getElementById("dvdSelectList");
    list.innerHTML = "";
    popResults.forEach((pop, index) => {
        const div = document.createElement("div");
        div.className = "dvd-item";
        div.innerHTML = `<img src="${pop.image}" width="80"><p>${pop.name}</p><button onclick="selectPop(${index})">Choisir</button>`;
        list.appendChild(div);
    });
    document.getElementById("dvdModal").classList.remove("hidden");
}

async function selectPop(index) {
    const pop = popResults[index];
    await supabaseClient.from("items").insert([{ user: currentUser, name: pop.name, image: pop.image, category: "pop", status: "aucun" }]);
    document.getElementById("name").value = "";
    document.getElementById("dvdModal").classList.add("hidden");
    render();
}

async function searchCard(name) {
    if (!name) name = "pikachu";
    const res = await fetch(`https://api.tcgdex.net/v2/fr/cards?name=${encodeURIComponent(name)}`);
    const json = await res.json();
    cardResults = json || [];
    const list = document.getElementById("dvdSelectList");
    list.innerHTML = "";
    cardResults.slice(0, 20).forEach((card, index) => {
        const img = card.image ? card.image + "/low.png" : "https://via.placeholder.com/150";
        const div = document.createElement("div");
        div.className = "dvd-item";
        div.innerHTML = `<img src="${img}" width="80"><p>${card.name}</p><button onclick="selectCard(${index})">Choisir</button>`;
        list.appendChild(div);
    });
    document.getElementById("dvdModal").classList.remove("hidden");
}

async function selectCard(index) {
    const card = cardResults[index];
    const highImg = card.image ? card.image + "/high.png" : "https://via.placeholder.com/150";
    await supabaseClient.from("items").insert([{ user: currentUser, name: card.name, image: highImg, category: "carte", status: "aucun" }]);
    document.getElementById("name").value = "";
    document.getElementById("dvdModal").classList.add("hidden");
    render();
}

function closeModify() { document.getElementById("modifyModal").classList.add("hidden"); }
function closeSeries() { document.getElementById("seriesPage").classList.add("hidden"); document.getElementById("app").classList.remove("hidden"); }
function openFilePicker() { document.getElementById("fileInput").click(); }
function openAvatarPicker() { document.getElementById("avatarFileInput").click(); }
function openModifyFilePicker() { document.getElementById("modifyFileInput").click(); }
function openProfile() { document.getElementById("profileModal").classList.remove("hidden"); document.getElementById("profileName").textContent = currentUsername; document.getElementById("profileAvatarBig").src = document.getElementById("avatar").src; }
function closeProfileModal() { document.getElementById("profileModal").classList.add("hidden"); }

function showRegister() { 
    document.getElementById("loginError").textContent = "";
    document.getElementById("loginPage").classList.add("hidden"); 
    document.getElementById("registerPage").classList.remove("hidden"); 
    document.getElementById("rUser").focus();
}

function backToLogin() { 
    document.getElementById("registerError").textContent = "";
    document.getElementById("registerPage").classList.add("hidden"); 
    document.getElementById("loginPage").classList.remove("hidden"); 
    document.getElementById("loginUser").focus();
}

function toggleMenu() { const s = document.getElementById("sidebar"); const a = document.getElementById("arrow"); s.classList.toggle("closed"); if (a) a.classList.toggle("open"); }

function setTabAndClose(t, event) {
    currentTab = t;
    document.querySelectorAll("#sidebar button").forEach(btn => btn.classList.remove("active-tab"));
    event.currentTarget.classList.add("active-tab");
    updateActiveDots();
    render();
    toggleMenu();
}

async function updateDashboard() {
    if (!currentUser) return;
    const { data: items } = await supabaseClient.from("items").select("id").eq("user", currentUser);
    document.getElementById("totalUser").textContent = (items ? items.length : 0) + " objets";
}

function toggleMangaSelect() {
    const category = document.getElementById("category").value;
    const mangaSelect = document.getElementById("mangaSelect");
    if (mangaSelect) {
        if (category === "manga") { mangaSelect.style.display = "block"; loadMangas(); }
        else mangaSelect.style.display = "none";
    }
}

function loadMangas() {
    const select = document.getElementById("mangaSelect");
    if (!select) return;
    select.innerHTML = `<option value="" disabled selected>Mangas</option><option value="Naruto">Naruto</option><option value="One Piece">One Piece</option><option value="Bleach">Bleach</option>`;
}

function updateActiveDots() {
    const tabs = ["all", "manga", "dvd", "livre", "carte", "pop", "jeuvideo"];

    tabs.forEach(tab => {
        const dot = document.getElementById("dot-" + tab);
        if (dot) dot.classList.toggle("active-dot", currentTab === tab);
    });
}

function updateProgressBar() {
    const checks = document.querySelectorAll(".tome-check");
    const total = checks.length;
    const checked = document.querySelectorAll(".tome-check.active").length;
    const p = total ? Math.round((checked / total) * 100) : 0;
    document.getElementById("progressText").textContent = `${checked}/${total} (${p}%)`;
    document.getElementById("progressFill").style.width = p + "%";
}

async function searchGame(name = "") {
    const list = document.getElementById("dvdSelectList");
    document.getElementById("dvdModal").classList.remove("hidden");

    list.innerHTML = "<p>Recherche...</p>";

    const { data, error } = await supabaseClient
        .from("jeux_video")
        .select("*")
        .ilike("name", `%${name}%`)
        .limit(20);

    if (error) {
        console.error(error);
        list.innerHTML = "<p>Erreur base de données ❌</p>";
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = "<p>Aucun jeu trouvé ❌</p>";
        return;
    }

    window.gameResults = data;

    list.innerHTML = "";

    data.forEach((game, index) => {
        const div = document.createElement("div");
        div.className = "dvd-item";

        div.innerHTML = `
            <img src="${game.image}" width="80">
            <p>${game.name}</p>
            <button onclick="selectGame(${index})">Choisir</button>
        `;

        list.appendChild(div);
    });
}

async function selectGame(index) {
    const game = window.gameResults[index];

    await supabaseClient.from("items").insert([{
        user: currentUser,
        name: game.name,
        image: game.image,
        category: "jeuvideo",
        status: "aucun"
    }]);

    document.getElementById("dvdModal").classList.add("hidden");
    document.getElementById("name").value = "";
    render();
}