# LU Decomposition Calculator

A modern, step-by-step matrix decomposition calculator supporting multiple methods.

**Live:** [nc.arose-niazi.me](https://nc.arose-niazi.me)

## Features

- **Multiple Methods:** Doolittle, Crout, Cholesky, PLU (partial pivoting)
- **Dynamic Matrix Size:** 2×2 up to 6×6
- **Step-by-Step Solutions:** Detailed breakdown of every calculation
- **Linear Equation Solver:** Solve Ax = b with forward/backward substitution
- **Matrix Inverse** and **Determinant** calculation
- **Condition Number** analysis
- **Compare Mode:** Run multiple methods side by side
- **Dark Mode** with persistent theme
- **Import/Export:** Paste matrices, export as LaTeX
- **Shareable Links:** Encode problems in URL parameters
- **Calculation History** saved in localStorage
- **Mobile Responsive** design
- **SEO Optimized** with structured data

## Tech Stack

Vanilla HTML/CSS/JS + [math.js](https://mathjs.org/) (CDN)

## Development

Just open `index.html` in a browser. No build tools needed.

## Deployment

Dockerized with nginx. Auto-deploys on push via webhook.

```bash
docker compose up -d --build
```

## Author

[Arose Niazi](https://arose-niazi.me)
