from app.navigation.router import calculate_route_alternatives

def test_route_calculation_start_dest_change():
    # Cape Town to Maitri
    res_maitri = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-70.77, dest_lon=11.73,
        vessel_speed_kn=14.0, objective="SAFEST"
    )
    assert len(res_maitri["routes"]) == 3
    dist_maitri = res_maitri["routes"][0]["distanceNm"]
    
    # Cape Town to Bharati Station (-69.41, 76.19)
    res_bharati = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-69.41, dest_lon=76.19,
        vessel_speed_kn=14.0, objective="SAFEST"
    )
    dist_bharati = res_bharati["routes"][0]["distanceNm"]
    
    # Changing destination must produce different geographic distance
    assert dist_bharati > dist_maitri
    assert dist_bharati != dist_maitri

def test_objective_changes_recommendation():
    # Safest objective
    res_safest = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-70.77, dest_lon=11.73,
        vessel_speed_kn=14.0, objective="SAFEST"
    )
    assert res_safest["recommended_route_id"] == "route-b"
    
    # Shortest objective
    res_shortest = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-70.77, dest_lon=11.73,
        vessel_speed_kn=14.0, objective="SHORTEST"
    )
    assert res_shortest["recommended_route_id"] == "route-a"

def test_speed_changes_eta():
    res_slow = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-70.77, dest_lon=11.73,
        vessel_speed_kn=10.0
    )
    res_fast = calculate_route_alternatives(
        start_lat=-33.92, start_lon=18.42,
        dest_lat=-70.77, dest_lon=11.73,
        vessel_speed_kn=16.0
    )
    
    eta_slow = res_slow["routes"][0]["etaHours"]
    eta_fast = res_fast["routes"][0]["etaHours"]
    assert eta_slow > eta_fast
