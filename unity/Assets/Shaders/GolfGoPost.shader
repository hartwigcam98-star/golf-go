// The web game's finishing (shader-patches fog_fragment + post-chain.js 'final'): haze over distance toward the horizon's colour,
// the bloom (three levels, added before the curve), then the filmic curve (sqrt(aces(c * expo))), the sun's glare and ghosts, the
// colour grade, the vignette and a dither. Input: the camera's linear HDR picture.
// Passes: 0 the finish, 1 bright (what glows: over 1.9, HDR), 2 down (a 4-tap box), 3 blur (9-tap Gaussian along _GGDir).
// Enhanced graphics (beyond what the web runs on a phone): 4 ambient occlusion from the depth (the web's High setting, post-chain.js
// 'ao'), 5 its depth-aware blur ('aob'), 6 sun shafts (light streaming past the trees from the sun, at a quarter size).
Shader "GolfGo/Post"
{
    Properties { _MainTex ("", 2D) = "black" {} }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            #include "GolfGoSky.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize; UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture);
            float4x4 _GGInvProj, _GGCamToWorld; float _GGExpo, _GGAsp, _GGBloomK; float4 _GGSunP;
            sampler2D _GGB1, _GGB2, _GGB3, _GGAO, _GGShaft; float _GGAOOn, _GGShaftK;
            float hsh (float2 p) { return frac(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }
            float4 frag (v2f_img i) : SV_Target
            {
                float2 uv = i.uv; float3 c = tex2D(_MainTex, uv).rgb;
                float2 duv = uv;
            #if UNITY_UV_STARTS_AT_TOP
                if (_MainTex_TexelSize.y < 0) duv.y = 1 - duv.y;
            #endif
                float raw = SAMPLE_DEPTH_TEXTURE(_CameraDepthTexture, duv);
            #if defined(UNITY_REVERSED_Z)
                bool sky = raw <= 1e-6;
            #else
                bool sky = raw >= 1 - 1e-6;
            #endif
                if (!sky)
                {   // the pixel's ray (the camera's own off-centre projection) and how far along it the surface is
                    float4 vr = mul(_GGInvProj, float4(duv * 2 - 1, 1, 1)); float3 dv = normalize(vr.xyz / vr.w);
                    float ez = LinearEyeDepth(raw), dist = ez / max(-dv.z, 1e-4);
                    float3 dw = mul((float3x3)_GGCamToWorld, dv); float3 v = float3(dw.x, dw.y, -dw.z);
                    c = lerp(c, fogCol(v), fogAmt(dist));
                }
                // ambient occlusion (the web's High: x mix(1, ao, .85)), then the sun shafts, warm, before the curve
                if (_GGAOOn > .5) c *= lerp(1., tex2D(_GGAO, uv).r, .85);
                if (_GGShaftK > 0.) c += float3(1., .86, .62) * tex2D(_GGShaft, uv).r * _GGShaftK;
                // bloom (post-chain.js final: b1 .42 + b2 .38 + b3 .5, x bloomK .55 with a float picture)
                c += (tex2D(_GGB1, uv).rgb * .42 + tex2D(_GGB2, uv).rgb * .38 + tex2D(_GGB3, uv).rgb * .5) * _GGBloomK;
                c = sqrt(aces(c * _GGExpo));
                // the sun in the picture: how much of its disc shows (5 taps over 8), a glow round it and four ghosts across the screen
                if (_GGSunP.z > 0.)
                {
                    float2 sp = _GGSunP.xy;
                #if UNITY_UV_STARTS_AT_TOP
                    if (_MainTex_TexelSize.y < 0) sp.y = 1 - sp.y;
                #endif
                    float2 px = _MainTex_TexelSize.xy; float vis = 0.;
                    for (int k = 0; k < 5; k++)
                    {
                        float2 o = (k == 0 ? float2(0, 0) : k == 1 ? float2(-4, -4) : k == 2 ? float2(4, -4) : k == 3 ? float2(-4, 4) : float2(4, 4)) * px;
                        float3 q = tex2Dlod(_MainTex, float4(sp + o, 0, 0)).rgb; vis += step(8., max(q.r, max(q.g, q.b)));
                    }
                    vis = vis / 5. * _GGSunP.z;
                    float2 dd = (duv - _GGSunP.xy) * float2(_GGAsp, 1.); float r = length(dd);
                    c += float3(1., .88, .66) * vis * (.2 * exp(-r * 9.) + .06 * exp(-r * 2.2));
                    float2 ax = float2(.5, .5) - _GGSunP.xy;
                    for (int g = 0; g < 4; g++)
                    {
                        float t = .55 + g * .42; float2 gp = _GGSunP.xy + ax * t * 2.; float sz = .025 + .03 * (g == 2 ? 1. : 0.) + .012 * g;
                        float gr = length((duv - gp) * float2(_GGAsp, 1.));
                        float3 tn = g == 0 ? float3(.9, .7, .4) : g == 1 ? float3(.4, .8, .6) : g == 2 ? float3(.5, .6, 1.) : float3(1., .5, .4);
                        c += tn * vis * .045 * smoothstep(sz, sz * .55, gr);
                    }
                }
                c = grade(c);
                float2 vq = (uv - .5) * float2(_GGAsp, 1.) * 1.25; c *= 1. - .26 * smoothstep(.35, 1.05, dot(vq, vq) * 1.6);
                c += (hsh(uv * _ScreenParams.xy) - .5) / 255.;
            #ifndef UNITY_COLORSPACE_GAMMA
                c = GammaToLinearSpace(saturate(c));   // (written to the sRGB screen, which encodes it back)
            #endif
                return float4(c, 1);
            }
            ENDCG
        }
        // 1 bright: the average of four texels, kept only over 1.9 (the web's HDR threshold), capped
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize;
            float4 frag (v2f_img i) : SV_Target
            {
                float2 px = _MainTex_TexelSize.xy, uv = i.uv;
                float3 c = (tex2D(_MainTex, uv + px * float2(-.5, -.5)).rgb + tex2D(_MainTex, uv + px * float2(.5, -.5)).rgb + tex2D(_MainTex, uv + px * float2(-.5, .5)).rgb + tex2D(_MainTex, uv + px * float2(.5, .5)).rgb) * .25;
                float l = max(max(c.r, c.g), c.b); c *= max(l - 1.9, 0.) / max(l, 1e-4); return float4(min(c, 30.), 1);
            }
            ENDCG
        }
        // 2 down: a 4-tap box
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize;
            float4 frag (v2f_img i) : SV_Target
            {
                float2 px = _MainTex_TexelSize.xy, uv = i.uv;
                return float4((tex2D(_MainTex, uv + px * float2(-.5, -.5)).rgb + tex2D(_MainTex, uv + px * float2(.5, -.5)).rgb + tex2D(_MainTex, uv + px * float2(-.5, .5)).rgb + tex2D(_MainTex, uv + px * float2(.5, .5)).rgb) * .25, 1);
            }
            ENDCG
        }
        // 3 blur: the web's 9-tap Gaussian in 5 linear taps, along _GGDir (one texel)
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _GGDir;
            float4 frag (v2f_img i) : SV_Target
            {
                float2 uv = i.uv, d = _GGDir.xy; float3 c = tex2D(_MainTex, uv).rgb * .227;
                c += (tex2D(_MainTex, uv + d * 1.385).rgb + tex2D(_MainTex, uv - d * 1.385).rgb) * .316;
                c += (tex2D(_MainTex, uv + d * 3.231).rgb + tex2D(_MainTex, uv - d * 3.231).rgb) * .0703;
                return float4(c, 1);
            }
            ENDCG
        }
        // 4 ambient occlusion (post-chain.js 'ao', the web's High setting): 12 samples round each spot in its own plane, from the depth;
        // out: r the occlusion (1 open), g the spot's distance (for the blur)
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize; UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture); float4 _CameraDepthTexture_TexelSize;
            float4x4 _GGInvProj; float4 _GGK;   // (projection x and y scale, the AO picture's texel)
            float hsh (float2 p) { return frac(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }
            float rawAt (float2 q) { return SAMPLE_DEPTH_TEXTURE_LOD(_CameraDepthTexture, float4(q, 0, 0)); }
            bool skyRaw (float r)
            {
            #if defined(UNITY_REVERSED_Z)
                return r <= 1e-6;
            #else
                return r >= 1 - 1e-6;
            #endif
            }
            // the spot under depth uv q, in view space with z the distance ahead (as the web's vp)
            float3 vp (float2 q)
            {
                float ez = LinearEyeDepth(rawAt(q)); float4 r = mul(_GGInvProj, float4(q * 2 - 1, 1, 1)); float3 d = r.xyz / r.w;
                return float3(d.xy / -d.z * ez, ez);
            }
            float4 frag (v2f_img i) : SV_Target
            {
                float2 q = i.uv;
            #if UNITY_UV_STARTS_AT_TOP
                if (_MainTex_TexelSize.y < 0) q.y = 1 - q.y;
            #endif
                if (skyRaw(rawAt(q))) return float4(1, 1e4, 0, 1);
                float3 P = vp(q); if (P.z > 140.) return float4(1, P.z, 0, 1);
                // the spot's plane from its neighbours one AO texel away (two screen pixels: the depth texture can be coarser than the
                // picture, and a neighbour reading the same depth texel tips the plane toward the camera: bands of false shade across the
                // ground in build 28's look check); the nearer-depth side, as the web's, unless that side hasn't moved at all
                float2 dp = _GGK.zw; float e = 1e-5 * P.z + 1e-4;
                float3 px1 = vp(q + float2(dp.x, 0)), px0 = vp(q - float2(dp.x, 0)), py1 = vp(q + float2(0, dp.y)), py0 = vp(q - float2(0, dp.y));
                float ax1 = abs(px1.z - P.z), ax0 = abs(P.z - px0.z), ay1 = abs(py1.z - P.z), ay0 = abs(P.z - py0.z);
                float3 dx = (ax1 < ax0 && ax1 > e) || ax0 <= e ? px1 - P : P - px0, dy = (ay1 < ay0 && ay1 > e) || ay0 <= e ? py1 - P : P - py0;
                float3 N = normalize(cross(dx, dy)); if (dot(N, P) > 0.) N = -N;
                float Rw = clamp(P.z * .05, .45, 3.); float2 rad = _GGK.xy * .5 * Rw / P.z;
                if (rad.x < _GGK.z * 1.5) return float4(1, P.z, 0, 1);
                float a0 = hsh(floor(i.uv / _GGK.zw)) * 6.2832, occ = 0., bias = .004 * P.z + .01;
                for (int k = 0; k < 12; k++)
                {
                    float t = (k + .5) / 12.; float a = a0 + t * 6.2832 * 3.; float2 o = float2(cos(a), sin(a)) * rad * t;
                    float3 v = vp(q + o) - P; float vv = dot(v, v);
                    occ += max(dot(v, N) - bias, 0.) / (vv + .02 * Rw * Rw) * max(0., 1. - vv / (Rw * Rw));
                }
                float ao = pow(max(0., 1. - 2.2 * Rw * occ / 12.), 1.6);
                ao = lerp(ao, 1., smoothstep(70., 140., P.z));
                ao = lerp(1., ao, smoothstep(5.5, 8.5, P.z));   // (none on the ground at your feet: a band of false shade there in build 28)
                return float4(ao, P.z, 0, 1);
            }
            ENDCG
        }
        // 5 the occlusion blurred along _GGDir, only across spots at about the same distance ('aob')
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _GGDir;
            float4 frag (v2f_img i) : SV_Target
            {
                float z0 = tex2D(_MainTex, i.uv).g, s = 0., w = 0.;
                for (int k = -3; k <= 3; k++)
                {
                    float2 t = tex2Dlod(_MainTex, float4(i.uv + _GGDir.xy * k * 1.5, 0, 0)).rg;
                    float kk = exp(-abs(t.y - z0) / (.04 * z0 + .05)) * (1. - abs(k) / 4.5); s += t.x * kk; w += kk;
                }
                return float4(s / max(w, 1e-4), z0, 0, 1);
            }
            ENDCG
        }
        // 6 sun shafts: from each spot, 24 steps toward the sun; open sky near the sun lights the way, the trees and the golfer cut it
        // into rays (the sun's place on screen, y up: _GGSunS.xy; it may be off the edge)
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.5
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize; UNITY_DECLARE_DEPTH_TEXTURE(_CameraDepthTexture);
            float4 _GGSunS; float _GGAsp;
            float hsh (float2 p) { return frac(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }
            float skyAt (float2 q)
            {
                float r = SAMPLE_DEPTH_TEXTURE_LOD(_CameraDepthTexture, float4(saturate(q), 0, 0));
            #if defined(UNITY_REVERSED_Z)
                return r <= 1e-6 ? 1. : 0.;
            #else
                return r >= 1 - 1e-6 ? 1. : 0.;
            #endif
            }
            float4 frag (v2f_img i) : SV_Target
            {
                float2 q = i.uv;
            #if UNITY_UV_STARTS_AT_TOP
                if (_MainTex_TexelSize.y < 0) q.y = 1 - q.y;
            #endif
                float2 d = _GGSunS.xy - q; float L = length(d * float2(_GGAsp, 1)); if (L > .7) d *= .7 / L;
                float2 st = d / 24.; float2 p = q + st * hsh(i.uv * 917.3); float sum = 0., dec = 1.;
                for (int k = 0; k < 24; k++)
                {
                    float r = length((_GGSunS.xy - p) * float2(_GGAsp, 1));
                    sum += skyAt(p) * exp(-r * 4.2) * dec; dec *= .965; p += st;
                }
                float v = sum / 24. * (1. - .55 * skyAt(q));   // (the open sky itself a little less: the rays show against what's lit)
                return float4(v, v, v, 1);
            }
            ENDCG
        }
    }
}
