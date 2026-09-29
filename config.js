// 1) Paste your Supabase values here (Project Settings > API).
//    Use ONLY the anon/public key. Never paste the service_role key.
window.ERMOL_CONFIG = {
    SUPABASE_URL: "YOUR_SUPABASE_URL",
    SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
};

// Shared subject/topic data (no need to edit).
window.ERMOL_DATA = {
    SUBJECTS: [
        { n: "C++", i: "⚙️", d: "Basics • OOP • Arrays • Functions" },
        { n: "HTML", i: "🌐", d: "Elements • Forms • Tables • Semantics" },
        { n: "Python", i: "🐍", d: "Basics • Functions • Lists • OOP" },
        { n: "ERP", i: "📊", d: "Concepts • Modules • Business Systems" },
        { n: "CSS", i: "🎨", d: "Selectors • Flexbox • Grid • Responsive" },
        { n: "Web Development", i: "💻", d: "HTML • CSS • JavaScript • APIs" }
    ],
    TOPICS: {
        "C++": ["Basics", "Variables", "Data Types", "Operators", "Loops", "Functions", "Arrays", "Pointers", "OOP", "STL"],
        "HTML": ["Basics", "Elements", "Attributes", "Links", "Images", "Tables", "Forms", "Semantic HTML"],
        "Python": ["Basics", "Variables", "Data Types", "Operators", "Conditions", "Loops", "Functions", "Lists", "Dictionaries", "OOP"],
        "ERP": ["ERP Basics", "ERP Modules", "Finance", "Human Resources", "Inventory", "Supply Chain", "Business Processes"],
        "CSS": ["Basics", "Selectors", "Colors", "Box Model", "Flexbox", "Grid", "Position", "Animations", "Responsive Design"],
        "Web Development": ["HTML", "CSS", "JavaScript", "DOM", "APIs", "JSON", "Git & GitHub", "Frontend", "Backend"]
    }
};
