/* Loading a hole exported by next/tools/export-hole.mjs: metadata (.json), one binary of 4-byte-aligned chunks (.bin), and the
   surroundings texture. Heights are yards in the hole frame (tee at 0,0; x east, y south). */
export async function loadHole(course, hole) {
  const base = `./data/${course}/h${hole}`;
  const [meta, bin] = await Promise.all([
    fetch(base + '.json').then(r => { if (!r.ok) throw new Error(`no data for ${course} hole ${hole}`); return r.json(); }),
    fetch(base + '.bin').then(r => { if (!r.ok) throw new Error('missing ' + base + '.bin'); return r.arrayBuffer(); })]);
  const T = { f32: Float32Array, u8: Uint8Array, u32: Uint32Array };
  const chunk = k => { const c = meta.bin[k], A = T[c.type]; return new A(bin, c.offset, c.length / A.BYTES_PER_ELEMENT); };
  return { meta, chunk, hg: chunk('hg'), gg: chunk('gg'), lg: chunk('lg'), dir: `./data/${course}/` };
}

// bilinear height: the 0.5-yd grid round the green where it reaches, else the 2-yd grid (as the game's hFineH / hAtH)
export function heightFn(D) {
  const bil = (g, a, x, y) => { const fx = (x - g.x0) / g.st, fy = (y - g.y0) / g.st;
    if (fx < 0 || fy < 0 || fx > g.nx - 1 || fy > g.ny - 1) return null;
    const i = Math.min(g.nx - 2, fx | 0), j = Math.min(g.ny - 2, fy | 0), tx = fx - i, ty = fy - j, n = g.nx;
    return (a[j * n + i] * (1 - tx) + a[j * n + i + 1] * tx) * (1 - ty) + (a[(j + 1) * n + i] * (1 - tx) + a[(j + 1) * n + i + 1] * tx) * ty; };
  const { hg, gg } = D.meta, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  return (x, y) => bil(gg, D.gg, x, y) ?? bil(hg, D.hg, cl(x, hg.x0, hg.x0 + (hg.nx - 1) * hg.st), cl(y, hg.y0, hg.y0 + (hg.ny - 1) * hg.st));
}
