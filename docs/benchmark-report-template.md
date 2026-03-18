# Benchmark Report: [Test Name]

**Date**: YYYY-MM-DD
**Version**: Nexus-5v5 v0.x.x
**Environment**: [local / staging / production]
**Tester**: [name]

---

## Test Scenario

| Parameter | Value |
|-----------|-------|
| Test file | `backend/tests/load/locustfile_*.py` |
| Target endpoint(s) | `[endpoint path(s)]` |
| Concurrent users | [N] |
| Spawn rate | [N/sec] |
| Duration | [minutes] |
| Host | [URL] |

## Methodology

1. **Setup**: Describe pre-test state (seeded data, DB size, cache state).
2. **Execution**: Locust command used:
   ```bash
   locust -f [file] --host=[host] --users=[N] --spawn-rate=[N] --run-time=[duration]
   ```
3. **Monitoring**: Prometheus metrics, Grafana dashboards, system resource usage.
4. **Teardown**: Any cleanup steps performed.

## Results

### Latency Distribution

| Percentile | Response Time (ms) |
|-----------|-------------------|
| p50 | |
| p75 | |
| p90 | |
| p95 | |
| p99 | |
| Max | |

### Throughput

| Metric | Value |
|--------|-------|
| Total requests | |
| Requests/sec (avg) | |
| Requests/sec (peak) | |
| Failed requests | |
| Error rate (%) | |

### Error Breakdown

| Status Code | Count | Description |
|-------------|-------|-------------|
| 200 | | Success |
| 4xx | | Client errors |
| 5xx | | Server errors |
| Timeout | | Connection timeouts |

### Resource Utilization

| Resource | Avg | Peak |
|----------|-----|------|
| CPU (backend) | | |
| Memory (backend) | | |
| CPU (database) | | |
| Redis memory | | |
| ClickHouse query time (p95) | | |
| Open connections | | |

## Performance Against Targets

| Target | Result | Status |
|--------|--------|--------|
| p99 < 200ms (draft scoring) | | PASS / FAIL |
| Error rate < 1% | | PASS / FAIL |
| Zero 5xx under load | | PASS / FAIL |
| Sustained throughput | | PASS / FAIL |

## Bottlenecks Identified

1. **[Bottleneck]**: Description, observed impact, evidence from metrics.

## Recommendations

1. **[Recommendation]**: Proposed fix, expected improvement, priority.

## Comparison with Previous Run

| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
| p50 | | | |
| p99 | | | |
| Throughput | | | |
| Error rate | | | |

## Appendix

- Locust HTML report: `[path]`
- Grafana snapshot: `[link]`
- Raw CSV data: `[path]`
