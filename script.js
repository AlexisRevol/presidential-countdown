// A mettre au début de ton script.js
const translations = {
    en: {
        title: "Presidential Countdown",
        subtitle: "How much time does he/she have left?",
        country_select_placeholder: "-- Choose a country --",
        days: "Days",
        hours: "Hours",
        minutes: "Minutes",
        seconds: "Seconds",
        unlimited_term: "Unlimited term",
        end_date_prefix: "End of term scheduled for",
        term_ended: "The term is over!",
        error_loading: "Could not retrieve data.",
        error_no_leader: "Could not find current leader data.",
        country_Q30: "United States",
        country_Q96: "Mexico",
        country_Q155: "Brazil",
        country_Q414: "Argentina",
        country_Q142: "France",
        country_Q159: "Russia",
        country_Q183: "Germany",
        country_Q38: "Italy",
        country_Q145: "United Kingdom",
        country_Q29: "Spain",
        country_Q16: "Canada",
        country_Q17: "Japan",
        country_Q408: "Australia",
        country_Q423: "North Korea",
        country_Q668: "India",
        country_Q884: "South Korea",
        country_Q115: "South Africa",
        country_Q962: "Benin",
        country_Q1032: "Nigeria",
    },
    fr: {
        title: "Compteur Présidentiel",
        subtitle: "Combien de temps lui reste-t-il ?",
        country_select_placeholder: "-- Choisissez un pays --",
        days: "Jours",
        hours: "Heures",
        minutes: "Minutes",
        seconds: "Secondes",
        unlimited_term: "Mandat à durée indéterminée",
        end_date_prefix: "Fin du mandat prévue le",
        term_ended: "Le mandat est terminé !",
        error_loading: "Impossible de récupérer les données.",
        error_no_leader: "Impossible de trouver les données du dirigeant actuel.",
        country_Q30: "États-Unis",
        country_Q96: "Mexique",
        country_Q155: "Brésil",
        country_Q414: "Argentine",
        country_Q142: "France",
        country_Q159: "Russie",
        country_Q183: "Allemagne",
        country_Q38: "Italie",
        country_Q145: "Royaume-Uni",
        country_Q29: "Espagne",
        country_Q16: "Canada",
        country_Q17: "Japon",
        country_Q408: "Australie",
        country_Q423: "Corée du Nord",
        country_Q668: "Inde",
        country_Q884: "Corée du Sud",
        country_Q115: "Afrique du Sud",
        country_Q962: "Bénin",
        country_Q1032: "Nigéria",
    }
};

document.addEventListener('DOMContentLoaded', () => {
    new CountdownApp();
});

class CountdownApp {
    constructor() { 
        this.detectLanguage();

        this.countrySelect = document.getElementById('country-select');
        this.countdownContainer = document.getElementById('countdown-container');
        this.loader = document.getElementById('loading-spinner');
        this.errorMessage = document.getElementById('error-message');
        this.leaderNameEl = document.getElementById('leader-name');
        this.leaderPhotoEl = document.getElementById('leader-photo');
        this.endDateInfoEl = document.getElementById('end-date-info');
        
        this.countdownGridEl = document.getElementById('countdown-grid');
        this.daysEl = document.getElementById('days');
        this.hoursEl = document.getElementById('hours');
        this.minutesEl = document.getElementById('minutes');
        this.secondsEl = document.getElementById('seconds');
        this.unlimitedTermEl = document.getElementById('unlimited-term-display');

        this.countdownInterval = null;
        this.cache = {};

        this.countryRules = {
            "Q30": { name: "États-Unis", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            "Q96": { name: "Mexique", mandateLengthYears: 6, positionId: "P35", termType: 'fixed' },
            "Q155": { name: "Brésil", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            "Q414": { name: "Argentine", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
            "Q142": { name: "France", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q159": { name: "Russie", mandateLengthYears: 6, positionId: "P35", termType: 'fixed' },
            "Q183": { name: "Allemagne", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' }, 
            "Q38": { name: "Italie", mandateLengthYears: 7, positionId: "P35", termType: 'fixed' },
            "Q145": { name: "Royaume-Uni", positionId: "P35", termType: 'unlimited' }, 
            "Q29": { name: "Espagne", positionId: "P35", termType: 'unlimited' },
            "Q16": { name: "Canada", positionId: "P35", termType: 'unlimited' }, 
            "Q17": { name: "Japon", positionId: "P35", termType: 'unlimited' },
            "Q408": { name: "Australie", positionId: "P35", termType: 'unlimited' },
            "Q423": { name: "Corée du Nord", positionId: "P35", termType: 'unlimited' },
            "Q668": { name: "Inde", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' }, 
            "Q884": { name: "Corée du Sud", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q115": { name: "Afrique du Sud", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q962": { name: "Bénin", mandateLengthYears: 5, positionId: "P35", termType: 'fixed' },
            "Q1032": { name: "Nigéria", mandateLengthYears: 4, positionId: "P35", termType: 'fixed' },
        };

        this.applyStaticTranslations();
        this.populateCountries();
        this.addEventListeners();
    }

    addEventListeners() {
        this.countrySelect.addEventListener('change', this.handleCountryChange.bind(this));
    }

    detectLanguage() {
        const browserLang = navigator.language.split('-')[0];
        this.lang = translations[browserLang] ? browserLang : 'en'; 
        document.documentElement.lang = this.lang;
    }

    applyStaticTranslations() {
        const elements = document.querySelectorAll('[data-i18n-key]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            el.textContent = this.getTranslation(key);
        });
    }
    
    getTranslation(key) {
        return translations[this.lang][key] || key;
    }

    populateCountries() {
        this.countrySelect.innerHTML = ''; 

        const placeholderOption = document.createElement('option');
        placeholderOption.value = "";
        placeholderOption.textContent = this.getTranslation('country_select_placeholder');
        this.countrySelect.appendChild(placeholderOption);

        const countriesArray = Object.keys(this.countryRules).map(countryId => ({
            id: countryId,
            name: this.getTranslation(`country_${countryId}`)
        }));

        countriesArray.sort((a, b) => a.name.localeCompare(b.name, this.lang));
        
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
        
        const positionProperty = rules.positionId; 
        
        // Langue dynamique dans la requête SPARQL
        const sparqlQuery = `
            SELECT ?leader ?leaderLabel ?photo ?startTime WHERE {
              wd:${countryId} p:${positionProperty} ?statement.
              ?statement ps:${positionProperty} ?leader.
              FILTER NOT EXISTS { ?statement pq:P582 ?endTime. }
              OPTIONAL { ?statement pq:P580 ?startTime. }
              OPTIONAL { ?leader wdt:P18 ?photo. }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "${this.lang},en". }
            } ORDER BY DESC(?startTime) LIMIT 1`;

        const endpointUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
        const response = await fetch(endpointUrl, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error('Erreur réseau.');
        
        const data = await response.json();

        if (data?.results?.bindings?.length > 0) {
            return this.processLeaderData(data.results.bindings[0], rules);
        }

        throw new Error(this.getTranslation('error_no_leader'));
    }
    
    processLeaderData(result, rules) {
        if (rules.termType === 'unlimited') {
            return {
                name: result.leaderLabel.value,
                photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150/333/FFF?text=Photo+N/A',
                termType: 'unlimited'
            };
        }

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
            photoUrl: result.photo ? result.photo.value : 'https://via.placeholder.com/150/333/FFF?text=Photo+N/A',
            endDate: endDate.toISOString(),
            termType: 'fixed'
        };
    }
    
    displayData(data) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.leaderNameEl.textContent = data.name;
        this.leaderPhotoEl.src = data.photoUrl;

        if (data.termType === 'unlimited') {
            this.countdownGridEl.classList.add('hidden');
            this.unlimitedTermEl.classList.remove('hidden');
            this.endDateInfoEl.classList.add('hidden');
        } else {
            this.unlimitedTermEl.classList.add('hidden');
            this.countdownGridEl.classList.remove('hidden');
            this.endDateInfoEl.classList.remove('hidden');

            const endDate = new Date(data.endDate);
            const dateString = endDate.toLocaleDateString(this.lang, { year: 'numeric', month: 'long', day: 'numeric' });
            this.endDateInfoEl.textContent = `${this.getTranslation('end_date_prefix')} ${dateString}`;

            this.updateCountdown(endDate);
            this.countdownInterval = setInterval(() => this.updateCountdown(endDate), 1000);
        }

        this.countdownContainer.classList.remove('hidden');
    }

    updateCountdown(endDate) {
        const totalSecondsLeft = Math.floor((endDate - new Date()) / 1000);

        if (totalSecondsLeft < 0) {
            clearInterval(this.countdownInterval);
            this.daysEl.textContent = '0';
            this.hoursEl.textContent = '00';
            this.minutesEl.textContent = '00';
            this.secondsEl.textContent = '00';
            this.endDateInfoEl.textContent = this.getTranslation('term_ended');
            return;
        }

        this.daysEl.textContent = Math.floor(totalSecondsLeft / 3600 / 24);
        this.hoursEl.textContent = String(Math.floor(totalSecondsLeft / 3600) % 24).padStart(2, '0');
        this.minutesEl.textContent = String(Math.floor(totalSecondsLeft / 60) % 60).padStart(2, '0');
        this.secondsEl.textContent = String(totalSecondsLeft % 60).padStart(2, '0');
    }
}

// Init application
document.addEventListener('DOMContentLoaded', () => {
    new CountdownApp();
});