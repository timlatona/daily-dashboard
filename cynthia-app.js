// Cynthia's Dashboard Configuration
const CONFIG = {
    // Add any specific config for Cynthia here
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial calls
    updateGreeting();
    updateDate();
    updateClock();

    // Load saved theme
    loadTheme();

    // Data fetching
    fetchQuote();
    fetchDadJoke();
    fetchNationalDay();
    fetchSunData();
    fetchMoonPhase();
    fetchWeather();

    // Intervals
    setInterval(updateClock, 1000);
    setInterval(updateGreeting, 60000);
    setInterval(updateSunArc, 60000);
    setInterval(fetchWeather, 600000);

    // Theme switcher
    document.getElementById('theme-select').addEventListener('change', (e) => {
        setTheme(e.target.value);
    });
});

// --- Theme System ---
function loadTheme() {
    const savedTheme = localStorage.getItem('cynthia-dashboard-theme') || 'floral';
    setTheme(savedTheme);
    document.getElementById('theme-select').value = savedTheme;
}

function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('cynthia-dashboard-theme', themeName);
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

    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options).toUpperCase();
}

function updateClock() {
    const clockElement = document.getElementById('digital-clock');
    const now = new Date();

    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
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
    const lat = 47.401;
    const lng = -122.324;
    const apiUrl = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK') {
            sunriseTime = new Date(data.results.sunrise);
            sunsetTime = new Date(data.results.sunset);

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

    const totalDayLength = sunsetTime - sunriseTime;
    const timeSinceSunrise = now - sunriseTime;

    let percentage = 0;

    if (now < sunriseTime) {
        percentage = 0;
    } else if (now > sunsetTime) {
        percentage = 1;
    } else {
        percentage = timeSinceSunrise / totalDayLength;
    }

    const radius = 100;
    const centerX = 110;
    const centerY = 110;

    const angle = Math.PI * (1 - percentage);

    const x = centerX + radius * Math.cos(angle);
    const y = centerY - radius * Math.sin(angle);

    sunIndicator.style.left = `${x - 5}px`;
    sunIndicator.style.top = `${y - 5}px`;

    sunIndicator.style.opacity = (now < sunriseTime || now > sunsetTime) ? '0.3' : '0.7';
}

// --- Moon Phase Logic ---
function fetchMoonPhase() {
    const moonPhaseEl = document.getElementById('moon-phase');
    const moonPhaseNameEl = document.getElementById('moon-phase-name');

    const today = new Date();
    const knownNewMoon = new Date(2000, 0, 6, 18, 14);
    const daysSinceKnownNewMoon = (today - knownNewMoon) / (1000 * 60 * 60 * 24);
    const synodicMonth = 29.53058867;
    const phase = (daysSinceKnownNewMoon % synodicMonth) / synodicMonth;

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

    const illuminationPercent = Math.round(illumination * 100);

    if (phase < 0.5) {
        moonPhaseEl.style.background = `linear-gradient(90deg, #1e293b ${100 - illuminationPercent}%, #f1f5f9 ${100 - illuminationPercent}%)`;
    } else {
        moonPhaseEl.style.background = `linear-gradient(90deg, #f1f5f9 ${illuminationPercent}%, #1e293b ${illuminationPercent}%)`;
    }

    moonPhaseNameEl.textContent = phaseName;
}

// --- Weather Data ---
async function fetchWeather() {
    const weatherStrip = document.getElementById('weather-strip');
    const lat = 47.3223;
    const lon = -122.3126;
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

// --- Inspirational Quote ---
async function fetchQuote() {
    const quoteContainer = document.getElementById('quote-data');
    const apiUrl = 'https://api.quotable.io/random';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();

        quoteContainer.innerHTML = `
            <div class="quote-text">"${data.content}"</div>
            <div class="quote-author">— ${data.author}</div>
        `;
    } catch (error) {
        console.error('Error fetching quote:', error);
        // Fallback quote
        quoteContainer.innerHTML = `
            <div class="quote-text">"The only way to do great work is to love what you do."</div>
            <div class="quote-author">— Steve Jobs</div>
        `;
    }
}

// --- Dad Joke ---
async function fetchDadJoke() {
    const jokeContainer = document.getElementById('joke-data');
    const apiUrl = 'https://icanhazdadjoke.com/';

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('API error');
        const data = await response.json();

        jokeContainer.innerHTML = `
            <div class="joke-text">${data.joke}</div>
        `;
    } catch (error) {
        console.error('Error fetching dad joke:', error);
        // Fallback joke
        jokeContainer.innerHTML = `
            <div class="joke-text">Why don't scientists trust atoms? Because they make up everything!</div>
        `;
    }
}
