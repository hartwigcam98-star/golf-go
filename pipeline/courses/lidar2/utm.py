"""NAD83 / UTM (GRS80) forward and inverse, Krüger series (sub-mm accuracy inside a zone)."""
import numpy as np
a = 6378137.0; f = 1 / 298.257222101; k0 = 0.9996
n = f / (2 - f); A = a / (1 + n) * (1 + n**2 / 4 + n**4 / 64)
al = [n / 2 - 2 * n**2 / 3 + 5 * n**3 / 16, 13 * n**2 / 48 - 3 * n**3 / 5, 61 * n**3 / 240]
be = [n / 2 - 2 * n**2 / 3 + 37 * n**3 / 96, n**2 / 48 + n**3 / 15, 17 * n**3 / 480]
de = [2 * n - 2 * n**2 / 3 - 2 * n**3, 7 * n**2 / 3 - 8 * n**3 / 5, 56 * n**3 / 15]
e2 = f * (2 - f); e = np.sqrt(e2)


def zone_of(epsg): return epsg - 26900


def fwd(lon, lat, zone):
    lon = np.radians(np.asarray(lon, float)); lat = np.radians(np.asarray(lat, float))
    l0 = np.radians(zone * 6 - 183)
    t = np.sinh(np.arctanh(np.sin(lat)) - e * np.arctanh(e * np.sin(lat)))
    xi = np.arctan2(t, np.cos(lon - l0)); eta = np.arctanh(np.sin(lon - l0) / np.sqrt(1 + t * t))
    E = eta + sum(al[j] * np.cos(2 * (j + 1) * xi) * np.sinh(2 * (j + 1) * eta) for j in range(3))
    N = xi + sum(al[j] * np.sin(2 * (j + 1) * xi) * np.cosh(2 * (j + 1) * eta) for j in range(3))
    return 500000 + k0 * A * E, k0 * A * N


def inv(x, y, zone):
    xi = np.asarray(y, float) / (k0 * A); eta = (np.asarray(x, float) - 500000) / (k0 * A)
    xp = xi - sum(be[j] * np.sin(2 * (j + 1) * xi) * np.cosh(2 * (j + 1) * eta) for j in range(3))
    ep = eta - sum(be[j] * np.cos(2 * (j + 1) * xi) * np.sinh(2 * (j + 1) * eta) for j in range(3))
    chi = np.arcsin(np.sin(xp) / np.cosh(ep))
    lat = chi + sum(de[j] * np.sin(2 * (j + 1) * chi) for j in range(3))
    lon = np.radians(zone * 6 - 183) + np.arctan2(np.sinh(ep), np.cos(xp))
    return np.degrees(lon), np.degrees(lat)


if __name__ == '__main__':
    x, y = fwd(-92.84272172051355, 44.94340409707623, 15); print(x, y)
    print(inv(x, y, 15))
    print(fwd(-93, 45, 15))  # central meridian: x=500000

