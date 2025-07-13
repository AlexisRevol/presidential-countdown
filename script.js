document.addEventListener('DOMContentLoaded', () => {
    new CountdownApp();
});

class CountdownApp {
    constructor() { 
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

        this.countdownInterval = null;
        this.cache = {};

        // Data configuration
        this.countryRules = {
            // --- AMÉRIQUES ---
            "Q30": { name: "États-Unis", mandateLengthYears: 4, positionId: "P35" }, // Président
            "Q16": { name: "Canada", mandateLengthYears: 4, positionId: "P36" }, // Premier Ministre (mandat législatif, généralement 4 ans)
            "Q96": { name: "Mexique", mandateLengthYears: 6, positionId: "P35" }, // Président (mandat de 6 ans non renouvelable)
            "Q155": { name: "Brésil", mandateLengthYears: 4, positionId: "P35" }, // Président
            "Q414": { name: "Argentine", mandateLengthYears: 4, positionId: "P35" }, // Président

            // --- EUROPE ---
            "Q142": { name: "France", mandateLengthYears: 5, positionId: "P35" }, // Président
            "Q183": { name: "Allemagne", mandateLengthYears: 4, positionId: "P36" }, // Chancelier (mandat législatif)
            "Q145": { name: "Royaume-Uni", mandateLengthYears: 5, positionId: "P36" }, // Premier Ministre (mandat législatif max 5 ans)
            "Q38": { name: "Italie", mandateLengthYears: 5, positionId: "P36" }, // Président du Conseil des ministres (Premier Ministre)
            "Q29": { name: "Espagne", mandateLengthYears: 4, positionId: "P36" }, // Président du gouvernement (Premier Ministre)
            "Q159": { name: "Russie", mandateLengthYears: 6, positionId: "P35" }, // Président
            "Q34": { name: "Suède", mandateLengthYears: 4, positionId: "P36" }, // Premier Ministre

            // --- ASIE ---
            "Q17": { name: "Japon", mandateLengthYears: 4, positionId: "P36" }, // Premier Ministre (mandat législatif)
            "Q668": { name: "Inde", mandateLengthYears: 5, positionId: "P36" }, // Premier Ministre
            "Q408": { name: "Australie", mandateLengthYears: 3, positionId: "P36" }, // Premier Ministre (mandat législatif)
            "Q884": { name: "Corée du Sud", mandateLengthYears: 5, positionId: "P35" }, // Président

            // --- AFRIQUE ---
            "Q115": { name: "Afrique du Sud", mandateLengthYears: 5, positionId: "P35" }, // Président
            "Q962": { name: "Bénin", mandateLengthYears: 5, positionId: "P35" }, // Président
            "Q1032": { name: "Nigéria", mandateLengthYears: 4, positionId: "P35" }, // Président
        };

        this.populateCountries();
        this.addEventListeners();
    }

    // Link event to action
    addEventListeners() {
        this.countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    }

    // Fill menu
    populateCountries() {
        for (const countryId in this.countryRules) {
            const option = document.createElement('option');
            option.value = countryId;
            option.textContent = this.countryRules[countryId].name;
            this.countrySelect.appendChild(option);
        }
    }

    // Called on country change
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
            if (this.cache[countryId]) {
                this.displayData(this.cache[countryId]);
            } else {
                const leaderData = await this.getLeaderData(countryId);
                this.cache[countryId] = leaderData; // <-- MISE EN CACHE
                this.displayData(leaderData);
            }
        } catch (error) {
            console.error("Error:", error);
            this.errorMessage.textContent = `Unable to retrieve data. ${error.message}`;
            this.errorMessage.classList.remove('hidden');
            this.loader.classList.add('hidden');
        }
    }

    async getLeaderData(countryId) {
        const rules = this.countryRules[countryId];
        if (!rules) throw new Error("No rules defined for this country.");

        // Get leader data from Wikidata
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

        if (!response.ok) throw new Error('Network error when requesting Wikidata.');
        
        const data = await response.json();
        
        if (!data?.results?.bindings || data.results.bindings.length === 0) {
            throw new Error("Impossible to find a leader with a start date on Wikidata.");
        }

        const result = data.results.bindings[0];
        const mandateYears = rules.mandateLengthYears;
        const now = new Date();


        let startDate = new Date(result.startTime.value);
        let endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + mandateYears);

        // As long as this end date is in the past, we move forward one term.
        while (endDate < now) {
            startDate = endDate;
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + mandateYears);
        }

        return {
            name: result.leaderLabel.value,
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
            endDate: endDate.toISOString()
        };
    }

    // Fallback method if no data found in previous one
    async getLeaderDataFallback(countryId, rules) {
        console.warn("Main request failed, use fallback method.");
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
        if (!response.ok) throw new Error('The fallback request also failed.');
        
        const data = await response.json();
        if (data.results.bindings.length === 0) {
            throw new Error("Impossible to find a manager, even with the rescue method.");
        }

        const result = data.results.bindings[0];
        const mandateYears = rules.mandateLengthYears;
        const now = new Date();

        let startDate = new Date(result.startTime.value);
        let endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + mandateYears);

        while (endDate < now) {
            startDate = endDate;
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + mandateYears);
        }

        return {
            name: result.leaderLabel.value,
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150',
            endDate: endDate.toISOString()
        };
    }

     displayData(data) {
        this.leaderNameEl.textContent = data.name;
        const endDate = new Date(data.endDate);
        this.endDateInfoEl.textContent = `Fin du mandat le ${endDate.toLocaleDateString('fr-FR')}`;

        this.leaderPhotoEl.style.opacity = 0.5;
        this.leaderPhotoEl.style.filter = 'blur(5px)';

        // Pre-loads the new image into memory
        const img = new Image();
        img.src = data.photoUrl;

        // When the image is fully loaded
        img.onload = () => {
            this.leaderPhotoEl.src = data.photoUrl;
            this.leaderPhotoEl.style.opacity = 1;
            this.leaderPhotoEl.style.filter = 'blur(0)';
        };

        img.onerror = () => {
            this.leaderPhotoEl.src = 'https://via.placeholder.com/150';
            this.leaderPhotoEl.style.opacity = 1;
            this.leaderPhotoEl.style.filter = 'blur(0)';
        };

        this.updateCountdown(endDate);
        this.countdownInterval = setInterval(() => this.updateCountdown(endDate), 1000);

        this.loader.classList.add('hidden');
        this.countdownContainer.classList.remove('hidden');
    }

    updateCountdown(endDate) {
        const totalSecondsLeft = Math.floor((endDate - new Date()) / 1000);

        if (totalSecondsLeft <= 0) {
            clearInterval(this.countdownInterval);
            this.secondsLeftEl.textContent = "0";
            this.countdownLabelEl.textContent = "The mandate is over !";
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