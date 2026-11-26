using System.Collections.Generic;
using UnityEngine;

/* Unity's primitive shapes built here, the same sizes as CreatePrimitive's (sphere and cube 1 across, cylinder and capsule 1 across
   and 2 tall), because CreatePrimitive adds a collider and the build leaves the physics module out ("Can't add component because
   class 'CapsuleCollider' doesn't exist"). */
public static class Prims
{
    static readonly Dictionary<PrimitiveType, Mesh> cache = new Dictionary<PrimitiveType, Mesh>();
    public static Mesh Get(PrimitiveType t)
    {
        if (cache.TryGetValue(t, out var m) && m) return m;
        m = t == PrimitiveType.Sphere ? Lathe("Sphere", 24, 12, a => (Mathf.Sin(a) * .5f, -Mathf.Cos(a) * .5f), true)
          : t == PrimitiveType.Capsule ? Capsule()
          : t == PrimitiveType.Cylinder ? Cylinder()
          : t == PrimitiveType.Quad ? Quad()
          : Cube();
        cache[t] = m; return m;
    }
    // a surface of revolution round y: f(a) = (radius, height) for a from 0 (bottom) to pi (top)
    static Mesh Lathe(string name, int seg, int rings, System.Func<float, (float r, float y)> f, bool smooth)
    {
        var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
        for (int j = 0; j <= rings; j++)
        {
            float a = Mathf.PI * j / rings; var (r, y) = f(a);
            for (int i = 0; i <= seg; i++)
            {
                float b = 2 * Mathf.PI * i / seg; var p = new Vector3(Mathf.Cos(b) * r, y, Mathf.Sin(b) * r);
                v.Add(p); n.Add(new Vector3(Mathf.Cos(b) * Mathf.Sin(a), -Mathf.Cos(a), Mathf.Sin(b) * Mathf.Sin(a))); uv.Add(new Vector2((float)i / seg, (float)j / rings));
            }
        }
        for (int j = 0; j < rings; j++) for (int i = 0; i < seg; i++)
        { int a = j * (seg + 1) + i, b = a + seg + 1; t.AddRange(new[] { a, b, a + 1, a + 1, b, b + 1 }); }
        var m = new Mesh { name = name }; m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(t, 0); m.RecalculateBounds(); return m;
    }
    static Mesh Capsule()
    {   // two half spheres of radius .5 joined by a 1-tall tube: 2 tall in all
        const int seg = 24, half = 6; var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
        int rings = 0;
        for (int h = 0; h < 2; h++)
            for (int j = 0; j <= half; j++)
            {
                float a = (h == 0 ? 0 : Mathf.PI / 2) + Mathf.PI / 2 * j / half; float r = Mathf.Sin(a) * .5f, y = -Mathf.Cos(a) * .5f + (h == 0 ? -.5f : .5f);
                for (int i = 0; i <= seg; i++)
                {
                    float b = 2 * Mathf.PI * i / seg; v.Add(new Vector3(Mathf.Cos(b) * r, y, Mathf.Sin(b) * r));
                    n.Add(new Vector3(Mathf.Cos(b) * Mathf.Sin(a), -Mathf.Cos(a), Mathf.Sin(b) * Mathf.Sin(a))); uv.Add(new Vector2((float)i / seg, (y + 1) / 2));
                }
                rings++;
            }
        for (int j = 0; j < rings - 1; j++) for (int i = 0; i < seg; i++)
        { int a = j * (seg + 1) + i, b = a + seg + 1; t.AddRange(new[] { a, b, a + 1, a + 1, b, b + 1 }); }
        var m = new Mesh { name = "Capsule" }; m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(t, 0); m.RecalculateBounds(); return m;
    }
    static Mesh Cylinder()
    {   // radius .5, from y -1 to 1, with caps
        const int seg = 24; var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
        for (int i = 0; i <= seg; i++)
        {
            float b = 2 * Mathf.PI * i / seg; var d = new Vector3(Mathf.Cos(b), 0, Mathf.Sin(b));
            v.Add(d * .5f + Vector3.down); v.Add(d * .5f + Vector3.up); n.Add(d); n.Add(d); uv.Add(new Vector2((float)i / seg, 0)); uv.Add(new Vector2((float)i / seg, 1));
        }
        for (int i = 0; i < seg; i++) { int a = i * 2; t.AddRange(new[] { a, a + 1, a + 2, a + 2, a + 1, a + 3 }); }
        for (int c = 0; c < 2; c++)
        {
            float y = c == 0 ? -1 : 1; var up = c == 0 ? Vector3.down : Vector3.up; int o = v.Count; v.Add(new Vector3(0, y, 0)); n.Add(up); uv.Add(new Vector2(.5f, .5f));
            for (int i = 0; i <= seg; i++) { float b = 2 * Mathf.PI * i / seg; v.Add(new Vector3(Mathf.Cos(b) * .5f, y, Mathf.Sin(b) * .5f)); n.Add(up); uv.Add(new Vector2(.5f + Mathf.Cos(b) * .5f, .5f + Mathf.Sin(b) * .5f)); }
            for (int i = 0; i < seg; i++) if (c == 0) t.AddRange(new[] { o, o + 1 + i, o + 2 + i }); else t.AddRange(new[] { o, o + 2 + i, o + 1 + i });
        }
        var m = new Mesh { name = "Cylinder" }; m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(t, 0); m.RecalculateBounds(); return m;
    }
    static Mesh Cube()
    {
        var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var t = new List<int>();
        foreach (var f in new[] { Vector3.right, Vector3.left, Vector3.up, Vector3.down, Vector3.forward, Vector3.back })
        {
            var a = Vector3.Cross(f, Mathf.Abs(f.y) > .5f ? Vector3.forward : Vector3.up); var b = Vector3.Cross(f, a); int o = v.Count;
            foreach (var (x, y) in new[] { (-1, -1), (1, -1), (1, 1), (-1, 1) }) { v.Add((f + a * x + b * y) * .5f); n.Add(f); uv.Add(new Vector2((x + 1) / 2, (y + 1) / 2)); }
            t.AddRange(new[] { o, o + 2, o + 1, o, o + 3, o + 2 });
        }
        var m = new Mesh { name = "Cube" }; m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(t, 0); m.RecalculateBounds();
        // (each face's winding: front faces outward, checked by its normal)
        var tri = m.triangles; for (int i = 0; i < tri.Length; i += 3)
        { var p0 = v[tri[i]]; var nn = Vector3.Cross(v[tri[i + 1]] - p0, v[tri[i + 2]] - p0); if (Vector3.Dot(nn, n[tri[i]]) < 0) { (tri[i + 1], tri[i + 2]) = (tri[i + 2], tri[i + 1]); } }
        m.triangles = tri; return m;
    }
    static Mesh Quad()
    {
        var m = new Mesh { name = "Quad" };
        m.vertices = new[] { new Vector3(-.5f, -.5f, 0), new Vector3(.5f, -.5f, 0), new Vector3(.5f, .5f, 0), new Vector3(-.5f, .5f, 0) };
        m.normals = new[] { Vector3.back, Vector3.back, Vector3.back, Vector3.back }; m.uv = new[] { new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1) };
        m.triangles = new[] { 0, 2, 1, 0, 3, 2 }; return m;
    }
}
