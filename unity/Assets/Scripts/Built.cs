using UnityEngine;

/* Everything the web game builds round a hole into its one vertex-coloured mesh (3d-meshes.js, built-things.js: the clubhouse,
   houses and other structures, bridges, course props, the fescue wisps), exported by export_built.js and drawn with the web's
   material for it (R3.mat.tree: GolfGo/Tree, the crown-mass kind, colours already linear). Mirrored into Unity's z as it loads. */
public static class Built
{
    public static GameObject Build(string holePath, Transform parent, System.Collections.Generic.List<Object> assets)
    {
        var ta = CourseStore.Load<TextAsset>(holePath + "_built"); var mat = Resources.Load<Material>("Mats/Built");
        if (ta == null || mat == null || mat.shader == null || !mat.shader.isSupported) return null;
        var b = ta.bytes; int n = System.BitConverter.ToInt32(b, 0); if (n < 3) return null;
        float F(int o) => System.BitConverter.ToSingle(b, o);
        Vector3 mn = new Vector3(F(4), F(8), F(12)), stp = new Vector3(F(16), F(20), F(24));
        var root = new GameObject("Built"); root.transform.SetParent(parent, false);
        // into 64-yd squares by each triangle's middle, so what's behind the camera or outside the shadow cascades isn't drawn
        // (the export runs in the web's build order; Ross Bridge's hotel and the houses round it are 470,000 vertices a hole)
        const float CELL = 64; const int CH = 60000;   // (triangles stay whole: a multiple of 3)
        var P = new Vector3[n]; var N = new Vector3[n]; var C = new Color32[n];
        for (int k = 0; k < n; k++)
        {
            int o = 28 + k * 12;
            P[k] = new Vector3(mn.x + System.BitConverter.ToUInt16(b, o) * stp.x, mn.y + System.BitConverter.ToUInt16(b, o + 2) * stp.y, -(mn.z + System.BitConverter.ToUInt16(b, o + 4) * stp.z));
            N[k] = new Vector3((sbyte)b[o + 6] / 127f, (sbyte)b[o + 7] / 127f, -(sbyte)b[o + 8] / 127f);
            C[k] = new Color32(b[o + 9], b[o + 10], b[o + 11], 255);
        }
        var cells = new System.Collections.Generic.Dictionary<long, System.Collections.Generic.List<int>>();
        for (int k = 0; k + 2 < n; k += 3)
        {
            var m3 = (P[k] + P[k + 1] + P[k + 2]) / 3; long key = ((long)Mathf.FloorToInt(m3.x / CELL) << 32) ^ (uint)Mathf.FloorToInt(m3.z / CELL);
            if (!cells.TryGetValue(key, out var l)) cells[key] = l = new System.Collections.Generic.List<int>(); l.Add(k);
        }
        foreach (var l in cells.Values)
            for (int s0 = 0; s0 < l.Count; s0 += CH / 3)
            {
                int tc = Mathf.Min(CH / 3, l.Count - s0), m = tc * 3; var v = new Vector3[m]; var nr = new Vector3[m]; var c = new Color32[m]; var t = new int[m];
                for (int q = 0; q < tc; q++)
                {
                    int k = l[s0 + q];
                    for (int e = 0; e < 3; e++) { v[q * 3 + e] = P[k + e]; nr[q * 3 + e] = N[k + e]; c[q * 3 + e] = C[k + e]; }
                    t[q * 3] = q * 3; t[q * 3 + 1] = q * 3 + 2; t[q * 3 + 2] = q * 3 + 1;   // (mirrored: rewound)
                }
                var me = new Mesh { name = "Built" }; me.vertices = v; me.normals = nr; me.colors32 = c; me.triangles = t; me.RecalculateBounds(); assets.Add(me);
                var go = new GameObject("Built part"); go.transform.SetParent(root.transform, false);
                go.AddComponent<MeshFilter>().sharedMesh = me; var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On; r.receiveShadows = true;
            }
        return root;
    }
}
