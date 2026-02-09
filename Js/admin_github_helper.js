
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
        console.log(`Intentando conectar a: ${apiUrl}`);
        const getRes = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        
        let sha = "";
        if (getRes.ok) {
            const getData = await getRes.json();
            sha = getData.sha;
            console.log("SHA actual obtenido:", sha);
        } else if (getRes.status === 404) {
            console.log("El archivo no existe, se creará uno nuevo.");
        } else {
            console.error("Error al obtener SHA:", getRes.status, getRes.statusText);
            const errBody = await getRes.text();
            console.error("Detalle error:", errBody);
            showToast(`❌ Error GitHub (Get SHA): ${getRes.status}`);
            return false;
        }

        // 2. Update file
        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${config.token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28"
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
            console.error("Error al guardar:", err);
            showToast(`❌ Error GitHub: ${err.message}`);
            return false;
        }
    } catch (e) {
        console.error("Excepción en saveToGitHub:", e);
        showToast(`❌ Error de conexión: ${e.message}`);
        return false;
    }
}

// Initialize config on load
document.addEventListener("DOMContentLoaded", loadConfigGitHub);
