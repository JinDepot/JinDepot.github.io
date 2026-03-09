# Course Raffle

A semester-long pedagogical experiment that teaches the Central Limit Theorem (CLT) empirically to undergraduate engineering students.

---

## What This Is

Course Raffle introduces students to a live, longitudinal sampling process. Each week, 30 iid samples are drawn from an undisclosed probability distribution. Students observe the sample means evolve over 14 weeks and attempt to estimate the distribution parameters, the process through which they experience CLT convergence empirically.


## Pedagogical Goals

- **CLT universality:** The sample mean distribution converges to normal regardless of the parent distribution's shape, provided it has finite variance.
- **Variance reduction:** Averaging reduces variability by a factor of the sample size. This is visually apparent when comparing individual values to the tight clustering of sample means.
- **Observation before theory:** Encountering the empirical pattern first and the formal theorem second produces deeper understanding than the reverse.
- **Replication as evidence:** Three independent session sequences all producing the same histogram shape demonstrates that CLT describes a systematic property of sampling, not a coincidence.
- **Active inference:** The voluntary estimation task transforms passive observation into active statistical reasoning — students must synthesize data, form hypotheses, and commit to numerical predictions.


## Raffle Structure

- 3 separate sessions with non-overlapping students, all drawing from the same parent distribution
- 4 draws per session per week: 30 iid samples each, with the sample mean announced and recorded
- All results shared on Google Sheets across sessions — cross-session data access is intentional and encouraged


## Technical Notes

- **Draw engine:** Inverse CDF sampler; Raw values stored at full precision; rounding applied only at display time.
- **Auth:** GitHub PAT verification gates all actions to a single authorized user.
