# Presidential Countdown

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![SPARQL](https://img.shields.io/badge/sparql-blue.svg?style=for-the-badge)

A web application that displays a real-time countdown to the end of a head of state's term.

**➡️ [Try it](https://AlexisRevol.github.io/presidential-countdown)** 
https://AlexisRevol.github.io/presidential-countdown

<img src="https://AlexisRevol.github.io/presidential-countdown/demo_screenshot2.png" alt="Application Screenshot" width="400"/>

---

*   **API & Data Handling**:
    *   **Fetch API**: For making requests to external data sources.
    *   **Wikidata & SPARQL**: Interacting with a massive, open knowledge base using its specific query language. This is the core of the app's "smart" functionality.

*   **Tooling & Deployment**:
    *   **Git & GitHub**: Version control and code management.
    *   **GitHub Pages**: Continuous deployment and hosting of a static website.

---


## Challenges & Solutions

One of the main challenges was handling the **inconsistencies and missing data within Wikidata**.

*   **The Problem**: For many countries, especially parliamentary systems, the start date of a prime minister's term is not stored in the same way as a president's. Furthermore, re-elections are often not modeled as new, distinct entries with their own start dates.

*   **The Solution**: A robust "fast-forward" algorithm was implemented in JavaScript.
    1.  The app fetches the earliest known start date for the current leader's tenure.
    2.  It then iteratively calculates the end of each successive term by adding the official mandate length.
    3.  This loop continues until the calculated end date is in the future.
    4.  This approach makes the application resilient to data update delays and inconsistent data modeling, ensuring it almost always returns a correct and relevant countdown.