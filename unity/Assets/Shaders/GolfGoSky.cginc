// The web game's sky, clouds, haze and finishing (lighting-shared-by-every.js GLSL_LIGHT, GLSL_GRADE), in the web's own coordinates
// (x east, y up, z south): callers turn Unity's directions round (z -> -z). Globals set by GolfGoLook.cs each frame.
#ifndef GOLFGO_SKY
#define GOLFGO_SKY
sampler2D _GGNoise; float3 _GGSun, _GGE; float _GGCloudOn, _GGWxG, _GGTime;

float3 skyBase (float3 d)
{
    float y = saturate(d.y), mu = max(dot(d, _GGSun), 0.);
    float3 zen = float3(.028, .095, .34), hor = float3(.56, .69, .86);
    float3 c = lerp(hor, zen, pow(y, .38)); c = lerp(c, dot(c, float3(.3, .55, .15)).xxx * float3(.98, 1., 1.04) * 1.12, _GGWxG);
    c *= 1. + .18 * mu * mu * (1. - y);
    c += float3(1., .83, .58) * (.22 * pow(mu, 6.) + .6 * pow(mu, 48.) + 2.5 * pow(mu, 600.)) * (1. - .4 * y);
    return c;
}
// clouds live on a plane 1.8 km up (yards); the same field shades the course
#define CLOUD_H 1800.
float2 cloudUV (float2 xz) { return xz / 11000. + float2(_GGTime * .0011, _GGTime * .0005); }
float cLo () { return lerp(.64, .47, _GGCloudOn); }
float nz (float2 uv, int ch) { float4 t = tex2Dlod(_GGNoise, float4(uv, 0, 0)); return ch == 0 ? t.r : t.g; }
float cloudN (float2 uv) { return nz(uv, 0) * .62 + nz(uv * 2.63 + float2(.31, .17), 1) * .27 + nz(uv * 6.1 + float2(.73, .41), 0) * .11; }
float cloudShadowAt (float3 wp)
{
    if (_GGCloudOn < .01) return 1.;
    float2 uv = cloudUV(wp.xz + _GGSun.xz * (CLOUD_H - wp.y) / max(_GGSun.y, .2));
    float n = nz(uv, 0) * .62 + nz(uv * 2.63 + float2(.31, .17), 1) * .27 + .055; float l = cLo(); return 1. - .6 * smoothstep(l - .01, l + .1, n);
}
float3 skyFull (float3 d, float disc)
{
    float3 c = skyBase(d); float mu = dot(d, _GGSun);
    c += float3(1., .96, .88) * smoothstep(.99988, .99994, mu) * disc;
    if (_GGCloudOn > .01 && d.y > .004)
    {
        float2 xz = _GGE.xz + d.xz / (d.y + .012) * CLOUD_H; float2 uv = cloudUV(xz);
        float n = cloudN(uv), cl = cLo(), den = smoothstep(cl, cl + .09, n);
        if (den > .001)
        {
            float2 ts = normalize(_GGSun.xz + float2(1e-4, 1e-4)) * .012; float n2 = cloudN(uv + ts), n3 = cloudN(uv + ts * 2.2);
            float lit = clamp(1. - ((n2 - n) * 9. + (n3 - n) * 5.), 0., 1.3); float thick = smoothstep(cl, cl + .2, n);
            float mu2 = max(mu, 0.);
            float3 sunLit = float3(1.3, 1.28, 1.24) * (.78 + .42 * lit) + float3(1., .85, .6) * pow(mu2, 5.) * .8 * (1. - thick * .6);
            float3 shade = float3(.5, .56, .67) * (.8 + .3 * d.y);
            float3 cc = lerp(shade, sunLit, clamp(lit * .8 + .25 - thick * .35, 0., 1.));
            float fade = smoothstep(.004, .22, d.y);
            c = lerp(c, cc, den * fade * .97);
        }
    }
    return c;
}
// aerial perspective (rlOn: the mown-stripe courses): lightens and blues distant tree lines
float fogAmt (float dist) { return 1. - exp(-max(dist - 60., 0.) / 1900.); }
float3 fogCol (float3 v) { return skyBase(normalize(float3(v.x, .035, v.z))); }
float3 aces (float3 c) { return saturate((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14)); }
float3 grade (float3 c)
{
    float l = dot(c, float3(.2126, .7152, .0722));
    float gd = saturate((c.g - max(c.r, c.b)) * 4.);
    c = lerp(c, float3(lerp(c.r, c.g, .16), c.g * .96, c.b * .94), gd * .75);
    c = lerp(l.xxx, c, 1. - .14 * gd);
    c = lerp(c, c * c * (3. - 2. * c), .34);
    c *= lerp(float3(.97, .99, 1.04), float3(1.03, 1.01, .965), smoothstep(.2, .85, l));
    return c;
}
#endif
