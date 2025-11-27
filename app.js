
const CONFIG = {
    tideStationId: '9446248', // Des Moines, WA (East Passage)
    houseValue: 1303356, // Static value from Redfin (Nov 27, 2025)
    houseValueChange: 0 // No change for static
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial calls
    updateGreeting();
    updateDate();
    updateClock();

    // Data fetching
    fetchTideData();
    fetchHouseValue();
    fetchHistoryData();
    fetchSunData();
    fetchNFLData();

    // Intervals
    setInterval(updateClock, 1000); // Update clock every second
    setInterval(updateGreeting, 60000); // Check greeting every minute
    setInterval(updateSunArc, 60000); // Update sun position every minute
});

// --- Clock & Greeting Logic ---
function updateGreeting() {
    const greetingElement = document.getElementById('greeting');
    const hour = new Date().getHours();
    let greeting = 'Good Morning';

    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else if (hour >= 17) {
        greeting = 'Good Evening';
    }

    greetingElement.textContent = greeting;
}

function updateDate() {
    const dateElement = document.getElementById('current-date');
    const today = new Date();

    // Digital format: MON, NOV 27, 2025
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options).toUpperCase();
}

function updateClock() {
    const clockElement = document.getElementById('digital-clock');
    const now = new Date();

    // Format: HH:MM:SS (24-hour or 12-hour? School clocks usually 12h or 24h. Let's do 24h for "digital" feel or 12h standard. 
    // User asked for "digital clock with red letters like what you might see in a school". 
    // School clocks are often HH:MM, but let's do HH:MM:SS.

    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false, // 24-hour format often looks more "digital/tech"
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    clockElement.textContent = timeString;
}

// --- Sun Arc Logic ---
let sunriseTime = null;
let sunsetTime = null;

async function fetchSunData() {
    // Des Moines, WA coordinates
    const lat = 47.401;
    const lng = -122.324;
    const apiUrl = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK') {
            sunriseTime = new Date(data.results.sunrise);
            sunsetTime = new Date(data.results.sunset);

            // Display times
            document.getElementById('sunrise-time').textContent = sunriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            document.getElementById('sunset-time').textContent = sunsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            updateSunArc();
        }
    } catch (error) {
        console.error('Error fetching sun data:', error);
    }
}

function updateSunArc() {
    if (!sunriseTime || !sunsetTime) return;

    const now = new Date();
    const sunIndicator = document.getElementById('sun-indicator');

    // Calculate percentage of day passed
    const totalDayLength = sunsetTime - sunriseTime;
    const timeSinceSunrise = now - sunriseTime;

    let percentage = 0;

    if (now < sunriseTime) {
        percentage = 0; // Before sunrise
    } else if (now > sunsetTime) {
        percentage = 1; // After sunset
    } else {
        percentage = timeSinceSunrise / totalDayLength;
    }

    // Map percentage (0 to 1) to angle (180 to 0 degrees for CSS rotation, or coordinates)
    // Let's use coordinates on a semi-circle path
    // Path is a semi-circle with radius ~100px
    // Center is at bottom middle of .sun-arc (110px, 110px) relative to top-left

    const radius = 100;
    const centerX = 110;
    const centerY = 110; // Bottom of the arc container

    // Angle in radians: 0% = PI (left), 50% = PI/2 (top), 100% = 0 (right)
    // Wait, standard unit circle: PI is left, 0 is right.
    // So we go from PI to 0.
    const angle = Math.PI * (1 - percentage);

    const x = centerX + radius * Math.cos(angle);
    const y = centerY - radius * Math.sin(angle); // Subtract because Y grows downwards

    // Adjust for indicator size (10px now)
    sunIndicator.style.left = `${x - 5}px`;
    sunIndicator.style.top = `${y - 5}px`;

    // Show/Hide based on day/night? Or just keep it pinned at ends?
    // Let's keep it visible but maybe dim it at night.
    sunIndicator.style.opacity = (now < sunriseTime || now > sunsetTime) ? '0.3' : '0.7';
}

// --- History Data (On This Day) ---
async function fetchHistoryData() {
    const historyContainer = document.getElementById('history-data');
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Wikipedia's "On This Day" API (HTTPS)
    const apiUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Get a random event from the list
        if (data.events && data.events.length > 0) {
            const randomEvent = data.events[Math.floor(Math.random() * data.events.length)];
            const year = randomEvent.year;
            const fact = randomEvent.text;
            const wikiLink = randomEvent.pages && randomEvent.pages[0] ?
                `https://en.wikipedia.org/wiki/${encodeURIComponent(randomEvent.pages[0].titles.normalized)}` :
                `https://en.wikipedia.org/wiki/${month}_${day}`;

            historyContainer.innerHTML = `
                <span class="history-year">${year}</span>
                <p class="history-text">${fact}</p>
                <a href="${wikiLink}" target="_blank" class="history-link">Learn more →</a>
            `;
        } else {
            historyContainer.innerHTML = '<p>No historical events found.</p>';
        }

    } catch (error) {
        console.error('Error fetching history data:', error);
        historyContainer.innerHTML = '<p>Unable to load history fact.</p>';
    }
}

// --- Tide Data Integration ---
async function fetchTideData() {
    const tideContainer = document.getElementById('tide-data');

    // Fetch today's tides
    const todayUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${CONFIG.tideStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&application=DailyDashboard&format=json`;

    // Fetch 14 days of tides for lowest daylight tide
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const rangeUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDate(today)}&end_date=${formatDate(endDate)}&station=${CONFIG.tideStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&interval=hilo&application=DailyDashboard&format=json`;

    try {
        // Fetch both today's tides and 14-day range
        const [todayResponse, rangeResponse] = await Promise.all([
            fetch(todayUrl),
            fetch(rangeUrl)
        ]);

        if (!todayResponse.ok || !rangeResponse.ok) throw new Error('Network response was not ok');

        const todayData = await todayResponse.json();
        const rangeData = await rangeResponse.json();

        // Render today's low tides
        if (todayData.predictions && todayData.predictions.length > 0) {
            renderTides(todayData.predictions);
        } else {
            tideContainer.innerHTML = '<p>No tide data available for today.</p>';
        }

        // Find lowest daylight tide in next 14 days
        if (rangeData.predictions && rangeData.predictions.length > 0) {
            findLowestDaylightTide(rangeData.predictions);
        }

    } catch (error) {
        console.error('Error fetching tide data:', error);
        tideContainer.innerHTML = '<p>Unable to load tide data.</p>';
    }
}

function renderTides(predictions) {
    const tideContainer = document.getElementById('tide-data');
    tideContainer.innerHTML = '';

    const lowTides = predictions.filter(p => p.type === 'L');

    if (lowTides.length === 0) {
        tideContainer.innerHTML = '<p>No low tides remaining today.</p>';
        return;
    }

    lowTides.forEach(tide => {
        const time = formatTime(tide.t);
        const level = parseFloat(tide.v).toFixed(1);

        const tideItem = document.createElement('div');
        tideItem.className = 'tide-item';
        tideItem.innerHTML = `
            <span class="tide-time">${time}</span>
            <span class="tide-level">${level} ft</span>
        `;
        tideContainer.appendChild(tideItem);
    });
}

async function findLowestDaylightTide(predictions) {
    const lowestContainer = document.getElementById('lowest-tide-data');
    if (!lowestContainer) return;

    // We need sunrise/sunset times to determine daylight
    // We'll use the already-fetched sunriseTime and sunsetTime, or wait for them
    // For simplicity, let's assume sunrise is around 7:30 AM and sunset around 4:30 PM
    // In a more robust solution, we'd fetch sunrise/sunset for each day

    const lowTides = predictions.filter(p => p.type === 'L');

    let lowestDaylightTide = null;

    for (const tide of lowTides) {
        const tideDate = new Date(tide.t);
        const hour = tideDate.getHours();

        // Consider daylight as roughly 7 AM to 5 PM (conservative estimate)
        const isDaylight = hour >= 7 && hour < 17;

        if (isDaylight) {
            const level = parseFloat(tide.v);
            if (!lowestDaylightTide || level < lowestDaylightTide.level) {
                lowestDaylightTide = {
                    date: tideDate,
                    level: level,
                    time: tide.t
                };
            }
        }
    }

    if (lowestDaylightTide) {
        const dateStr = lowestDaylightTide.date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        const timeStr = formatTime(lowestDaylightTide.time);

        lowestContainer.innerHTML = `
            <div class="lowest-tide-highlight">
                <div class="lowest-tide-label">Lowest Daylight Tide (14 days)</div>
                <div class="lowest-tide-info">
                    <span class="lowest-tide-date">${dateStr}</span>
                    <span class="lowest-tide-time">${timeStr}</span>
                    <span class="lowest-tide-level">${lowestDaylightTide.level.toFixed(1)} ft</span>
                </div>
            </div>
        `;
    } else {
        lowestContainer.innerHTML = '<p style="font-size: 0.9rem; opacity: 0.7;">No daylight low tides found.</p>';
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// --- House Value (Static) ---
function fetchHouseValue() {
    const houseContainer = document.getElementById('house-value-data');

    setTimeout(() => {
        const value = CONFIG.houseValue;

        const formattedValue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);

        houseContainer.innerHTML = `
            <div class="house-price">${formattedValue}</div>
            <div class="house-change">
                <span style="font-size: 0.8rem; color: #94a3b8;">Estimated Value</span>
            </div>
        `;
    }, 500);
}

// --- NFL Data Integration ---
async function fetchNFLData() {
    const nflContainer = document.getElementById('nfl-data');
    const apiUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const events = data.events || [];

        nflContainer.innerHTML = '';

        // 1. Find Next Seahawks Game
        const seahawksGame = events.find(event =>
            event.competitions[0].competitors.some(team => team.team.abbreviation === 'SEA')
        );

        if (seahawksGame) {
            renderNFLGame(nflContainer, seahawksGame, 'Next Seahawks Game');
        } else {
            nflContainer.innerHTML += '<p>No upcoming Seahawks game found.</p>';
        }

        // 2. Find Upcoming Non-Sunday Games (within 6.5 days)
        const now = new Date();
        const lookaheadLimit = new Date(now.getTime() + (6.5 * 24 * 60 * 60 * 1000)); // 6.5 days from now

        const upcomingNonSundayGames = events.filter(event => {
            const gameDate = new Date(event.date);
            const dayOfWeek = gameDate.getDay(); // 0 = Sunday

            // Filter logic:
            // 1. Game is in the future (or very recent past if today) - API handles "current week" mostly
            // 2. Game is NOT on Sunday (dayOfWeek !== 0)
            // 3. Game is within the lookahead limit
            // 4. Game is NOT the Seahawks game (already displayed)

            return (
                gameDate >= now &&
                gameDate <= lookaheadLimit &&
                dayOfWeek !== 0 &&
                event.id !== seahawksGame?.id
            );
        });

        // Sort by date
        upcomingNonSundayGames.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcomingNonSundayGames.length > 0) {
            // Add a divider or header if needed, but for now just list them
            upcomingNonSundayGames.forEach(game => {
                const gameDate = new Date(game.date);
                const dayName = gameDate.toLocaleDateString('en-US', { weekday: 'long' });
                renderNFLGame(nflContainer, game, `${dayName} Football`);
            });
        }

    } catch (error) {
        console.error('Error fetching NFL data:', error);
        nflContainer.innerHTML = '<p>Unable to load NFL schedule.</p>';
    }
}

function renderNFLGame(container, game, label) {
    const matchup = game.name;
    const shortName = game.shortName;
    const date = new Date(game.date);

    const timeString = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const gameDiv = document.createElement('div');
    gameDiv.className = 'nfl-game';
    gameDiv.innerHTML = `
        <div class="game-header">${label}</div>
        <div class="game-matchup">${shortName}</div>
        <div class="game-time">${timeString}</div>
    `;
    container.appendChild(gameDiv);
}
