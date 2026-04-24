# Headless Parity Report

Generated: 2026-04-23T22:25:22.092Z
Source: http://127.0.0.1:5173
Target: http://127.0.0.1:8082

| Route | Source | Target | iPhone12 | Pixel5 | Overall |
|---|---|---|---|---|---|
| login | `/auth/login` | `/login` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |
| schedule | `/app/schedule` | `/schedule` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |
| customers | `/app/customers` | `/customers` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |
| conversations | `/app/conversations` | `/conversations` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |
| settings | `/app/settings` | `/settings` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |
| notifications | `/app/notifications` | `/notifications` | FAIL (11.335%) | FAIL (10.047%) | **FAIL** |

## Notes
- PASS requires flow parity and <=0.3% pixel diff per viewport.
- PARTIAL allows <=1.5% pixel diff while flow parity is valid.
- FAIL means flow mismatch, runtime error, or high visual diff.