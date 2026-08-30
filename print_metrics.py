from backend.app.ml.regional_sea_ice_ml_model import regional_sea_ice_ml

metrics = regional_sea_ice_ml.train_and_evaluate()
print("=== REGIONAL ML MODEL PERFORMANCE VS PERSISTENCE BASELINE ===")
for reg in ["Weddell Sea", "Ross Sea", "Amundsen Sea", "Bellingshausen Sea", "Scotia Sea", "Lazarev Sea"]:
    print(f"\nRegion: {reg}")
    for h in ["1d", "3d", "7d", "14d", "30d"]:
        m = metrics[reg][h]
        ml_mae = m["mae"]
        ml_rmse = m["rmse"]
        b_mae = m["baseline_mae"]
        b_rmse = m["baseline_rmse"]
        beats = "YES" if m["ml_beats_baseline"] else "NO"
        print(f"  Horizon +{h:3s} | ML MAE: {ml_mae:5.2f}% (RMSE: {ml_rmse:5.2f}%) | Baseline MAE: {b_mae:5.2f}% | ML Beats Baseline: {beats}")
