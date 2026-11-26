// Golf Go water (Stage 6): the web game's water (sky.js mat.water + shader-patches "water"): a near-black teal surface
// (.012, .03, .034), 90% opaque, smooth (roughness .04), two drifting layers of soft ripples that fade with distance, and the
// planar reflection of the scene (WaterReflect.cs renders it), nudged by the ripples, carrying 90% of the reflected light.
Shader "GolfGo/Water"
{
    Properties
    {
        _Color ("Base", Color) = (0.012, 0.03, 0.034, 1)
        _Opacity ("Opacity", Range(0,1)) = 0.9
        _ReflTex ("Reflection", 2D) = "black" {}
        _ReflOn ("Reflection on", Float) = 0
        _EnvK ("Reflection strength", Float) = 1.1
    }
    SubShader
    {
        Tags { "Queue"="Transparent-10" "RenderType"="Transparent" "IgnoreProjector"="True" }
        LOD 200
        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"
            #include "Lighting.cginc"

            fixed4 _Color; float _Opacity; sampler2D _ReflTex; float _ReflOn; float _EnvK;

            struct appdata { float4 vertex : POSITION; };
            struct v2f { float4 pos : SV_POSITION; float3 wp : TEXCOORD0; float4 sp : TEXCOORD1; UNITY_FOG_COORDS(2) };

            v2f vert (appdata v)
            {
                v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.wp = mul(unity_ObjectToWorld, v.vertex).xyz; o.sp = ComputeScreenPos(o.pos);
                UNITY_TRANSFER_FOG(o, o.pos); return o;
            }
            // the web game's hash noise (wHash / wNoise)
            float wHash (float2 p) { float3 p3 = frac(float3(p.x, p.y, p.x) * .1031); p3 += dot(p3, p3.yzx + 33.33); return frac((p3.x + p3.y) * p3.z); }
            float wNoise (float2 p)
            {
                float2 i = floor(p), f = frac(p); float2 u = f * f * (3. - 2. * f);
                return lerp(lerp(wHash(i), wHash(i + float2(1, 0)), u.x), lerp(wHash(i + float2(0, 1)), wHash(i + float2(1, 1)), u.x), u.y);
            }
            fixed4 frag (v2f i) : SV_Target
            {
                float wT = _Time.y;
                // two drifting layers of soft ripples (game x, z: Unity z is mirrored, which only mirrors the noise)
                float2 p = i.wp.xz;
                float2 g = (float2(wNoise(p * .7 + float2(wT * .25, 0)), wNoise(p * .7 + float2(0, wT * .2) + 5.)) - .5) * .6;
                g += (float2(wNoise(p * 2.9 - float2(wT * .5, wT * .15)), wNoise(p * 2.9 + float2(wT * .3, -wT * .45) + 9.)) - .5) * .3;
                float dist = length(i.wp - _WorldSpaceCameraPos);
                g *= 1. / (1. + dist * .015);
                float3 n = normalize(float3(0, 1, 0) + float3(g.x, 0, g.y) * .11);
                float3 v = normalize(_WorldSpaceCameraPos - i.wp);
                float3 l = normalize(_WorldSpaceLightPos0.xyz);
                // diffuse from the sun and the sky (the base is nearly black: it mostly shows the reflection)
                float3 col = _Color.rgb * (_LightColor0.rgb * saturate(dot(n, l)) + ShadeSH9(float4(n, 1)));
                // reflected light: Fresnel (F0 .04) times the mirrored scene (or the sky probe), nudged by the ripples
                float nv = saturate(dot(n, v)); float F = .04 + .96 * pow(1. - nv, 5.);
                float3 env;
                if (_ReflOn > .5)
                {
                    float2 ru = i.sp.xy / i.sp.w; ru += n.xz * .035;
                    env = tex2D(_ReflTex, clamp(ru, .001, .999)).rgb;
                }
                else
                {
                    float3 r = reflect(-v, n); env = DecodeHDR(UNITY_SAMPLE_TEXCUBE(unity_SpecCube0, r), unity_SpecCube0_HDR);
                }
                col += F * env * _EnvK;
                // the sun's glint off the ripples
                float3 h = normalize(l + v); col += _LightColor0.rgb * pow(saturate(dot(n, h)), 400.) * F * 4.;
                fixed4 c = fixed4(col, _Opacity);
                UNITY_APPLY_FOG(i.fogCoord, c);
                return c;
            }
            ENDCG
        }
    }
    FallBack Off
}
