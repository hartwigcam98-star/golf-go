// The web game's finishing (shader-patches fog_fragment + post-chain.js 'final'): haze over distance toward the horizon's colour,
// then the filmic curve (sqrt(aces(c * expo))), the colour grade, the vignette and a dither. Input: the camera's linear HDR picture.
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
            float4x4 _GGInvProj, _GGCamToWorld; float _GGExpo, _GGAsp;
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
                c = sqrt(aces(c * _GGExpo));
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
    }
}
