import math
from typing import Tuple

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers.
    """
    R = 6371.0 # Earth radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance

def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the initial bearing from point 1 to point 2.
    Returns bearing in degrees (0-360).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)

    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    
    initial_bearing = math.atan2(y, x)
    initial_bearing = math.degrees(initial_bearing)
    return (initial_bearing + 360) % 360

def cross_track_distance(start_lat: float, start_lon: float, end_lat: float, end_lon: float, curr_lat: float, curr_lon: float) -> float:
    """
    Calculate the cross-track distance (deviation) of a current point 
    from a great-circle path defined by a start point and an end point.
    Returns distance in kilometers.
    """
    R = 6371.0
    
    # Distance from start to current (angular distance)
    d13 = haversine(start_lat, start_lon, curr_lat, curr_lon) / R
    
    # Bearing from start to current
    theta13 = math.radians(bearing(start_lat, start_lon, curr_lat, curr_lon))
    
    # Bearing from start to end (the planned path)
    theta12 = math.radians(bearing(start_lat, start_lon, end_lat, end_lon))
    
    # Cross-track angular distance
    dxt = math.asin(math.sin(d13) * math.sin(theta13 - theta12))
    
    # Convert angular distance back to kilometers
    return abs(dxt * R)
