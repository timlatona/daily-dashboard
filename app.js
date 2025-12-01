
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

    // Load saved theme
    loadTheme();

    // Data fetching
    fetchTideData();
    fetchHouseValue();
    fetchHistoryData();
    fetchSunData();
    fetchMoonPhase();
    fetchWeather();
    fetchNFLData();

    // Intervals
    setInterval(updateClock, 1000); // Update clock every second
    setInterval(updateGreeting, 60000); // Check greeting every minute
    setInterval(updateSunArc, 60000); // Update sun position every minute
    setInterval(fetchWeather, 600000); // Update weather every 10 minutes

    // Theme switcher
    document.getElementById('theme-select').addEventListener('change', (e) => {
        setTheme(e.target.value);
    });
});

// --- Theme System ---
function loadTheme() {
    const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
    setTheme(savedTheme);
    document.getElementById('theme-select').value = savedTheme;
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('dashboard-theme', themeName);
}
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

// --- Moon Phase Logic ---
function fetchMoonPhase() {
    const moonPhaseEl = document.getElementById('moon-phase');
    const moonPhaseNameEl = document.getElementById('moon-phase-name');

    // Calculate moon phase
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Simple moon phase calculation (approximate)
    // Based on the synodic month (29.53 days)
    const knownNewMoon = new Date(2000, 0, 6, 18, 14); // Jan 6, 2000
    const daysSinceKnownNewMoon = (today - knownNewMoon) / (1000 * 60 * 60 * 24);
    const synodicMonth = 29.53058867;
    const phase = (daysSinceKnownNewMoon % synodicMonth) / synodicMonth;

    // Determine phase name and illumination
    let phaseName = '';
    let illumination = 0;

    if (phase < 0.0625) {
        phaseName = 'New Moon';
        illumination = 0;
    } else if (phase < 0.1875) {
        phaseName = 'Waxing Crescent';
        illumination = phase * 2;
    } else if (phase < 0.3125) {
        phaseName = 'First Quarter';
        illumination = 0.5;
    } else if (phase < 0.4375) {
        phaseName = 'Waxing Gibbous';
        illumination = 0.5 + (phase - 0.25) * 2;
    } else if (phase < 0.5625) {
        phaseName = 'Full Moon';
        illumination = 1;
    } else if (phase < 0.6875) {
        phaseName = 'Waning Gibbous';
        illumination = 1 - (phase - 0.5) * 2;
    } else if (phase < 0.8125) {
        phaseName = 'Last Quarter';
        illumination = 0.5;
    } else if (phase < 0.9375) {
        phaseName = 'Waning Crescent';
        illumination = 0.5 - (phase - 0.75) * 2;
    } else {
        phaseName = 'New Moon';
        illumination = 0;
    }

    // Update moon graphic
    // Use CSS to show illumination
    const illuminationPercent = Math.round(illumination * 100);

    if (phase < 0.5) {
        // Waxing (right side illuminated)
        moonPhaseEl.style.background = `linear-gradient(90deg, #1e293b ${100 - illuminationPercent}%, #f1f5f9 ${100 - illuminationPercent}%)`;
    } else {
        // Waning (left side illuminated)
        moonPhaseEl.style.background = `linear-gradient(90deg, #f1f5f9 ${illuminationPercent}%, #1e293b ${illuminationPercent}%)`;
    }

    moonPhaseNameEl.textContent = phaseName;
}

// --- Weather Data ---
async function fetchWeather() {
    const weatherStrip = document.getElementById('weather-strip');

    // Federal Way, WA coordinates
    const lat = 47.3223;
    const lon = -122.3126;

    // Using Open-Meteo API (free, no key required)
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const feelsLike = Math.round(data.current.apparent_temperature);
            const humidity = data.current.relative_humidity_2m;
            const windSpeed = Math.round(data.current.wind_speed_10m);
            const weatherCode = data.current.weather_code;

            // Map weather codes to icons and descriptions
            const weatherInfo = getWeatherInfo(weatherCode);

            weatherStrip.innerHTML = `
                <div class="weather-item">
                    <span class="weather-icon">${weatherInfo.icon}</span>
                    <span class="weather-condition">${weatherInfo.description}</span>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">🌡️</span>
                    <span class="weather-temp">${temp}°F</span>
                    <span style="opacity: 0.6; font-size: 0.8rem;">(feels ${feelsLike}°)</span>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">💧</span>
                    <span>${humidity}%</span>
                </div>
                <div class="weather-item">
                    <span class="weather-icon">💨</span>
                    <span>${windSpeed} mph</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        weatherStrip.innerHTML = '<span style="opacity: 0.5;">Weather unavailable</span>';
    }
}

function getWeatherInfo(code) {
    // WMO Weather interpretation codes
    const weatherMap = {
        0: { icon: '☀️', description: 'Clear' },
        1: { icon: '🌤️', description: 'Mostly Clear' },
        2: { icon: '⛅', description: 'Partly Cloudy' },
        3: { icon: '☁️', description: 'Overcast' },
        45: { icon: '🌫️', description: 'Foggy' },
        48: { icon: '🌫️', description: 'Foggy' },
        51: { icon: '🌦️', description: 'Light Drizzle' },
        53: { icon: '🌦️', description: 'Drizzle' },
        55: { icon: '🌦️', description: 'Heavy Drizzle' },
        61: { icon: '🌧️', description: 'Light Rain' },
        63: { icon: '🌧️', description: 'Rain' },
        65: { icon: '🌧️', description: 'Heavy Rain' },
        71: { icon: '🌨️', description: 'Light Snow' },
        73: { icon: '🌨️', description: 'Snow' },
        75: { icon: '🌨️', description: 'Heavy Snow' },
        77: { icon: '🌨️', description: 'Snow Grains' },
        80: { icon: '🌦️', description: 'Light Showers' },
        81: { icon: '🌦️', description: 'Showers' },
        82: { icon: '🌦️', description: 'Heavy Showers' },
        85: { icon: '🌨️', description: 'Light Snow Showers' },
        86: { icon: '🌨️', description: 'Snow Showers' },
        95: { icon: '⛈️', description: 'Thunderstorm' },
        96: { icon: '⛈️', description: 'Thunderstorm + Hail' },
        99: { icon: '⛈️', description: 'Thunderstorm + Hail' }
    };

    return weatherMap[code] || { icon: '🌡️', description: 'Unknown' };
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
    // Add timestamp to prevent caching
    const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?t=${new Date().getTime()}`;

    // Add Refresh Button if not present
    let refreshBtn = document.getElementById('nfl-refresh-btn');
    if (!refreshBtn) {
        // Find the header in the parent container
        const widgetHeader = nflContainer.parentElement.querySelector('h2');
        if (widgetHeader) {
            refreshBtn = document.createElement('button');
            refreshBtn.id = 'nfl-refresh-btn';
            refreshBtn.innerHTML = '↻';
            refreshBtn.title = 'Refresh NFL Data';
            refreshBtn.style.cssText = `
                background: none;
                border: none;
                color: var(--text-color);
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: 10px;
                opacity: 0.7;
                transition: transform 0.3s;
            `;
            refreshBtn.onclick = () => {
                refreshBtn.style.transform = 'rotate(360deg)';
                fetchNFLData();
                setTimeout(() => refreshBtn.style.transform = 'none', 500);
            };
            widgetHeader.appendChild(refreshBtn);
        }
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const events = data.events || [];

        nflContainer.innerHTML = '';

        // 1. Find Seahawks Game (Next, Live, or Last)
        const seahawksGame = events.find(event =>
            event.competitions[0].competitors.some(team => team.team.abbreviation === 'SEA')
        );

        if (seahawksGame) {
            const statusState = seahawksGame.status.type.state; // pre, in, post
            let label = 'Next Seahawks Game';

            if (statusState === 'post') {
                label = 'Last Seahawks Game';
            } else if (statusState === 'in') {
                label = '🔴 Live Seahawks Game';
            }

            renderNFLGame(nflContainer, seahawksGame, label, statusState === 'post' || statusState === 'in');
        } else {
            nflContainer.innerHTML += '<p>No Seahawks game data found.</p>';
        }

        // 2. Find Upcoming Non-Sunday Games (within 6.5 days)
        const now = new Date();
        const lookaheadLimit = new Date(now.getTime() + (6.5 * 24 * 60 * 60 * 1000)); // 6.5 days from now

        const upcomingNonSundayGames = events.filter(event => {
            const gameDate = new Date(event.date);
            const dayOfWeek = gameDate.getDay(); // 0 = Sunday

            // Filter logic:
            // 1. Game is in the future (or very recent past if today)
            // 2. Game is NOT on Sunday (dayOfWeek !== 0)
            // 3. Game is within the lookahead limit
            // 4. Game is NOT the Seahawks game (already displayed)
            // 5. Game is NOT finished (post) - we only want UPCOMING non-Sunday games

            return (
                gameDate >= now &&
                gameDate <= lookaheadLimit &&
                dayOfWeek !== 0 &&
                event.id !== seahawksGame?.id &&
                event.status.type.state !== 'post'
            );
        });

        // Sort by date
        upcomingNonSundayGames.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcomingNonSundayGames.length > 0) {
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

function renderNFLGame(container, game, label, showScore = false) {
    const shortName = game.shortName;
    const date = new Date(game.date);
    const competition = game.competitions[0];

    let timeOrScore = '';

    if (showScore) {
        // Find score
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
        timeOrScore = `${awayTeam.team.abbreviation} ${awayTeam.score} - ${homeTeam.team.abbreviation} ${homeTeam.score}`;

        if (game.status.type.state === 'in') {
            timeOrScore += ` (${game.status.displayClock})`;
        } else if (game.status.type.state === 'post') {
            timeOrScore += ` (Final)`;
        }
    } else {
        timeOrScore = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    const gameDiv = document.createElement('div');
    gameDiv.className = 'nfl-game';
    gameDiv.innerHTML = `
        <div class="game-header">${label}</div>
        <div class="game-matchup">${shortName}</div>
        <div class="game-time" style="${showScore ? 'font-weight: bold; color: var(--accent-color);' : ''}">${timeOrScore}</div>
    `;
    container.appendChild(gameDiv);
}
