/** Explicit test-only CSS response. Network font loading/visual font fidelity are NOT verified by this fixture. */
module.exports = Object.fromEntries(['Geist','Geist Mono'].map(family=>[
 `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ','+')}:wght@100..900&display=swap`,
 '/* Network font unavailable in this test environment; exercise application with system fallback. */'
]));
