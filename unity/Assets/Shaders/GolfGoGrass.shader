// The web game's grass blades (post-chain.js R3G: r3GrassGeo, R3_GRASS_VS), built on the GPU: each instance is a 4-yd tile of
// blades; each blade keeps itself only where the density wanted there reaches its rank, grows where the surface map has rough or
// fescue, takes its height, lean and colour from the course map and noise, sways in the wind, and sits on the hole's own heights.
// Drawn with identity matrices: the object space is Unity's world (x, up, z = -the game's y). Colour is the web's linear vGc.
Shader "GolfGo/Grass"
{
    Properties
    {
        _HT ("Heights (hT, RFloat)", 2D) = "black" {}
        _Surf ("Surface map (gSurf)", 2D) = "black" {}
        _MainTex ("Course map (gTex)", 2D) = "white" {}
        _Noise ("Noise (noiseT)", 2D) = "gray" {}
        _HB ("Heights rect: x0, y0, step, nx", Vector) = (0, 0, 1, 1)
        _HN ("Heights ny", Float) = 1
        _GSB ("Surface map rect", Vector) = (0, 0, 1, 1)
        _GB ("Course map rect", Vector) = (0, 0, 1, 1)
        _GC0 ("Density centre 0", Vector) = (0, 0, 0, 1)
        _GC1 ("Density centre 1", Vector) = (0, 0, 0, 1)
        _GD ("Density cap, desert, ball", Vector) = (110, 0, 100000, 100000)
        _WV ("Wind", Vector) = (0, 0, 0, 0)
        _TK ("Turf tints", Vector) = (1, 1, 1, 1)
        _GCap ("This level's blades per tile cap", Float) = 110
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry+50" }
        Cull Off
        CGPROGRAM
        #pragma surface surf GG vertex:vert exclude_path:deferred
        #pragma multi_compile_instancing
        #pragma target 3.5
        #include "GolfGoBake.cginc"
        sampler2D _HT, _Surf, _MainTex, _Noise; float4 _HT_TexelSize;
        float4 _HB, _GSB, _GB, _GC0, _GC1, _GD, _WV, _TK; float _HN, _GCap;
        // Nov 26 (build 24): ordinary GPU instancing (Grass.cs: DrawMeshInstanced), each tile's corner in its matrix's translation
        // (Unity's (x, 0, -y)); procedural instancing from a buffer drew nothing on the phone
        struct Input { float4 color : COLOR; float3 worldPos; };

        float hAt (int2 i) { i = clamp(i, int2(0, 0), int2(_HB.w - 1, _HN - 1)); return tex2Dlod(_HT, float4((i + .5) / float2(_HB.w, _HN), 0, 0)).r; }
        float r3h (float2 q)
        {
            float2 f = (q - _HB.xy) / _HB.z; f = clamp(f, float2(0, 0), float2(_HB.w - 1.001, _HN - 1.001)); int2 i = int2(floor(f)); float2 t = f - i;
            return lerp(lerp(hAt(i), hAt(i + int2(1, 0)), t.x), lerp(hAt(i + int2(0, 1)), hAt(i + int2(1, 1)), t.x), t.y);
        }
        float r3dens (float d, float4 C) { return 1. - smoothstep(C.z, C.w, d); }
        float4 texNF (sampler2D t, float2 uv, float lod) { return tex2Dlod(t, float4(uv.x, 1. - uv.y, 0, lod)); }

        void vert (inout appdata_full v)
        {
            float3 T0 = float3(unity_ObjectToWorld._m03, unity_ObjectToWorld._m13, unity_ObjectToWorld._m23); float2 to = float2(T0.x, -T0.z);
            float4 bl = float4(v.texcoord.xy, v.texcoord1.xy); float3 position = v.vertex.xyz;
            float2 gq = to + bl.xy;
            float dd0 = length(gq - _GC0.xy), dd1 = length(gq - _GC1.xy);
            float dens = max(r3dens(dd0, _GC0), r3dens(dd1, _GC1)) * _GD.x;
            float keep = step(position.z * _GCap, dens);
            float4 sw = 0;
            if (keep > 0) { float2 su = (gq - _GSB.xy + .5) / _GSB.zw; if (su.x >= 0 && su.y >= 0 && su.x <= 1 && su.y <= 1) sw = texNF(_Surf, su, 0); }
            float3 gW = float3(0, -1e5, 0); float3 objectNormal = float3(0, 1, 0); float3 vGc = 0;
            if (keep * (sw.g + sw.b) > 0)
            {
                float ra = bl.z, rb = bl.w;
                float hR = sw.g * lerp(.075, .155, rb) * _TK.z, hF = sw.b * lerp(.3, .82, rb * rb);
                float2 cl = tex2Dlod(_Noise, float4(gq / 17., 0, 0)).rg;
                float fw = sw.b / (sw.g + sw.b + 1e-4) * (1. - _GD.y);
                float hgt = max(hR, hF) * (.55 + .9 * cl.x) * lerp(1., .45 + 1.1 * smoothstep(.3, .75, tex2Dlod(_Noise, float4(gq / 4.3 + .31, 0, 0)).r), fw);
                float nb = length(gq - _GD.zw); hgt *= lerp(.22, 1., smoothstep(.35, .8, nb));
                float thin = clamp(sqrt(_GD.x / max(dens, 1.)), 1., 3.2);
                float wdt = lerp(.011, .009, sw.b) * thin * (.8 + .4 * ra) * step(.004, hgt);
                float ang = ra * 6.2832; float2 fd = float2(cos(ang), sin(ang)), sd = float2(-fd.y, fd.x);
                float t = position.y;
                float lean = (rb - .5) * .9 + sw.b * .35;
                float gust = sin(_Time.y * 1.7 + gq.x * .35 + gq.y * .27) * .5 + sin(_Time.y * 2.9 + gq.x * .8) * .25;
                float2 bend = fd * lean * hgt + _WV.xy * (_WV.z * (.35 + .65 * gust)) * hgt * (1. + .7 * fw);
                gW = float3(gq.x, r3h(gq) - .015, gq.y);
                gW.xz += sd * position.x * wdt * (1. - t * .8) + bend * t * t;
                gW.y += hgt * t * (1. - .18 * dot(bend, bend) / max(hgt * hgt, 1e-4));
                float3 bn = normalize(float3(fd.x, 0., fd.y) - float3(bend.x, 0., bend.y) * 2. * t);
                objectNormal = normalize(lerp(bn, float3(0., 1., 0.), .55 + .25 * t));
                float3 gc = texNF(_MainTex, (gq - _GB.xy) / _GB.zw, 1).rgb; gc = lerp(dot(gc, float3(.299, .587, .114)).xxx, gc, .78) * .9;
                float3 tip = lerp(gc * float3(1.18, 1.26, 1.02), float3(.86, .78, .5), min(1., sw.b * .55 * _TK.w + sw.g * max(0., _TK.w - 1.) * .5));
                float3 cc = lerp(gc * .42, tip, smoothstep(0., 1., t)) * (.84 + .32 * rb) * (.86 + .28 * cl.y);
                if (fw > .01)
                {
                    float gold = smoothstep(.35, .8, frac(ra * 7.31 + cl.y * .7)) * clamp(.35 + .4 * _TK.w, 0., 1.);
                    float3 fb = float3(.28, .33, .18), fm = lerp(float3(.5, .57, .34), float3(.68, .62, .38), gold), ft = lerp(float3(.66, .68, .45), float3(.9, .81, .55), gold);
                    float3 fc = (t < .6 ? lerp(fb, fm, t / .6) : lerp(fm, ft, (t - .6) / .4)) * (.86 + .28 * rb) * (.9 + .2 * cl.y); cc = lerp(cc, fc, fw);
                }
                vGc = cc * cc;
            }
            // the game's (x, up, y south) to Unity's (x, up, z north)
            v.vertex = float4(float3(gW.x, gW.y, -gW.z) - T0, 1);   // (the instance matrix adds the tile's corner back) v.normal = float3(objectNormal.x, objectNormal.y, -objectNormal.z); v.color = float4(vGc, 1);
        }
        void surf (Input IN, inout SurfaceOutputGG o)
        {
            float3 alb = IN.color.rgb;
            float3 vv = normalize(_WorldSpaceCameraPos - IN.worldPos);
            o.Bk = bakeAt(float2(IN.worldPos.x, -IN.worldPos.z));
            // translucent, as the web's (its sunCol is the light's colour)
            float3 em = alb * _LightColor0.rgb * .3 * pow(max(dot(-vv, _WorldSpaceLightPos0.xyz), 0), 4) * lerp(1., o.Bk.x, .9);
        #ifdef UNITY_COLORSPACE_GAMMA
            alb = LinearToGammaSpace(alb); em = LinearToGammaSpace(em);
        #endif
            o.Albedo = alb; o.Emission = em; o.Smoothness = 1 - .88; o.Metallic = 0; o.Occlusion = 1; o.Alpha = 1;
        }
        ENDCG
    }
}
