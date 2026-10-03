// Global State Variables
let isSignup = false;
let isAwaitingOtp = false;
let totalClasses = 0;
let presentClasses = 0;
let isDarkMode = true;
let performanceChartInstance = null;
let attendanceChartInstance = null;

// --- Profile & Settings Management ---
let profileData = JSON.parse(localStorage.getItem('studentProfile')) || {
    name: "Student Name",
    course: "Course Name",
    avatar: ""
};

// --- Goals & Routine State Data ---
let goalsData = JSON.parse(localStorage.getItem('studentGoals')) || [];
let routinesData = JSON.parse(localStorage.getItem('studentRoutines')) || [];

// --- Study Timer State Data ---
let totalSeconds = 30 * 60; // 30 minutes default Pomodoro
let timerInterval = null;
let isRunning = false;

// --- Global DOMContentLoaded Initializer ---
window.addEventListener('DOMContentLoaded', () => {
    loadProfileSettings();
    updateWorldClock();
    updateTimerDisplay();
    renderGoals();
    saveAndRenderGoals();
    renderRoutines();
    initPerformanceChart('line');
    initAttendanceChart();
    updateDashboardCounts();
    
    const savedTab = localStorage.getItem('activeStudentTab') || 'dashboard';
    switchTab(savedTab);
});

// Authentication Mode Toggle
function toggleAuthMode() {
    isSignup = !isSignup;
    isAwaitingOtp = false;
    
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const signupDetails = document.getElementById('signupDetailsContainer');
    const otpField = document.getElementById('otpFieldContainer');
    const toggleText = document.getElementById('toggleText');

    if (authTitle) authTitle.innerText = isSignup ? "Create Account" : "Welcome Back";
    if (authSubtitle) authSubtitle.innerText = isSignup ? "Fill in your details to register" : "Please login to access your student portal";
    if (authBtn) authBtn.innerText = isSignup ? "Register & Send OTP" : "Login";
    
    if (signupDetails) signupDetails.classList.toggle('hidden', !isSignup);
    if (otpField) otpField.classList.add('hidden');
    
    if (toggleText) {
        toggleText.innerHTML = isSignup ? 
            `Already have an account? <button type="button" onclick="toggleAuthMode()" class="text-purple-600 dark:text-purple-400 hover:underline font-medium">Login</button>` :
            `Don't have an account? <button type="button" onclick="toggleAuthMode()" class="text-purple-600 dark:text-purple-400 hover:underline font-medium">Create account</button>`;
    }
}

// Authentication Handler (Login / Signup / OTP)
async function handleAuth(event) {
    event.preventDefault();
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const fullNameInput = document.getElementById('fullNameInput');
    const phoneInput = document.getElementById('phoneInput');
    const courseInput = document.getElementById('courseInput');

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const name = fullNameInput ? fullNameInput.value.trim() || "Student" : "Student";
    const course = courseInput ? courseInput.value.trim() : "Bachelor of Computer Applications";

    // OTP Verification Flow
    if (isSignup && isAwaitingOtp) {
        const otpInput = document.getElementById('otpInput');
        const otp = otpInput ? otpInput.value.trim() : "";
        if (!otp) {
            showAlert("Please enter the OTP sent to your email!");
            return;
        }
        try {
            const res = await fetch('http://127.0.0.1:8000/verify-otp', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert("Email verified successfully! You can now log in.");
                isAwaitingOtp = false;
                toggleAuthMode();
            } else {
                showAlert(data.detail || "Invalid OTP code.");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error connecting to server for verification.");
        }
        return;
    }

    // Signup Registration Flow
    if (isSignup) {
        try {
            const res = await fetch('http://127.0.0.1:8000/signup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ full_name: name, email, password, course })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert("OTP sent successfully to your email!");
                isAwaitingOtp = true;
                const otpField = document.getElementById('otpFieldContainer');
                const authBtn = document.getElementById('authBtn');
                if (otpField) otpField.classList.remove('hidden');
                if (authBtn) authBtn.innerText = "Verify OTP & Complete";
            } else {
                let errorMsg = data.detail;
                if (Array.isArray(errorMsg)) {
                    errorMsg = errorMsg.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
                }
                showAlert(errorMsg || "Registration failed.");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error connecting to backend server.");
        }
        return;
    }

    // Login Flow
    try {
        const res = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            profileData.name = data.name || name;
            profileData.course = data.course || course;
            saveProfileSettingsData();
            updateProfileUI();
            
            const authSection = document.getElementById('authSection');
            const portalSection = document.getElementById('portalSection');
            if (authSection) authSection.classList.add('hidden');
            if (portalSection) portalSection.classList.remove('hidden');
            showAlert("Login successful!");
        } else {
            showAlert(data.detail || "Invalid email or password.");
        }
    } catch (err) {
        console.error(err);
        // Fallback simulation if backend server is not running locally
        profileData.name = name;
        profileData.course = course;
        saveProfileSettingsData();
        updateProfileUI();
        
        const authSection = document.getElementById('authSection');
        const portalSection = document.getElementById('portalSection');
        if (authSection) authSection.classList.add('hidden');
        if (portalSection) portalSection.classList.remove('hidden');
        showAlert("Logged in successfully (Offline Mode)!");
    }
}

// Session Management
function logout() {
    const portalSection = document.getElementById('portalSection');
    const authSection = document.getElementById('authSection');
    if (portalSection) portalSection.classList.add('hidden');
    if (authSection) authSection.classList.remove('hidden');
    isAwaitingOtp = false;
    showAlert("Logged out successfully.");
}

function deleteAccount() {
    if(confirm("Are you sure you want to delete your account?")) {
        localStorage.clear();
        showAlert("Account deleted successfully.");
        logout();
    }
}

// Sidebar Navigation Tab Switcher
function switchTab(tabId) {
    const tabs = ['dashboard', 'performance', 'attendance', 'subjects', 'tasks', 'goals', 'routine', 'gemini', 'settings'];
    tabs.forEach(tab => {
        const view = document.getElementById(`view-${tab}`);
        const nav = document.getElementById(`nav-${tab}`);
        if (view) {
            view.classList.toggle('hidden', tab !== tabId);
        }
        if (nav) {
            nav.className = tab === tabId ? 
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 font-medium border border-purple-500/30 transition" : 
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition";
        }
    });
    localStorage.setItem('activeStudentTab', tabId);
}

// Dashboard Counts Update
function updateDashboardCounts() {
    const dashTasksCount = document.getElementById('dashTasksCount');
    const dashGoalsCount = document.getElementById('dashGoalsCount');
    
    const tasksList = document.getElementById('tasksList');
    if (dashTasksCount && tasksList) {
        const taskItems = tasksList.querySelectorAll('.border');
        dashTasksCount.innerText = taskItems.length;
    }
    
    if (dashGoalsCount) {
        const activeCount = goalsData.filter(goal => !goal.completed).length;
        dashGoalsCount.innerText = activeCount;
    }
}

// AI Curriculum Generator
function generateSubjectsByAI() {
    const aiSubjectInput = document.getElementById('aiSubjectInput');
    const container = document.getElementById('aiSyllabusContainer');
    if (!aiSubjectInput || !container) return;

    const query = aiSubjectInput.value.toLowerCase().trim();
    if(!query) {
        showAlert("Please enter a course or class name first!");
        return;
    }
    
    container.innerHTML = `<div class="text-center py-8 text-purple-600 dark:text-purple-400 text-sm font-medium animate-pulse">✨ Gemini AI is generating curriculum for "${aiSubjectInput.value}"...</div>`;

    setTimeout(() => {
        let generatedSubjects = [
            { title: `Core Module 1: Introduction to ${aiSubjectInput.value}`, desc: "Fundamental definitions, core concepts, and structural overview." },
            { title: "Core Module 2: Advanced Concepts & Frameworks", desc: "Deep dive into specialized methodologies and practical implementations." },
            { title: "Core Module 3: Applied Practice & Case Studies", desc: "Real-world problem solving and analytical approaches." },
            { title: "Core Module 4: Capstone Assessment & Project", desc: "Project framework and final evaluation metrics." }
        ];

        container.innerHTML = "";
        generatedSubjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = "backdrop-blur-md bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-2 shadow-xl hover:border-purple-500/40 transition-all";
            card.innerHTML = `<h4 class="font-bold text-purple-600 dark:text-purple-400">${sub.title}</h4><p class="text-xs text-slate-500 dark:text-slate-400">${sub.desc}</p>`;
            container.appendChild(card);
        });
        showAlert("AI curriculum generated successfully!");
    }, 600);
}

// Performance Management
function addCustomPerformance() {
    const monthInput = document.getElementById('perfMonthInput');
    const scoreInput = document.getElementById('perfScoreInput');

    const label = monthInput && monthInput.value.trim() !== '' ? monthInput.value.trim() : 'Exam Record';
    const score = scoreInput && scoreInput.value.trim() !== '' ? scoreInput.value.trim() : '0';

    const perfList = document.getElementById('performanceLogsList');
    if (perfList) {
        if (perfList.querySelector('p')) perfList.innerHTML = "";
        
        const entry = document.createElement('div');
        entry.className = "flex justify-between items-center bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm mb-2 shadow-md";
        entry.innerHTML = `<span class="text-slate-700 dark:text-slate-300">📊 ${label}</span><span class="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">${score}%</span>`;
        
        perfList.prepend(entry);
    }

    if (monthInput) monthInput.value = '';
    if (scoreInput) scoreInput.value = '';
    showAlert("Performance record added!");
}

function initPerformanceChart(type = 'line') {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    performanceChartInstance = new Chart(ctx, {
        type: type,
        data: {
            labels: ['Test 1', 'Test 2', 'Mid-Term', 'Final Exam'],
            datasets: [{
                label: 'Score (%)',
                data: [65, 78, 82, 92],
                borderColor: '#9333ea',
                backgroundColor: type === 'bar' ? '#9333ea' : 'rgba(147, 51, 234, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateChartType(type) {
    initPerformanceChart(type);
}

// Attendance Management Functions
function markAttendance() {
    totalClasses += 1;
    presentClasses += 1;
    updateAttendanceUI();
    showAlert("Marked present for today!");
}

function addCustomAttendance() {
    const statusInput = document.getElementById('attStatusInput');
    const status = statusInput ? statusInput.value : 'Present';

    totalClasses += 1;
    if (status === 'Present') {
        presentClasses += 1;
    }

    updateAttendanceUI();
    showAlert(`Attendance marked as ${status}!`);
}

function updateAttendanceUI() {
    const percent = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

    const totalClassesElem = document.getElementById('statTotalClasses');
    const presentClassesElem = document.getElementById('statPresentClasses');
    const percentBadge = document.getElementById('attendancePercentBadge');
    const dashAttendance = document.getElementById('dashAttendance');

    if (totalClassesElem) totalClassesElem.innerText = totalClasses;
    if (presentClassesElem) presentClassesElem.innerText = presentClasses;
    if (percentBadge) percentBadge.innerText = `${percent}%`;
    if (dashAttendance) dashAttendance.innerText = `${percent}%`;
}

function initAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }

    attendanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Attendance Rate (%)',
                data: [80, 85, 90, 88],
                backgroundColor: '#10b981',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Goal Management Functions
function renderGoals() {
    const goalsList = document.getElementById('goalsList');
    if (!goalsList) return;

    if (goalsData.length === 0) {
        goalsList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">No goals added yet.</p>`;
        return;
    }

    goalsList.innerHTML = '';
    goalsData.forEach((goal, index) => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm shadow-md";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" ${goal.completed ? 'checked' : ''} onclick="toggleGoal(${index})" class="w-4 h-4 accent-purple-600 rounded cursor-pointer">
                <span class="${goal.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}">${goal.text}</span>
            </div>
            <button onclick="deleteGoal(${index})" class="text-xs text-rose-500 hover:underline font-medium">Delete</button>
        `;
        goalsList.appendChild(item);
    });
}

function addGoal() {
    const input = document.getElementById('newGoalInput');
    if (!input || input.value.trim() === '') return;

    goalsData.push({ text: input.value.trim(), completed: false });
    input.value = '';
    saveAndRenderGoals();
    showAlert("Goal added successfully!");
}

function toggleGoal(index) {
    goalsData[index].completed = !goalsData[index].completed;
    saveAndRenderGoals();
}

function deleteGoal(index) {
    goalsData.splice(index, 1);
    saveAndRenderGoals();
}

function resetGoals() {
    goalsData = [];
    saveAndRenderGoals();
    showAlert("Goals reset successfully.");
}

function saveAndRenderGoals() {
    localStorage.setItem('studentGoals', JSON.stringify(goalsData));
    renderGoals();
    updateDashboardCounts();
}

// Task Management
function addTask() {
    const input = document.getElementById('newTaskInput');
    if (!input || !input.value.trim()) return;
    const list = document.getElementById('tasksList');
    if (!list) return;

    if (list.querySelector('p')) list.innerHTML = "";
    const item = document.createElement('div');
    item.className = "flex justify-between items-center bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm shadow-md";
    item.innerHTML = `<span class="text-slate-800 dark:text-slate-200">📌 ${input.value}</span><button onclick="this.parentElement.remove(); updateDashboardCounts();" class="text-rose-500 text-xs hover:underline font-medium">Delete</button>`;
    list.appendChild(item);
    input.value = "";
    
    updateDashboardCounts();
    showAlert("Task added successfully!");
}

// Study Timer (Pomodoro) Logic
function updateTimerDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const display = document.getElementById('timerDisplay');
    
    if (display) {
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;

    timerInterval = setInterval(() => {
        if (totalSeconds > 0) {
            totalSeconds--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            alert("Great job! Pomodoro study session complete.");
            totalSeconds = 30 * 60;
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = 30 * 60;
    updateTimerDisplay();
}

// World Clock Logic
function updateWorldClock() {
    const selectElement = document.getElementById('countrySelect');
    const timeDisplay = document.getElementById('worldClockTime');
    const dateDisplay = document.getElementById('worldClockDate');

    if (!selectElement || !timeDisplay || !dateDisplay) return;

    const timeZone = selectElement.value;
    const now = new Date();

    try {
        const timeString = now.toLocaleTimeString('en-US', {
            timeZone: timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const dateString = now.toLocaleDateString('en-US', {
            timeZone: timeZone,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        timeDisplay.textContent = timeString;
        dateDisplay.textContent = dateString;
    } catch (error) {
        console.error("Invalid time zone", error);
    }
}

setInterval(updateWorldClock, 1000);

// Routine Management Functions
function renderRoutines() {
    const routineListContainer = document.getElementById('routineListContainer');
    if (!routineListContainer) return;

    if (routinesData.length === 0) {
        routineListContainer.innerHTML = `
            <div class="backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 border-dashed p-8 rounded-2xl text-center space-y-2">
                <div class="w-10 h-10 bg-purple-600/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl mx-auto flex items-center justify-center font-bold">⏰</div>
                <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">No Routine Tasks Added</h3>
                <p class="text-xs text-slate-500">Add your tasks above with target dates to start tracking.</p>
            </div>
        `;
        return;
    }

    routineListContainer.innerHTML = '';
    routinesData.forEach((routine, index) => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-sm shadow-md";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" ${routine.completed ? 'checked' : ''} onclick="toggleRoutine(${index})" class="w-4 h-4 accent-purple-600 rounded cursor-pointer">
                <div>
                    <span class="${routine.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'} font-medium block">${routine.title}</span>
                    <span class="text-[11px] text-purple-600 dark:text-purple-400">Target: ${routine.date || 'No Date'}</span>
                </div>
            </div>
            <button onclick="deleteRoutine(${index})" class="text-xs text-rose-500 hover:underline font-medium">Delete</button>
        `;
        routineListContainer.appendChild(item);
    });
}

function addRoutineItem() {
    const titleInput = document.getElementById('routineTitleInput');
    const dateInput = document.getElementById('routineDateInput');

    if (!titleInput || titleInput.value.trim() === '') return;

    routinesData.push({
        title: titleInput.value.trim(),
        date: dateInput ? dateInput.value : '',
        completed: false
    });

    titleInput.value = '';
    if (dateInput) dateInput.value = '';

    saveAndRenderRoutines();
    showAlert("Routine task added successfully!");
}

function toggleRoutine(index) {
    routinesData[index].completed = !routinesData[index].completed;
    saveAndRenderRoutines();
}

function deleteRoutine(index) {
    routinesData.splice(index, 1);
    saveAndRenderRoutines();
}

function saveAndRenderRoutines() {
    localStorage.setItem('studentRoutines', JSON.stringify(routinesData));
    renderRoutines();
}

// Theme Mode Toggle
// Theme Mode Toggle (Fixed for data-theme attribute)
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    const htmlElement = document.documentElement;
    
    if (isDarkMode) {
        htmlElement.setAttribute('data-theme', 'dark');
        htmlElement.classList.add('dark'); // Tailwind classes support ke liye
        showAlert("Switched to Dark Mode 🌙");
    } else {
        htmlElement.setAttribute('data-theme', 'light');
        htmlElement.classList.remove('dark'); // Tailwind classes support ke liye
        showAlert("Switched to Light Mode ☀️");
    }
    
    // Theme preference save karein
    localStorage.setItem('studentTheme', isDarkMode ? 'dark' : 'light');
}

// Alert Notification Banner
function showAlert(msg) {
    const banner = document.getElementById('alertBanner');
    if (!banner) return;
    
    let displayMessage = msg;
    if (typeof msg === 'object' && msg !== null) {
        displayMessage = msg.message || JSON.stringify(msg);
    }

    banner.innerText = displayMessage;
    banner.classList.remove('hidden');
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 4000);
}

// Gemini Chat Handlers
function startNewGeminiChat() {
    const chatContainer = document.getElementById('geminiChatContainer');
    if (chatContainer) {
        chatContainer.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">AI</div>
                <div class="bg-slate-800/80 border border-slate-700/60 text-slate-200 p-4 rounded-2xl max-w-xl text-sm shadow-md">
                    Started a new chat session! How can I assist you with your studies or projects today?
                </div>
            </div>`;
    }
    showAlert("New chat session started.");
}

async function sendGeminiMessage() {
    const inputField = document.getElementById('geminiPromptInput');
    const chatContainer = document.getElementById('geminiChatContainer');
    if (!inputField) return;

    const prompt = inputField.value.trim();
    if (!prompt) return;

    if (chatContainer) {
        chatContainer.innerHTML += `
            <div class="flex items-start gap-3 justify-end my-2">
                <div class="bg-purple-600 text-white p-4 rounded-2xl max-w-xl text-sm shadow-md">${prompt}</div>
                <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">U</div>
            </div>`;
    }
    inputField.value = "";

    try {
        const response = await fetch('http://127.0.0.1:8000/api/gemini', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt })
        });
        const data = await response.json();
        
        const aiReply = data.reply || data.response || data.message || data.detail || JSON.stringify(data);

        if (chatContainer) {
            const formattedReply = typeof marked !== 'undefined' ? marked.parse(aiReply) : aiReply;

            chatContainer.innerHTML += `
                <div class="flex items-start gap-3 my-2">
                    <div class="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">AI</div>
                    <div class="bg-slate-800/80 border border-slate-700/60 text-slate-200 p-4 rounded-2xl max-w-xl text-sm shadow-md markdown-content">${formattedReply}</div>
                </div>`;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } catch (err) {
        console.error(err);
        // Simulated AI response if backend is offline
        if (chatContainer) {
            chatContainer.innerHTML += `
                <div class="flex items-start gap-3 my-2">
                    <div class="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">AI</div>
                    <div class="bg-slate-800/80 border border-slate-700/60 text-slate-200 p-4 rounded-2xl max-w-xl text-sm shadow-md">
                        This is a simulated AI reply for: "${prompt}". (Backend API endpoint not connected).
                    </div>
                </div>`;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
}

// Profile & Settings Management Handlers
function loadProfileSettings() {
    const nameInput = document.getElementById('settingsNameInput');
    const courseInput = document.getElementById('settingsCourseInput');
    
    if (nameInput) nameInput.value = profileData.name;
    if (courseInput) courseInput.value = profileData.course;

    updateProfileUI();
}

function previewProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        profileData.avatar = e.target.result;
        saveProfileSettingsData();
        updateProfileUI();
        showAlert("Profile photo updated successfully!");
    };
    reader.readAsDataURL(file);
}

function resetProfilePhoto() {
    profileData.avatar = "";
    saveProfileSettingsData();
    updateProfileUI();
    showAlert("Profile photo reset.");
}

function updateProfileUI() {
    const avatarContainers = document.querySelectorAll('#userAvatarContainer, #userAvatarLetter');
    const displayName = document.getElementById('profileDisplayName');
    const degreeBadge = document.getElementById('profileDegreeBadge');
    const welcomeName = document.getElementById('welcomeUser');

    if (displayName) displayName.textContent = profileData.name || "Student Name";
    if (welcomeName) welcomeName.textContent = `Welcome back, ${profileData.name || "Student"}`;
    if (degreeBadge) degreeBadge.textContent = profileData.course || "BCA";

    let firstLetter = profileData.name ? profileData.name.trim().charAt(0).toUpperCase() : "S";

    avatarContainers.forEach(container => {
        if (!container) return;
        if (profileData.avatar) {
            container.innerHTML = `<img src="${profileData.avatar}" class="w-full h-full object-cover rounded-xl">`;
        } else {
            container.innerHTML = `<span class="font-bold text-white">${firstLetter}</span>`;
        }
    });
}

function saveProfileSettings() {
    const nameInput = document.getElementById('settingsNameInput');
    const courseInput = document.getElementById('settingsCourseInput');

    if (nameInput) profileData.name = nameInput.value.trim();
    if (courseInput) profileData.course = courseInput.value.trim();

    saveProfileSettingsData();
    updateProfileUI();
    
    showAlert("Profile settings successfully updated!");
}

function saveProfileSettingsData() {
    localStorage.setItem('studentProfile', JSON.stringify(profileData));
}