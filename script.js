class CountdownApp {
    constructor() { 
        this.countrySelect = document.getElementById('country-select');
        this.countdownContainer = document.getElementById('countdown-container');
        this.loader = document.getElementById('loading-spinner');
        this.errorMessage = document.getElementById('error-message');
        this.leaderNameEl = document.getElementById('leader-name');
        this.leaderPhotoEl = document.getElementById('leader-photo');
        this.endDateInfoEl = document.getElementById('end-date-info');
        
        // MODIFIÉ : Séparation des éléments du timer pour un contrôle plus fin
        this.timerEl = document.getElementById('timer');
        this.secondsLeftEl = document.getElementById('seconds-left');
        this.countdownLabelEl = document.getElementById('countdown-label');
        this.fullCountdownEl = document.getElementById('full-countdown');

        this.countdownInterval = null;
        this.cache = {};

        // --- MODIFICATION DE LA CONFIGURATION ---
        // J'ai ajouté une propriété `termType`.
        // 'fixed' pour un mandat à durée déterminée.
        // 'unlimited' pour les monarchies ou dirigeants à vie.
        this.countryRules = {
            // --- AMERICAS (Presidential systems) ---
            "Q30": { name: "États-Unis", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            "Q96": { name: "Mexique", mandateLengthYears: 6, positionId: "P35", termType: 'fixed' },
            "Q155": { name: "Brésil", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            "Q414": { name: "Argentine", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            
            // --- EUROPE ---
            "Q142": { name: "France", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q159": { name: "Russie", mandateLengthYears: 6, positionId: "P35", termType: 'fixed' },
            "Q183": { name: "Allemagne", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q38": { name: "Italie", mandateLengthYears: 7, positionId: "P35", termType: 'fixed' },

            // --- MONARCHIES & RÉGIMES À DURÉE INDÉTERMINÉE ---
            // On utilise maintenant termType: 'unlimited'
            "Q145": { name: "Royaume-Uni", positionId: "P35", termType: 'unlimited' }, 
            "Q29": { name: "Espagne", positionId: "P35", termType: 'unlimited' },
            "Q16": { name: "Canada", positionId: "P35", termType: 'unlimited' },
            "Q17": { name: "Japon", positionId: "P35", termType: 'unlimited' },
            "Q408": { name: "Australie", positionId: "P35", termType: 'unlimited' },
            "Q423": { name: "Corée du Nord", positionId: "P6", termType: 'unlimited' }, // P6 = chef d'état
            
            // --- ASIE ---
            "Q668": { name: "Inde", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' }, 
            "Q884": { name: "Corée du Sud", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },

            // --- AFRIQUE ---
            "Q115": { name: "Afrique du Sud", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q962": { name: "Bénin", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q1032": { name: "Nigéria", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
        };

        this.populateCountries();
        this.addEventListeners();
    }

    addEventListeners() {
        this.countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    }

    populateCountries() {
        const countriesArray = Object.keys(this.countryRules).map(countryId => {
            return {
                id: countryId,
                name: this.countryRules[countryId].name
            };
        });

        countriesArray.sort((a, b) => a.name.localeCompare(b.name));
        countriesArray.forEach(country => {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = country.name;
            this.countrySelect.appendChild(option);
        });
    }

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
            // Le cache fonctionne toujours de la même manière
            const leaderData = this.cache[countryId] 
                ? this.cache[countryId] 
                : await this.getLeaderData(countryId);

            if (!this.cache[countryId]) {
                this.cache[countryId] = leaderData;
            }
            this.displayData(leaderData);

        } catch (error) {
            console.error("Error:", error);
            this.errorMessage.textContent = `Impossible de récupérer les données. ${error.message}`;
            this.errorMessage.classList.remove('hidden');
        } finally {
            this.loader.classList.add('hidden');
        }
    }

    async getLeaderData(countryId) {
        const rules = this.countryRules[countryId];
        if (!rules) throw new Error("Aucune règle définie pour ce pays.");

        // La requête SPARQL reste la même, elle cherche toujours le dirigeant actuel.
        const sparqlQuery = `
            SELECT ?leader ?leaderLabel ?photo ?startTime WHERE {
              wd:${countryId} p:${rules.positionId} ?statement.
              ?statement ps:${rules.positionId} ?leader.
              ?statement pq:P580 ?startTime.
              OPTIONAL { ?leader wdt:P18 ?photo. }
              OPTIONAL { ?statement pq:P582 ?endTime. }
              FILTER(!BOUND(?endTime) || ?endTime > NOW())
              SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
            } ORDER BY DESC(?startTime) LIMIT 1`;

        const endpointUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const response = await fetch(endpointUrl, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error('Erreur réseau lors de la récupération des données.');
        
        const data = await response.json();

        if (data?.results?.bindings?.length > 0) {
            // On passe les règles à la fonction de traitement
            return this.processLeaderData(data.results.bindings[0], rules);
        }

        throw new Error("Impossible de trouver les données du dirigeant actuel.");
    }
    
    // --- MODIFICATION DU TRAITEMENT DES DONNÉES ---
    processLeaderData(result, rules) {
        // Si le type de mandat est 'unlimited', on ne calcule pas de date de fin.
        if (rules.termType === 'unlimited') {
            return {
                name: result.leaderLabel.value,
                photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
                termType: 'unlimited' // On propage cette information
            };
        }

        // Sinon, on effectue le calcul habituel pour les mandats à durée fixe.
        const mandateYears = rules.mandateLengthYears;
        const now = new Date();
        
        let startDate = new Date(result.startTime.value);
        let endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + mandateYears);

        // Cette boucle est utile pour les présidents réélus
        while (endDate < now) {
            startDate = endDate;
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + mandateYears);
        }
        
        return {
            name: result.leaderLabel.value,
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
            endDate: endDate.toISOString(),
            termType: 'fixed' // On propage cette information
        };
    }
    
    // --- MODIFICATION MAJEURE DE L'AFFICHAGE ---
    displayData(data) {
        // On nettoie l'état précédent (surtout pour l'animation)
        this.secondsLeftEl.classList.remove('unlimited-term');
        this.secondsLeftEl.classList.add('countdown-numbers');

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Affichage des informations communes
        this.leaderNameEl.textContent = data.name;
        this.leaderPhotoEl.style.opacity = 0;
        
        const img = new Image();
        img.src = data.photoUrl;
        img.onload = () => {
            this.leaderPhotoEl.src = data.photoUrl;
            this.leaderPhotoEl.style.opacity = 1;
        };
        img.onerror = () => {
            this.leaderPhotoEl.src = 'https://via.placeholder.com/150';
            this.leaderPhotoEl.style.opacity = 1;
        };

        // --- NOUVELLE LOGIQUE D'AFFICHAGE CONDITIONNEL ---
        if (data.termType === 'unlimited') {
            // Cas du mandat illimité
            this.timerEl.style.display = 'block';
            this.fullCountdownEl.style.display = 'none';
            this.endDateInfoEl.style.display = 'none';

            this.secondsLeftEl.textContent = '∞'; // Symbole infini
            this.secondsLeftEl.classList.add('unlimited-term'); // Classe pour l'animation
            this.secondsLeftEl.classList.remove('countdown-numbers');
            
            this.countdownLabelEl.textContent = "Mandat à durée indéterminée";
            
        } else {
            // Cas du mandat à durée fixe (logique existante)
            this.timerEl.style.display = 'block';
            this.fullCountdownEl.style.display = 'block';
            this.endDateInfoEl.style.display = 'block';

            const endDate = new Date(data.endDate);
            this.endDateInfoEl.textContent = `Fin du mandat prévue le ${endDate.toLocaleDateString('fr-FR')}`;

            this.updateCountdown(endDate);
            this.countdownInterval = setInterval(() => this.updateCountdown(endDate), 1000);
        }

        this.countdownContainer.classList.remove('hidden');
    }

    updateCountdown(endDate) {
        const totalSecondsLeft = Math.floor((endDate - new Date()) / 1000);

        if (totalSecondsLeft <= 0) {
            clearInterval(this.countdownInterval);
            this.secondsLeftEl.textContent = "0";
            this.countdownLabelEl.textContent = "Le mandat est terminé !";
            this.fullCountdownEl.textContent = "";
            return;
        }

        this.countdownLabelEl.textContent = "secondes restantes"; // On s'assure que le label est correct
        this.secondsLeftEl.textContent = totalSecondsLeft.toLocaleString('fr-FR');
        
        const days = Math.floor(totalSecondsLeft / 3600 / 24);
        const hours = Math.floor(totalSecondsLeft / 3600) % 24;
        const minutes = Math.floor(totalSecondsLeft / 60) % 60;
        const seconds = totalSecondsLeft % 60;
        this.fullCountdownEl.textContent = `${days}j ${hours}h ${minutes}m ${seconds}s`;
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new CountdownApp();
});