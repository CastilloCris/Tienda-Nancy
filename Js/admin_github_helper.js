
// GitHub Configuration Logic
function loadConfigGitHub() {
    const config = JSON.parse(localStorage.getItem("ghConfig") || "{}");
    if (document.getElementById("gh-owner")) document.getElementById("gh-owner").value = config.owner || "";
    if (document.getElementById("gh-repo")) document.getElementById("gh-repo").value = config.repo || "";
    if (document.getElementById("gh-path")) document.getElementById("gh-path").value = config.path || "data/productos.json";
    if (document.getElementById("gh-token")) document.getElementById("gh-token").value = config.token || "";
}

function guardarConfigGitHub() {
    const config = {
        owner: document.getElementById("gh-owner").value.trim(),
        repo: document.getElementById("gh-repo").value.trim(),
        path: document.getElementById("gh-path").value.trim(),
        token: document.getElementById("gh-token").value.trim()
    };
    localStorage.setItem("ghConfig", JSON.stringify(config));
    showToast("✓ Configuración de GitHub guardada");
}

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

async function saveToGitHub(newContent) {
    const config = JSON.parse(localStorage.getItem("ghConfig") || "{}");
    if (!config.owner || !config.repo || !config.token) {
        // Si no hay config, no hacemos nada (solo local)
        return false;
    }

    showToast("⏳ Guardando en GitHub...");
    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
    
    try {
        // 1. Get current SHA
        const getRes = await fetch(apiUrl, {
            headers: {
                "Authorization": `token ${config.token}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });
        
        let sha = "";
        if (getRes.ok) {
            const getData = await getRes.json();
            sha = getData.sha;
        }

        // 2. Update file
        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${config.token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update products via Admin Panel",
                content: utf8_to_b64(JSON.stringify(newContent, null, 2)),
                sha: sha
            })
        });

        if (putRes.ok) {
            showToast("✓ Guardado en GitHub exitosamente");
            return true;
        } else {
            const err = await putRes.json();
            showToast(`❌ Error GitHub: ${err.message}`);
            return false;
        }
    } catch (e) {
        console.error(e);
        showToast("❌ Error de conexión con GitHub");
        return false;
    }
}

// Initialize config on load
document.addEventListener("DOMContentLoaded", loadConfigGitHub);
