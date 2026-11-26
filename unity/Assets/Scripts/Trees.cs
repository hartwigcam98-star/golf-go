using System.Collections.Generic;
using UnityEngine;

/* The web game's species trees (arm-ik.js R3T), exported by export_trees.js: every tree model Troy Burne draws (each species version
   re-shaped to its measured crown base), in a full and a lighter version, and each hole's trees: which model, where, turned, sized
   and tinted. The web draws the full version within 140 yd of the camera and the lighter one beyond (r3TreeLOD); so does this.
   The models are in the web's 3D world (x east, y up, z south): mirrored into Unity's (z north) as they load. */
public class Trees
{
    const float NEAR = 140;   // R3T_NEAR
    static readonly Dictionary<string, Mesh[]> lib = new Dictionary<string, Mesh[]>();
    static Material[] mats;
    class Tree { public Vector3 p; public GameObject full, lite; public bool isFull; }
    readonly List<Tree> trees = new List<Tree>();
    public readonly Transform root;
    float nextLod; Vector3 lodAt = new Vector3(1e9f, 0, 0);

    static Material[] Mats() => mats ??= new[] { Resources.Load<Material>("Mats/TreeBark"), Resources.Load<Material>("Mats/TreeMass"), Resources.Load<Material>("Mats/TreeLeaf") };
    public static bool Available(string holePath) => Resources.Load<TextAsset>(holePath + "_trees") != null && Mats()[2] != null && Mats()[2].shader != null && Mats()[2].shader.isSupported;

    // one model: 6 parts (full bark, mass, leaf; lite bark, mass, leaf), as Unity meshes (null where a part is empty)
    static Mesh[] Model(string key)
    {
        if (lib.TryGetValue(key, out var m)) return m;
        var ta = Resources.Load<TextAsset>("trees/" + key.Replace('|', '_').Replace('#', '-'));
        m = new Mesh[6];
        if (ta != null)
        {
            var b = ta.bytes; int o = 0;
            for (int part = 0; part < 6; part++)
            {
                int n = System.BitConverter.ToInt32(b, o); o += 4; if (n == 0) continue;
                var v = new Vector3[n]; var nr = new Vector3[n]; var c = new Color32[n]; var uv = new Vector2[n]; var t = new int[n];
                for (int k = 0; k < n; k++, o += 28)
                {
                    v[k] = new Vector3(System.BitConverter.ToSingle(b, o), System.BitConverter.ToSingle(b, o + 4), -System.BitConverter.ToSingle(b, o + 8));
                    nr[k] = new Vector3((sbyte)b[o + 12] / 127f, (sbyte)b[o + 13] / 127f, -(sbyte)b[o + 14] / 127f);
                    c[k] = new Color32(b[o + 16], b[o + 17], b[o + 18], 255);
                    uv[k] = new Vector2(System.BitConverter.ToSingle(b, o + 20), System.BitConverter.ToSingle(b, o + 24));
                }
                // non-indexed triangles; mirroring z turns them over, so each is rewound
                for (int k = 0; k + 2 < n; k += 3) { t[k] = k; t[k + 1] = k + 2; t[k + 2] = k + 1; }
                var me = new Mesh { name = key + "/" + part, indexFormat = n > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
                me.vertices = v; me.normals = nr; me.colors32 = c; me.uv = uv; me.triangles = t;
                if (part % 3 == 0) me.RecalculateTangents();   // (the bark's normal map)
                me.RecalculateBounds(); me.UploadMeshData(true); m[part] = me;
            }
        }
        lib[key] = m; return m;
    }

    public Trees(string holePath, Transform parent)
    {
        root = new GameObject("Species trees").transform; root.SetParent(parent, false);
        var ta = Resources.Load<TextAsset>(holePath + "_trees"); if (ta == null) return;
        var b = ta.bytes; int o = 0, groups = System.BitConverter.ToInt32(b, o); o += 4; var M = Mats(); var mpb = new MaterialPropertyBlock();
        for (int gi = 0; gi < groups; gi++)
        {
            int kl = System.BitConverter.ToInt32(b, o); o += 4; string key = System.Text.Encoding.ASCII.GetString(b, o, kl); o += kl;
            int n = System.BitConverter.ToInt32(b, o); o += 4; var model = Model(key);
            for (int i = 0; i < n; i++, o += 36)
            {
                float F(int j) => System.BitConverter.ToSingle(b, o + j * 4);
                // the web's instance matrix: position, a turn about up, sideways and upward scale; mirrored (z, and the turn's sign)
                var pos = new Vector3(F(0), F(1), -F(2)); var rot = Quaternion.Euler(0, -F(3) * Mathf.Rad2Deg, 0); var sc = new Vector3(F(4), F(5), F(4));
                mpb.SetColor("_Tint", new Color(F(6), F(7), F(8), 1));
                var tr = new Tree { p = pos };
                tr.full = Part(model, 0, pos, rot, sc, M, mpb); tr.lite = Part(model, 3, pos, rot, sc, M, mpb); tr.lite.SetActive(false); tr.isFull = true;
                trees.Add(tr);
            }
        }
        Lod(Vector3.zero, true);
    }
    // the trees leave the live shadow map where the hole's light is baked (the bake has their shadows: the web's r3Shadow)
    public static bool Cast = true;
    GameObject Part(Mesh[] model, int at, Vector3 pos, Quaternion rot, Vector3 sc, Material[] M, MaterialPropertyBlock mpb)
    {
        var go = new GameObject(at == 0 ? "Tree" : "Tree lite"); go.transform.SetParent(root, false); go.transform.SetPositionAndRotation(pos, rot); go.transform.localScale = sc;
        for (int k = 0; k < 3; k++)
        {
            var me = model[at + k]; if (me == null) continue;
            var c = new GameObject(k == 0 ? "Bark" : k == 1 ? "Mass" : "Leaves"); c.transform.SetParent(go.transform, false);
            c.AddComponent<MeshFilter>().sharedMesh = me; var r = c.AddComponent<MeshRenderer>(); r.sharedMaterial = M[k]; r.SetPropertyBlock(mpb);
            r.shadowCastingMode = Cast ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off; r.receiveShadows = true;
        }
        return go;
    }
    // r3TreeLOD: the full version within 140 yd, the lighter beyond; looked at again once the camera has moved a fair way
    public void Lod(Vector3 cam, bool force = false)
    {
        if (!force && (Time.time < nextLod || (cam - lodAt).sqrMagnitude < 22 * 22)) return;
        nextLod = Time.time + .25f; lodAt = cam;
        foreach (var t in trees)
        {
            float dx = t.p.x - cam.x, dz = t.p.z - cam.z; bool f = dx * dx + dz * dz < NEAR * NEAR;
            if (f == t.isFull) continue; t.isFull = f; t.full.SetActive(f); t.lite.SetActive(!f);
        }
    }
}
