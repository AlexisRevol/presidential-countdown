// On attend que le HTML soit entièrement chargé avant d'exécuter notre script.
// C'est une bonne pratique pour éviter les erreurs "element is null".
document.addEventListener('DOMContentLoaded', () => {
    new CountdownApp();
});

class CountdownApp {
    // Le constructeur est la première méthode appelée lors de la création d'un nouvel objet.
    // C'est l'endroit idéal pour initialiser les propriétés et lancer la configuration.
    constructor() {
        console.log("Application initialisée !");
        
        // 1. On stocke les références aux éléments du DOM comme propriétés de la classe.
        // On utilise "this" pour dire "cette propriété appartient à CET objet".
        this.countrySelect = document.getElementById('country-select');
        this.countdownContainer = document.getElementById('countdown-container');
        this.loader = document.getElementById('loading-spinner');
        this.errorMessage = document.getElementById('error-message');
        this.leaderNameEl = document.getElementById('leader-name');
        this.leaderPhotoEl = document.getElementById('leader-photo');
        this.endDateInfoEl = document.getElementById('end-date-info');
        this.secondsLeftEl = document.getElementById('seconds-left');
        this.countdownLabelEl = document.getElementById('countdown-label'); // Corrigé ici pour ID
        this.fullCountdownEl = document.getElementById('full-countdown');

        // 2. On stocke l'état de l'application (les variables qui changent)
        this.countdownInterval = null;

        // 3. On stocke la configuration (données qui ne changent pas)
        this.countryRules = {
            "Q142": { name: "France", mandateLengthYears: 5, positionId: "P35" },
            "Q30": { name: "États-Unis", mandateLengthYears: 4, positionId: "P35" },
            "Q155": { name: "Brésil", mandateLengthYears: 4, positionId: "P35" },
            "Q183": { name: "Allemagne", mandateLengthYears: 4, positionId: "P36" }
        };

        // 4. On lance les méthodes de configuration initiale
        this.populateCountries();
        this.addEventListeners();
    }

    // Méthode pour lier les événements aux actions
    addEventListeners() {
        // Quand l'événement 'change' se produit sur countrySelect, on appelle la méthode handleCountryChange.
        // .bind(this) est CRUCIAL. Il assure que DANS la méthode handleCountryChange, "this" fera toujours référence à notre classe CountdownApp,
        // et non à l'élément <select> qui a déclenché l'événement.
        this.countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    }

    // Méthode pour remplir le menu déroulant
    populateCountries() {
        for (const countryId in this.countryRules) {
            const option = document.createElement('option');
            option.value = countryId;
            option.textContent = this.countryRules[countryId].name;
            this.countrySelect.appendChild(option);
        }
    }

    // Méthode appelée lors du changement de pays
    async handleCountryChange(event) {
        const countryId = event.target.value;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        if (!countryId) {
            this.countdownContainer.classList.add('hidden');
            this.errorMessage.classList.add('hidden');
            return;
        }

        this.loader.classList.remove('hidden');
        this.countdownContainer.classList.add('hidden');
        this.errorMessage.classList.add('hidden');

        try {
            const leaderData = await this.getLeaderData(countryId);
            this.displayData(leaderData);
        } catch (error) {
            console.error("Erreur:", error);
            this.errorMessage.textContent = `Impossible de récupérer les données. ${error.message}`;
            this.errorMessage.classList.remove('hidden');
            this.loader.classList.add('hidden');
        }
    }

        async getLeaderData(countryId) {
        const rules = this.countryRules[countryId];
        if (!rules) throw new Error("Aucune règle définie pour ce pays.");

        // REQUÊTE SIMPLIFIÉE : On veut juste le dirigeant avec la date de début la plus récente.
        // C'est notre point de départ le plus fiable. On ignore volontairement la date de fin ici.
        const sparqlQuery = `
            SELECT ?leaderLabel ?photo ?startTime WHERE {
              wd:${countryId} p:${rules.positionId} ?statement.
              ?statement ps:${rules.positionId} ?leader.
              ?statement pq:P580 ?startTime.
              OPTIONAL { ?leader wdt:P18 ?photo. }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
            } 
            ORDER BY DESC(?startTime) 
            LIMIT 1`;

        const endpointUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const response = await fetch(endpointUrl, { headers: { 'Accept': 'application/json' } });

        if (!response.ok) throw new Error('Erreur réseau lors de la requête à Wikidata.');
        
        const data = await response.json();
        
        // Vérification sécurisée unique
        if (!data?.results?.bindings || data.results.bindings.length === 0) {
            throw new Error("Impossible de trouver un dirigeant avec une date de début sur Wikidata.");
        }

        const result = data.results.bindings[0];
        const mandateYears = rules.mandateLengthYears;
        const now = new Date();

        // --- LA LOGIQUE DE "FAST-FORWARD" EST MAINTENANT LA LOGIQUE PRINCIPALE ---
        
        // 1. On part de la date de début que Wikidata nous donne (ex: 2017)
        let startDate = new Date(result.startTime.value);

        // 2. On calcule une première date de fin potentielle (ex: 2022)
        let endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + mandateYears);

        // 3. TANT QUE cette date de fin est dans le passé, on avance d'un mandat.
        while (endDate < now) {
            console.log(`Mandat terminé le ${endDate.toLocaleDateString()} détecté. Passage au suivant.`);
            // La nouvelle date de début est l'ancienne date de fin.
            startDate = endDate;
            // On recalcule la nouvelle date de fin.
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + mandateYears);
        }
        
        // 4. À la sortie de la boucle, 'endDate' est forcément la bonne date de fin du mandat actuel.
        console.log(`Date de fin de mandat actuelle calculée : ${endDate.toLocaleDateString()}`);

        return {
            name: result.leaderLabel.value,
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
            endDate: endDate.toISOString()
        };
    }

    // PLAN B : Méthode de secours si la première requête ne trouve rien (cas Macron)
    async getLeaderDataFallback(countryId, rules) {
        console.warn("La requête principale a échoué, utilisation de la méthode de secours (fallback).");
        const sparqlQuery = `
            SELECT ?leaderLabel ?photo ?startTime WHERE {
              wd:${countryId} p:${rules.positionId} ?statement.
              ?statement ps:${rules.positionId} ?leader.
              ?statement pq:P580 ?startTime.
              OPTIONAL { ?leader wdt:P18 ?photo. }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
            } 
            ORDER BY DESC(?startTime) 
            LIMIT 1`;
        
        const endpointUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const response = await fetch(endpointUrl, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error('La requête de secours a aussi échoué.');
        
        const data = await response.json();
        if (data.results.bindings.length === 0) {
            throw new Error("Impossible de trouver un dirigeant, même avec la méthode de secours.");
        }

        const result = data.results.bindings[0];
        const mandateYears = rules.mandateLengthYears;
        const now = new Date();

        // --- C'est ici que la logique de "fast-forward" s'applique ---
        let startDate = new Date(result.startTime.value);
        let endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + mandateYears);

        while (endDate < now) {
            console.log(`Terme fini le ${endDate.toLocaleDateString()}. Calcul du suivant.`);
            startDate = endDate;
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + mandateYears);
        }
        // À la fin de la boucle, endDate est la date de fin du mandat actuel.

        return {
            name: result.leaderLabel.value,
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
            endDate: endDate.toISOString()
        };
    }

    // Méthode pour afficher les données et lancer le timer
    displayData(data) {
        this.leaderNameEl.textContent = data.name;
        this.leaderPhotoEl.src = data.photoUrl;
        
        const endDate = new Date(data.endDate);
        this.endDateInfoEl.textContent = `Fin du mandat le ${endDate.toLocaleDateString('fr-FR')}`;

        this.updateCountdown(endDate);
        this.countdownInterval = setInterval(() => this.updateCountdown(endDate), 1000);

        this.loader.classList.add('hidden');
        this.countdownContainer.classList.remove('hidden');
    }

    // Méthode qui met à jour le compte à rebours
    updateCountdown(endDate) {
        const totalSecondsLeft = Math.floor((endDate - new Date()) / 1000);

        if (totalSecondsLeft <= 0) {
            clearInterval(this.countdownInterval);
            this.secondsLeftEl.textContent = "0";
            this.countdownLabelEl.textContent = "Le mandat est terminé !"; // Corrigé ici
            this.fullCountdownEl.textContent = "";
            return;
        }

        this.secondsLeftEl.textContent = totalSecondsLeft.toLocaleString('fr-FR');
        
        const days = Math.floor(totalSecondsLeft / 3600 / 24);
        const hours = Math.floor(totalSecondsLeft / 3600) % 24;
        const minutes = Math.floor(totalSecondsLeft / 60) % 60;
        const seconds = totalSecondsLeft % 60;
        this.fullCountdownEl.textContent = `${days}j ${hours}h ${minutes}m ${seconds}s`;
    }
}