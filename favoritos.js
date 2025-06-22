const FAVORITOS_KEY = 'favoritos';

function getFavoritos() {
    return JSON.parse(localStorage.getItem(FAVORITOS_KEY)) || [];
}

function toggleFavorito(jogoId) {
    const favoritos = getFavoritos();
    const index = favoritos.indexOf(jogoId);
    
    if (index === -1) {
        favoritos.push(jogoId);
    } else {
        favoritos.splice(index, 1);
    }
    
    localStorage.setItem(FAVORITOS_KEY, JSON.stringify(favoritos));
    return index === -1;
}

function isFavorito(jogoId) {
    return getFavoritos().includes(jogoId);
}