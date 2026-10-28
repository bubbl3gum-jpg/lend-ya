# Independent font-build prerequisite correction

28 October 2026. The root layout imported network-loaded Geist/Geist Mono while the existing body already uses Arial/Helvetica and heritage surfaces explicitly use Georgia/Times plus Arial. Remote Google Fonts returned 403 in 13A. Removed these network font imports/classes and bound Tailwind sans/mono tokens to explicit system stacks. Heritage display/support stacks, materials and layout are unchanged. No font binaries, new third-party assets, licenses or packages are introduced/distributed. System-installed font availability varies by device; the declared fallback stacks remain available.

Normal `npm run build:verify` passed on a newly owned disposable DB, run `1bb4813441fcb3a03db1c3d2`, exit 0. `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` was explicitly removed from the coordinator environment. No test CSS substitution, network font fetch, TLS bypass or root-layout mock. Existing 13A font test fixture is retained as historical test infrastructure but unused here.

This correction is committed separately from inspection features. Final feature production build is checked again in the regression ledger. No aesthetic acceptance or identical font metrics on every platform is inferred; the product's existing local serif/sans heritage intent is preserved.
