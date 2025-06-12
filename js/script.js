// --- Variáveis DOM ---
const usernameInput = document.getElementById('usernameInput');
const generateButton = document.getElementById('generateButton');
const messageBox = document.getElementById('messageBox');
const loadingSpinner = document.getElementById('loadingSpinner');
const statsContainer = document.getElementById('statsContainer');

// Elementos do perfil
const avatar = document.getElementById('avatar');
const profileName = document.getElementById('profileName');
const usernameDisplay = document.getElementById('usernameDisplay');
const bio = document.getElementById('bio');
const profileLink = document.getElementById('profileLink');

// Elementos das estatísticas principais
const followers = document.getElementById('followers');
const following = document.getElementById('following');
const publicRepos = document.getElementById('publicRepos');
const publicGists = document.getElementById('publicGists');
const totalStars = document.getElementById('totalStars');

// Elementos para exibição das linguagens
const languageListDisplay = document.getElementById('languageListDisplay');
const noLanguageMessage = document.getElementById('noLanguageMessage');

// --- Funções Auxiliares para Manipulação da UI ---

/**
 * Exibe uma mensagem na caixa de mensagens.
 * @param {string} msg - A mensagem a ser exibida.
 * @param {boolean} isError - Se a mensagem é um erro (true, texto vermelho) ou sucesso/informação (false, texto verde).
 */
function showMessage(msg, isError = true) {
    messageBox.textContent = msg;
    messageBox.classList.remove('hidden');
    messageBox.classList.toggle('text-red-600', isError);
    messageBox.classList.toggle('bg-red-50', isError);
    messageBox.classList.toggle('text-green-600', !isError);
    messageBox.classList.toggle('bg-green-50', !isError);
}

/**
 * Oculta a caixa de mensagens.
 */
function hideMessage() {
    messageBox.classList.add('hidden');
}

/**
 * Exibe ou oculta o spinner de carregamento.
 * @param {boolean} show - Se deve exibir (true) ou ocultar (false) o spinner.
 */
function toggleLoadingSpinner(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

/**
 * Oculta o container de estatísticas.
 */
function hideStatsContainer() {
    statsContainer.classList.add('hidden');
}

/**
 * Exibe o container de estatísticas.
 */
function showStatsContainer() {
    statsContainer.classList.remove('hidden');
}

/**
 * Combina as estatísticas de linguagem de múltiplos repositórios.
 * A API do GitHub retorna a contagem de bytes para cada linguagem.
 * @param {Object[]} repos - Array de objetos de repositório.
 * @returns {Object} Um objeto onde as chaves são os nomes das linguagens e os valores são o total de bytes.
 */
async function getCombinedLanguageStats(repos) {
    const languageStats = {};
    for (const repo of repos) {
        // Garante que apenas repositórios públicos e que não são forks sejam processados
        if (!repo.private && !repo.fork) {
            const languagesUrl = repo.languages_url;
            try {
                const response = await fetch(languagesUrl);
                if (!response.ok) {
                    // Avisa no console se não conseguir buscar as linguagens para um repo específico
                    console.warn(`Não foi possível buscar as linguagens para ${repo.full_name}: ${response.statusText}`);
                    continue; // Pula para o próximo repositório
                }
                const repoLanguages = await response.json();
                // Soma os bytes de cada linguagem
                for (const lang in repoLanguages) {
                    languageStats[lang] = (languageStats[lang] || 0) + repoLanguages[lang];
                }
            } catch (error) {
                console.error(`Erro ao buscar linguagens para ${repo.full_name}:`, error);
            }
        }
    }
    return languageStats;
}

/**
 * Gera uma cor aleatória para uma bolinha.
 * @returns {string} Uma string de cor no formato RGBA.
 */
function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    // Retorna uma cor mais suave para o design moderno
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

/**
 * Exibe a lista de linguagens com porcentagens e bolinhas coloridas.
 * @param {Array<Array<string, number>>} sortedLanguages - Array de linguagens e seus bytes, ordenados.
 */
function displayLanguagesAsList(sortedLanguages) {
    languageListDisplay.innerHTML = ''; // Limpa o conteúdo anterior
    noLanguageMessage.classList.add('hidden'); // Oculta a mensagem de "nenhuma linguagem"

    if (sortedLanguages.length === 0) {
        noLanguageMessage.classList.remove('hidden');
        return;
    }

    const totalBytes = sortedLanguages.reduce((sum, [, bytes]) => sum + bytes, 0);

    sortedLanguages.forEach(([lang, bytes]) => {
        const percentage = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(2) : 0;
        const color = getRandomColor(); // Gera uma cor única para cada linguagem

        const languageItem = document.createElement('div');
        languageItem.className = 'language-item-list'; // Usa a classe para estilização flexbox
        languageItem.innerHTML = `
            <span class="language-color-dot" style="background-color: ${color};"></span>
            <span class="text-gray-700 text-lg font-medium">${lang} <span class="font-bold">${percentage}%</span></span>
        `;
        languageListDisplay.appendChild(languageItem);
    });
}

/**
 * Função principal para gerar e exibir as estatísticas do GitHub.
 */
async function generateGitHubStats() {
    // Limpa mensagens e esconde estatísticas antigas, mostra spinner de carregamento
    hideMessage();
    hideStatsContainer();
    toggleLoadingSpinner(true);

    const username = usernameInput.value.trim();
    if (!username) {
        showMessage("Por favor, digite um nome de usuário do GitHub.");
        toggleLoadingSpinner(false);
        return;
    }

    try {
        // --- 1. Obter informações do usuário ---
        const userResponse = await fetch(`https://api.github.com/users/${username}`);
        if (!userResponse.ok) {
            // Lida com diferentes códigos de erro da API do GitHub
            if (userResponse.status === 404) {
                showMessage("Nome de usuário do GitHub não encontrado.");
            } else if (userResponse.status === 403) {
                showMessage("Limite de taxa da API do GitHub excedido (para requisições não autenticadas). Tente novamente mais tarde.");
            } else {
                showMessage(`Erro ao buscar informações do usuário: ${userResponse.statusText}`);
            }
            toggleLoadingSpinner(false);
            return;
        }
        const userData = await userResponse.json();

        // --- 2. Obter todos os repositórios públicos do usuário ---
        let allRepos = [];
        let page = 1;
        let hasMoreRepos = true;
        while (hasMoreRepos) {
            // A API do GitHub retorna no máximo 100 itens por página
            const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&page=${page}`);
            if (!reposResponse.ok) {
                console.warn(`Não foi possível buscar os repositórios (página ${page}): ${reposResponse.statusText}`);
                break; // Sai do loop se houver um erro na página
            }
            const reposData = await reposResponse.json();
            allRepos = allRepos.concat(reposData); // Concatena os repositórios da página atual
            if (reposData.length < 100) {
                hasMoreRepos = false; // Não há mais páginas se menos de 100 repositórios foram retornados
            } else {
                page++; // Continua para a próxima página
            }
        }

        // --- 3. Calcular estatísticas de repositório ---
        let totalStarsCount = 0;
        // Filtra para garantir que apenas repositórios públicos e não forks sejam contados
        const ownedPublicRepos = allRepos.filter(repo => !repo.private && !repo.fork);
        ownedPublicRepos.forEach(repo => {
            totalStarsCount += repo.stargazers_count || 0; // Soma as estrelas de cada repositório
        });

        // --- 4. Obter e combinar estatísticas de linguagem ---
        const languageStats = await getCombinedLanguageStats(ownedPublicRepos);

        // Ordena as linguagens por bytes (do maior para o menor)
        const sortedLanguages = Object.entries(languageStats).sort(([, a], [, b]) => b - a);

        // --- 5. Exibir os dados na UI ---
        avatar.src = userData.avatar_url; // Define a URL do avatar
        profileName.textContent = userData.name || userData.login; // Exibe o nome real ou o login
        usernameDisplay.textContent = `@${userData.login}`; // Exibe o nome de usuário com @
        bio.textContent = userData.bio || "Nenhuma biografia disponível."; // Exibe a biografia ou mensagem padrão
        profileLink.href = userData.html_url; // Define o link para o perfil do GitHub

        // Preenche as estatísticas principais
        followers.textContent = userData.followers;
        following.textContent = userData.following;
        publicRepos.textContent = userData.public_repos;
        publicGists.textContent = userData.public_gists;
        totalStars.textContent = totalStarsCount;

        // --- 6. Exibir linguagens como lista ---
        displayLanguagesAsList(sortedLanguages);

        showStatsContainer(); // Exibe o container de estatísticas
    } catch (error) {
        console.error("Erro geral na geração de estatísticas:", error);
        showMessage("Ocorreu um erro inesperado ao gerar as estatísticas. Por favor, tente novamente.");
    } finally {
        toggleLoadingSpinner(false); // Oculta o spinner ao finalizar, com sucesso ou erro
    }
}

// --- Event Listeners ---
// Ativa a função ao clicar no botão "Gerar Estatísticas"
generateButton.addEventListener('click', generateGitHubStats);
// Ativa a função ao pressionar "Enter" no campo de nome de usuário
usernameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        generateGitHubStats();
    }
});

// Limpa o conteúdo inicial da caixa de mensagens e do container de estatísticas ao carregar
hideMessage();
hideStatsContainer();
