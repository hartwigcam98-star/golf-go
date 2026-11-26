// The web game's finishing (shader-patches fog_fragment + post-chain.js 'final'): haze over distance toward the horizon's colour,
// the bloom (three levels, added before the curve), then the filmic curve (sqrt(aces(c * expo))), the sun's glare and ghosts, the
// colour grade, the vignette and a dither. Input: the camera's linear HDR picture.
// Passes: 0 the finish, 1 bright (what glows: over 1.9, HDR), 2 down (a 4-tap box), 3 blur (9-tap Gaussian along _GGDir).
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
            sampler2D _GGB1, _GGB2, _GGB3;
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
    }
}
