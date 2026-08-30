import urllib.request
import re
import os
import xarray as xr

def test_nsidc_download():
    # Test directory in NSIDC G02202 HTTPS archive
    year = "2023"
    base_url = f"https://noaadata.apps.nsidc.org/NOAA/G02202_V4/south/daily/{year}/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    print(f"Connecting to NSIDC archive: {base_url}")
    req = urllib.request.Request(base_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8")
            
        # Pattern for seaice_conc_daily_sh_*.nc
        files = re.findall(r'href="([^"]*seaice_conc_daily_sh_[^"]*\.nc)"', html)
        if not files:
            files = re.findall(r'href=\'([^\']*seaice_conc_daily_sh_[^\']*\.nc)\'', html)
            
        print(f"Found {len(files)} daily NetCDF files in NSIDC archive.")
        if files:
            sample_filename = files[-1]
            if "/" in sample_filename:
                sample_filename = sample_filename.split("/")[-1]
            download_url = f"{base_url}{sample_filename}"
            print(f"Downloading real NetCDF file: {download_url}")
            
            f_req = urllib.request.Request(download_url, headers=headers)
            with urllib.request.urlopen(f_req, timeout=30) as f_resp:
                nc_bytes = f_resp.read()
                
            os.makedirs("data/spatial_sic", exist_ok=True)
            local_path = os.path.join("data", "spatial_sic", sample_filename)
            with open(local_path, "wb") as f:
                f.write(nc_bytes)
                
            print(f"Successfully saved {len(nc_bytes)} bytes to {local_path}")
            
            # Inspect with xarray
            ds = xr.open_dataset(local_path)
            print("=== REAL NSIDC NETCDF METADATA ===")
            print("Variables:", list(ds.data_vars.keys()))
            print("Dimensions:", dict(ds.sizes))
            print("Coordinates:", list(ds.coords.keys()))
            for attr in ["title", "summary", "id", "institution", "spatial_resolution", "time_coverage_start", "time_coverage_end"]:
                if attr in ds.attrs:
                    print(f"Attr {attr}: {ds.attrs[attr]}")
                    
            # Check SIC variable
            sic_var_name = "cdr_seaice_conc" if "cdr_seaice_conc" in ds else list(ds.data_vars.keys())[0]
            sic_da = ds[sic_var_name]
            print(f"SIC Variable '{sic_var_name}' shape: {sic_da.shape}, units: {sic_da.attrs.get('units', 'unknown')}, valid_range: {sic_da.attrs.get('valid_range', 'unknown')}")
            
            # Extract sample stats
            val = sic_da.values
            # Filter valid (0.0 to 1.0)
            valid_mask = (val >= 0.0) & (val <= 1.0)
            print(f"Valid ocean cells: {valid_mask.sum()} / {val.size}")
            if valid_mask.sum() > 0:
                print(f"Mean SIC in raw data: {float(val[valid_mask].mean()) * 100:.2f}%")
                print(f"Min SIC: {float(val[valid_mask].min()) * 100:.2f}%")
                print(f"Max SIC: {float(val[valid_mask].max()) * 100:.2f}%")
                
            ds.close()
            return local_path
            
    except Exception as e:
        print(f"NSIDC download test failed: {e}")
        return None

if __name__ == "__main__":
    test_nsidc_download()
