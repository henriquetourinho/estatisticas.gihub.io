// --- Variáveis Globais e Constantes ---
const CACHE_DURATION_MINUTES = 30;
let languageChartInstance = null; // Para manter a referência do gráfico

// Mapa de cores para linguagens populares
const languageColors = {
    'JavaScript': 'rgba(241, 224, 90, 0.8)',
    'TypeScript': 'rgba(49, 120, 198, 0.8)',
    'Python': 'rgba(53, 114, 165, 0.8)',
    'Java': 'rgba(176, 114, 25, 0.8)',
    'HTML': 'rgba(227, 76, 38, 0.8)',
    'CSS': 'rgba(86, 61, 124, 0.8)',
    'PHP': 'rgba(119, 123, 179, 0.8)',
    'C++': 'rgba(243, 75, 125, 0.8)',
    'C#': 'rgba(23, 134, 0, 0.8)',
    'C': 'rgba(168, 168, 168, 0.8)',
    'Ruby': 'rgba(204, 31, 20, 0.8)',
    'Go': 'rgba(0, 173, 216, 0.8)',
    'Shell': 'rgba(137, 224, 81, 0.8)',
    'Swift': 'rgba(240, 82, 42, 0.8)',
    'Kotlin': 'rgba(127, 82, 240, 0.8)',
    'Dart': 'rgba(1, 216, 209, 0.8)',
    'Vue': 'rgba(65, 184, 131, 0.8)',
    'Rust': 'rgba(222, 165, 132, 0.8)',
};

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
const noLanguageMessage = document.getElementById('noLanguageMessage');

// Elementos dos repositórios populares
const popularReposList = document.getElementById('popularReposList');
const noPublicReposMessage = document.getElementById('noPublicReposMessage');


// --- Funções Auxiliares para Manipulação da UI ---

function showMessage(msg, isError = true) {
    messageBox.textContent = msg;
    messageBox.classList.remove('hidden');
    messageBox.classList.toggle('text-red-600', isError);
    messageBox.classList.toggle('bg-red-50', isError);
    messageBox.classList.toggle('text-green-600', !isError);
    messageBox.classList.toggle('bg-green-50', !isError);
}

function hideMessage() {
    messageBox.classList.add('hidden');
}

function toggleLoadingSpinner(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

function hideStatsContainer() {
    statsContainer.classList.add('hidden');
}

function showStatsContainer() {
    statsContainer.classList.remove('hidden');
}

function getColorForLanguage(lang) {
    return languageColors[lang] || `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.8)`;
}

// --- Funções de Processamento de Dados da API ---

async function getCombinedLanguageStats(repos) {
    const languageStats = {};
    const languagePromises = repos
        .filter(repo => !repo.private && !repo.fork && repo.size > 0) // Ignora repositórios vazios
        .map(async repo => {
            try {
                const response = await fetch(repo.languages_url);
                if (!response.ok) {
                    console.warn(`Não foi possível buscar as linguagens para ${repo.full_name}: ${response.statusText}`);
                    return;
                }
                const repoLanguages = await response.json();
                for (const lang in repoLanguages) {
                    languageStats[lang] = (languageStats[lang] || 0) + repoLanguages[lang];
                }
            } catch (error) {
                console.error(`Erro ao buscar linguagens para ${repo.full_name}:`, error);
            }
        });
    await Promise.all(languagePromises); // Executa as buscas de linguagens em paralelo
    return languageStats;
}

// --- Funções de Exibição de Dados ---

function displayData(data) {
    const { userData, totalStarsCount, sortedLanguages, popularRepos } = data;

    avatar.src = userData.avatar_url;
    profileName.textContent = userData.name || userData.login;
    usernameDisplay.textContent = `@${userData.login}`;
    bio.textContent = userData.bio || "Nenhuma biografia disponível.";
    profileLink.href = userData.html_url;

    followers.textContent = userData.followers;
    following.textContent = userData.following;
    publicRepos.textContent = userData.public_repos;
    publicGists.textContent = userData.public_gists;
    totalStars.textContent = totalStarsCount;

    displayLanguagesAsChart(sortedLanguages);
    displayPopularRepos(popularRepos);

    showStatsContainer();
}

function displayLanguagesAsChart(sortedLanguages) {
    const chartCanvas = document.getElementById('languageChart').getContext('2d');
    noLanguageMessage.classList.add('hidden');

    if (languageChartInstance) {
        languageChartInstance.destroy();
    }

    if (sortedLanguages.length === 0) {
        noLanguageMessage.classList.remove('hidden');
        return;
    }

    const topLanguages = sortedLanguages.slice(0, 10);
    const labels = topLanguages.map(([lang]) => lang);
    const data = topLanguages.map(([, bytes]) => bytes);
    const backgroundColors = topLanguages.map(([lang]) => getColorForLanguage(lang));

    languageChartInstance = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 255, 255, 0.7)',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#4A5568', font: { family: "'Inter', sans-serif", size: 14 }, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                            return `${context.label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}

function displayPopularRepos(repos) {
    popularReposList.innerHTML = '';
    noPublicReposMessage.classList.add('hidden');

    if (repos.length === 0) {
        noPublicReposMessage.classList.remove('hidden');
        return;
    }

    repos.forEach(repo => {
        const repoElement = document.createElement('div');
        repoElement.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center';
        repoElement.innerHTML = `
            <div>
                <a href="${repo.html_url}" target="_blank" class="text-lg font-bold text-blue-600 hover:underline">${repo.name}</a>
                <p class="text-gray-600 text-sm mt-1">${repo.description || 'Sem descrição.'}</p>
            </div>
            <div class="text-right ml-4 flex-shrink-0">
                <span class="text-yellow-500 font-bold text-lg">⭐ ${repo.stargazers_count}</span>
            </div>
        `;
        popularReposList.appendChild(repoElement);
    });
}

// --- Função Principal ---

async function generateGitHubStats() {
    hideMessage();
    hideStatsContainer();
    toggleLoadingSpinner(true);

    const username = usernameInput.value.trim();
    if (!username) {
        showMessage("Por favor, digite um nome de usuário do GitHub.");
        toggleLoadingSpinner(false);
        return;
    }

    const cacheKey = `github_stats_${username.toLowerCase()}`;
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));

    if (cachedData && (new Date().getTime() - cachedData.timestamp) < CACHE_DURATION_MINUTES * 60 * 1000) {
        console.log("Carregando dados do cache para:", username);
        displayData(cachedData.data);
        toggleLoadingSpinner(false);
        return;
    }

    try {
        const userResponse = await fetch(`https://api.github.com/users/${username}`);
        if (!userResponse.ok) {
            if (userResponse.status === 404) showMessage("Nome de usuário do GitHub não encontrado.");
            else if (userResponse.status === 403) showMessage("Limite de taxa da API do GitHub excedido. Tente novamente mais tarde.");
            else showMessage(`Erro ao buscar informações do usuário: ${userResponse.statusText}`);
            toggleLoadingSpinner(false);
            return;
        }
        const userData = await userResponse.json();

        let allRepos = [];
        let page = 1;
        while (true) {
            const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&page=${page}`);
            if (!reposResponse.ok) {
                console.warn(`Não foi possível buscar os repositórios (página ${page}): ${reposResponse.statusText}`);
                break;
            }
            const reposData = await reposResponse.json();
            if (reposData.length === 0) break;
            allRepos = allRepos.concat(reposData);
            page++;
        }

        const ownedPublicRepos = allRepos.filter(repo => !repo.private && !repo.fork);
        const totalStarsCount = ownedPublicRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
        const sortedRepos = [...ownedPublicRepos].sort((a, b) => b.stargazers_count - a.stargazers_count);
        
        const languageStats = await getCombinedLanguageStats(ownedPublicRepos);
        const sortedLanguages = Object.entries(languageStats).sort(([, a], [, b]) => b - a);

        const fullData = {
            userData,
            totalStarsCount,
            sortedLanguages,
            popularRepos: sortedRepos.slice(0, 5)
        };

        const cachePayload = { timestamp: new Date().getTime(), data: fullData };
        localStorage.setItem(cacheKey, JSON.stringify(cachePayload));

        displayData(fullData);

    } catch (error) {
        console.error("Erro geral na geração de estatísticas:", error);
        showMessage("Ocorreu um erro inesperado ao gerar as estatísticas. Por favor, tente novamente.");
    } finally {
        toggleLoadingSpinner(false);
    }
}

// --- Event Listeners ---
generateButton.addEventListener('click', generateGitHubStats);
usernameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        generateGitHubStats();
    }
});

// Inicialização da página
hideMessage();
hideStatsContainer();