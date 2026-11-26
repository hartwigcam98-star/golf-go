// Golf Go ground (Stage 6): the web game's ground shader (ground.js R3_GROUND_BODY), ported:
//   the painted course map (gTex), the per-yard surface map (gSurf: r short grass, g rough, b fescue, a green; sand what's left),
//   tiling detail textures per surface that fade out between 30 and 190 yd, the photographed turf and sand (pG / pS) multiplied in
//   near you (fading 40-220 yd), bunkers a touch darker with soft rake furrows close by, sunny drifts, mown stripes that swap shade as
//   you walk round them (light on the blades), the green's stripes, then diffuse = c*c as the web game does. The baked light map
//   multiplies on top (x2, 0.5 = full sun), as the Standard ground did. _GMode 0 is the land beyond the hole (the skirt): the
//   surroundings map (gStex) or plain grass noise, no surface map.
// The game's ground plane q = (x, y) is Unity's (x, -z). Textures the web game uploads without flipY (canvases, data) are read
// with v flipped (Unity's v = 0 is the image's bottom row). All of them are imported as raw data (sRGB off), as the web samples them.
Shader "GolfGo/Ground"
{
    Properties
    {
        _MainTex ("Course map (gTex)", 2D) = "white" {}
        _Light ("Baked light", 2D) = "gray" {}
        _Surf ("Surface map (gSurf)", 2D) = "black" {}
        _DS ("Detail short", 2D) = "gray" {}
        _DR ("Detail rough", 2D) = "gray" {}
        _DF ("Detail fescue", 2D) = "gray" {}
        _DD ("Detail sand", 2D) = "gray" {}
        _PG ("Photo turf", 2D) = "gray" {}
        _PS ("Photo sand", 2D) = "gray" {}
        _Surround ("Surroundings (gStex)", 2D) = "white" {}
        _GB ("Course map rect", Vector) = (0, 0, 1, 1)
        _GSB ("Surface map rect", Vector) = (0, 0, 1, 1)
        _GSS ("Surroundings rect", Vector) = (0, 0, 0, 0)
        _LB ("Light map rect", Vector) = (0, 0, 1, 1)
        _TK ("Turf tints", Vector) = (1, 1, 1, 1)
        _RLS ("Mown stripes", Vector) = (1, 0, 11, 0)
        _RLG ("Green stripes", Vector) = (0, 0, 0, 0)
        _GMode ("Hole (1) or beyond (0)", Float) = 1
        _SlT ("Green slope map (slT, raw bytes)", 2D) = "black" {}
        _SLB ("Slope map rect", Vector) = (0, 0, 1, 1)
        _SlRot ("Grid direction (ball to pin)", Vector) = (1, 0, 0, 0)
        _SlOn ("Slope grid fade", Float) = 0
        _SLG ("Grid spacing", Float) = 1
        _SlDk ("Darker grid", Float) = 0
        _POn ("Photo detail on", Float) = 1
        _LightOn ("Baked light on", Float) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        CGPROGRAM
        #pragma surface surf Standard noforwardadd
        #pragma target 3.5
        sampler2D _SlT; float4 _SLB, _SlRot; float _SlOn, _SLG, _SlDk;
        sampler2D _MainTex, _Light, _Surf, _DS, _DR, _DF, _DD, _PG, _PS, _Surround;
        float4 _GB, _GSB, _GSS, _LB, _TK, _RLS, _RLG; float _GMode, _POn, _LightOn;
        struct Input { float3 worldPos; };

        // the web game's GLSL_NOISE
        float hash (float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
        float vnoise (float2 p)
        {
            float2 i = floor(p), f = frac(p); f = f * f * (3. - 2. * f);
            return lerp(lerp(hash(i), hash(i + float2(1, 0)), f.x), lerp(hash(i + float2(0, 1)), hash(i + float2(1, 1)), f.x), f.y);
        }
        // a texture the web game reads without flipY, at its own uv
        float4 texNF (sampler2D t, float2 uv) { return tex2D(t, float2(uv.x, 1. - uv.y)); }
        float4 texNFg (sampler2D t, float2 uv, float2 dx, float2 dy) { return tex2Dgrad(t, float2(uv.x, 1. - uv.y), float2(dx.x, -dx.y), float2(dy.x, -dy.y)); }
        // every ground texture is imported as raw data (sRGB off), as the web game samples them (NoColorSpace): no conversion
        float3 toWeb (float3 c) { return c; }

        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            float3 wp = IN.worldPos;
            float2 q = float2(wp.x, -wp.z);
            float2 E2 = float2(_WorldSpaceCameraPos.x, -_WorldSpaceCameraPos.z);
            float dist = length(wp - _WorldSpaceCameraPos);
            float3 c;
            float2 su = (q - _GSS.xy) / max(_GSS.zw, float2(1, 1));
            if (_GMode > .5) { float2 uv = (q - _GB.xy) / _GB.zw; c = toWeb(tex2D(_MainTex, float2(uv.x, 1. - uv.y)).rgb); }
            else if (_GSS.z > 0. && su.x > 0. && su.y > 0. && su.x < 1. && su.y < 1.) c = toWeb(texNF(_Surround, su).rgb);
            else c = lerp(float3(.25, .34, .18), float3(.33, .42, .22), vnoise(q * .01) * .7 + hash(floor(q * .05)) * .3);
            c = lerp(dot(c, float3(.299, .587, .114)).xxx, c, .78) * .9;
            float m = vnoise(q * .045) * .6 + vnoise(q * .19) * .4; c *= .9 + .2 * m;
            float4 w = _GMode > .5 ? texNF(_Surf, (q - _GSB.xy + .5) / _GSB.zw) : float4(.25, .45, .1, 0);
            float ws = max(0., 1. - w.r - w.g - w.b);
            float2 dqx = ddx(q), dqy = ddy(q);
            float dS = 0, dR = 0, dF = 0, dD = 0;
            if (w.r > .002) dS = texNFg(_DS, q / 1.2, dqx / 1.2, dqy / 1.2).r * .6 + texNFg(_DS, q / 3.1 + .37, dqx / 3.1, dqy / 3.1).r * .4;
            if (w.g > .002) dR = texNFg(_DR, q / 1.7, dqx / 1.7, dqy / 1.7).r * .6 + texNFg(_DR, q / 4.3 + .61, dqx / 4.3, dqy / 4.3).r * .4;
            if (w.b > .002) dF = texNFg(_DF, q / 2.8, dqx / 2.8, dqy / 2.8).r * .65 + texNFg(_DF, q / 7.9 + .23, dqx / 7.9, dqy / 7.9).r * .35;
            if (ws > .002 && _POn < .5) dD = texNFg(_DD, q / 1.1, dqx / 1.1, dqy / 1.1).r * .6 + texNFg(_DD, q / 3.7 + .5, dqx / 3.7, dqy / 3.7).r * .4;
            float det = (w.r * dS * 1.25 + w.g * dR * 1.3 + w.b * dF * 1.6 + ws * dD * 1.) * 2. - (w.r * 1.25 + w.g * 1.3 + w.b * 1.6 + ws);
            if (_POn > .5)
            {   // photographed turf and sand: their colour ratios multiply the painted course near you
                float2 qr = float2(q.x * .8 - q.y * .6, q.x * .6 + q.y * .8);
                float2 rx = float2(dqx.x * .8 - dqx.y * .6, dqx.x * .6 + dqx.y * .8), ry = float2(dqy.x * .8 - dqy.y * .6, dqy.x * .6 + dqy.y * .8);
                float nzm = smoothstep(.3, .7, vnoise(q * .07));
                float gw = w.a, kga = lerp(1.7, 1.05, gw) * lerp(_TK.x, 1., gw), kgb = lerp(3.9, 2.6, gw) * lerp(_TK.x, 1., gw);
                float2 ga = q / kga, gb2 = qr / kgb + .37, sa = q / 2.4, sb = qr / 5.3 + .61;
                float fd = 1. - smoothstep(40., 220., dist), kg = (w.r * .9 + w.g) * fd * lerp(_TK.y, 1., gw), ks = ws * fd;
                float3 pg = float3(1, 1, 1), ps = float3(1, 1, 1);
                if (kg > .001) pg = lerp(toWeb(tex2Dgrad(_PG, ga, dqx / kga, dqy / kga).rgb), toWeb(tex2Dgrad(_PG, gb2, rx / kgb, ry / kgb).rgb), nzm) * 2.5;
                if (ks > .001) ps = lerp(toWeb(tex2Dgrad(_PS, sa, dqx / 2.4, dqy / 2.4).rgb), toWeb(tex2Dgrad(_PS, sb, rx / 5.3, ry / 5.3).rgb), nzm) * 2.5;
                float3 pgl = lerp(dot(pg, float3(.333, .333, .333)).xxx, pg, lerp(.55, .35, gw)); kg *= lerp(1., .6, gw) * lerp(.78, .75, gw);
                c *= lerp(float3(1, 1, 1), pgl, kg * 1.1) * lerp(float3(1, 1, 1), ps, ks);
                det = (w.b * dF * 1.6) * 2. - (w.b * 1.6) + (w.r * (dS * 2. - 1.) * .35 + w.g * (dR * 2. - 1.) * .4);
            }
            c *= 1. + det * 1.45 * (1. - smoothstep(30., 190., dist));
            if (_GMode > .5)
            {
                if (dist < 90.) c *= 1. + (vnoise(q * .75) - .5) * .07 * (w.r * (1. - w.a) + w.g) * (1. - smoothstep(25., 90., dist));
                // bunkers read as sand: a touch darker, soft rake furrows close by (two rake directions in drifts)
                if (ws > .002)
                {
                    c *= lerp(1., .9, ws); float fr = (1. - smoothstep(4., 13., dist)) * smoothstep(.6, .95, ws);
                    if (fr > .001)
                    {
                        float p1 = dot(q, float2(.8, .6)) / .14, p2 = dot(q, float2(-.45, .89)) / .14, fq = max(fwidth(p1), fwidth(p2)); fr *= 1. - smoothstep(.25, .5, fq);
                        float j = vnoise(q * 1.3) * 2.5, rk = lerp(sin(p1 * 6.2832 + j), sin(p2 * 6.2832 + j), smoothstep(.35, .65, vnoise(q * .03))) * fr * (.55 + .45 * vnoise(q * .4));
                        c *= 1. + rk * .008;
                    }
                }
            }
            c *= lerp(float3(1, 1, 1), float3(1.05, 1.03, .9), smoothstep(.55, .8, vnoise(q * .013)) * .5 * (w.r + w.g));
            // the green's slope grid (ground.js): lines coloured by steepness (green gentle to red severe), bright dashes marching along
            // each line toward lower ground, faster the more it breaks. slT is uploaded raw (row 0 = the rect's top edge y0): read as is.
            float2 slR = _SlRot.xy, gq = float2(dot(q, slR), dot(q, float2(-slR.y, slR.x))) / _SLG, fw = max(fwidth(gq), float2(.03, .03));
            if (_GMode > .5 && _SlOn > .002)
            {
                float2 sv = (q - _SLB.xy) / _SLB.zw;
                if (sv.x > 0. && sv.y > 0. && sv.x < 1. && sv.y < 1.)
                {
                    float4 s = tex2Dlod(_SlT, float4(sv, 0, 0)); float a = s.a * _SlOn;
                    if (a > .003)
                    {
                        float k = s.b; float3 g0 = float3(.08, .95, .42), g1 = float3(1., .9, .08), g2 = float3(1., .48, .04), g3 = float3(1., .08, .08);
                        float3 rc = k < .34 ? lerp(g0, g1, k / .34) : k < .67 ? lerp(g1, g2, (k - .34) / .33) : lerp(g2, g3, (k - .67) / .33);
                        float2 gf = abs(frac(gq - .5) - .5);
                        float2 ln = 1. - smoothstep(fw * .35, fw * 1.9, gf), ln2 = 1. - smoothstep(fw * .9, fw * 3., gf);
                        float Lf = (1. - smoothstep(.22, .45, max(fw.x, fw.y))) * (1. - smoothstep(50., 90., dist));
                        float2 hl = 1. - smoothstep(fw * 1.2, fw * 4.2, gf); float far = smoothstep(10., 35., dist) * _SlDk; c *= 1. - _SlDk * (.26 + .12 * far) * max(hl.x, hl.y) * Lf * a;
                        float2 pr = float2(-slR.y, slR.x); float dfd = 1. - smoothstep(30., 60., dist);
                        float lxy[2] = { 0., 0. };
                        [unroll] for (int ax = 0; ax < 2; ax++)
                        {
                            float lw = ax == 0 ? ln.x : ln.y, lw2 = ax == 0 ? ln2.x : ln2.y;
                            float along = ax == 0 ? gq.y : gq.x, across = ax == 0 ? gq.x : gq.y;
                            float2 sc2 = ax == 0 ? float2(floor(across + .5), floor(along) + .5) : float2(floor(along) + .5, floor(across + .5));
                            float2 cw = (sc2.x * slR + sc2.y * pr) * _SLG; float4 sq = tex2Dlod(_SlT, float4(clamp((cw - _SLB.xy) / _SLB.zw, 0., 1.), 0, 0));
                            float2 d2 = sq.rg * 2. - 1.; float l2 = length(d2);
                            float comp = l2 > .3 ? (ax == 0 ? dot(d2, pr) : dot(d2, slR)) / l2 : 0.; float m = smoothstep(.12, .45, abs(comp)) * dfd * (1. - smoothstep(.07, .16, max(fw.x, fw.y)));
                            float ph = frac(along - _Time.y * (.25 + 2.6 * sq.b) * comp); if (comp < 0.) ph = 1. - ph;
                            float dash = smoothstep(.4, .88, ph) * (1. - smoothstep(.88, .98, ph));
                            lxy[ax] = lw2 < .01 ? 0. : max(lw * lerp(.62, .45, m), lw2 * 1.45 * dash * m);
                        }
                        float lmax = max(lxy[0], lxy[1]), L = lmax * Lf;
                        float3 rcd = lerp(rc, rc * rc, .55) * .82, lc = lerp(lerp(c * 1.1, rc * .85, .75), lerp(c * .9, rcd, .8), _SlDk), lb = rc * 1.55 + .16;
                        c = lerp(c, lerp(lc, lb, clamp((lmax - .62) / .75, 0., 1.)), clamp(L * a * (1. + .4 * far), 0., 1.));
                    }
                }
            }
            if (_GMode > .5)
            {   // mown stripes are light on the blades: they swap shade as you walk round them and fade looking straight down
                float3 vw3 = wp - _WorldSpaceCameraPos; float2 vq = float2(vw3.x, -vw3.z); float hz = length(vq); float2 vd = vq / max(hz, 1e-3);
                float grz = clamp(hz / max(length(vw3), 1e-3), 0., 1.);
                if (_RLS.w > .5 && _RLS.z > 0.)
                {
                    float ph = (q.y * _RLS.x - q.x * _RLS.y) / _RLS.z, fp = max(fwidth(ph), 1e-4); float par = -clamp(sin(3.14159 * ph) / (fp * 4.7), -1., 1.);
                    c *= 1. + .06 * par * dot(vd, _RLS.xy) * grz * w.r * (1. - w.a);
                }
                if (dot(_RLG.zw, _RLG.zw) > .5)
                {
                    float2 dg = q - _RLG.xy; float ph = (dg.y * _RLG.z - dg.x * _RLG.w) / 4., fp = max(fwidth(ph), 1e-4); float par = clamp(sin(3.14159 * ph) / (fp * 4.7), -1., 1.);
                    c *= 1. + .035 * par * dot(vd, _RLG.zw) * grz * w.a * (1. - smoothstep(35., 55., length(dg)));
                }
            }
            c = max(c, 0);
        #ifdef UNITY_COLORSPACE_GAMMA
            float3 alb = c;
        #else
            float3 alb = c * c;
        #endif
            if (_LightOn > .5)
            {   // the hole's Blender-baked light (0.5 = full sun and open sky), as the Standard ground's x2 detail map
                float2 lu = (q - _LB.xy) / _LB.zw;
                if (lu.x > 0. && lu.y > 0. && lu.x < 1. && lu.y < 1.) alb *= tex2D(_Light, float2(lu.x, 1. - lu.y)).r * unity_ColorSpaceDouble.rgb;
            }
            o.Albedo = alb; o.Metallic = 0; o.Smoothness = .05; o.Alpha = 1;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
