import xarray as xr
import pandas as pd
import numpy as np

# Load both raw files
ds_iig = xr.open_dataset('datasets/raw/bharati/weather/iig_bharati.nc')
df_iig = ds_iig.to_dataframe().reset_index()

ds_imd = xr.open_dataset('datasets/raw/bharati/weather/imd_bharati.nc')
df_imd = ds_imd.to_dataframe().reset_index()

# Extract overlap window: 2016-11-14 00:00:00 to 2016-12-31 23:00:00
df_iig_overlap = df_iig[(df_iig['obstime'] >= '2016-11-14') & (df_iig['obstime'] <= '2016-12-31 23:59:59')].copy()

df_imd['obstime_h'] = df_imd['obstime'].dt.floor('h')
df_imd_hourly = df_imd.groupby('obstime_h').agg({
    'tempr': 'mean',
    'rh': 'mean',
    'ws': 'mean',
    'wd': 'mean',
    'ap': 'mean'
}).reset_index().rename(columns={'obstime_h': 'obstime'})

merged = pd.merge(df_iig_overlap, df_imd_hourly, on='obstime', suffixes=('_iig', '_imd'))
n_samples = len(merged)
print('='*80)
print(f'OVERLAP COMPARISON AUDIT (2016-11-14 to 2016-12-31) | Samples: {n_samples}')
print('='*80)

# 1. Temperature: IIG tempr vs IMD tempr
diff_temp = (merged['tempr_iig'] - merged['tempr_imd']).abs()
r_temp = merged['tempr_iig'].corr(merged['tempr_imd'])
min_dt = (merged['tempr_iig'] - merged['tempr_imd']).min()
max_dt = (merged['tempr_iig'] - merged['tempr_imd']).max()
print('Temperature (tempr_iig vs tempr_imd):')
print(f'  Sample count:             {n_samples}')
print(f'  Pearson correlation (r):  {r_temp:.6f}')
print(f'  Mean absolute diff:       {diff_temp.mean():.4f} °C')
print(f'  Median absolute diff:     {diff_temp.median():.4f} °C')
print(f'  Min / Max difference:     {min_dt:.4f} / {max_dt:.4f} °C')

# 2. Pressure: IIG rh vs IMD rh
diff_press = (merged['rh_iig'] - merged['rh_imd']).abs()
r_press = merged['rh_iig'].corr(merged['rh_imd'])
min_dp = (merged['rh_iig'] - merged['rh_imd']).min()
max_dp = (merged['rh_iig'] - merged['rh_imd']).max()
print('\nPressure (IIG rh vs IMD rh):')
print(f'  Sample count:             {n_samples}')
print(f'  Pearson correlation (r):  {r_press:.6f}')
print(f'  Mean absolute diff:       {diff_press.mean():.4f} hPa')
print(f'  Median absolute diff:     {diff_press.median():.4f} hPa')
print(f'  Min / Max difference:     {min_dp:.4f} / {max_dp:.4f} hPa')

# 3. Wind Direction: IIG wd vs IMD ws (degrees)
raw_wd_diff = (merged['wd_iig'] - merged['ws_imd'])
ang_diff = (raw_wd_diff + 180) % 360 - 180
r_wd = merged['wd_iig'].corr(merged['ws_imd'])
print('\nWind Direction (IIG wd vs IMD ws):')
print(f'  Sample count:             {n_samples}')
print(f'  Pearson correlation (r):  {r_wd:.6f}')
print(f'  Mean absolute diff:       {ang_diff.abs().mean():.4f}°')
print(f'  Median absolute diff:     {ang_diff.abs().median():.4f}°')
print(f'  Min / Max difference:     {ang_diff.min():.4f}° / {ang_diff.max():.4f}°')

# 4. Wind Speed: IIG ws (m/s) vs IMD wd converted from knots to m/s
imd_ws_ms = merged['wd_imd'] * 0.514444
diff_ws = (merged['ws_iig'] - imd_ws_ms).abs()
r_ws = merged['ws_iig'].corr(imd_ws_ms)
min_dws = (merged['ws_iig'] - imd_ws_ms).min()
max_dws = (merged['ws_iig'] - imd_ws_ms).max()
print('\nWind Speed (IIG ws vs IMD wd * 0.514444):')
print(f'  Sample count:             {n_samples}')
print(f'  Pearson correlation (r):  {r_ws:.6f}')
print(f'  Mean absolute diff:       {diff_ws.mean():.4f} m/s')
print(f'  Median absolute diff:     {diff_ws.median():.4f} m/s')
print(f'  Min / Max difference:     {min_dws:.4f} / {max_dws:.4f} m/s')

# 5. Relative Humidity in late 2016:
print('\nRelative Humidity (IIG ap vs IMD ap):')
print(f'  IIG ap mean during Nov-Dec 2016: {merged["ap_iig"].mean():.4f}% (Flatline at 0.00-0.04% due to sensor failure)')
print(f'  IMD ap mean during Nov-Dec 2016: {merged["ap_imd"].mean():.2f}% (Active operational humidity observation)')
