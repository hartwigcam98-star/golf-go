using UnityEngine;

/* Everything the web game builds round a hole into its one vertex-coloured mesh (3d-meshes.js, built-things.js: the clubhouse,
   houses and other structures, bridges, course props, the fescue wisps), exported by export_built.js and drawn with the web's
   material for it (R3.mat.tree: GolfGo/Tree, the crown-mass kind, colours already linear). Mirrored into Unity's z as it loads. */
public static class Built
{
    public static GameObject Build(string holePath, Transform parent, System.Collections.Generic.List<Object> assets)
    {
        var ta = Resources.Load<TextAsset>(holePath + "_built"); var mat = Resources.Load<Material>("Mats/Built");
        if (ta == null || mat == null || mat.shader == null || !mat.shader.isSupported) return null;
        var b = ta.bytes; int n = System.BitConverter.ToInt32(b, 0); if (n < 3) return null;
        float F(int o) => System.BitConverter.ToSingle(b, o);
        Vector3 mn = new Vector3(F(4), F(8), F(12)), stp = new Vector3(F(16), F(20), F(24));
        var root = new GameObject("Built"); root.transform.SetParent(parent, false);
        const int CH = 60000;   // (triangles stay whole: a multiple of 3)
        for (int s0 = 0; s0 < n; s0 += CH)
        {
            int m = Mathf.Min(CH, n - s0); var v = new Vector3[m]; var nr = new Vector3[m]; var c = new Color32[m]; var t = new int[m];
            for (int k = 0; k < m; k++)
            {
                int o = 28 + (s0 + k) * 12;
                v[k] = new Vector3(mn.x + System.BitConverter.ToUInt16(b, o) * stp.x, mn.y + System.BitConverter.ToUInt16(b, o + 2) * stp.y, -(mn.z + System.BitConverter.ToUInt16(b, o + 4) * stp.z));
                nr[k] = new Vector3((sbyte)b[o + 6] / 127f, (sbyte)b[o + 7] / 127f, -(sbyte)b[o + 8] / 127f);
                c[k] = new Color32(b[o + 9], b[o + 10], b[o + 11], 255);
            }
            for (int k = 0; k + 2 < m; k += 3) { t[k] = k; t[k + 1] = k + 2; t[k + 2] = k + 1; }   // (mirrored: rewound)
            var me = new Mesh { name = "Built " + s0 }; me.vertices = v; me.normals = nr; me.colors32 = c; me.triangles = t; me.RecalculateBounds(); assets.Add(me);
            var go = new GameObject("Built part"); go.transform.SetParent(root.transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = me; var r = go.AddComponent<MeshRenderer>(); r.sharedMaterial = mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On; r.receiveShadows = true;
        }
        return root;
    }
}
