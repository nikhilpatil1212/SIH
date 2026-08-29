# Project Data Directory

This directory hosts the project dataset references and environmental data files.

## Structure

```
data/
├── iceberg/          # Documented reference to the 47-year Antarctic iceberg dataset
└── environmental/    # Storage location for verified environmental datasets (ERA5, OSCAR/HYCOM, NSIDC, GEBCO)
```

## Existing Iceberg Dataset Location
The primary 47-year historical Antarctic iceberg trajectory dataset is located at:
`47years-iceberg-dataset/updated7_consol/`

* **Total Files:** 647 iceberg CSV files + `README_consolidated.TXT`
* **Total Records:** 516,691 daily records
* **Date Span:** 1976-02-01 to 2026-04-30 (~50.2 years)
* **Geographic Extent:** -79.1°S to -42.57°S Latitude, -180.0° to +180.0° Longitude

*Note: The existing iceberg dataset remains in its original location to prevent breaking workspace path references.*
