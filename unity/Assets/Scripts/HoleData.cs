using System;
using UnityEngine;

// Troy Burne hole 1, exported from the web game (tools: the headless export in the Unity test notes).
// Game frame: x east, y south, heights up, all in yards. Unity: X = x, Z = -y, Y = height (1 unit = 1 yard).
[Serializable] public class Grid { public float x0, y0, st; public int nx, ny; public float[] data; }
[Serializable] public class LieGrid { public float x0, y0; public int nx, ny; public int[] data; }
[Serializable] public class TexRect { public float x0, y0, w, h; }

[Serializable]
public class HoleData
{
    public string course; public int hole, par, len;
    public float[] pin, tee;
    public Grid hg, gg;
    public LieGrid lg;
    public string[] lieNames;
    public TexRect tex;
    public float[] green;
    public float[] trees;   // x, y, crown radius, ground height, top height, crown base, conifer (7 per tree)

    public static HoleData Load(string name) => JsonUtility.FromJson<HoleData>(CourseStore.Load<TextAsset>(name).text);

    static float Bilinear(Grid g, float x, float y)
    {
        float fx = Mathf.Clamp((x - g.x0) / g.st, 0, g.nx - 1.001f), fy = Mathf.Clamp((y - g.y0) / g.st, 0, g.ny - 1.001f);
        int i = (int)fx, j = (int)fy; float tx = fx - i, ty = fy - j; var d = g.data; int n = g.nx;
        return Mathf.Lerp(Mathf.Lerp(d[j * n + i], d[j * n + i + 1], tx), Mathf.Lerp(d[(j + 1) * n + i], d[(j + 1) * n + i + 1], tx), ty);
    }
    bool InGG(float x, float y) => gg != null && gg.data != null && gg.data.Length > 0 && x > gg.x0 && y > gg.y0 && x < gg.x0 + (gg.nx - 1) * gg.st && y < gg.y0 + (gg.ny - 1) * gg.st;
    // height in yards at game (x, y): the fine green grid where there is one, else the 2-yd hole grid
    public float H(float x, float y) => InGG(x, y) ? Bilinear(gg, x, y) : Bilinear(hg, x, y);
    public Vector2 Grad(float x, float y) => new Vector2(H(x + .5f, y) - H(x - .5f, y), H(x, y + .5f) - H(x, y - .5f));
    public string Lie(float x, float y)
    {
        int i = Mathf.RoundToInt(x - lg.x0), j = Mathf.RoundToInt(y - lg.y0);
        if (i < 0 || j < 0 || i >= lg.nx || j >= lg.ny) return "ob";
        int c = lg.data[j * lg.nx + i]; return c >= 0 && c < lieNames.Length ? lieNames[c] : "ob";
    }
    public static Vector3 U(float x, float y, float h) => new Vector3(x, h, -y);
}
